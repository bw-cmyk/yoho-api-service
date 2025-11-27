import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, Between, LessThanOrEqual } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Order } from '../entities/order.entity';
import { Product } from '../entities/product.entity';
import { ShippingAddress } from '../entities/shipping-address.entity';
import { AssetService } from '../../assets/services/asset.service';
import { Currency } from '../../assets/entities/balance/user-asset.entity';
import {
  OrderType,
  InstantBuyOrderStatus,
  LuckyDrawOrderStatus,
  PaymentStatus,
} from '../enums/ecommerce.enums';
import {
  CreateInstantBuyOrderDto,
  CreateLuckyDrawOrderDto,
  QueryOrdersDto,
} from '../dto/order.dto';
import { ProductService } from './product.service';
import { ShippingAddressService } from './shipping-address.service';
import { LogisticsService } from './logistics.service';
import { TransactionType } from 'src/api-modules/assets/entities/balance/transaction.entity';

@Injectable()
export class OrderService {
  private readonly logger = new Logger(OrderService.name);

  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(ShippingAddress)
    private readonly addressRepository: Repository<ShippingAddress>,
    private readonly assetService: AssetService,
    private readonly productService: ProductService,
    private readonly addressService: ShippingAddressService,
    private readonly logisticsService: LogisticsService,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * 创建 Instant Buy 订单
   */
  async createInstantBuyOrder(
    userId: string,
    dto: CreateInstantBuyOrderDto,
  ): Promise<Order> {
    // 获取商品信息
    const product = await this.productService.findById(dto.productId);

    // 检查商品是否可售卖
    if (!product.isAvailableForSale()) {
      throw new BadRequestException('商品不可售卖');
    }

    // 检查库存
    if (product.stock < dto.quantity) {
      throw new BadRequestException('库存不足');
    }

    // 检查购买上限
    if (product.purchaseLimit) {
      const userOrders = await this.orderRepository.count({
        where: {
          userId,
          productId: product.id,
          type: OrderType.INSTANT_BUY,
          paymentStatus: PaymentStatus.PAID,
        },
      });
      if (userOrders + dto.quantity > product.purchaseLimit) {
        throw new BadRequestException('超过购买上限');
      }
    }

    // 验证规格
    const productSpecs = product.specifications || [];
    for (const selectedSpec of dto.specifications) {
      const exists = productSpecs.some(
        (spec) =>
          spec.key === selectedSpec.key && spec.value === selectedSpec.value,
      );
      if (!exists) {
        throw new BadRequestException(
          `无效的商品规格: ${selectedSpec.key}=${selectedSpec.value}`,
        );
      }
    }

    // 获取或验证收货地址
    let shippingAddress: ShippingAddress | null = null;
    if (dto.shippingAddressId) {
      shippingAddress = await this.addressService.findByIdAndUserId(
        dto.shippingAddressId,
        userId,
      );
    } else {
      // 如果没有提供地址，尝试获取默认地址
      shippingAddress = await this.addressService.getDefaultAddress(userId);
    }

    if (!shippingAddress) {
      throw new BadRequestException('请选择收货地址');
    }

    // 计算支付金额
    const paymentAmount = product.salePrice.times(dto.quantity);

    // 检查用户余额
    const userAssets = await this.assetService.getUserAssets(userId);
    const usdAsset = userAssets.find((a) => a.currency === Currency.USD);
    if (!usdAsset || !usdAsset.hasEnoughBalance(paymentAmount)) {
      throw new BadRequestException('余额不足');
    }

    // 在事务中创建订单并扣款
    return await this.dataSource.transaction(async (manager) => {
      // 创建订单
      const order = manager.create(Order, {
        orderNumber: Order.generateOrderNumber(),
        userId,
        type: OrderType.INSTANT_BUY,
        productId: product.id,
        productInfo: {
          name: product.name,
          thumbnail: product.thumbnail,
          images: product.images || [],
          specifications: dto.specifications,
          originalPrice: product.originalPrice.toString(),
          salePrice: product.salePrice.toString(),
        },
        quantity: dto.quantity,
        paymentAmount,
        paymentStatus: PaymentStatus.UNPAID,
        instantBuyStatus: InstantBuyOrderStatus.CONFIRMED,
        shippingAddressId: shippingAddress ? shippingAddress.id : null,
      });

      const savedOrder = await manager.save(order);

      // 扣款
      await this.assetService.orderPayment({
        userId,
        currency: Currency.USD,
        amount: paymentAmount,
        game_id: `ORDER_${savedOrder.orderNumber}`,
        description: `购买商品: ${product.name}`,
        metadata: {
          orderId: savedOrder.id,
          orderNumber: savedOrder.orderNumber,
          productId: product.id,
          productName: product.name,
        },
      });

      // 更新订单支付状态
      savedOrder.paymentStatus = PaymentStatus.PAID;
      await manager.save(savedOrder);

      // 减少库存
      await this.productService.decreaseStock(product.id, dto.quantity);

      // 初始化物流时间线
      await this.logisticsService.initializeLogisticsTimeline(savedOrder);

      this.logger.log(`用户 ${userId} 创建订单成功: ${savedOrder.orderNumber}`);

      return savedOrder;
    });
  }

