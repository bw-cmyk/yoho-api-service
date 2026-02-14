import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, In, Not, IsNull } from 'typeorm';
import {
  DrawRound,
  DrawRoundStatus,
} from '../../ecommerce/entities/draw-round.entity';
import {
  DrawResult,
  PrizeType,
  PrizeStatus,
} from '../../ecommerce/entities/draw-result.entity';
import { DrawService } from '../../ecommerce/services/draw.service';
import { LogisticsService } from '../../ecommerce/services/logistics.service';
import {
  PrizeShippingStatus,
  OrderType,
} from '../../ecommerce/enums/ecommerce.enums';
import { Product } from '../../ecommerce/entities/product.entity';
import { Order } from '../../ecommerce/entities/order.entity';
import { UserService } from '../../user/service/user.service';

@Injectable()
export class AdminDrawService {
  constructor(
    @InjectRepository(DrawRound)
    private readonly drawRoundRepo: Repository<DrawRound>,
    @InjectRepository(DrawResult)
    private readonly drawResultRepo: Repository<DrawResult>,
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
    private readonly drawService: DrawService,
    private readonly logisticsService: LogisticsService,
    private readonly userService: UserService,
    private readonly dataSource: DataSource,
  ) {}

  async getRounds(productId: number, page: number, limit: number) {
    const [items, total] = await this.drawRoundRepo.findAndCount({
      where: { productId },
      order: { roundNumber: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    // 获取已开奖轮次的结果
    const drawnRoundIds = items
      .filter((r) => r.status === DrawRoundStatus.DRAWN)
      .map((r) => r.id);

    let resultsMap: Record<number, DrawResult> = {};
    if (drawnRoundIds.length > 0) {
      const results = await this.drawResultRepo.find({
        where: drawnRoundIds.map((id) => ({ drawRoundId: id })),
      });
      resultsMap = results.reduce((acc, r) => {
        acc[r.drawRoundId] = r;
        return acc;
      }, {} as Record<number, DrawResult>);
    }

    return {
      data: items.map((round) => ({
        id: round.id,
        productId: round.productId,
        roundNumber: round.roundNumber,
        totalSpots: round.totalSpots,
        soldSpots: round.soldSpots,
        pricePerSpot: round.pricePerSpot.toString(),
        prizeValue: round.prizeValue.toString(),
        status: round.status,
        completedAt: round.completedAt,
        drawnAt: round.drawnAt,
        createdAt: round.createdAt,
        result: resultsMap[round.id]
          ? {
              winningNumber: resultsMap[round.id].winningNumber,
              winnerUserId: resultsMap[round.id].winnerUserId,
              winnerUserName: resultsMap[round.id].winnerUserName,
              prizeStatus: resultsMap[round.id].prizeStatus,
            }
          : null,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getRoundDetail(id: number) {
    const round = await this.drawRoundRepo.findOne({
      where: { id },
      relations: ['product'],
    });

    if (!round) {
      throw new NotFoundException('轮次不存在');
    }

    let result = null;
    if (round.status === DrawRoundStatus.DRAWN) {
      result = await this.drawResultRepo.findOne({
        where: { drawRoundId: id },
      });
    }

    return {
      ...round,
      pricePerSpot: round.pricePerSpot.toString(),
      prizeValue: round.prizeValue.toString(),
      result,
    };
  }

  async processDraw(id: number) {
    const round = await this.drawRoundRepo.findOne({ where: { id } });

    if (!round) {
      throw new NotFoundException('轮次不存在');
    }

    if (round.status === DrawRoundStatus.DRAWN) {
      throw new BadRequestException('该轮次已开奖');
    }

    if (round.status === DrawRoundStatus.CANCELLED) {
      throw new BadRequestException('该轮次已取消');
    }

    // 调用 DrawService 的开奖方法
    return this.drawService.processDraw(id);
  }

  async createRound(productId: number) {
    return this.drawService.getOrCreateCurrentRound(productId);
  }

  // ==================== 实物奖品订单管理 ====================

  /**
   * 获取实物奖品订单统计（基于 Order 系统）
   */
  async getPrizeOrderStats(): Promise<{
    pendingAddress: number;
    pendingShipment: number;
    shipped: number;
    delivered: number;
    total: number;
  }> {
    console.log(this.orderRepo
      .createQueryBuilder()
      .select('"prize_shipping_status"', 'status')
      .addSelect('COUNT(*)', 'count')
      .where('type = :type', { type: OrderType.LUCKY_DRAW })
      .andWhere('draw_result_id IS NOT NULL')
      .addGroupBy('"prize_shipping_status"').getSql())

    const results = await this.orderRepo
      .createQueryBuilder()
      .select('"prize_shipping_status"', 'status')
      .addSelect('COUNT(*)', 'count')
      .where('type = :type', { type: OrderType.LUCKY_DRAW })
      .andWhere('draw_result_id IS NOT NULL')
      .addGroupBy('"prize_shipping_status"')
      .getRawMany();

    const statsMap = results.reduce((acc, row) => {
      // NULL 状态视为 PENDING_ADDRESS（未创建订单的情况）
      const status = row.status || PrizeShippingStatus.PENDING_ADDRESS;
      acc[status] = (acc[status] || 0) + parseInt(row.count, 10);
      return acc;
    }, {} as Record<string, number>);

    const pendingAddress = statsMap[PrizeShippingStatus.PENDING_ADDRESS] || 0;
    const pendingShipment = statsMap[PrizeShippingStatus.PENDING_SHIPMENT] || 0;
    const shipped = statsMap[PrizeShippingStatus.SHIPPED] || 0;
    const delivered = statsMap[PrizeShippingStatus.DELIVERED] || 0;

    return {
      pendingAddress,
      pendingShipment,
      shipped,
      delivered,
      total: pendingAddress + pendingShipment + shipped + delivered,
    };
  }

  /**
   * 获取实物奖品订单列表（基于 Order 系统）
   */
  async getPrizeOrders(query: {
    status?: PrizeShippingStatus;
    keyword?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }): Promise<{
    data: any[];
    total: number;
    page: number;
    limit: number;
    stats: {
      pendingAddress: number;
      pendingShipment: number;
      shipped: number;
      delivered: number;
    };
  }> {
    const { status, keyword, startDate, endDate, page = 1, limit = 20 } = query;

    // 处理 PENDING_ADDRESS 状态（未创建订单的情况）
    if (status === PrizeShippingStatus.PENDING_ADDRESS) {
      const drawResultsWithoutOrder = await this.drawResultRepo.find({
        where: {
          prizeType: PrizeType.PHYSICAL,
          winnerUserId: Not(IsNull()),
          orderId: IsNull(),
        },
        relations: ['drawRound', 'drawRound.product'],
        take: limit,
        skip: (page - 1) * limit,
        order: { createdAt: 'DESC' as any },
      });

      // 转换为统一格式
      const data = await Promise.all(
        drawResultsWithoutOrder.map(async (result) => {
          const drawRound = await this.drawRoundRepo.findOne({
            where: { id: result.drawRoundId },
            relations: ['product'],
          });
          return {
            drawResultId: result.id,
            shippingOrderNumber: result.shippingOrderNumber,
            prizeShippingStatus: PrizeShippingStatus.PENDING_ADDRESS,
            prizeStatus: result.prizeStatus,
            product: drawRound?.product
              ? {
                  id: drawRound.product.id,
                  name: drawRound.product.name,
                  thumbnail: drawRound.product.thumbnail,
                }
              : null,
            winner: {
              userId: result.winnerUserId,
              userName: result.winnerUserName,
              avatar: result.winnerUserAvatar,
            },
            shippingAddress: null,
            logistics: {
              company: result.logisticsCompany,
              trackingNumber: result.trackingNumber,
              shippedAt: result.shippedAt,
              deliveredAt: result.deliveredAt,
            },
            prizeValue: result.prizeValue.toString(),
            addressSubmittedAt: result.addressSubmittedAt,
            createdAt: result.createdAt,
          };
        }),
      );

      const stats = await this.getPrizeOrderStats();
      return {
        data,
        total: await this.drawResultRepo.count({
          where: {
            prizeType: PrizeType.PHYSICAL,
            winnerUserId: Not(IsNull()),
            orderId: IsNull(),
          },
        }),
        page,
        limit,
        stats: {
          pendingAddress: stats.pendingAddress,
          pendingShipment: stats.pendingShipment,
          shipped: stats.shipped,
          delivered: stats.delivered,
        },
      };
    }

    // 构建查询条件
    const qb = this.orderRepo
      .createQueryBuilder()
      .where('type = :type', { type: OrderType.LUCKY_DRAW })
      // .andWhere('draw_result_id IS NOT NULL');

    if (status) {
      qb.andWhere('prize_shipping_status = :status', { status });
    }

    // 关键词搜索
    if (keyword) {
      qb.andWhere(
        '("order_number" LIKE :keyword OR "logistics_company" LIKE :keyword OR "tracking_number" LIKE :keyword)',
        { keyword: `%${keyword}%` },
      );
    }

    // 日期范围
    if (startDate) {
      qb.andWhere('"created_at" >= :startDate', {
        startDate: new Date(startDate),
      });
    }

    if (endDate) {
      qb.andWhere('"created_at" <= :endDate', {
        endDate: new Date(endDate + 'T23:59:59'),
      });
    }

    qb.orderBy('"created_at"', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [orders, total] = await qb.getManyAndCount();

    // 获取关联的 DrawResult 信息
    const drawResultIds = orders
      .map((o) => o.drawResultId)
      .filter((id) => id !== null);
    const drawResults = await this.drawResultRepo.find({
      where: { id: In(drawResultIds as number[]) },
      relations: ['drawRound', 'drawRound.product'],
    });

    const drawResultMap = new Map(
      drawResults.map((dr) => [
        dr.id,
        {
          ...dr,
          roundNumber: dr.drawRound?.roundNumber,
          winningNumber: dr.winningNumber,
          product: dr.drawRound?.product,
        },
      ]),
    );

    // 获取收货地址信息
    const shippingAddressIds = orders
      .map((o) => o.shippingAddressId)
      .filter((id) => id !== null);
    const shippingAddresses = await this.dataSource
      .getRepository('ShippingAddress')
      .findByIds(shippingAddressIds as number[]);
    const shippingAddressMap = new Map(shippingAddresses.map((sa) => [sa.id, sa]));

    // 获取统计数据
    const stats = await this.getPrizeOrderStats();

    const data = orders.map((order) => {
      const drawResult = drawResultMap.get(order.drawResultId!);
      const shippingAddress = shippingAddressMap.get(order.shippingAddressId!);

      return {
        drawResultId: order.drawResultId,
        shippingOrderNumber: order.orderNumber,
        prizeShippingStatus: order.prizeShippingStatus,
        prizeStatus: drawResult?.prizeStatus,
        product: order.productInfo
          ? {
              id: order.productId,
              name: order.productInfo.name,
              thumbnail: order.productInfo.thumbnail,
            }
          : null,
        winner: {
          userId: order.userId,
          userName: drawResult?.winnerUserName,
          avatar: drawResult?.winnerUserAvatar,
        },
        shippingAddress: shippingAddress
          ? {
              recipientName: shippingAddress.recipientName,
              phoneNumber: shippingAddress.phoneNumber,
              fullAddress: [
                shippingAddress.country,
                shippingAddress.state,
                shippingAddress.city,
                shippingAddress.streetAddress,
                shippingAddress.apartment,
                shippingAddress.zipCode,
              ]
                .filter(Boolean)
                .join(', '),
            }
          : null,
        logistics: {
          company: order.logisticsCompany,
          trackingNumber: order.trackingNumber,
          shippedAt: null,
          deliveredAt: order.deliveredAt,
        },
        prizeValue: drawResult?.prizeValue.toString() || '0',
        addressSubmittedAt: drawResult?.addressSubmittedAt,
        createdAt: order.createdAt,
      };
    });

    return {
      data,
      total,
      page,
      limit,
      stats: {
        pendingAddress: stats.pendingAddress,
        pendingShipment: stats.pendingShipment,
        shipped: stats.shipped,
        delivered: stats.delivered,
      },
    };
  }

  /**
   * 获取实物奖品订单详情（基于新的 Order 系统）
   */
  async getPrizeOrderDetail(drawResultId: number): Promise<any> {
    const result = await this.drawResultRepo.findOne({
      where: { id: drawResultId },
      relations: ['drawRound', 'drawRound.product'],
    });

    if (!result) {
      throw new NotFoundException('Prize order not found');
    }

    if (result.prizeType !== PrizeType.PHYSICAL) {
      throw new BadRequestException('This is not a physical prize');
    }

    // 如果已创建订单，获取订单信息
    let order = null;
    let timeline = [];
    if (result.orderId) {
      order = await this.dataSource.manager.findOne(Order, {
        where: { id: result.orderId },
        relations: ['shippingAddress'],
      });

      if (order) {
        timeline = await this.logisticsService.getOrderLogisticsTimeline(
          order.id,
        );
      }
    }

    // 构建时间线事件
    const events = [
      {
        event: 'WON',
        title: 'Won Prize',
        time: result.createdAt,
      },
    ];

    if (result.addressSubmittedAt) {
      events.push({
        event: 'ADDRESS_SUBMITTED',
        title: 'Address Submitted',
        time: result.addressSubmittedAt,
      });
    }

    if (order?.logisticsCompany) {
      events.push({
        event: 'SHIPPED',
        title: 'Shipped',
        description: `${order.logisticsCompany} ${order.trackingNumber}`,
        time: timeline.find((t) => t.nodeKey === 'PRIZE_SHIPPED')?.activatedAt,
      } as any);
    }

    if (order?.deliveredAt) {
      events.push({
        event: 'DELIVERED',
        title: 'Delivered',
        time: order.deliveredAt,
      });
    }

    return {
      drawResultId: result.id,
      orderId: order?.id,
      orderNumber: order?.orderNumber,
      prizeShippingStatus: order?.prizeShippingStatus,
      prizeStatus: result.prizeStatus,
      drawRoundId: result.drawRoundId,
      roundNumber: result.drawRound?.roundNumber,
      winningNumber: result.winningNumber,
      product: result.drawRound?.product
        ? {
            id: result.drawRound.product.id,
            name: result.drawRound.product.name,
            thumbnail: result.drawRound.product.thumbnail,
            images: result.drawRound.product.images,
          }
        : null,
      winner: {
        userId: result.winnerUserId,
        userName: result.winnerUserName,
        avatar: result.winnerUserAvatar,
      },
      shippingAddress: order?.shippingAddress || null,
      logistics: order
        ? {
            company: order.logisticsCompany,
            trackingNumber: order.trackingNumber,
            deliveredAt: order.deliveredAt,
          }
        : null,
      timeline: events,
      prizeValue: result.prizeValue.toString(),
      addressSubmittedAt: result.addressSubmittedAt,
      createdAt: result.createdAt,
    };
  }

  /**
   * 发货操作（基于新的 Order 系统）
   */
  async shipPrizeOrder(
    drawResultId: number,
    logisticsCompany: string,
    trackingNumber: string,
  ): Promise<{
    success: boolean;
    orderId: number;
    prizeShippingStatus: PrizeShippingStatus;
  }> {
    return await this.dataSource.transaction(async (manager) => {
      const result = await manager.findOne(DrawResult, {
        where: { id: drawResultId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!result) {
        throw new NotFoundException('Prize order not found');
      }

      if (!result.orderId) {
        throw new BadRequestException('Prize has not been claimed yet');
      }

      // 获取订单
      const order = await manager.findOne(Order, {
        where: { id: result.orderId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!order) {
        throw new NotFoundException('Order not found');
      }

      if (order.prizeShippingStatus !== PrizeShippingStatus.PENDING_SHIPMENT) {
        throw new BadRequestException(
          `Cannot ship order with status: ${order.prizeShippingStatus}`,
        );
      }

      // 更新订单发货信息
      order.logisticsCompany = logisticsCompany;
      order.trackingNumber = trackingNumber;
      order.prizeShippingStatus = PrizeShippingStatus.SHIPPED;

      await manager.save(order);

      // 更新物流时间线（传入事务管理器）
      await this.logisticsService.shipPrize(
        order,
        logisticsCompany,
        trackingNumber,
        manager,
      );

      return {
        success: true,
        orderId: order.id,
        prizeShippingStatus: order.prizeShippingStatus,
      };
    });
  }

  /**
   * 确认签收（基于新的 Order 系统）
   */
  async confirmPrizeDelivery(drawResultId: number): Promise<{
    success: boolean;
    orderId: number;
    prizeStatus: PrizeStatus;
    prizeShippingStatus: PrizeShippingStatus;
    deliveredAt: Date;
  }> {
    return await this.dataSource.transaction(async (manager) => {
      const result = await manager.findOne(DrawResult, {
        where: { id: drawResultId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!result) {
        throw new NotFoundException('Prize order not found');
      }

      if (!result.orderId) {
        throw new BadRequestException('Prize has not been claimed yet');
      }

      // 获取订单
      const order = await manager.findOne(Order, {
        where: { id: result.orderId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!order) {
        throw new NotFoundException('Order not found');
      }

      if (order.prizeShippingStatus !== PrizeShippingStatus.SHIPPED) {
        throw new BadRequestException(
          `Cannot confirm delivery for order with status: ${order.prizeShippingStatus}`,
        );
      }

      // 更新订单状态
      order.prizeShippingStatus = PrizeShippingStatus.DELIVERED;
      order.deliveredAt = new Date();
      await manager.save(order);

      // 更新 DrawResult 状态为已发放
      result.prizeStatus = PrizeStatus.DISTRIBUTED;
      result.prizeDistributedAt = new Date();
      await manager.save(result);

      // 更新物流时间线
      await this.logisticsService.confirmPrizeDelivery(order);

      return {
        success: true,
        orderId: order.id,
        prizeStatus: result.prizeStatus,
        prizeShippingStatus: order.prizeShippingStatus,
        deliveredAt: order.deliveredAt,
      };
    });
  }

  /**
   * 批量发货
   */
  async batchShipPrizeOrders(
    orders: Array<{
      drawResultId: number;
      logisticsCompany: string;
      trackingNumber: string;
    }>,
  ): Promise<{
    success: number;
    failed: number;
    errors: Array<{ drawResultId: number; error: string }>;
  }> {
    let success = 0;
    let failed = 0;
    const errors: Array<{ drawResultId: number; error: string }> = [];

    for (const order of orders) {
      try {
        await this.shipPrizeOrder(
          order.drawResultId,
          order.logisticsCompany,
          order.trackingNumber,
        );
        success++;
      } catch (error) {
        failed++;
        errors.push({
          drawResultId: order.drawResultId,
          error: error.message || 'Unknown error',
        });
      }
    }

    return { success, failed, errors };
  }
}
