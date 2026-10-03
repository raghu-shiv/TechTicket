export const SLA_PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const;

export type SlaPriority = (typeof SLA_PRIORITIES)[number];

export interface SlaPolicyTarget {
  id: string;
  priority: SlaPriority;
  firstResponseMinutes: number;
  resolutionMinutes: number;
}

export interface SlaPolicy {
  id: string;
  name: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  targets: SlaPolicyTarget[];
}

export type SlaPoliciesResponse = SlaPolicy[];
