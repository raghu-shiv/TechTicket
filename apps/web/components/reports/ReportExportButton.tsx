"use client";

import { useState } from "react";

import { useOrganizations } from "@/hooks/use-organizations";

export type ExportReportName =
  | "dashboard"
  | "foundation"
  | "products"
  | "sla"
  | "tat"
  | "ticket-library"
  | "employees"
  | "usage";

type ExportFormat = "csv" | "json";

type ExportParams = Record<string, string | number | boolean | undefined>;

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

export function ReportExportButton({
  report,
  params = {},
  disabled = false,
}: {
  report: ExportReportName;
  params?: ExportParams;
  disabled?: boolean;
}) {
  const organization = useOrganizations();
  const organizationId = organization.data?.[0]?.organizationId;

  const [format, setFormat] = useState<ExportFormat>("csv");
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function downloadExport() {
    if (!organizationId || exporting || disabled) return;

    setExporting(true);
    setError(null);

    try {
      const search = new URLSearchParams();
      search.set("format", format);

      for (const [key, value] of Object.entries(params)) {
        if (value !== undefined && value !== "") {
          search.set(key, String(value));
        }
      }

      const url = new URL(`${API_BASE_URL}/reports/analytics/export/${report}`);
      url.search = search.toString();

      const response = await fetch(url.toString(), {
        method: "GET",
        credentials: "include",
        headers: {
          Accept: format === "json" ? "application/json" : "text/csv",
          "x-organization-id": organizationId,
        },
        cache: "no-store",
      });

      if (!response.ok) {
        let message = `Export failed (${response.status})`;

        try {
          const body = (await response.json()) as {
            message?: string | string[];
          };

          if (Array.isArray(body.message)) {
            message = body.message.join(", ");
          } else if (body.message) {
            message = body.message;
          }
        } catch {
          // Keep the status-based fallback.
        }

        throw new Error(message);
      }

      const blob = await response.blob();
      const disposition = response.headers.get("content-disposition");
      const filenameMatch = disposition?.match(/filename="([^"]+)"/i);
      const filename = filenameMatch?.[1] ?? `techticket-${report}.${format}`;

      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement("a");

      anchor.href = objectUrl;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(objectUrl);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Unable to export this report.",
      );
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="space-y-2 report-export-control">
      <div className="flex flex-wrap items-center gap-2">
        <label className="sr-only" htmlFor={`export-format-${report}`}>
          Export format
        </label>

        <select
          id={`export-format-${report}`}
          aria-label="Export format"
          className="report-control"
          value={format}
          onChange={(event) => setFormat(event.target.value as ExportFormat)}
          disabled={exporting || disabled}
        >
          <option value="csv">CSV</option>
          <option value="json">JSON</option>
        </select>

        <button
          type="button"
          className="report-export-button"
          onClick={() => void downloadExport()}
          disabled={
            exporting || disabled || organization.isLoading || !organizationId
          }
        >
          {exporting ? "Preparing export…" : "Export report"}
        </button>
      </div>

      {error && (
        <p
          role="alert"
          className="rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2.5 text-sm text-destructive"
        >
          {error}
        </p>
      )}
    </div>
  );
}
