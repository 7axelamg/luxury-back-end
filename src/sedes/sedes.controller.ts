import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { SedesService } from './sedes.service';
import { CreateSedeDto } from './dto/create-sede.dto';
import { UpdateSedeDto } from './dto/update-sede.dto';
import { SuperAdminGuard } from '../auth/super-admin.guard';

@Controller('sedes')
@UseGuards(SuperAdminGuard)
export class SedesController {
  constructor(private readonly sedesService: SedesService) {}

  @Get()
  async findAll() {
    return this.sedesService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.sedesService.findOne(id);
  }

  @Post()
  async create(@Body() dto: CreateSedeDto) {
    return this.sedesService.create(dto);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateSedeDto) {
    return this.sedesService.update(id, dto);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.sedesService.deactivate(id);
  }

  @Patch(':id/deactivate')
  async deactivate(@Param('id') id: string) {
    return this.sedesService.deactivate(id);
  }

  @Patch(':id/activate')
  async activate(@Param('id') id: string) {
    return this.sedesService.activate(id);
  }
}
