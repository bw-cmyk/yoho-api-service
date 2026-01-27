import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, FindOptionsWhere, In } from 'typeorm';
import { Product } from '../../ecommerce/entities/product.entity';
import {
  ProductType,
  ProductStatus,
} from '../../ecommerce/enums/ecommerce.enums';
import {
  CreateProductDto,
  UpdateProductDto,
  QueryProductDto,
} from '../dto/product.dto';

@Injectable()
export class AdminProductService {
  constructor(
    @InjectRepository(Product)
    private productRepository: Repository<Product>,
  ) {}

  async create(createProductDto: CreateProductDto) {
    const product = this.productRepository.create(createProductDto);
    return this.productRepository.save(product);
  }

  async findAll(query: QueryProductDto) {
    const { page = 1, limit = 10, keyword, type, status } = query;
    const skip = (page - 1) * limit;

    const where: FindOptionsWhere<Product> = {
      type: In([ProductType.INSTANT_BUY, ProductType.LUCKY_DRAW]),
    };

    if (keyword) {
      where.name = Like(`%${keyword}%`);
    }
    if (type) {
      where.type = type;
    }
    if (status) {
      where.status = status;
    }

    const [data, total] = await this.productRepository.findAndCount({
      where,
      skip,
      take: limit,
      order: { createdAt: 'DESC' },
    });

    // Convert Decimal to string for JSON serialization
    const serializedData = data.map((product) => ({
      ...product,
      originalPrice: product.originalPrice?.toString() || '0',
      salePrice: product.salePrice?.toString() || '0',
      totalRating: product.totalRating?.toString() || '0',
    }));

    return {
      data: serializedData,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: number) {
    const product = await this.productRepository.findOne({ where: { id } });
    if (!product) {
      throw new NotFoundException(`Product #${id} not found`);
    }
    return {
      ...product,
      originalPrice: product.originalPrice?.toString() || '0',
      salePrice: product.salePrice?.toString() || '0',
      totalRating: product.totalRating?.toString() || '0',
    };
  }

  async update(id: number, updateProductDto: UpdateProductDto) {
    const product = await this.productRepository.findOne({ where: { id } });
    if (!product) {
      throw new NotFoundException(`Product #${id} not found`);
    }
    Object.assign(product, updateProductDto);
    const saved = await this.productRepository.save(product);
    return {
      ...saved,
      originalPrice: saved.originalPrice?.toString() || '0',
      salePrice: saved.salePrice?.toString() || '0',
      totalRating: saved.totalRating?.toString() || '0',
    };
  }

  async remove(id: number) {
    const product = await this.productRepository.findOne({ where: { id } });
    if (!product) {
      throw new NotFoundException(`Product #${id} not found`);
    }
    await this.productRepository.softRemove(product);
    return { success: true, message: 'Product deleted' };
  }

  async setStatus(id: number, status: ProductStatus) {
    await this.productRepository.update(id, { status });
    return this.findOne(id);
  }

  async getStats() {
    const baseWhere = {
      type: In([ProductType.INSTANT_BUY, ProductType.LUCKY_DRAW]),
    };

    const total = await this.productRepository.count({ where: baseWhere });
    const active = await this.productRepository.count({
      where: { ...baseWhere, status: ProductStatus.ACTIVE },
    });
    const draft = await this.productRepository.count({
      where: { ...baseWhere, status: ProductStatus.DRAFT },
    });
    const paused = await this.productRepository.count({
      where: { ...baseWhere, status: ProductStatus.PAUSED },
    });
    const instantBuy = await this.productRepository.count({
      where: { type: ProductType.INSTANT_BUY },
    });
    const luckyDraw = await this.productRepository.count({
      where: { type: ProductType.LUCKY_DRAW },
    });

    return {
      total,
      active,
      draft,
      paused,
      instantBuy,
      luckyDraw,
    };
  }
}
