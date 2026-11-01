import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import * as jwt from 'jsonwebtoken';

@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers?.authorization;

    let user = request.user;
    if (!user && authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      try {
        const decoded: any = jwt.verify(
          token,
          process.env.JWT_SECRET || 'luxury_secret_key_2026',
        );
        user = {
          id: decoded.sub || decoded.userId,
          userId: decoded.userId || decoded.sub,
          username: decoded.username,
          role: decoded.role || decoded.rol,
          rol: decoded.rol || decoded.role,
          sedeId: decoded.sedeId || null,
        };
        request.user = user;
      } catch {
        throw new UnauthorizedException('Token inválido o expirado');
      }
    }

    if (!user) {
      throw new UnauthorizedException('No autenticado. Inicie sesión para acceder.');
    }

    const role = (user.role || user.rol || '').toUpperCase();
    if (role === 'SUPER_ADMIN') {
      return true;
    }

    throw new ForbiddenException(
      'Acceso denegado: Se requiere rol de SUPER_ADMIN.',
    );
  }
}
