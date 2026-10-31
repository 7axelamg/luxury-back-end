import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/user.entity';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly jwtService: JwtService,
  ) {}

  async login(username: string, password: string) {
    const user = await this.userRepo.findOne({ where: { username } });
    if (!user) {
      throw new UnauthorizedException('Credenciales incorrectas');
    }
    const valid = await user.checkPassword(password);
    if (!valid) {
      throw new UnauthorizedException('Credenciales incorrectas');
    }

    if (user.activo === false) {
      throw new UnauthorizedException(
        'Este usuario se encuentra inactivo. Comuníquese con la administración del taller.',
      );
    }

    const payload = { sub: user.id, username: user.username, role: user.role };
    const token = this.jwtService.sign(payload);

    return {
      access_token: token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
      },
    };
  }

  async validateUserById(id: string): Promise<User | null> {
    return this.userRepo.findOne({ where: { id } });
  }
}
