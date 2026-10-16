"use client";

import { useRef, useState, type FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Download, FileText, Paperclip, Trash2 } from "lucide-react";

import { EmptyState, ErrorState, LoadingState } from "@/components/shared";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui";
import {
  ticketAttachmentQueryKeys,
  useTicketAttachments,
} from "@/hooks/use-ticket-attachments";
import {
  deleteTicketAttachment,
  downloadTicketAttachment,
  uploadTicketAttachment,
} from "@/lib/api/tickets";

const MAX_ATTACHMENT_SIZE = 10 * 1024 * 1024;

const ALLOWED_ATTACHMENT_TYPES = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
  "text/plain",
  "text/csv",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
]);

const ACCEPTED_ATTACHMENT_FORMATS = [
  ".pdf",
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".webp",
  ".txt",
  ".csv",
  ".doc",
  ".docx",
  ".xls",
  ".xlsx",
  ".ppt",
  ".pptx",
].join(",");

function formatFileSize(size: number): string {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;

  return `${(size / (1024 * 1024)).toFixed(2)} MB`;
}

function formatUploadDate(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Date unavailable";
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function errorText(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

export function TicketAttachmentsPanel({
  organizationId,
  ticketId,
  canDelete = false,
}: {
  organizationId: string;
  ticketId: string;
  canDelete?: boolean;
}) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const attachmentsQuery = useTicketAttachments(organizationId, ticketId);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const listQueryKey = ticketAttachmentQueryKeys.list(organizationId, ticketId);

  const uploadMutation = useMutation({
    mutationFn: (file: File) =>
      uploadTicketAttachment(organizationId, ticketId, file),

    onSuccess: async (_result, file) => {
      setSelectedFile(null);
      setUploadError(null);
      setSuccessMessage(`Uploaded ${file.name}.`);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      await queryClient.invalidateQueries({ queryKey: listQueryKey });
    },

    onError: (error) => {
      setUploadError(errorText(error, "Unable to upload the attachment."));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (attachmentId: string) =>
      deleteTicketAttachment(organizationId, ticketId, attachmentId),

    onSuccess: async () => {
      setSuccessMessage("Attachment deleted.");
      await queryClient.invalidateQueries({ queryKey: listQueryKey });
    },
  });

  async function handleDownload(attachmentId: string, fileName: string) {
    setDownloadingId(attachmentId);
    setDownloadError(null);
    setSuccessMessage(null);

    let objectUrl: string | null = null;

    try {
      const blob = await downloadTicketAttachment(
        organizationId,
        ticketId,
        attachmentId,
      );

      objectUrl = URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = fileName;
      link.style.display = "none";

      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      setDownloadError(errorText(error, "Unable to download the attachment."));
    } finally {
      if (objectUrl) {
        const urlToRelease = objectUrl;

        // Let the browser start the download before releasing the URL.
        window.setTimeout(() => URL.revokeObjectURL(urlToRelease), 1000);
      }

      setDownloadingId(null);
    }
  }

  function handleUpload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setUploadError(null);
    setSuccessMessage(null);

    if (!selectedFile) {
      setUploadError("Choose a file to upload.");
      return;
    }

    if (selectedFile.size > MAX_ATTACHMENT_SIZE) {
      setUploadError("Attachments must be 10 MB or smaller.");
      return;
    }

    if (!ALLOWED_ATTACHMENT_TYPES.has(selectedFile.type)) {
      setUploadError(
        "This file type is not supported. Choose a PDF, image, text, CSV, Word, Excel, or PowerPoint file.",
      );
      return;
    }

    uploadMutation.mutate(selectedFile);
  }

  function handleDelete(attachmentId: string, fileName: string) {
    if (!canDelete || deleteMutation.isPending) return;

    const confirmed = window.confirm(
      `Permanently delete "${fileName}" from this ticket?`,
    );

    if (confirmed) {
      setSuccessMessage(null);
      deleteMutation.mutate(attachmentId);
    }
  }

  const attachments = attachmentsQuery.data ?? [];
  const busy =
    uploadMutation.isPending ||
    deleteMutation.isPending ||
    downloadingId !== null;

  return (
    <Card>
      <CardContent className="space-y-4 p-5 sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Paperclip
              className="size-4 text-muted-foreground"
              aria-hidden="true"
            />
            <h2 className="text-base font-semibold">Attachments</h2>

            {attachmentsQuery.isSuccess && (
              <Badge variant="secondary">{attachments.length}</Badge>
            )}
          </div>
        </div>

        {successMessage && (
          <p
            className="rounded-md border border-emerald-600/30 bg-emerald-600/5 px-3 py-2 text-sm"
            role="status"
            aria-live="polite"
          >
            {successMessage}
          </p>
        )}

        <form
          onSubmit={handleUpload}
          className="space-y-3 rounded-lg border border-dashed p-4"
        >
          <div>
            <label
              htmlFor={`ticket-attachment-file-${ticketId}`}
              className="text-sm font-medium"
            >
              Add attachment
            </label>

            <input
              ref={fileInputRef}
              id={`ticket-attachment-file-${ticketId}`}
              type="file"
              accept={ACCEPTED_ATTACHMENT_FORMATS}
              disabled={busy}
              onChange={(event) => {
                setSelectedFile(event.target.files?.[0] ?? null);
                setUploadError(null);
                setSuccessMessage(null);
              }}
              aria-describedby={`ticket-attachment-help-${ticketId}`}
              className="mt-2 block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-muted file:px-3 file:py-2 file:text-sm file:font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
            />

            <p
              id={`ticket-attachment-help-${ticketId}`}
              className="mt-2 text-xs text-muted-foreground"
            >
              Maximum size: 10 MB. Supported formats include PDF, PNG, JPEG,
              GIF, WebP, TXT, CSV, Word, Excel, and PowerPoint.
            </p>

            {selectedFile && (
              <p className="mt-2 break-words text-xs text-muted-foreground">
                Selected: {selectedFile.name} (
                {formatFileSize(selectedFile.size)})
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={!selectedFile || busy}
            className="inline-flex h-9 items-center justify-center gap-2 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
          >
            {uploadMutation.isPending ? "Uploading..." : "Upload attachment"}
          </button>
        </form>

        {uploadError && (
          <ErrorState
            variant="compact"
            title="Unable to upload attachment"
            description={uploadError}
          />
        )}

        {downloadError && (
          <ErrorState
            variant="compact"
            title="Unable to download attachment"
            description={downloadError}
          />
        )}

        {deleteMutation.isError && (
          <ErrorState
            variant="compact"
            title="Unable to delete attachment"
            description={errorText(
              deleteMutation.error,
              "The attachment could not be deleted.",
            )}
            onRetry={() => {
              const attachmentId = deleteMutation.variables;
              if (attachmentId && canDelete) {
                deleteMutation.mutate(attachmentId);
              }
            }}
          />
        )}

        {attachmentsQuery.isLoading && (
          <LoadingState variant="compact" label="Loading attachments..." />
        )}

        {attachmentsQuery.isError && (
          <ErrorState
            variant="compact"
            title="Unable to load attachments"
            description={errorText(
              attachmentsQuery.error,
              "The attachment list could not be loaded.",
            )}
            onRetry={() => void attachmentsQuery.refetch()}
          />
        )}

        {attachmentsQuery.isSuccess && attachments.length === 0 && (
          <EmptyState
            variant="compact"
            icon={FileText}
            title="No attachments"
            description="Files uploaded to this ticket will appear here."
          />
        )}

        {attachmentsQuery.isSuccess && attachments.length > 0 && (
          <ul className="divide-y">
            {attachments.map((attachment) => (
              <li
                key={attachment.id}
                className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex min-w-0 items-start gap-3">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-muted">
                    <FileText
                      className="size-5 text-muted-foreground"
                      aria-hidden="true"
                    />
                  </div>

                  <div className="min-w-0">
                    <p
                      className="break-words text-sm font-medium"
                      title={attachment.fileName}
                    >
                      {attachment.fileName}
                    </p>

                    <p className="mt-1 text-xs text-muted-foreground">
                      {formatFileSize(attachment.size)}
                      {" · "}
                      {attachment.mimeType}
                    </p>

                    <p className="mt-1 text-xs text-muted-foreground">
                      Uploaded by {attachment.uploadedBy.name}
                      {" · "}
                      {formatUploadDate(attachment.createdAt)}
                    </p>
                  </div>
                </div>

                <div className="flex shrink-0 flex-wrap gap-2 self-start sm:self-center">
                  <button
                    type="button"
                    onClick={() =>
                      void handleDownload(attachment.id, attachment.fileName)
                    }
                    disabled={busy}
                    aria-label={`Download ${attachment.fileName}`}
                    className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-input px-3 text-sm font-medium hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
                  >
                    <Download className="size-4" aria-hidden="true" />
                    {downloadingId === attachment.id
                      ? "Downloading..."
                      : "Download"}
                  </button>

                  {canDelete && (
                    <button
                      type="button"
                      onClick={() =>
                        handleDelete(attachment.id, attachment.fileName)
                      }
                      disabled={busy}
                      aria-label={`Delete ${attachment.fileName}`}
                      className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-destructive/30 px-3 text-sm text-destructive hover:bg-destructive/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
                    >
                      <Trash2 className="size-4" aria-hidden="true" />
                      {deleteMutation.isPending &&
                      deleteMutation.variables === attachment.id
                        ? "Deleting..."
                        : "Delete"}
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
