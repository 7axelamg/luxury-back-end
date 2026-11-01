import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface AuthUserPayload {
  id: string;
  userId?: string;
  username: string;
  role: string;
  rol?: string;
  sedeId?: string | null;
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
            id: payload.sub || payload.userId,
            userId: payload.userId || payload.sub,
            username: payload.username,
            role: payload.role || payload.rol,
            rol: payload.rol || payload.role,
            sedeId: payload.sedeId || null,
          };
        }
      } catch {
        // En caso de token malformado
      }
    }

    return null;
  },
);
