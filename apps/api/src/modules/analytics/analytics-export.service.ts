import { BadRequestException, Injectable } from '@nestjs/common';
import { plainToInstance, type ClassConstructor } from 'class-transformer';
import { validate } from 'class-validator';
import { Readable } from 'node:stream';

import type { OrganizationContext } from '../../common/organization/organization.types';

import { AnalyticsQueryDto } from './dto/analytics-query.dto';
import { EmployeeDashboardQueryDto } from './dto/employee-dashboard-query.dto';
import { TatReportQueryDto } from './dto/tat-report-query.dto';
import { TicketLibraryReportQueryDto } from './dto/ticket-library-report-query.dto';
import { UsageReportQueryDto } from './dto/usage-report-query.dto';

import { AnalyticsService } from './analytics.service';
import { EmployeeDashboardService } from './employee-dashboard.service';
import { TicketLibraryReportsService } from './ticket-library-reports.service';
import { UsageReportService } from './usage-report.service';

export const EXPORT_REPORTS = [
  'dashboard',
  'foundation',
  'products',
  'sla',
  'tat',
  'ticket-library',
  'employees',
  'usage',
] as const;

export type ExportReport = (typeof EXPORT_REPORTS)[number];
export type ExportFormat = 'csv' | 'json';

type ExportQueryDto =
  | AnalyticsQueryDto
  | TatReportQueryDto
  | TicketLibraryReportQueryDto
  | EmployeeDashboardQueryDto
  | UsageReportQueryDto;

interface ExportResult {
  filename: string;
  contentType: string;
  stream: Readable;
}

type CsvRow = [string, string, string, unknown];

const REPORT_DTO: Record<ExportReport, ClassConstructor<object>> = {
  dashboard: AnalyticsQueryDto,
  foundation: AnalyticsQueryDto,
  products: AnalyticsQueryDto,
  sla: AnalyticsQueryDto,
  tat: TatReportQueryDto,
  'ticket-library': TicketLibraryReportQueryDto,
  employees: EmployeeDashboardQueryDto,
  usage: UsageReportQueryDto,
};

function isExportReport(value: string): value is ExportReport {
  return (EXPORT_REPORTS as readonly string[]).includes(value);
}

function isExportFormat(value: unknown): value is ExportFormat {
  return value === 'csv' || value === 'json';
}

function csvCell(value: unknown): string {
  let text: string;

  if (value === null || value === undefined) {
    text = '';
  } else if (value instanceof Date) {
    text = value.toISOString();
  } else if (typeof value === 'object') {
    text = JSON.stringify(value) ?? '';
  } else {
    text = String(value);
  }

  // Avoid spreadsheet formula execution for untrusted string values.
  if (typeof value === 'string' && /^[\t\r ]*[=+\-@]/.test(text)) {
    text = `'${text}`;
  }

  return `"${text.replace(/"/g, '""')}"`;
}

function* flattenRecord(
  section: string,
  recordIndex: string,
  value: unknown,
  field = '',
): Generator<CsvRow> {
  if (value instanceof Date) {
    yield [section, recordIndex, field || 'value', value.toISOString()];
    return;
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      yield [section, recordIndex, field || 'value', '[]'];
      return;
    }

    for (let index = 0; index < value.length; index += 1) {
      const nestedField = field ? `${field}[${index}]` : `[${index}]`;

      yield* flattenRecord(section, recordIndex, value[index], nestedField);
    }

    return;
  }

  if (value !== null && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>).filter(
      ([, child]) => child !== undefined,
    );

    if (entries.length === 0) {
      yield [section, recordIndex, field || 'value', '{}'];
      return;
    }

    for (const [key, child] of entries) {
      const nestedField = field ? `${field}.${key}` : key;

      yield* flattenRecord(section, recordIndex, child, nestedField);
    }

    return;
  }

  yield [section, recordIndex, field || 'value', value];
}

function* csvChunks(payload: unknown): Generator<string> {
  // UTF-8 BOM improves compatibility with common spreadsheet software.
  yield '\uFEFFsection,recordIndex,field,value\r\n';

  if (payload === null || typeof payload !== 'object') {
    yield `${csvCell('data')},${csvCell('')},${csvCell('value')},${csvCell(payload)}\r\n`;
    return;
  }

  for (const [section, value] of Object.entries(
    payload as Record<string, unknown>,
  )) {
    if (value === undefined) continue;

    if (Array.isArray(value)) {
      if (value.length === 0) {
        yield [section, '', 'value', '[]'].map(csvCell).join(',') + '\r\n';
        continue;
      }

      for (let index = 0; index < value.length; index += 1) {
        for (const row of flattenRecord(section, String(index), value[index])) {
          yield row.map(csvCell).join(',') + '\r\n';
        }
      }

      continue;
    }

    for (const row of flattenRecord(section, '', value)) {
      yield row.map(csvCell).join(',') + '\r\n';
    }
  }
}

