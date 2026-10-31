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

  async validate(payload: { sub: string; username: string; role: string }) {
    const user = await this.authService.validateUserById(payload.sub);
    return user ? { id: payload.sub, username: payload.username, role: payload.role } : null;
  }
}
