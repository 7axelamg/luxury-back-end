import { Controller, Post, Body, Req, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  async login(
    @Body('username') username: string,
    @Body('password') password: string,
  ) {
    return this.authService.login(username, password);
  }

  @Post('change-password')
  async changePassword(
    @Body('username') username: string,
    @Body('currentPassword') currentPassword: string,
    @Body('passwordActual') passwordActual: string,
    @Body('newPassword') newPassword: string,
    @Body('nuevaPassword') nuevaPassword: string,
    @Req() req: any,
  ) {
    const userIdentifier = username || req.user?.username || req.user?.id;
    if (!userIdentifier) {
      throw new UnauthorizedException('Debe indicar el usuario o iniciar sesión para cambiar la contraseña');
    }

    const current = currentPassword || passwordActual;
    const next = newPassword || nuevaPassword;
    return this.authService.changePassword(userIdentifier, current, next);
  }

  @Post('cambiar-password')
  async cambiarPassword(
    @Body('username') username: string,
    @Body('currentPassword') currentPassword: string,
    @Body('passwordActual') passwordActual: string,
    @Body('newPassword') newPassword: string,
    @Body('nuevaPassword') nuevaPassword: string,
    @Req() req: any,
  ) {
    return this.changePassword(
      username,
      currentPassword,
      passwordActual,
      newPassword,
      nuevaPassword,
      req,
    );
  }
}
