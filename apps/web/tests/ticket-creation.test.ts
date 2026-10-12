import { afterEach, describe, expect, it, vi } from "vitest";

import {
  createTicket,
  downloadTicketAttachment,
  getTicketAttachments,
  uploadTicketAttachment,
} from "@/lib/api/tickets";
import {
  MAX_TICKET_ATTACHMENT_BYTES,
  validateTicketDraft,
} from "@/lib/ticket-creation";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("ticket creation form validation", () => {
  it("requires a non-empty title and description", () => {
    const errors = validateTicketDraft({
      title: "   ",
      description: " \n ",
      files: [],
    });

    expect(errors.title).toBe("Enter a ticket title.");
    expect(errors.description).toBe("Enter a ticket description.");
  });

  it("accepts trimmed, valid title and description values", () => {
    const errors = validateTicketDraft({
      title: "  Email is unavailable  ",
      description: "  Mail cannot be sent from the support mailbox. ",
      files: [],
    });

    expect(errors).toEqual({});
  });

  it("enforces the API's 200-character title limit", () => {
    const errors = validateTicketDraft({
      title: "T".repeat(201),
      description: "A valid description",
      files: [],
    });

    expect(errors.title).toBe(
      "The ticket title must be 200 characters or fewer.",
    );
  });

  it("accepts an attachment at the 10 MB limit", () => {
    const errors = validateTicketDraft({
      title: "Cannot access the application",
      description: "The application returns an error.",
      files: [
        {
          name: "trace.txt",
          size: MAX_TICKET_ATTACHMENT_BYTES,
          type: "text/plain",
        },
      ],
    });

    expect(errors.attachments).toBeUndefined();
  });

  it("rejects an attachment larger than 10 MB", () => {
    const errors = validateTicketDraft({
      title: "Cannot access the application",
      description: "The application returns an error.",
      files: [
        {
          name: "trace.txt",
          size: MAX_TICKET_ATTACHMENT_BYTES + 1,
          type: "text/plain",
        },
      ],
    });

    expect(errors.attachments).toContain("trace.txt");
    expect(errors.attachments).toContain("10 MB");
  });

  it("rejects unsupported attachment MIME types", () => {
    const errors = validateTicketDraft({
      title: "Cannot access the application",
      description: "The application returns an error.",
      files: [
        {
          name: "payload.bin",
          size: 100,
          type: "application/octet-stream",
        },
      ],
    });

    expect(errors.attachments).toContain("unsupported file type");
  });
});

describe("createTicket API contract", () => {
  it("posts the creation payload using the selected organization header", async () => {
    const createdTicket = {
      id: "ticket-123",
      ticketNumber: "TT-00123",
      organizationId: "org-123",
    };

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => createdTicket,
    } as Response);

    vi.stubGlobal("fetch", fetchMock);

    const input = {
      title: "Email is unavailable",
      description: "Messages fail when sent from the support mailbox.",
      type: "INCIDENT" as const,
      priority: "HIGH" as const,
      productId: "product-123",
    };

    const result = await createTicket("org-123", input);

    expect(result).toEqual(createdTicket);
    expect(fetchMock).toHaveBeenCalledOnce();

    const [url, init] = fetchMock.mock.calls[0] as unknown as [
      string,
      RequestInit,
    ];

    expect(url).toMatch(/\/tickets$/);
    expect(init).toMatchObject({
      method: "POST",
      credentials: "include",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "x-organization-id": "org-123",
      },
    });
    expect(JSON.parse(init.body as string)).toEqual(input);
  });

  it("surfaces validation messages from the API", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({
        message: [
          "title should not be empty",
          "description should not be empty",
        ],
      }),
    } as Response);

    vi.stubGlobal("fetch", fetchMock);

    await expect(
      createTicket("org-123", {
        title: "",
        description: "",
        type: "INCIDENT",
        priority: "MEDIUM",
      }),
    ).rejects.toThrow(
      "title should not be empty, description should not be empty",
    );
  });
});

describe("ticket attachment API contract", () => {
  it("uploads each file as multipart field 'file'", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
    } as Response);

    vi.stubGlobal("fetch", fetchMock);

    const file = new File(["diagnostic output"], "trace.txt", {
      type: "text/plain",
    });

    await uploadTicketAttachment("org-123", "ticket-123", file);

    expect(fetchMock).toHaveBeenCalledOnce();

    const [url, init] = fetchMock.mock.calls[0] as unknown as [
      string,
      RequestInit,
    ];

    expect(url).toMatch(/\/tickets\/ticket-123\/attachments$/);
    expect(init).toMatchObject({
      method: "POST",
      credentials: "include",
      headers: {
        Accept: "application/json",
        "x-organization-id": "org-123",
      },
    });

    expect(init.body).toBeInstanceOf(FormData);
    expect((init.body as FormData).get("file")).toBe(file);

    // The browser sets the multipart Content-Type and boundary.
    expect(init.headers).not.toHaveProperty("Content-Type");
  });

  it("surfaces attachment upload failures", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({
        message: "File type is not supported",
      }),
    } as Response);

    vi.stubGlobal("fetch", fetchMock);

    const file = new File(["data"], "trace.txt", {
      type: "text/plain",
    });

    await expect(
      uploadTicketAttachment("org-123", "ticket-123", file),
    ).rejects.toThrow("File type is not supported");
  });
});

describe("ticket attachment listing and download API", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("lists attachments using the authenticated organization context", async () => {
    const attachments = [
      {
        id: "attachment-1",
        ticketId: "ticket-123",
        uploadedById: "user-123",
        fileName: "error-log.txt",
        mimeType: "text/plain",
        size: 120,
        createdAt: "2026-10-12T08:00:00.000Z",
        uploadedBy: {
          id: "user-123",
          name: "Test User",
          email: "test@example.com",
        },
      },
    ];

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => attachments,
    } as Response);

    vi.stubGlobal("fetch", fetchMock);

    const result = await getTicketAttachments("org-123", "ticket-123");

    expect(result).toEqual(attachments);

    const [url, init] = fetchMock.mock.calls[0] as unknown as [
      string,
      RequestInit,
    ];

    expect(url).toMatch(/\/tickets\/ticket-123\/attachments$/);
    expect(init).toMatchObject({
      method: "GET",
      credentials: "include",
      headers: {
        Accept: "application/json",
        "x-organization-id": "org-123",
      },
    });
  });

  it("downloads attachment contents with organization context", async () => {
    const expectedBlob = new Blob(["example log content"], {
      type: "text/plain",
    });

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      blob: async () => expectedBlob,
    } as Response);

    vi.stubGlobal("fetch", fetchMock);

    const result = await downloadTicketAttachment(
      "org-123",
      "ticket-123",
      "attachment-1",
    );

    expect(result).toBe(expectedBlob);

    const [url, init] = fetchMock.mock.calls[0] as unknown as [
      string,
      RequestInit,
    ];

    expect(url).toMatch(/\/tickets\/ticket-123\/attachments\/attachment-1$/);
    expect(init).toMatchObject({
      method: "GET",
      credentials: "include",
      headers: {
        "x-organization-id": "org-123",
      },
    });
  });
});
