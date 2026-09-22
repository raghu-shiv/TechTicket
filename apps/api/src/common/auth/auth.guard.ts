import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';

import type { Request } from 'express';

import { AuthContextService } from './auth-context.service';
import type { AuthContext } from './auth.types';

export const AUTH_CONTEXT_KEY = 'auth';

type AuthenticatedRequest = Request & {
  auth?: AuthContext;
};

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly authContext: AuthContextService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();

    const authContext = await this.authContext.getContext(request.headers);

    request[AUTH_CONTEXT_KEY] = authContext;

    return true;
  }
}
