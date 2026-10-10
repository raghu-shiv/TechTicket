import { IsOptional, IsString } from 'class-validator';

import { AnalyticsQueryDto } from './analytics-query.dto';

/**
 * Employee dashboard filters. Date and ticket-dimension validation is reused
 * from the Analytics query contract; employee selection is checked against
 * the active organization's AGENT memberships in the service.
 */
export class EmployeeDashboardQueryDto extends AnalyticsQueryDto {
  @IsOptional()
  @IsString()
  employeeId?: string;
}