  /**
   * 创建 Lucky Draw 订单
   */
  async createLuckyDrawOrder(
    userId: string,
    dto: CreateLuckyDrawOrderDto,
  ): Promise<Order> {
    // 获取商品信息
    const product = await this.productService.findById(dto.productId);

    // 检查商品类型
    if (product.type !== 'LUCKY_DRAW') {
      throw new BadRequestException('商品类型不匹配');
    }

    // 检查商品是否可售卖
    if (!product.isAvailableForSale()) {
      throw new BadRequestException('商品不可售卖');
    }

    // 检查库存
    if (product.stock < dto.spots) {
      throw new BadRequestException('库存不足');
    }

    // 计算支付金额（假设每份价格为售价）
    const pricePerSpot = product.salePrice;
    const paymentAmount = pricePerSpot.times(dto.spots);

    // 检查用户余额
    const userAssets = await this.assetService.getUserAssets(userId);
    const usdAsset = userAssets.find((a) => a.currency === Currency.USD);
    if (!usdAsset || !usdAsset.hasEnoughBalance(paymentAmount)) {
      throw new BadRequestException('余额不足');
    }

    // 在事务中创建订单并扣款
    return await this.dataSource.transaction(async (manager) => {
      // 创建订单
      const order = manager.create(Order, {
        orderNumber: Order.generateOrderNumber(),
        userId,
        type: OrderType.LUCKY_DRAW,
        productId: product.id,
        productInfo: {
          name: product.name,
          thumbnail: product.thumbnail,
          images: product.images || [],
          specifications: [],
          originalPrice: product.originalPrice.toString(),
          salePrice: product.salePrice.toString(),
        },
        quantity: dto.spots,
        paymentAmount,
        paymentStatus: PaymentStatus.UNPAID,
        luckyDrawStatus: LuckyDrawOrderStatus.ONGOING,
        luckyDrawSpots: dto.spots,
        luckyDrawPricePerSpot: pricePerSpot,
        luckyDrawWon: null,
      });

      const savedOrder = await manager.save(order);

      // 扣款
      await this.assetService.bet({
        userId,
        currency: Currency.USD,
        type: TransactionType.LUCKY_DRAW,
        amount: paymentAmount,
        game_id: `ORDER_${savedOrder.orderNumber}`,
        description: `参与抽奖: ${product.name} x ${dto.spots}`,
        metadata: {
          orderId: savedOrder.id,
          orderNumber: savedOrder.orderNumber,
          productId: product.id,
          productName: product.name,
          spots: dto.spots,
        },
      });

      // 更新订单支付状态
      savedOrder.paymentStatus = PaymentStatus.PAID;
      await manager.save(savedOrder);

      // 减少库存
      await this.productService.decreaseStock(product.id, dto.spots);

      this.logger.log(
        `用户 ${userId} 创建抽奖订单成功: ${savedOrder.orderNumber}`,
      );

      return savedOrder;
    });
  }

  /**
   * 根据ID查找订单
   */
  async findById(id: number): Promise<Order> {
    const order = await this.orderRepository.findOne({
      where: { id },
      // relations: ['shippingAddress', 'logisticsTimelines'],
    });

    if (order.shippingAddressId) {
      const shippingAddress = await this.addressService.findById(
        order.shippingAddressId,
      );
      order.shippingAddress = shippingAddress;
    }

    const logisticsTimelines =
      await this.logisticsService.getOrderLogisticsTimeline(order.id);
    order.logisticsTimelines = logisticsTimelines;

    return order;
  }

  /**
   * 根据订单号查找订单
   */
  async findByOrderNumber(orderNumber: string): Promise<Order> {
    const order = await this.orderRepository.findOne({
      where: { orderNumber },
    });

    if (!order) {
      throw new NotFoundException(`订单不存在: ${orderNumber}`);
    }

    return order;
  }

