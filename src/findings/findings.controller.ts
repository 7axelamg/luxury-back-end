import { Controller, Get, Post, Patch, Delete, Body, Param } from '@nestjs/common';
import { FindingsService } from './findings.service';

@Controller()
export class FindingsController {
  constructor(private readonly findingsService: FindingsService) {}

  /** GET /orders/:id/findings — lista los hallazgos de una orden */
  @Get('orders/:orderId/findings')
  findByOrder(@Param('orderId') orderId: string) {
    return this.findingsService.findByOrder(orderId);
  }

  /** POST /orders/:id/findings — crea un hallazgo nuevo en una orden */
  @Post('orders/:orderId/findings')
  create(
    @Param('orderId') orderId: string,
    @Body() dto: any,
  ) {
    return this.findingsService.create(orderId, dto);
  }

  /** PATCH /findings/:id — actualiza estado, precio, notas de un hallazgo */
  @Patch('findings/:id')
  update(@Param('id') id: string, @Body() dto: any) {
    return this.findingsService.update(id, dto);
  }

  /** DELETE /findings/:id — elimina un hallazgo (solo admin) */
  @Delete('findings/:id')
  remove(@Param('id') id: string) {
    return this.findingsService.remove(id);
  }
}
