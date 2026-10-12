"use client";

import { useState } from "react";
import { Download, FileText, Paperclip, RefreshCw } from "lucide-react";

import { Card, CardContent } from "@/components/ui";
import { useTicketAttachments } from "@/hooks/use-ticket-attachments";
import { downloadTicketAttachment } from "@/lib/api/tickets";

function formatFileSize(size: number): string {
  if (size < 1024) {
    return `${size} B`;
  }

  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`;
  }

  return `${(size / (1024 * 1024)).toFixed(2)} MB`;
}

function formatUploadDate(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Date unavailable";
  }

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function TicketAttachmentsPanel({
  organizationId,
  ticketId,
}: {
  organizationId: string;
  ticketId: string;
}) {
  const attachmentsQuery = useTicketAttachments(organizationId, ticketId);

  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  async function handleDownload(attachmentId: string, fileName: string) {
    setDownloadingId(attachmentId);
    setDownloadError(null);

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
      setDownloadError(
        error instanceof Error
          ? error.message
          : "Unable to download the attachment.",
      );
    } finally {
      if (objectUrl) {
        // Allow the browser to begin the download before releasing the URL.
        window.setTimeout(() => URL.revokeObjectURL(objectUrl!), 1000);
      }

      setDownloadingId(null);
    }
  }

  const attachments = attachmentsQuery.data ?? [];

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

            {!attachmentsQuery.isLoading && !attachmentsQuery.isError && (
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                {attachments.length}
              </span>
            )}
          </div>

          {attachmentsQuery.isError && (
            <button
              type="button"
              onClick={() => void attachmentsQuery.refetch()}
              className="inline-flex h-9 items-center gap-2 rounded-md border border-input px-3 text-sm transition-colors hover:bg-muted"
            >
              <RefreshCw className="size-3.5" />
              Retry
            </button>
          )}
        </div>

        {attachmentsQuery.isLoading && (
          <p className="text-sm text-muted-foreground" role="status">
            Loading attachments...
          </p>
        )}

        {attachmentsQuery.isError && (
          <div className="space-y-2" role="alert">
            <p className="text-sm text-destructive">
              {attachmentsQuery.error instanceof Error
                ? attachmentsQuery.error.message
                : "Unable to load ticket attachments."}
            </p>

            <p className="text-xs text-muted-foreground">
              The ticket may still have attachments. Retry to fetch the list
              again.
            </p>
          </div>
        )}

        {attachmentsQuery.isSuccess && attachments.length === 0 && (
          <div className="rounded-md border border-dashed px-4 py-6 text-center">
            <FileText
              className="mx-auto size-5 text-muted-foreground"
              aria-hidden="true"
            />
            <p className="mt-2 text-sm font-medium">No attachments</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Files added to this ticket will appear here.
            </p>
          </div>
        )}

        {attachments.length > 0 && (
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

                <button
                  type="button"
                  onClick={() =>
                    void handleDownload(attachment.id, attachment.fileName)
                  }
                  disabled={downloadingId !== null}
                  aria-label={`Download ${attachment.fileName}`}
                  className="inline-flex h-9 shrink-0 items-center justify-center gap-2 self-start rounded-md border border-input px-3 text-sm font-medium transition-colors hover:bg-muted disabled:pointer-events-none disabled:opacity-50 sm:self-center"
                >
                  <Download className="size-4" />
                  {downloadingId === attachment.id
                    ? "Downloading..."
                    : "Download"}
                </button>
              </li>
            ))}
          </ul>
        )}

        {downloadError && (
          <p className="text-sm text-destructive" role="alert">
            {downloadError}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
