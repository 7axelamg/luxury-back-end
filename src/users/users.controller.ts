import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Req,
  UseGuards,
} from '@nestjs/common';
import { UsersService, CreateUserDto, UpdateUserDto } from './users.service';
import { AdminGuard } from '../auth/admin.guard';

@Controller('users')
@UseGuards(AdminGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  /** GET /users — Lista todos los empleados/usuarios */
  @Get()
  async findAll() {
    return this.usersService.findAll();
  }

  /** GET /users/audit-logs — Obtiene el historial de asignaciones de roles */
  @Get('audit-logs')
  async getAuditLogs() {
    return this.usersService.getRoleAuditLogs();
  }

  /** GET /users/:id — Obtiene un empleado por ID */
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  /** POST /users — Registra un nuevo empleado */
  @Post()
  async create(@Body() dto: CreateUserDto, @Req() req: any) {
    return this.usersService.createUser(dto, req.user);
  }

  /** PATCH /users/:id — Actualiza datos del empleado o rol */
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
    @Req() req: any,
  ) {
    return this.usersService.updateUser(id, dto, req.user);
  }

  /** PATCH /users/:id/deactivate — Desactiva un empleado */
  @Patch(':id/deactivate')
  async deactivate(@Param('id') id: string) {
    return this.usersService.deactivate(id);
  }

  /** PATCH /users/:id/activate — Reactiva un empleado */
  @Patch(':id/activate')
  async activate(@Param('id') id: string) {
    return this.usersService.activate(id);
  }
}
