import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Sede } from './sede.entity';
import { SedesService } from './sedes.service';
import { SedesController } from './sedes.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Sede])],
  controllers: [SedesController],
  providers: [SedesService],
  exports: [SedesService, TypeOrmModule],
})
export class SedesModule {}
