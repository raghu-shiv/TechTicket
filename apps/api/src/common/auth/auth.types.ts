import type { Session, User } from 'better-auth/types';

export interface AuthenticatedRequest {
  user: User;
  session: Session;
}

export interface CurrentUser {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
}

export interface CurrentSession {
  id: string;
  userId: string;
  expiresAt: Date;
}

export interface AuthContext {
  user: CurrentUser;
  session: CurrentSession;
  organization?: AuthOrganizationContext;
}

export interface AuthOrganizationContext {
  userId: string;
  organizationId: string;
  role: 'OWNER' | 'ADMIN' | 'AGENT' | 'REQUESTER';
}
