export const MAX_TICKET_ATTACHMENT_BYTES = 10 * 1024 * 1024;

export const SUPPORTED_TICKET_ATTACHMENT_TYPES = new Set([
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

export interface TicketAttachmentDraft {
  name: string;
  size: number;
  type: string;
}

export interface TicketDraftValidationInput {
  title: string;
  description: string;
  files?: readonly TicketAttachmentDraft[];
}

export type TicketDraftErrors = Partial<
  Record<"title" | "description" | "attachments", string>
>;

export function validateTicketDraft(
  input: TicketDraftValidationInput,
): TicketDraftErrors {
  const errors: TicketDraftErrors = {};

  const title = input.title.trim();
  const description = input.description.trim();

  if (!title) {
    errors.title = "Enter a ticket title.";
  } else if (title.length > 200) {
    errors.title = "The ticket title must be 200 characters or fewer.";
  }

  if (!description) {
    errors.description = "Enter a ticket description.";
  }

  for (const file of input.files ?? []) {
    if (file.size > MAX_TICKET_ATTACHMENT_BYTES) {
      errors.attachments = `"${file.name}" exceeds the 10 MB file-size limit.`;
      break;
    }

    if (!SUPPORTED_TICKET_ATTACHMENT_TYPES.has(file.type)) {
      errors.attachments = `"${file.name}" has an unsupported file type.`;
      break;
    }
  }

  return errors;
}
