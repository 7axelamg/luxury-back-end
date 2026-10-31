import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FindingsController } from './findings.controller';
import { FindingsService } from './findings.service';
import { Finding } from './finding.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Finding])],
  controllers: [FindingsController],
  providers: [FindingsService],
  exports: [FindingsService],
})
export class FindingsModule {}
