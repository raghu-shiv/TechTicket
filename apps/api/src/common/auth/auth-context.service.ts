import { Injectable, UnauthorizedException } from '@nestjs/common';

import type { IncomingHttpHeaders } from 'node:http';

import { auth } from '../../auth/auth';
import type { AuthContext } from './auth.types';

@Injectable()
export class AuthContextService {
  async getContext(headers: IncomingHttpHeaders): Promise<AuthContext> {
    const requestHeaders = new Headers();

    for (const [key, value] of Object.entries(headers)) {
      if (value === undefined) {
        continue;
      }

      requestHeaders.set(key, Array.isArray(value) ? value.join(', ') : value);
    }

    const result = await auth.api.getSession({
      headers: requestHeaders,
    });

    if (!result) {
      throw new UnauthorizedException('Authentication required');
    }

    return {
      user: {
        id: result.user.id,
        name: result.user.name,
        email: result.user.email,
        emailVerified: result.user.emailVerified,
      },
      session: {
        id: result.session.id,
        userId: result.session.userId,
        expiresAt: result.session.expiresAt,
      },
    };
  }
}
