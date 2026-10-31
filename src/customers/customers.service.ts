import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Customer } from './customer.entity';

@Injectable()
export class CustomersService {
  constructor(
    @InjectRepository(Customer)
    private readonly customerRepo: Repository<Customer>,
  ) {}

  findAll(): Promise<Customer[]> {
    return this.customerRepo.find({ order: { nombre: 'ASC' } });
  }

  findOne(id: string): Promise<Customer | null> {
    return this.customerRepo.findOne({ where: { id } });
  }

  findByCedula(cedula: string): Promise<Customer | null> {
    return this.customerRepo.findOne({ where: { cedula } });
  }
}