  /**
   * 查询用户的订单列表
   */
  async getUserOrders(
    userId: string,
    query: QueryOrdersDto,
  ): Promise<{ items: Order[]; total: number; page: number; limit: number }> {
    const { type, page = 1, limit = 20 } = query;

    const where: any = { userId };
    if (type) where.type = type;

    const [items, total] = await this.orderRepository.findAndCount({
      where,
      order: { createdAt: 'DESC' },
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
   * 申请退款（Instant Buy 订单）
   */
  async requestRefund(orderId: number, userId: string): Promise<Order> {
    const order = await this.findById(orderId);

    // 验证订单归属
    if (order.userId !== userId) {
      throw new BadRequestException('无权操作此订单');
    }

    // 检查订单类型
    if (order.type !== OrderType.INSTANT_BUY) {
      throw new BadRequestException('只有 Instant Buy 订单可以申请退款');
    }

    // 检查是否可以申请退款
    if (!order.canRequestRefund()) {
      throw new BadRequestException('订单未超过15天，无法申请退款');
    }

    // 检查是否已经申请过退款
    if (order.refundRequestedAt) {
      throw new BadRequestException('退款已申请，请勿重复申请');
    }

    // 在事务中处理退款
    return await this.dataSource.transaction(async (manager) => {
      // 更新订单状态
      order.refundRequestedAt = new Date();
      order.instantBuyStatus = InstantBuyOrderStatus.CANCELLED;
      await manager.save(order);

      // 处理停止配送
      await this.logisticsService.handleDeliveryStopped(order);

      // 退款到余额
      await this.assetService.deposit({
        userId: order.userId,
        currency: Currency.USD,
        amount: order.paymentAmount,
        reference_id: order.orderNumber,
        description: `订单退款: ${order.orderNumber}`,
        metadata: {
          orderId: order.id,
          orderNumber: order.orderNumber,
          refundType: 'REQUESTED',
        },
      });

      // 更新订单状态为退款中
      order.instantBuyStatus = InstantBuyOrderStatus.REFUNDING;
      order.paymentStatus = PaymentStatus.REFUNDED;
      order.refundedAt = new Date();
      await manager.save(order);

      this.logger.log(`订单退款申请成功: ${order.orderNumber}`);

      return order;
    });
  }

  /**
   * 自动取消订单（30天后因物流问题自动取消）
   */
  async autoCancelExpiredOrders(): Promise<void> {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // 查找30天前创建的、处于配送中状态的订单
    const expiredOrders = await this.orderRepository.find({
      where: [
        {
          type: OrderType.INSTANT_BUY,
          instantBuyStatus: InstantBuyOrderStatus.OUT_FOR_DELIVERY,
          createdAt: LessThanOrEqual(thirtyDaysAgo),
          refundRequestedAt: null, // 未申请过退款
        },
        {
          type: OrderType.INSTANT_BUY,
          instantBuyStatus: InstantBuyOrderStatus.SHIPPED,
          createdAt: LessThanOrEqual(thirtyDaysAgo),
          refundRequestedAt: null, // 未申请过退款
        },
      ],
    });

    for (const order of expiredOrders) {
      await this.dataSource.transaction(async (manager) => {
        // 更新订单状态
        order.instantBuyStatus = InstantBuyOrderStatus.CANCELLED;
        order.cancelledAt = new Date();
        await manager.save(order);

        // 处理清关失败
        await this.logisticsService.handleCustomsFailure(order);

        // 自动退款
        await this.assetService.deposit({
          userId: order.userId,
          currency: Currency.USD,
          amount: order.paymentAmount,
          reference_id: order.orderNumber,
          description: `订单自动取消退款: ${order.orderNumber}`,
          metadata: {
            orderId: order.id,
            orderNumber: order.orderNumber,
            refundType: 'AUTO_CANCELLED',
          },
        });

        // 更新订单状态为已退款
        order.instantBuyStatus = InstantBuyOrderStatus.REFUNDED;
        order.paymentStatus = PaymentStatus.REFUNDED;
        order.refundedAt = new Date();
        await manager.save(order);

        this.logger.log(`订单自动取消并退款: ${order.orderNumber}`);
      });
    }
  }

  /**
   * 推进物流进度（定时任务）
   */
  @Cron(CronExpression.EVERY_HOUR)
  async advanceLogisticsProgress(): Promise<void> {
    // 获取所有进行中的 Instant Buy 订单
    const activeOrders = await this.orderRepository.find({
      where: {
        type: OrderType.INSTANT_BUY,
        instantBuyStatus: Between(
          InstantBuyOrderStatus.CONFIRMED,
          InstantBuyOrderStatus.OUT_FOR_DELIVERY,
        ) as any,
      },
    });

    for (const order of activeOrders) {
      try {
        await this.logisticsService.advanceLogisticsTimeline(order);
      } catch (error) {
        this.logger.error(
          `推进物流进度失败: ${order.orderNumber}`,
          error.stack,
        );
      }
    }
  }

  /**
   * 获取订单详情（包含物流信息）
   */
  async getOrderDetail(
    id: number,
    userId: string,
  ): Promise<
    Order & {
      logisticsTimelines: any[];
      currentLogisticsStatus: any;
    }
  > {
    const order = await this.findById(id);

    // 验证订单归属
    if (order.userId !== userId) {
      throw new BadRequestException('无权查看此订单');
    }

    // 推进物流进度
    if (order.type === OrderType.INSTANT_BUY) {
      await this.logisticsService.advanceLogisticsTimeline(order);
    }

    // 获取物流时间线
    const logisticsTimelines =
      await this.logisticsService.getOrderLogisticsTimeline(order.id);

    // 获取当前物流状态
    const currentLogisticsStatus =
      await this.logisticsService.getCurrentLogisticsStatus(order.id);

    const orderDetail = Object.assign(order, {
      logisticsTimelines,
      currentLogisticsStatus,
    });

    return orderDetail as Order & {
      logisticsTimelines: any[];
      currentLogisticsStatus: any;
    };
  }
}
