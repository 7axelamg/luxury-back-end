import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Req,
  UseGuards,
} from '@nestjs/common';
import { UsersService, CreateUserDto, UpdateUserDto } from './users.service';
import { SuperAdminGuard } from '../auth/super-admin.guard';

@Controller('users')
@UseGuards(SuperAdminGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  /** GET /users — Lista todos los usuarios con su sede */
  @Get()
  async findAll() {
    return this.usersService.findAll();
  }

  /** GET /users/audit-logs — Obtiene el historial de asignaciones de roles */
  @Get('audit-logs')
  async getAuditLogs() {
    return this.usersService.getRoleAuditLogs();
  }

  /** GET /users/:id — Obtiene un usuario por ID */
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  /** POST /users — Registra un nuevo usuario */
  @Post()
  async create(@Body() dto: CreateUserDto, @Req() req: any) {
    return this.usersService.createUser(dto, req.user);
  }

  /** PATCH /users/:id — Actualiza datos del usuario o sede */
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
    @Req() req: any,
  ) {
    return this.usersService.updateUser(id, dto, req.user);
  }

  /** POST /users/:id/reset-password — Restablece contraseña temporal */
  @Post(':id/reset-password')
  async resetPassword(@Param('id') id: string, @Req() req: any) {
    return this.usersService.resetPassword(id, req.user);
  }

  /** POST /users/:id/restablecer-password — Alias para restablecer contraseña temporal */
  @Post(':id/restablecer-password')
  async restablecerPassword(@Param('id') id: string, @Req() req: any) {
    return this.usersService.resetPassword(id, req.user);
  }

  /** DELETE /users/:id — Desactiva usuario (nunca borrar, solo desactivar) */
  @Delete(':id')
  async delete(@Param('id') id: string) {
    return this.usersService.deactivate(id);
  }

  /** PATCH /users/:id/deactivate — Desactiva un usuario */
  @Patch(':id/deactivate')
  async deactivate(@Param('id') id: string) {
    return this.usersService.deactivate(id);
  }

  /** PATCH /users/:id/activate — Reactiva un usuario */
  @Patch(':id/activate')
  async activate(@Param('id') id: string) {
    return this.usersService.activate(id);
  }
}