function* jsonChunks(value: unknown): Generator<string> {
  if (value instanceof Date) {
    yield JSON.stringify(value.toISOString());
    return;
  }

  if (Array.isArray(value)) {
    yield '[';

    for (let index = 0; index < value.length; index += 1) {
      if (index > 0) yield ',';
      yield* jsonChunks(value[index]);
    }

    yield ']';
    return;
  }

  if (value !== null && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>).filter(
      ([, child]) => child !== undefined,
    );

    yield '{';

    for (let index = 0; index < entries.length; index += 1) {
      const [key, child] = entries[index];

      if (index > 0) yield ',';

      yield JSON.stringify(key);
      yield ':';
      yield* jsonChunks(child);
    }

    yield '}';
    return;
  }

  yield JSON.stringify(value) ?? 'null';
}

@Injectable()
export class AnalyticsExportService {
  constructor(
    private readonly analyticsService: AnalyticsService,
    private readonly employeeDashboardService: EmployeeDashboardService,
    private readonly ticketLibraryReportsService: TicketLibraryReportsService,
    private readonly usageReportService: UsageReportService,
  ) {}

  async createExport(
    context: OrganizationContext,
    reportValue: string,
    rawQuery: Record<string, unknown>,
  ): Promise<ExportResult> {
    if (!isExportReport(reportValue)) {
      throw new BadRequestException(
        `Unsupported report. Allowed reports: ${EXPORT_REPORTS.join(', ')}`,
      );
    }

    const formatValue = rawQuery.format ?? 'csv';

    if (!isExportFormat(formatValue)) {
      throw new BadRequestException('format must be either csv or json');
    }

    const { format: _format, ...filters } = rawQuery;

    const dto = await this.validateQuery(reportValue, filters);
    const payload = await this.getReportPayload(context, reportValue, dto);

    const extension = formatValue;
    const date = new Date().toISOString().slice(0, 10);
    const filename = `techticket-${reportValue}-${date}.${extension}`;

    if (formatValue === 'json') {
      return {
        filename,
        contentType: 'application/json; charset=utf-8',
        stream: Readable.from(jsonChunks(payload)),
      };
    }

    return {
      filename,
      contentType: 'text/csv; charset=utf-8',
      stream: Readable.from(csvChunks(payload)),
    };
  }

  private async validateQuery(
    report: ExportReport,
    filters: Record<string, unknown>,
  ): Promise<ExportQueryDto> {
    const DtoClass = REPORT_DTO[report];
    const dto = plainToInstance(DtoClass, filters);

    const errors = await validate(dto, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });

    if (errors.length > 0) {
      const messages = errors.flatMap((error) =>
        Object.values(error.constraints ?? {}),
      );

      throw new BadRequestException(
        messages.length > 0 ? messages : 'Invalid export filters',
      );
    }

    return dto as ExportQueryDto;
  }

  private async getReportPayload(
    context: OrganizationContext,
    report: ExportReport,
    dto: ExportQueryDto,
  ): Promise<unknown> {
    switch (report) {
      case 'dashboard':
        return this.analyticsService.getDashboard(
          context,
          dto as AnalyticsQueryDto,
        );

      case 'foundation':
        return this.analyticsService.getFoundation(
          context,
          dto as AnalyticsQueryDto,
        );

      case 'products':
        return this.analyticsService.getProductAnalytics(
          context,
          dto as AnalyticsQueryDto,
        );

      case 'sla':
        return this.analyticsService.getSlaReport(
          context,
          dto as AnalyticsQueryDto,
        );

      case 'tat':
        return this.analyticsService.getTatReport(
          context,
          dto as TatReportQueryDto,
        );

      case 'ticket-library':
        return this.ticketLibraryReportsService.getReport(
          context,
          dto as TicketLibraryReportQueryDto,
        );

      case 'employees':
        return this.employeeDashboardService.getDashboard(
          context,
          dto as EmployeeDashboardQueryDto,
        );

      case 'usage':
        return this.usageReportService.getReport(
          context,
          dto as UsageReportQueryDto,
        );
    }
  }
}
