import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface AuthUserPayload {
  id: string;
  username: string;
  role: string;
}

export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): AuthUserPayload | null => {
    const request = ctx.switchToHttp().getRequest();
    if (request.user) {
      return request.user;
    }

    const authHeader = request.headers?.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.substring(7);
        const parts = token.split('.');
        if (parts.length === 3) {
          const payloadJson = Buffer.from(parts[1], 'base64').toString('utf8');
          const payload = JSON.parse(payloadJson);
          return {
            id: payload.sub,
            username: payload.username,
            role: payload.role,
          };
        }
      } catch {
        // En caso de token malformado
      }
    }

    return null;
  },
);
