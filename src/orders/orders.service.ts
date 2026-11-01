import { Injectable, NotFoundException, BadRequestException, ForbiddenException, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order } from './order.entity';
import { Customer } from '../customers/customer.entity';
import { Vehicle } from '../vehicles/vehicle.entity';
import { HistorialAccion } from './historial-accion.entity';
import { User } from '../users/user.entity';
import { Sede } from '../sedes/sede.entity';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class OrdersService implements OnModuleInit {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
    @InjectRepository(Customer)
    private readonly customerRepo: Repository<Customer>,
    @InjectRepository(Vehicle)
    private readonly vehicleRepo: Repository<Vehicle>,
    @InjectRepository(HistorialAccion)
    private readonly historyRepo: Repository<HistorialAccion>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Sede)
    private readonly sedeRepo: Repository<Sede>,
  ) {}

  /** Inicializa nombres descriptivos en usuarios si están vacíos */
  async onModuleInit() {
    try {
      const userNames: Record<string, string> = {
        recepcion: 'Alejandro Gómez',
        jefe_patio: 'Manuel Torres',
        tecnico: 'Carlos Ruiz',
        lubricador: 'David Silva',
        gerente: 'Roberto Gómez',
        admin: 'Administrador General',
      };

      for (const [uname, nombre] of Object.entries(userNames)) {
        const u = await this.userRepo.findOne({ where: { username: uname } });
        if (u && !u.nombre) {
          u.nombre = nombre;
          await this.userRepo.save(u);
        }
      }
    } catch (e) {
      // Ignorar errores menores de inicialización si la DB está sincronizando
    }
  }

  /**
   * Visibilidad de órdenes según rol:
   * - RECEPCIONISTA, JEFE_DE_PATIO, TECNICO y LUBRICADOR ven solo órdenes de su sede.
   * - GERENTE_COMERCIAL, ADMINISTRADOR y SUPER_ADMIN ven todas, con filtro opcional por sede.
   */
  async findAll(user?: any, filterSedeId?: string): Promise<any[]> {
    const role = (user?.role || user?.rol || '').toUpperCase().trim().replace(/[\s-]+/g, '_');
    const operativeRoles = ['RECEPCIONISTA', 'JEFE_DE_PATIO', 'TECNICO', 'LUBRICADOR'];
    const adminRoles = ['GERENTE_COMERCIAL', 'ADMINISTRADOR', 'SUPER_ADMIN', 'ADMIN'];

    const where: any = {};

    if (user && operativeRoles.includes(role)) {
      const userSedeId = user.sedeId || (await this.getUserSedeId(user.id || user.userId));
      where.sede_id = userSedeId || '__SIN_SEDE__';
    } else if (adminRoles.includes(role) || !user) {
      if (filterSedeId && filterSedeId.trim()) {
        where.sede_id = filterSedeId.trim();
      }
    }

    const orders = await this.orderRepo.find({
      where,
      relations: {
        customer: true,
        vehicle: true,
        sede: true,
        recibidoPor: true,
        recepcionista: true,
        responsable_etapa1: true,
        responsable_etapa2: true,
        responsable_etapa3: true,
        responsable_etapa4: true,
        responsable_etapa5: true,
      },
      order: { fecha_ingreso: 'DESC' },
    });
    return orders.map((o) => this.mapToDto(o));
  }

  async findOne(id: string, user?: any): Promise<any> {
    const order = await this.orderRepo.findOne({
      where: { id },
      relations: {
        customer: true,
        vehicle: true,
        sede: true,
        recibidoPor: true,
        recepcionista: true,
        responsable_etapa1: true,
        responsable_etapa2: true,
        responsable_etapa3: true,
        responsable_etapa4: true,
        responsable_etapa5: true,
      },
    });
    if (!order) throw new NotFoundException(`Orden ${id} no encontrada`);

    if (user) {
      const role = (user.role || user.rol || '').toUpperCase().trim().replace(/[\s-]+/g, '_');
      const operativeRoles = ['RECEPCIONISTA', 'JEFE_DE_PATIO', 'TECNICO', 'LUBRICADOR'];
      if (operativeRoles.includes(role)) {
        const userSedeId = user.sedeId || (await this.getUserSedeId(user.id || user.userId));
        if (order.sede_id && userSedeId && order.sede_id !== userSedeId) {
          throw new NotFoundException(`Orden ${id} no encontrada`);
        }
      }
    }

    return this.mapToDto(order);
  }

  /** GET /orders/:id/history — Devuelve el historial completo con nombres de usuario y sede */
  async getOrderHistory(orderId: string): Promise<any[]> {
    const items = await this.historyRepo.find({
      where: { order_id: orderId },
      relations: { user: true, sede: true },
      order: { fecha: 'ASC' },
    });

    return items.map((h) => this.formatHistoryItem(h));
  }

  /** POST /orders/:id/history — Registra una acción directa */
  async logAction(
    orderId: string,
    dto: { etapa: number; accion: string; detalle?: string },
    user?: any,
  ): Promise<any> {
    const order = await this.orderRepo.findOne({ where: { id: orderId } });
    if (!order) throw new NotFoundException(`Orden ${orderId} no encontrada`);

    const userObj = typeof user === 'object' && user !== null ? user : null;
    const userId = typeof user === 'string' ? user : (userObj?.id || userObj?.userId);
    let userSedeId = userObj?.sedeId;

    if (userId && !userSedeId) {
      userSedeId = await this.getUserSedeId(userId);
    }

    const effectiveUserId = userId || (await this.getDefaultUserForStage(dto.etapa || 3));
    const effectiveSedeId = userSedeId || order.sede_id;

    const historyItem = new HistorialAccion();
    historyItem.order_id = orderId;
    historyItem.user_id = effectiveUserId;
    historyItem.sede_id = effectiveSedeId;
    historyItem.etapa = dto.etapa || 3;
    historyItem.accion = dto.accion || 'Marcó ítem de trabajo como realizado';
    historyItem.detalle = dto.detalle || '';
    historyItem.fecha = new Date();

    const saved = await this.historyRepo.save(historyItem);
    const withRelations = await this.historyRepo.findOne({
      where: { id: saved.id },
      relations: { user: true, sede: true },
    });
    return this.formatHistoryItem(withRelations || saved);
  }

  /**
   * Crea una orden.
   * Solo requiere placa y vehículo (marca y modelo).
   * `recibidoPorId` y `sedeId` provienen SIEMPRE del JWT, nunca del body.
   */
  async create(dto: any, userOrId?: any): Promise<any> {
    const placa = (dto.placa || '').toString().trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (!placa || placa.length < 5 || placa.length > 7) {
      throw new BadRequestException('La placa debe ser alfanumérica de 5 a 6 caracteres en mayúsculas sin espacios');
    }
    const vehiculoText = (dto.vehiculo || (dto.marca || dto.modelo ? `${dto.marca || ''} ${dto.modelo || ''}`.trim() : '')).toString().trim();
    if (!vehiculoText) {
      throw new BadRequestException('El campo vehículo (marca y modelo) es obligatorio');
    }

    // 1. Cliente opcional para compatibilidad con órdenes antiguas
    let customerId: string | null = null;
    if (dto.documento && dto.nombreCliente) {
      const documento = (dto.documento || '').toString().trim();
      let customer = await this.customerRepo.findOne({ where: { cedula: documento } });
      if (!customer) {
        customer = this.customerRepo.create({
          id: uuidv4(),
          nombre: dto.nombreCliente.trim(),
          telefono: (dto.telefono || '').toString().trim(),
          cedula: documento,
        });
        await this.customerRepo.save(customer);
      }
      customerId = customer.id;
    }

    // 2. Buscar o crear vehículo
    let vehicle = await this.vehicleRepo.findOne({
      where: { placa: placa },
    });
    if (!vehicle) {
      vehicle = this.vehicleRepo.create({
        id: uuidv4(),
        customer_id: customerId,
        placa: placa,
        vehiculo: vehiculoText,
        marca: (dto.marca || vehiculoText).trim(),
        modelo: (dto.modelo || '').trim(),
        color: (dto.color || '').trim(),
        kilometraje: dto.kilometraje || 0,
      });
      await this.vehicleRepo.save(vehicle);
    } else {
      if (!vehicle.vehiculo || vehicle.vehiculo !== vehiculoText) {
        vehicle.vehiculo = vehiculoText;
        await this.vehicleRepo.save(vehicle);
      }
    }

    // 3. Resolver usuario y sede desde el JWT (NUNCA del body)
    const userObj = typeof userOrId === 'object' && userOrId !== null ? userOrId : null;
    const userId = typeof userOrId === 'string' ? userOrId : (userObj?.id || userObj?.userId);
    let userSedeId = userObj?.sedeId;

    if (userId && !userSedeId) {
      userSedeId = await this.getUserSedeId(userId);
    }

    if (!userSedeId) {
      const defaultSede = await this.sedeRepo.findOne({ where: { activa: true }, order: { created_at: 'ASC' } });
      userSedeId = defaultSede?.id || null;
    }

    const effectiveUserId = userId || (await this.getDefaultUserForStage(1));

    // 4. Crear orden con recibidoPorId y sedeId
    const orderId = dto.id || this.generateOrderId();
    const order = new Order();
    order.id = orderId;
    order.customer_id = customerId;
    order.vehicle_id = vehicle.id;
    order.vehiculo = vehiculoText;
    order.paso_actual = 1;
    order.estado = 'Recepción completada';
    order.kilometraje = dto.kilometraje || null;
    order.observaciones = dto.observaciones || '';
    order.pertenencias = dto.pertenencias || '';
    order.recibido_por_id = effectiveUserId;
    order.recepcionista_id = effectiveUserId;
    order.sede_id = userSedeId;

    const saved = await this.orderRepo.save(order);

    // 5. Insertar en historial_acciones con userId, sedeId, fecha y hora
    const historyItem = new HistorialAccion();
    historyItem.order_id = saved.id;
    historyItem.user_id = effectiveUserId;
    historyItem.sede_id = userSedeId;
    historyItem.etapa = 1;
    historyItem.accion = 'Ingresó el vehículo';
    historyItem.detalle = `Recepción de ${vehiculoText} (Placa: ${vehicle.placa})`;
    historyItem.fecha = new Date();
    await this.historyRepo.save(historyItem);

    return this.findOne(saved.id);
  }

  generateOrderId(offset: number = 0): string {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const num = Math.floor(100 + Math.random() * 899) + offset;
    return `ORD-${yyyy}${mm}${dd}-${String(num).padStart(3, '0')}`;
  }

  /**
   * Avanza etapa guardando userId, sedeId, fecha y hora desde el JWT.
   * SUPER_ADMIN puede ejecutar cualquier acción y queda registrado.
   */
  async advanceStep(
    id: string,
    user?: any,
    advanceData?: { notificar?: boolean; motivo?: string; itemsPorCotizar?: number; hayItemsPorCotizar?: boolean },
  ): Promise<any> {
    const order = await this.orderRepo.findOne({ where: { id } });
    if (!order) throw new NotFoundException(`Orden ${id} no encontrada`);

    const paso = order.paso_actual;
    let accion = '';
    let detalle = '';

    const userObj = typeof user === 'object' && user !== null ? user : null;
    const userId = typeof user === 'string' ? user : (userObj?.id || userObj?.userId);
    let userRole = userObj?.role || userObj?.rol;
    let userSedeId = userObj?.sedeId;

    if (userId && (!userRole || !userSedeId)) {
      try {
        const dbUser = await this.userRepo.findOne({ where: { id: userId } });
        if (dbUser) {
          if (!userRole) userRole = dbUser.role;
          if (!userSedeId) userSedeId = dbUser.sedeId;
        }
      } catch {
        // Ignorar si falla la consulta
      }
    }

    const normRole = (userRole || '').toUpperCase().trim().replace(/[\s-]+/g, '_');
    const isSuperAdmin = normRole === 'SUPER_ADMIN';

    // SUPER_ADMIN puede ejecutar cualquier acción
    if (!isSuperAdmin && paso === 1 && userRole) {
      const allowedRoles = ['RECEPCIONISTA', 'JEFE_DE_PATIO', 'ADMINISTRADOR', 'ADMIN'];
      if (!allowedRoles.includes(normRole)) {
        throw new ForbiddenException('Solo RECEPCIONISTA y JEFE_DE_PATIO pueden avanzar esta etapa.');
      }
    }

    const effectiveUserId = userId || (await this.getDefaultUserForStage(paso));
    const effectiveSedeId = userSedeId || order.sede_id;
    const now = new Date();

    if (paso === 1) {
      const notificar = advanceData?.notificar === true;
      const motivo = advanceData?.motivo ? advanceData.motivo.trim() : '';

      order.estado = 'Checklist Ingreso completado - Cotización & Facturación en proceso';
      order.paso_actual = 2;
      order.responsable_etapa1_id = effectiveUserId;
      order.fecha_etapa1 = now;

      if (notificar) {
        accion = 'Enviar a cotización y notificar';
        detalle = motivo
          ? `Notificación enviada a GERENTE_COMERCIAL, TECNICO y LUBRICADOR. Motivo: ${motivo}`
          : 'Notificación enviada a GERENTE_COMERCIAL, TECNICO y LUBRICADOR para proceso de cotización.';
      } else {
        accion = 'Continuar sin notificar';
        detalle = motivo ? `Motivo: ${motivo}` : 'Avanza a Cotización & Factura sin notificación.';
      }
    } else if (paso >= 2) {
      order.estado = 'Entregado y Cerrado';
      order.paso_actual = 3;
      order.fecha_cierre = now;
      order.responsable_etapa2_id = effectiveUserId;
      order.fecha_etapa2 = now;
      accion = 'Emitió Factura, Pago Confirmado y Vehículo Entregado';
      detalle = 'Liquidación final procesada, factura emitida a satisfacción y vehículo entregado al cliente';
    }

    await this.orderRepo.save(order);

    // Registro en historial_acciones con userId, sedeId, fecha y hora
    if (accion) {
      const historyItem = new HistorialAccion();
      historyItem.order_id = order.id;
      historyItem.user_id = effectiveUserId;
      historyItem.sede_id = effectiveSedeId;
      historyItem.etapa = paso;
      historyItem.accion = accion;
      historyItem.detalle = detalle;
      historyItem.fecha = now;
      await this.historyRepo.save(historyItem);
    }

    return this.findOne(id);
  }

  async setStep(id: string, step: number, user?: any): Promise<any> {
    const order = await this.orderRepo.findOne({ where: { id } });
    if (!order) throw new NotFoundException(`Orden ${id} no encontrada`);

    const userObj = typeof user === 'object' && user !== null ? user : null;
    const userId = typeof user === 'string' ? user : (userObj?.id || userObj?.userId);
    let userSedeId = userObj?.sedeId;

    if (userId && !userSedeId) {
      userSedeId = await this.getUserSedeId(userId);
    }

    const effectiveUserId = userId || (await this.getDefaultUserForStage(step));
    const effectiveSedeId = userSedeId || order.sede_id;
    const now = new Date();

    order.paso_actual = step;
    if (step === 1) order.estado = 'Recepción y Checklist de Ingreso';
    else if (step === 2) order.estado = 'Cotización Checklist & Facturación';
    else if (step >= 3) {
      order.estado = 'Entregado y Cerrado';
      order.fecha_cierre = now;
    }

    await this.orderRepo.save(order);

    const historyItem = new HistorialAccion();
    historyItem.order_id = order.id;
    historyItem.user_id = effectiveUserId;
    historyItem.sede_id = effectiveSedeId;
    historyItem.etapa = step;
    historyItem.accion = `Cambio manual de etapa a paso ${step}`;
    historyItem.detalle = `Actualización de estado a "${order.estado}"`;
    historyItem.fecha = now;
    await this.historyRepo.save(historyItem);

    return this.findOne(id);
  }

  async updateCotizacionDoc(id: string, doc: any): Promise<any> {
    const order = await this.orderRepo.findOne({ where: { id } });
    if (!order) throw new NotFoundException(`Orden ${id} no encontrada`);

    order.cotizacion_doc_nombre = doc.nombre;
    order.cotizacion_doc_url = doc.url;
    order.cotizacion_doc_fecha = doc.fecha ? new Date(doc.fecha) : new Date();

    if (doc.clienteNotificado !== undefined) order.cliente_notificado = doc.clienteNotificado;
    if (doc.canalNotificacion) order.canal_notificacion = doc.canalNotificacion;
    if (doc.decisionCliente) order.decision_cliente = doc.decisionCliente;
    if (doc.pagoAcordado !== undefined) order.pago_acordado = doc.pagoAcordado;
    if (doc.notasCliente) order.notas_cliente = doc.notasCliente;

    await this.orderRepo.save(order);
    return this.findOne(id);
  }

  private async getUserSedeId(userId: string): Promise<string | null> {
    try {
      const user = await this.userRepo.findOne({ where: { id: userId } });
      return user?.sedeId || null;
    } catch {
      return null;
    }
  }

  /** Devuelve el ID de un usuario por rol para fallback en etapas */
  private async getDefaultUserForStage(etapa: number): Promise<string | null> {
    try {
      let targetUsername = 'recepcion';
      if (etapa === 1) targetUsername = 'jefe_patio';
      else if (etapa >= 2) targetUsername = 'gerente';

      const user = await this.userRepo.findOne({ where: { username: targetUsername } });
      if (user) return user.id;

      const anyUser = await this.userRepo.findOne({ where: {} });
      return anyUser ? anyUser.id : null;
    } catch {
      return null;
    }
  }

  private formatHistoryItem(h: HistorialAccion): any {
    return {
      id: h.id,
      orderId: h.order_id,
      userId: h.user_id,
      nombreUsuario: h.user?.nombre || h.user?.username || 'Usuario del Sistema',
      username: h.user?.username || '',
      rolUsuario: h.user?.role || '',
      sedeId: h.sede_id || null,
      sedeNombre: h.sede?.nombre || '',
      etapa: h.etapa,
      accion: h.accion,
      detalle: h.detalle,
      fecha: h.fecha,
    };
  }

  // Mapa interno Order → DTO compatible con el frontend
  private mapToDto(o: Order): any {
    const vehiculoNombre =
      o.vehiculo ||
      o.vehicle?.vehiculo ||
      (o.vehicle ? `${o.vehicle.marca || ''} ${o.vehicle.modelo || ''}`.trim() : '');

    return {
      id: o.id,
      cliente: vehiculoNombre,
      documento: o.customer?.cedula || '',
      telefono: o.customer?.telefono || '',
      vehiculo: vehiculoNombre,
      placa: o.vehicle?.placa || '',
      estado: o.estado,
      pasoActual: o.paso_actual,
      kilometraje: o.kilometraje,
      observaciones: o.observaciones,
      pertenencias: o.pertenencias,
      sedeId: o.sede_id || null,
      sedeNombre: o.sede?.nombre || '',
      recibidoPorId: o.recibido_por_id || o.recepcionista_id || null,
      recibidoPor: o.recibidoPor
        ? (o.recibidoPor.nombre || o.recibidoPor.username)
        : (o.recepcionista ? (o.recepcionista.nombre || o.recepcionista.username) : 'Alejandro Gómez'),
      fechaIngreso: o.fecha_ingreso,
      fechaCierre: o.fecha_cierre,
      // Cotización
      cotizacionDoc: o.cotizacion_doc_nombre
        ? {
            nombre: o.cotizacion_doc_nombre,
            url: o.cotizacion_doc_url,
            fecha: o.cotizacion_doc_fecha,
          }
        : null,
      // Notificación
      clienteNotificado: o.cliente_notificado,
      canalNotificacion: o.canal_notificacion,
      decisionCliente: o.decision_cliente,
      pagoAcordado: o.pago_acordado,
      notasCliente: o.notas_cliente,
      // Responsables directos
      recepcionista: o.recepcionista ? (o.recepcionista.nombre || o.recepcionista.username) : 'Alejandro Gómez',
      recepcionistaId: o.recepcionista_id,
      responsableEtapa1: o.responsable_etapa1 ? (o.responsable_etapa1.nombre || o.responsable_etapa1.username) : null,
      responsableEtapa1Id: o.responsable_etapa1_id,
      fechaEtapa1: o.fecha_etapa1,
      responsableEtapa2: o.responsable_etapa2 ? (o.responsable_etapa2.nombre || o.responsable_etapa2.username) : null,
      responsableEtapa2Id: o.responsable_etapa2_id,
      fechaEtapa2: o.fecha_etapa2,
    };
  }

  async seedSampleOrders(): Promise<any> {
    const sampleData = [
      {
        id: 'ORD-20260925-001',
        cliente: 'Sebastián Alarcón',
        documento: '1098273645',
        telefono: '+57 310 889 2211',
        placa: 'ROM-001',
        marca: 'Ferrari',
        modelo: 'Roma V8 Twin-Turbo',
        color: 'Rosso Corsa Metálico',
        kilometraje: 4200,
        pasoActual: 1,
        estado: 'Recepción y Checklist de Ingreso',
        observaciones: 'Vehículo recién ingresado. Pendiente de checklist de 6 categorías.',
        pertenencias: 'Gafas de sol Tom Ford en portagafas central, paraguas Ferrari oficial en maletero.',
      },
      {
        id: 'ORD-20260925-002',
        cliente: 'Carlos Mendoza',
        documento: '1020304050',
        telefono: '+57 311 234 5678',
        placa: 'POR-911',
        marca: 'Porsche',
        modelo: '911 GT3 RS',
        color: 'Gris Ágata Metalizado',
        kilometraje: 8500,
        pasoActual: 2,
        estado: 'Cotización Checklist & Facturación',
        observaciones: 'Checklist de ingreso aprobado. Pendiente de cotización y facturación.',
        pertenencias: 'Cargador de batería Porsche Tequipment en el maletero delantero.',
      },
      {
        id: 'ORD-20260925-003',
        cliente: 'Valeria Restrepo',
        documento: '43567890',
        telefono: '+57 315 789 0123',
        placa: 'MCL-720',
        marca: 'McLaren',
        modelo: '720S Spider',
        color: 'Naranja McLaren',
        kilometraje: 12300,
        pasoActual: 2,
        estado: 'Cotización Checklist & Facturación',
        observaciones: 'Mantenimiento preventivo y detallado cerámico por cotizar.',
        pertenencias: 'Manual de usuario y kit de herramientas original.',
      },
      {
        id: 'ORD-20260925-004',
        cliente: 'Andrés Felipe Gómez',
        documento: '71234567',
        telefono: '+57 300 456 7890',
        placa: 'URUS-88',
        marca: 'Lamborghini',
        modelo: 'Urus Performante',
        color: 'Verde Mantis',
        kilometraje: 19800,
        pasoActual: 3,
        estado: 'Entregado y Cerrado',
        observaciones: 'Factura pagada a satisfacción y vehículo entregado con paz y salvo.',
        pertenencias: 'Llave de repuesto en estuche de fibra de carbono.',
      },
    ];

    const userRecepcion = await this.userRepo.findOne({ where: { username: 'recepcion' } });
    const userJefe = await this.userRepo.findOne({ where: { username: 'jefe_patio' } });
    const userGerente = await this.userRepo.findOne({ where: { username: 'gerente' } });
    const defaultSede = await this.sedeRepo.findOne({ where: { activa: true }, order: { created_at: 'ASC' } });
    const defaultSedeId = defaultSede?.id || null;

    const results: string[] = [];
    for (const item of sampleData) {
      let customer = await this.customerRepo.findOne({ where: { cedula: item.documento } });
      if (!customer) {
        customer = this.customerRepo.create({
          id: uuidv4(),
          nombre: item.cliente,
          telefono: item.telefono,
          cedula: item.documento,
        });
        await this.customerRepo.save(customer);
      }

      let vehicle = await this.vehicleRepo.findOne({ where: { placa: item.placa } });
      if (!vehicle) {
        vehicle = this.vehicleRepo.create({
          id: uuidv4(),
          customer_id: customer.id,
          placa: item.placa,
          marca: item.marca,
          modelo: item.modelo,
          color: item.color,
          kilometraje: item.kilometraje,
        });
        await this.vehicleRepo.save(vehicle);
      }

      let order = await this.orderRepo.findOne({ where: { id: item.id } });
      if (!order) {
        order = new Order();
        order.id = item.id;
        order.customer_id = customer.id;
        order.vehicle_id = vehicle.id;
      }

      order.paso_actual = item.pasoActual;
      order.estado = item.estado;
      order.kilometraje = item.kilometraje;
      order.observaciones = item.observaciones;
      order.pertenencias = item.pertenencias;
      order.recibido_por_id = userRecepcion?.id || null;
      order.recepcionista_id = userRecepcion?.id || null;
      order.sede_id = defaultSedeId;

      const baseDate = new Date();
      if (item.pasoActual > 1) {
        order.responsable_etapa1_id = userJefe?.id || null;
        order.fecha_etapa1 = new Date(baseDate.getTime() - 2 * 3600 * 1000);
      }
      if (item.pasoActual >= 3) {
        order.responsable_etapa2_id = userGerente?.id || null;
        order.fecha_etapa2 = new Date(baseDate.getTime() - 1 * 3600 * 1000);
        order.fecha_cierre = new Date();
      }

      await this.orderRepo.save(order);

      const historyCount = await this.historyRepo.count({ where: { order_id: order.id } });
      if (historyCount === 0) {
        const hist: Partial<HistorialAccion>[] = [
          {
            order_id: order.id,
            user_id: userRecepcion?.id,
            sede_id: defaultSedeId,
            etapa: 1,
            accion: 'Ingresó el vehículo',
            detalle: `Recepción inicial de ${vehicle.marca} ${vehicle.modelo}`,
            fecha: new Date(baseDate.getTime() - 3 * 3600 * 1000),
          },
        ];

        if (item.pasoActual > 1) {
          hist.push({
            order_id: order.id,
            user_id: userJefe?.id,
            sede_id: defaultSedeId,
            etapa: 1,
            accion: 'Cerró Recepción & Checklist Ingreso',
            detalle: 'Checklist de 6 categorías e inventario de vehículo completado',
            fecha: new Date(baseDate.getTime() - 2 * 3600 * 1000),
          });
        }
        if (item.pasoActual >= 3) {
          hist.push({
            order_id: order.id,
            user_id: userGerente?.id,
            sede_id: defaultSedeId,
            etapa: 2,
            accion: 'Emitió Factura y Cerró Orden',
            detalle: 'Cotización aprobada, factura emitida y vehículo entregado',
            fecha: new Date(baseDate.getTime() - 1 * 3600 * 1000),
          });
        }

        for (const h of hist) {
          const entry = new HistorialAccion();
          entry.order_id = h.order_id!;
          entry.user_id = h.user_id || null;
          entry.sede_id = h.sede_id || defaultSedeId;
          entry.etapa = h.etapa!;
          entry.accion = h.accion!;
          entry.detalle = h.detalle || null;
          if (h.fecha) entry.fecha = h.fecha;
          await this.historyRepo.save(entry);
        }
      }

      results.push(item.id);
    }

    return { message: 'Datos de muestra sembrados correctamente con sede y recibidoPorId', total: results.length, orders: results };
  }
}
