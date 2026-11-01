import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrdersModule } from './orders/orders.module';
import { UsersModule } from './users/users.module';
import { CustomersModule } from './customers/customers.module';
import { VehiclesModule } from './vehicles/vehicles.module';
import { AuthModule } from './auth/auth.module';
import { FindingsModule } from './findings/findings.module';
import { SedesModule } from './sedes/sedes.module';

// Entities
import { User } from './users/user.entity';
import { RoleAuditLog } from './users/role-audit.entity';
import { Customer } from './customers/customer.entity';
import { Vehicle } from './vehicles/vehicle.entity';
import { Order } from './orders/order.entity';
import { Photo } from './orders/photo.entity';
import { Finding } from './findings/finding.entity';
import { HistorialAccion } from './orders/historial-accion.entity';
import { Sede } from './sedes/sede.entity';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRoot({
      type: 'mysql',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT!, 10) || 3306,
      username: process.env.DB_USER || 'root',
      password: process.env.DB_PASS || 'Victus2025',
      database: process.env.DB_NAME || 'luxury_service',
      entities: [
        User,
        RoleAuditLog,
        Customer,
        Vehicle,
        Order,
        Photo,
        Finding,
        HistorialAccion,
        Sede,
      ],
      synchronize: true, // crea las tablas automáticamente
      charset: 'utf8mb4',
      ssl: process.env.DB_SSL === 'true' ? { minVersion: 'TLSv1.2', rejectUnauthorized: true } : false,
    }),
    OrdersModule,
    UsersModule,
    CustomersModule,
    VehiclesModule,
    AuthModule,
    FindingsModule,
    SedesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
