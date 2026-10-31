import { Controller, Get, Post, Body, Param, Put } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { CurrentUser, AuthUserPayload } from '../auth/current-user.decorator';

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get()
  findAll() {
    return this.ordersService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.ordersService.findOne(id);
  }

  /** GET /orders/:id/history — Historial completo de acciones con nombre del usuario */
  @Get(':id/history')
  getOrderHistory(@Param('id') id: string) {
    return this.ordersService.getOrderHistory(id);
  }

  /** POST /orders/:id/history — Registra una acción individual (ej: ítem marcado en etapa 3) */
  @Post(':id/history')
  logAction(
    @Param('id') id: string,
    @Body() dto: { etapa: number; accion: string; detalle?: string },
    @CurrentUser() user: AuthUserPayload | null,
  ) {
    return this.ordersService.logAction(id, dto, user?.id);
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
    return this.ordersService.create(createOrderDto, user?.id);
  }

  @Put(':id/advance')
  advanceStep(
    @Param('id') id: string,
    @CurrentUser() user: AuthUserPayload | null,
  ) {
    return this.ordersService.advanceStep(id, user?.id);
  }

  @Put(':id/cotizacion-doc')
  updateCotizacionDoc(@Param('id') id: string, @Body() doc: any) {
    return this.ordersService.updateCotizacionDoc(id, doc);
  }

  @Put(':id/set-step')
  setStep(@Param('id') id: string, @Body('step') step: number) {
    return this.ordersService.setStep(id, Number(step));
  }
}
