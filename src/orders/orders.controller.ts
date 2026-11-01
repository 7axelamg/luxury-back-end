import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Put,
  Query,
} from '@nestjs/common';
import { OrdersService } from './orders.service';
import { CurrentUser, AuthUserPayload } from '../auth/current-user.decorator';

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get()
  findAll(
    @CurrentUser() user: AuthUserPayload | null,
    @Query('sedeId') sedeId?: string,
  ) {
    return this.ordersService.findAll(user, sedeId);
  }

  @Get(':id')
  findOne(
    @Param('id') id: string,
    @CurrentUser() user: AuthUserPayload | null,
  ) {
    return this.ordersService.findOne(id, user);
  }

  /** GET /orders/:id/history — Historial completo de acciones con nombre del usuario */
  @Get(':id/history')
  getOrderHistory(@Param('id') id: string) {
    return this.ordersService.getOrderHistory(id);
  }

  /** POST /orders/:id/history — Registra una acción individual */
  @Post(':id/history')
  logAction(
    @Param('id') id: string,
    @Body() dto: { etapa: number; accion: string; detalle?: string },
    @CurrentUser() user: AuthUserPayload | null,
  ) {
    return this.ordersService.logAction(id, dto, user);
  }

  @Post('seed-sample-orders')
  seedSampleOrders() {
    return this.ordersService.seedSampleOrders();
  }

  @Post()
  create(
    @Body() createOrderDto: any,
    @CurrentUser() user: AuthUserPayload | null,
  ) {
    return this.ordersService.create(createOrderDto, user);
  }

  @Put(':id/advance')
  advanceStep(
    @Param('id') id: string,
    @Body() body: { notificar?: boolean; motivo?: string; itemsPorCotizar?: number; hayItemsPorCotizar?: boolean },
    @CurrentUser() user: AuthUserPayload | null,
  ) {
    return this.ordersService.advanceStep(id, user, body);
  }

  @Put(':id/cotizacion-doc')
  updateCotizacionDoc(@Param('id') id: string, @Body() doc: any) {
    return this.ordersService.updateCotizacionDoc(id, doc);
  }

  @Put(':id/set-step')
  setStep(
    @Param('id') id: string,
    @Body('step') step: number,
    @CurrentUser() user: AuthUserPayload | null,
  ) {
    return this.ordersService.setStep(id, Number(step), user);
  }
}
