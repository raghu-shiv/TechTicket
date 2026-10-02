import type { SavedFilterDefinition } from '../saved-filter.types';

export interface SavedFilterResponse {
  id: string;
  organizationId: string;
  userId: string;
  name: string;
  description: string | null;
  filters: SavedFilterDefinition;
  createdAt: string;
  updatedAt: string;
}
