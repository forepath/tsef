import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { SupplierContractEntity } from '../entities/supplier-contract.entity';
import { applySupplierTenantFilter, getRequiredTenantId } from '../utils/tenant-query.utils';

@Injectable()
export class SupplierContractsRepository {
  constructor(
    @InjectRepository(SupplierContractEntity)
    private readonly repository: Repository<SupplierContractEntity>,
  ) {}

  async findByIdOrThrow(id: string): Promise<SupplierContractEntity> {
    const entity = await this.repository
      .createQueryBuilder('contract')
      .innerJoin('contract.supplier', 'supplier')
      .where('contract.id = :id', { id })
      .andWhere('supplier.tenant_id = :tenantId', { tenantId: getRequiredTenantId() })
      .getOne();

    if (!entity) {
      throw new NotFoundException(`Supplier contract with ID ${id} not found`);
    }

    return entity;
  }

  async findBySupplierAndNumber(supplierId: string, contractNumber: string): Promise<SupplierContractEntity | null> {
    return await this.repository
      .createQueryBuilder('contract')
      .innerJoin('contract.supplier', 'supplier')
      .where('contract.supplier_id = :supplierId', { supplierId })
      .andWhere('contract.contract_number = :contractNumber', { contractNumber })
      .andWhere('supplier.tenant_id = :tenantId', { tenantId: getRequiredTenantId() })
      .getOne();
  }

  async searchBySupplier(supplierId: string, search?: string, limit = 20): Promise<SupplierContractEntity[]> {
    const qb = this.repository
      .createQueryBuilder('contract')
      .innerJoin('contract.supplier', 'supplier')
      .where('contract.supplier_id = :supplierId', { supplierId })
      .orderBy('contract.contractNumber', 'ASC')
      .take(limit);

    applySupplierTenantFilter(qb, 'supplier');

    if (search?.trim()) {
      qb.andWhere('contract.contract_number ILIKE :search', { search: `%${search.trim()}%` });
    }

    return await qb.getMany();
  }

  async create(supplierId: string, contractNumber: string): Promise<SupplierContractEntity> {
    const entity = this.repository.create({ supplierId, contractNumber });

    return await this.repository.save(entity);
  }
}
