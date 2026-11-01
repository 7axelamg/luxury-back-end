import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AuthService } from './auth.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly authService: AuthService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'luxury_secret_key_2026',
    });
  }

  async validate(payload: {
    sub?: string;
    userId?: string;
    username: string;
    role?: string;
    rol?: string;
    sedeId?: string | null;
  }) {
    const id = payload.sub || payload.userId;
    if (!id) return null;

    const user = await this.authService.validateUserById(id);
    return user
      ? {
          id: user.id,
          userId: user.id,
          username: user.username,
          role: user.role,
          rol: user.role,
          sedeId: user.sedeId || null,
        }
      : null;
  }
}
