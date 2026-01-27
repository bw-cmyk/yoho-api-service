import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProductSpecification } from '../../ecommerce/entities/product-specification.entity';
import {
  CreateSpecificationDto,
  UpdateSpecificationDto,
} from '../dto/specification.dto';

@Injectable()
export class AdminSpecificationService {
  constructor(
    @InjectRepository(ProductSpecification)
    private specRepository: Repository<ProductSpecification>,
  ) {}

  async findByProductId(productId: number) {
    return this.specRepository.find({
      where: { productId },
      order: { key: 'ASC', sort: 'ASC' },
    });
  }

  async create(productId: number, dto: CreateSpecificationDto) {
    const spec = this.specRepository.create({
      ...dto,
      productId,
    });
    return this.specRepository.save(spec);
  }

  async createBatch(productId: number, specs: CreateSpecificationDto[]) {
    const entities = specs.map((dto) =>
      this.specRepository.create({
        ...dto,
        productId,
      }),
    );
    return this.specRepository.save(entities);
  }

  async update(id: number, dto: UpdateSpecificationDto) {
    const spec = await this.specRepository.findOne({ where: { id } });
    if (!spec) {
      throw new NotFoundException(`Specification #${id} not found`);
    }
    Object.assign(spec, dto);
    return this.specRepository.save(spec);
  }

  async remove(id: number) {
    const spec = await this.specRepository.findOne({ where: { id } });
    if (!spec) {
      throw new NotFoundException(`Specification #${id} not found`);
    }
    await this.specRepository.remove(spec);
    return { success: true };
  }

  async removeByProductId(productId: number) {
    await this.specRepository.delete({ productId });
    return { success: true };
  }

  async replaceAll(productId: number, specs: CreateSpecificationDto[]) {
    // 删除旧的规格
    await this.specRepository.delete({ productId });
    // 创建新的规格
    if (specs.length > 0) {
      const entities = specs.map((dto, index) =>
        this.specRepository.create({
          ...dto,
          productId,
          sort: dto.sort ?? index,
        }),
      );
      return this.specRepository.save(entities);
    }
    return [];
  }
}
