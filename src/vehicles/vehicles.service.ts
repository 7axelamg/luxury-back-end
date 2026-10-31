import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Vehicle } from './vehicle.entity';

@Injectable()
export class VehiclesService {
  constructor(
    @InjectRepository(Vehicle)
    private readonly vehicleRepo: Repository<Vehicle>,
  ) {}

  findAll(): Promise<Vehicle[]> {
    return this.vehicleRepo.find({ relations: { customer: true }, order: { placa: 'ASC' } });
  }

  findOne(id: string): Promise<Vehicle | null> {
    return this.vehicleRepo.findOne({ where: { id }, relations: { customer: true } });
  }

  findByPlaca(placa: string): Promise<Vehicle | null> {
    return this.vehicleRepo.findOne({ where: { placa }, relations: { customer: true } });
  }
}
