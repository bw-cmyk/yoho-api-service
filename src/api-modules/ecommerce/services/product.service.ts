import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual, MoreThanOrEqual, In } from 'typeorm';
import { Decimal } from 'decimal.js';
import { Product, ProductSpecification, ProductReview } from '../entities';
import { ProductType, ProductStatus } from '../enums/ecommerce.enums';
import {
  CreateProductDto,
  UpdateProductDto,
  QueryProductsDto,
} from '../dto/product.dto';

const EMPTY_PRODUCT_ID = -1;

@Injectable()
export class ProductService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(ProductSpecification)
    private readonly specificationRepository: Repository<ProductSpecification>,
    @InjectRepository(ProductReview)
    private readonly reviewRepository: Repository<ProductReview>,
  ) {}

  /**
   * 创建商品
   */
  async createProduct(dto: CreateProductDto): Promise<Product> {
    const product = this.productRepository.create({
      type: dto.type,
      priority: dto.priority ?? 0,
      badge: dto.badge,
      name: dto.name,
      description: dto.description,
      thumbnail: dto.thumbnail,
      images: dto.images ?? [],
      detail: dto.detail,
      originalPrice: new Decimal(dto.originalPrice),
      salePrice: new Decimal(dto.salePrice),
      stock: dto.stock ?? 0,
      dailySalesRange: dto.dailySalesRange,
      tags: dto.tags ?? [],
      saleStartTime: dto.saleStartTime ? new Date(dto.saleStartTime) : null,
      saleEndTime: dto.saleEndTime ? new Date(dto.saleEndTime) : null,
      purchaseLimit: dto.purchaseLimit,
      deliveryDaysMin: dto.deliveryDaysMin,
      deliveryDaysMax: dto.deliveryDaysMax,
      status: dto.status ?? ProductStatus.DRAFT,
      totalRating: new Decimal(0),
      reviewCount: 0,
    });

    const savedProduct = await this.productRepository.save(product);

    // 保存规格
    if (dto.specifications && dto.specifications.length > 0) {
      const specifications = dto.specifications.map((spec) =>
        this.specificationRepository.create({
          productId: savedProduct.id,
          key: spec.key,
          value: spec.value,
          isDefault: spec.isDefault ?? false,
          sort: spec.sort ?? 0,
        }),
      );
      await this.specificationRepository.save(specifications);
    }

    // 保存评价
    if (dto.reviews && dto.reviews.length > 0) {
      const reviews = dto.reviews.map((review) =>
        this.reviewRepository.create({
          productId: savedProduct.id,
          reviewerName: review.reviewerName,
          reviewerAvatar: review.reviewerAvatar,
          rating: new Decimal(review.rating),
          content: review.content,
          tags: review.tags ?? [],
          reviewTime: review.reviewTime
            ? new Date(review.reviewTime)
            : new Date(),
        }),
      );
      const savedReviews = await this.reviewRepository.save(reviews);

      // 更新商品评分
      const totalRating = savedReviews.reduce(
        (sum, r) => sum.plus(r.rating),
        new Decimal(0),
      );
      savedProduct.totalRating = totalRating;
      savedProduct.reviewCount = savedReviews.length;
      await this.productRepository.save(savedProduct);
    }

    return this.findById(savedProduct.id);
  }

  /**
   * 更新商品
   */
  async updateProduct(id: number, dto: UpdateProductDto): Promise<Product> {
    const product = await this.findById(id);

    if (dto.priority !== undefined) product.priority = dto.priority;
    if (dto.badge !== undefined) product.badge = dto.badge;
    if (dto.name !== undefined) product.name = dto.name;
    if (dto.description !== undefined) product.description = dto.description;
    if (dto.thumbnail !== undefined) product.thumbnail = dto.thumbnail;
    if (dto.images !== undefined) product.images = dto.images;
    if (dto.detail !== undefined) product.detail = dto.detail;
    if (dto.originalPrice !== undefined)
      product.originalPrice = new Decimal(dto.originalPrice);
    if (dto.salePrice !== undefined)
      product.salePrice = new Decimal(dto.salePrice);
    if (dto.stock !== undefined) product.stock = dto.stock;
    if (dto.dailySalesRange !== undefined)
      product.dailySalesRange = dto.dailySalesRange;
    if (dto.tags !== undefined) product.tags = dto.tags;
    if (dto.saleStartTime !== undefined)
      product.saleStartTime = new Date(dto.saleStartTime);
    if (dto.saleEndTime !== undefined)
      product.saleEndTime = new Date(dto.saleEndTime);
    if (dto.purchaseLimit !== undefined)
      product.purchaseLimit = dto.purchaseLimit;
    if (dto.deliveryDaysMin !== undefined)
      product.deliveryDaysMin = dto.deliveryDaysMin;
    if (dto.deliveryDaysMax !== undefined)
      product.deliveryDaysMax = dto.deliveryDaysMax;
    if (dto.status !== undefined) product.status = dto.status;

    await this.productRepository.save(product);

    // 更新规格（如果需要）
    if ('specifications' in dto && dto.specifications !== undefined) {
      await this.specificationRepository.delete({ productId: id });
      const specs = dto.specifications as any;
      if (Array.isArray(specs) && specs.length > 0) {
        const specifications = specs.map((spec: any) =>
          this.specificationRepository.create({
            productId: id,
            key: spec.key,
            value: spec.value,
            isDefault: spec.isDefault ?? false,
            sort: spec.sort ?? 0,
          }),
        );
        await this.specificationRepository.save(specifications);
      }
    }

    return this.findById(id);
  }

  /**
   * 根据ID查找商品
   */
  async findById(id: number): Promise<Product> {
    const product = await this.productRepository.findOne({
      where: { id },
    });

    const specifications = await this.specificationRepository.find({
      where: { productId: id },
    });
    product.specifications = specifications;

    const reviews = await this.reviewRepository.find({
      where: { productId: id },
    });
    product.reviews = reviews;
    if (!product) {
      throw new NotFoundException(`商品不存在: ${id}`);
    }

    return product;
  }

  /**
   * 查询商品列表
   */
  async findProducts(query: QueryProductsDto): Promise<{
    items: Product[];
    total: number;
    page: number;
    limit: number;
  }> {
    const { type, status, page = 1, limit = 20 } = query;

    const where: any = {};
    if (type) where.type = type;
    if (status) where.status = status;

    const [items, total] = await this.productRepository.findAndCount({
      where,
      // relations: ['specifications'],
      order: { priority: 'DESC', createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      items,
      total,
      page,
      limit,
    };
  }

  /**
   * 获取首页展示的商品
   */
  async getHomepageProducts() {
    const now = new Date();

    // Instant Buy: 优先级最高的一个可售卖商品
    const instantBuy = await this.productRepository.findOne({
      where: {
        type: ProductType.INSTANT_BUY,
        status: ProductStatus.ACTIVE,
        stock: MoreThanOrEqual(1),
        saleStartTime: LessThanOrEqual(now),
        saleEndTime: MoreThanOrEqual(now),
      },
      order: { priority: 'DESC' },
    });

    // Lucky Draws: 优先级最高的2个可售卖商品
    const luckyDraws = await this.productRepository.find({
      where: {
        type: ProductType.LUCKY_DRAW,
        status: ProductStatus.ACTIVE,
        stock: MoreThanOrEqual(1),
        saleStartTime: LessThanOrEqual(now),
        saleEndTime: MoreThanOrEqual(now),
      },
      order: { priority: 'DESC' },
      take: 2,
    });

    const specifications = await this.specificationRepository.find({
      where: {
        productId: In(
          luckyDraws
            .map((product) => product.id)
            .concat(instantBuy?.id || EMPTY_PRODUCT_ID),
        ),
      },
    });

    [instantBuy, ...luckyDraws].forEach((product) => {
      product.specifications = specifications.filter(
        (spec) => spec.productId === product.id,
      );
    });

    return {
      instantBuy: instantBuy
        ? {
            ...instantBuy,
            discountPercentage: instantBuy.discountPercentage,
          }
        : undefined,
      luckyDraws: luckyDraws.map((product) => ({
        ...product,
        discountPercentage: product.discountPercentage,
      })),
    };
  }

  /**
   * 获取商品详情
   */
  async getProductDetail(id: number): Promise<
    Product & {
      todaySold: number; // 今日已售数量
      totalPurchased: number; // 总已购人数
      estimatedDeliveryDays: number; // 预计到货天数
      remainingSaleTime: number; // 剩余售卖时间（秒）
    }
  > {
    const product = await this.findById(id);

    // 计算今日已售数量
    const todaySold = this.calculateTodaySold(product);

    // 计算总已购人数
    const totalPurchased = this.calculateTotalPurchased(product);

    // 计算预计到货天数
    const estimatedDeliveryDays =
      product.deliveryDaysMin && product.deliveryDaysMax
        ? Math.floor(
            Math.random() *
              (product.deliveryDaysMax - product.deliveryDaysMin + 1),
          ) + product.deliveryDaysMin
        : 0;

    // 计算剩余售卖时间
    let remainingSaleTime = 0;
    if (product.saleEndTime) {
      const now = new Date();
      const diff = product.saleEndTime.getTime() - now.getTime();
      remainingSaleTime = Math.max(0, Math.floor(diff / 1000));
    }

    const productDetail = Object.assign(product, {
      todaySold,
      totalPurchased,
      estimatedDeliveryDays,
      remainingSaleTime,
    });

    return productDetail as Product & {
      todaySold: number;
      totalPurchased: number;
      estimatedDeliveryDays: number;
      remainingSaleTime: number;
    };
  }

  async getProductReviews(id: number): Promise<ProductReview[]> {
    const reviews = await this.reviewRepository.find({
      where: { productId: id },
    });
    return reviews;
  }

  /**
   * 减少库存
   */
  async decreaseStock(id: number, quantity: number): Promise<void> {
    const product = await this.findById(id);

    if (product.stock < quantity) {
      throw new BadRequestException('Stock is not enough');
    }

    product.stock -= quantity;
    await this.productRepository.save(product);
  }

  /**
   * 增加库存
   */
  async increaseStock(id: number, quantity: number): Promise<void> {
    const product = await this.findById(id);
    product.stock += quantity;
    await this.productRepository.save(product);
  }

  /**
   * 计算今日已售数量（模拟数据）
   */
  private calculateTodaySold(product: Product): number {
    if (!product.dailySalesRange) {
      return 0;
    }

    // 每日总销量 = 配置的日销量值 ±20% 范围内随机
    const dailyTotal = product.dailySalesRange * (0.8 + Math.random() * 0.4); // 0.8 to 1.2

    // 当前小时（0-23）
    const currentHour = new Date().getHours();

    // 今日已售数量 = (每日总销量 / 24 * 当前小时) ±30% 以内随机
    const expectedSold = (dailyTotal / 24) * currentHour;
    const variation = expectedSold * 0.3; // ±30%
    const todaySold = Math.floor(
      expectedSold + (Math.random() * 2 - 1) * variation,
    );

    return Math.max(0, todaySold);
  }

  /**
   * 计算总已购人数（模拟数据）
   */
  private calculateTotalPurchased(product: Product): number {
    if (!product.dailySalesRange) {
      return 0;
    }

    // 已售卖天数（从售卖开始时间到现在）
    const now = new Date();
    const startTime = product.saleStartTime || product.createdAt;
    const daysSinceStart = Math.max(
      1,
      Math.floor((now.getTime() - startTime.getTime()) / (1000 * 60 * 60 * 24)),
    );

    // 总已购人数 = 日销量 * 已售卖天数 ± 10% 随机
    const expectedTotal = product.dailySalesRange * daysSinceStart;
    const variation = expectedTotal * 0.1; // ±10%
    const totalPurchased = Math.floor(
      expectedTotal + (Math.random() * 2 - 1) * variation,
    );

    return Math.max(0, totalPurchased);
  }

  /**
   * 删除商品
   */
  async deleteProduct(id: number): Promise<void> {
    const product = await this.findById(id);
    await this.productRepository.remove(product);
  }
}
