import {
  createParamDecorator,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';

import type { Request } from 'express';

import type { AuthContext, CurrentUser as CurrentUserType } from './auth.types';

type AuthenticatedRequest = Request & {
  auth?: AuthContext;
};

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): CurrentUserType => {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();

    if (!request.auth?.user) {
      throw new UnauthorizedException('Authentication required');
    }

    return request.auth.user;
  },
);
