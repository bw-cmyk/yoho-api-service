import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, In, Like, Between } from 'typeorm';
import { DrawRound, DrawRoundStatus } from '../../ecommerce/entities/draw-round.entity';
import {
  DrawResult,
  PrizeType,
  PrizeStatus,
} from '../../ecommerce/entities/draw-result.entity';
import { DrawService } from '../../ecommerce/services/draw.service';
import { LogisticsService } from '../../ecommerce/services/logistics.service';
import { PrizeShippingStatus } from '../../ecommerce/enums/ecommerce.enums';
import { Product } from '../../ecommerce/entities/product.entity';
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
      resultsMap = results.reduce(
        (acc, r) => {
          acc[r.drawRoundId] = r;
          return acc;
        },
        {} as Record<number, DrawResult>,
      );
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
   * 获取实物奖品订单统计
   */
  async getPrizeOrderStats(): Promise<{
    pendingAddress: number;
    pendingShipment: number;
    shipped: number;
    delivered: number;
    total: number;
  }> {
    const results = await this.drawResultRepo
      .createQueryBuilder('result')
      .select('result.prize_shipping_status', 'status')
      .addSelect('COUNT(*)', 'count')
      .where('result.prize_type = :type', { type: PrizeType.PHYSICAL })
      .andWhere('result.winner_user_id IS NOT NULL')
      .groupBy('result.prize_shipping_status')
      .getRawMany();

    const statsMap = results.reduce(
      (acc, row) => {
        // NULL 状态视为 PENDING_ADDRESS
        const status = row.status || PrizeShippingStatus.PENDING_ADDRESS;
        acc[status] = (acc[status] || 0) + parseInt(row.count, 10);
        return acc;
      },
      {} as Record<string, number>,
    );

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
   * 获取实物奖品订单列表
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

    // 构建查询条件
    const qb = this.drawResultRepo
      .createQueryBuilder('result')
      .where('result.prize_type = :type', { type: PrizeType.PHYSICAL })
      .andWhere('result.winner_user_id IS NOT NULL');

    if (status) {
      if (status === PrizeShippingStatus.PENDING_ADDRESS) {
        // 对于 PENDING_ADDRESS 状态，包含 NULL 值
        qb.andWhere(
          '(result.prize_shipping_status = :status OR result.prize_shipping_status IS NULL)',
          { status },
        );
      } else {
        qb.andWhere('result.prize_shipping_status = :status', { status });
      }
    }
    // 不再过滤 NULL 值，因为 NULL 视为 PENDING_ADDRESS

    if (keyword) {
      qb.andWhere(
        '(result.shipping_order_number LIKE :keyword OR result.winner_user_name LIKE :keyword OR result.tracking_number LIKE :keyword)',
        { keyword: `%${keyword}%` },
      );
    }

    if (startDate) {
      qb.andWhere('result.created_at >= :startDate', {
        startDate: new Date(startDate),
      });
    }

    if (endDate) {
      qb.andWhere('result.created_at <= :endDate', {
        endDate: new Date(endDate + 'T23:59:59'),
      });
    }

    qb.orderBy('result.address_submitted_at', 'DESC', 'NULLS LAST')
      .addOrderBy('result.created_at', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [results, total] = await qb.getManyAndCount();

    // 获取关联的商品信息
    const drawRoundIds = results.map((r) => r.drawRoundId);
    let productMap: Map<number, any> = new Map();

    if (drawRoundIds.length > 0) {
      const rounds = await this.drawRoundRepo.find({
        where: { id: In(drawRoundIds) },
        relations: ['product'],
      });
      rounds.forEach((round) => {
        if (round.product) {
          productMap.set(round.id, {
            id: round.product.id,
            name: round.product.name,
            thumbnail: round.product.thumbnail,
          });
        }
      });
    }

    // 获取统计数据
    const stats = await this.getPrizeOrderStats();

    const data = results.map((result) => ({
      drawResultId: result.id,
      shippingOrderNumber: result.shippingOrderNumber,
      // NULL 视为 PENDING_ADDRESS
      prizeShippingStatus:
        result.prizeShippingStatus || PrizeShippingStatus.PENDING_ADDRESS,
      prizeStatus: result.prizeStatus,
      product: productMap.get(result.drawRoundId) || null,
      winner: {
        userId: result.winnerUserId,
        userName: result.winnerUserName,
        avatar: result.winnerUserAvatar,
      },
      shippingAddress: result.shippingAddressSnapshot
        ? {
            recipientName: result.shippingAddressSnapshot.recipientName,
            phoneNumber: result.shippingAddressSnapshot.phoneNumber,
            fullAddress: [
              result.shippingAddressSnapshot.country,
              result.shippingAddressSnapshot.state,
              result.shippingAddressSnapshot.city,
              result.shippingAddressSnapshot.streetAddress,
              result.shippingAddressSnapshot.apartment,
              result.shippingAddressSnapshot.zipCode,
            ]
              .filter(Boolean)
              .join(', '),
          }
        : null,
      logistics: {
        company: result.logisticsCompany,
        trackingNumber: result.trackingNumber,
        shippedAt: result.shippedAt,
        deliveredAt: result.deliveredAt,
      },
      prizeValue: result.prizeValue.toString(),
      addressSubmittedAt: result.addressSubmittedAt,
      createdAt: result.createdAt,
    }));

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
   * 获取实物奖品订单详情
   */
  async getPrizeOrderDetail(drawResultId: number): Promise<any> {
    const result = await this.drawResultRepo.findOne({
      where: { id: drawResultId },
    });

    if (!result) {
      throw new NotFoundException('Prize order not found');
    }

    if (result.prizeType !== PrizeType.PHYSICAL) {
      throw new BadRequestException('This is not a physical prize');
    }

    // 获取商品信息
    const round = await this.drawRoundRepo.findOne({
      where: { id: result.drawRoundId },
      relations: ['product'],
    });

    // 获取物流时间线
    const timeline = await this.logisticsService.getPrizeShippingTimeline(
      drawResultId,
    );

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

    if (result.shippedAt) {
      events.push({
        event: 'SHIPPED',
        title: 'Shipped',
        description: `${result.logisticsCompany} ${result.trackingNumber}`,
        time: result.shippedAt,
      } as any);
    }

    if (result.deliveredAt) {
      events.push({
        event: 'DELIVERED',
        title: 'Delivered',
        time: result.deliveredAt,
      });
    }

    return {
      drawResultId: result.id,
      shippingOrderNumber: result.shippingOrderNumber,
      prizeShippingStatus: result.prizeShippingStatus,
      prizeStatus: result.prizeStatus,
      drawRoundId: result.drawRoundId,
      roundNumber: round?.roundNumber,
      winningNumber: result.winningNumber,
      product: round?.product
        ? {
            id: round.product.id,
            name: round.product.name,
            thumbnail: round.product.thumbnail,
            images: round.product.images,
          }
        : null,
      winner: {
        userId: result.winnerUserId,
        userName: result.winnerUserName,
        avatar: result.winnerUserAvatar,
      },
      shippingAddress: result.shippingAddressSnapshot,
      logistics: {
        company: result.logisticsCompany,
        trackingNumber: result.trackingNumber,
        shippedAt: result.shippedAt,
        deliveredAt: result.deliveredAt,
      },
      timeline: events,
      logisticsTimeline: timeline,
      prizeValue: result.prizeValue.toString(),
      addressSubmittedAt: result.addressSubmittedAt,
      createdAt: result.createdAt,
    };
  }

  /**
   * 发货操作
   */
  async shipPrizeOrder(
    drawResultId: number,
    logisticsCompany: string,
    trackingNumber: string,
  ): Promise<{
    success: boolean;
    drawResultId: number;
    prizeShippingStatus: PrizeShippingStatus;
    shippedAt: Date;
  }> {
    return await this.dataSource.transaction(async (manager) => {
      const result = await manager.findOne(DrawResult, {
        where: { id: drawResultId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!result) {
        throw new NotFoundException('Prize order not found');
      }

      if (result.prizeShippingStatus !== PrizeShippingStatus.PENDING_SHIPMENT) {
        throw new BadRequestException(
          `Cannot ship order with status: ${result.prizeShippingStatus}`,
        );
      }

      // 更新发货信息
      result.logisticsCompany = logisticsCompany;
      result.trackingNumber = trackingNumber;
      result.prizeShippingStatus = PrizeShippingStatus.SHIPPED;
      result.shippedAt = new Date();

      await manager.save(result);

      // 更新物流时间线
      await this.logisticsService.shipPrize(result, logisticsCompany, trackingNumber);

      return {
        success: true,
        drawResultId: result.id,
        prizeShippingStatus: result.prizeShippingStatus,
        shippedAt: result.shippedAt,
      };
    });
  }

  /**
   * 确认签收
   */
  async confirmPrizeDelivery(drawResultId: number): Promise<{
    success: boolean;
    drawResultId: number;
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

      if (result.prizeShippingStatus !== PrizeShippingStatus.SHIPPED) {
        throw new BadRequestException(
          `Cannot confirm delivery for order with status: ${result.prizeShippingStatus}`,
        );
      }

      // 更新状态
      result.prizeShippingStatus = PrizeShippingStatus.DELIVERED;
      result.prizeStatus = PrizeStatus.DISTRIBUTED;
      result.deliveredAt = new Date();
      result.prizeDistributedAt = new Date();

      await manager.save(result);

      // 更新物流时间线
      await this.logisticsService.confirmPrizeDelivery(result);

      return {
        success: true,
        drawResultId: result.id,
        prizeStatus: result.prizeStatus,
        prizeShippingStatus: result.prizeShippingStatus,
        deliveredAt: result.deliveredAt,
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
