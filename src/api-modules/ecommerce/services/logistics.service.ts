import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LogisticsTimeline } from '../entities/logistics-timeline.entity';
import { Order } from '../entities';
import { DrawResult } from '../entities/draw-result.entity';
import {
  LogisticsNodeKey,
  LogisticsSourceType,
  InstantBuyOrderStatus,
} from '../enums/ecommerce.enums';

/**
 * 物流节点配置
 */
interface LogisticsNodeConfig {
  key: LogisticsNodeKey;
  title: string;
  description: string;
  dayIndex: number; // 应该在第几天点亮（0表示当天）
}

/**
 * 正常流程的物流节点配置
 */
const NORMAL_LOGISTICS_NODES: LogisticsNodeConfig[] = [
  {
    key: LogisticsNodeKey.ORDER_CONFIRMED,
    title: 'Order Confirmed',
    description: 'Your order has been confirmed and is being prepared',
    dayIndex: 0,
  },
  {
    key: LogisticsNodeKey.ORDER_PROCESSING,
    title: 'Order Processing',
    description: 'Merchant is preparing your order',
    dayIndex: 1,
  },
  {
    key: LogisticsNodeKey.SHIPPED_FROM_ORIGIN,
    title: 'Shipped from Origin',
    description: 'Package has been shipped from origin country',
    dayIndex: 3,
  },
  {
    key: LogisticsNodeKey.ARRIVED_ORIGIN_HUB,
    title: 'Arrived at Origin Hub',
    description: 'Package arrived at origin logistics hub',
    dayIndex: 5,
  },
  {
    key: LogisticsNodeKey.EXPORT_CLEARANCE,
    title: 'Export Customs Clearance',
    description: 'Export customs clearance in progress',
    dayIndex: 7,
  },
  {
    key: LogisticsNodeKey.EXPORT_CLEARED,
    title: 'Export Customs Cleared',
    description: 'Successfully cleared export customs',
    dayIndex: 10,
  },
  {
    key: LogisticsNodeKey.AT_ORIGIN_PORT,
    title: 'At Origin Port',
    description: 'Package is at origin port',
    dayIndex: 12,
  },
  {
    key: LogisticsNodeKey.DEPARTED_ORIGIN_PORT,
    title: 'Departed from Origin Port',
    description: 'Vessel has departed from origin port',
    dayIndex: 14,
  },
  {
    key: LogisticsNodeKey.IN_VESSEL,
    title: 'In Vessel',
    description: 'Package is on the vessel',
    dayIndex: 15,
  },
  {
    key: LogisticsNodeKey.AT_DESTINATION_PORT,
    title: 'At Destination Port',
    description: 'Package has arrived at destination port',
    dayIndex: 21,
  },
  {
    key: LogisticsNodeKey.IMPORT_CLEARANCE,
    title: 'Import Customs Clearance',
    description: 'Import customs clearance in progress',
    dayIndex: 23,
  },
  {
    key: LogisticsNodeKey.IMPORT_CLEARED,
    title: 'Import Customs Cleared',
    description: 'Successfully cleared import customs',
    dayIndex: null, // 会在入境清关失败之前激活
  },
  {
    key: LogisticsNodeKey.ARRIVED_DESTINATION_HUB,
    title: 'Arrived at Destination Hub',
    description: 'Package arrived at destination logistics hub',
    dayIndex: null,
  },
  {
    key: LogisticsNodeKey.OUT_FOR_DELIVERY,
    title: 'Out for Delivery',
    description: 'Package is out for delivery today',
    dayIndex: null,
  },
  {
    key: LogisticsNodeKey.DELIVERED,
    title: 'Delivered',
    description: 'Package has been successfully delivered',
    dayIndex: null,
  },
];

/**
 * 清关失败的物流节点配置
 */
const CUSTOMS_FAILED_NODES: LogisticsNodeConfig[] = [
  {
    key: LogisticsNodeKey.CUSTOMS_CLEARANCE_FAILED,
    title: 'Customs Clearance Failed',
    description: 'Package failed customs clearance',
    dayIndex: 29,
  },
  {
    key: LogisticsNodeKey.RETURN_TO_SENDER,
    title: 'Return to Sender - Customs',
    description: 'Package is being returned to sender',
    dayIndex: 30,
  },
];

/**
 * 停止配送的物流节点配置
 */
const DELIVERY_STOPPED_NODE: LogisticsNodeConfig = {
  key: LogisticsNodeKey.DELIVERY_STOPPED,
  title: 'Delivery Stopped',
  description: 'Delivery has been stopped',
  dayIndex: null, // 立即激活
};

/**
 * 一元购实物奖品物流节点配置
 */
const PRIZE_SHIPPING_NODES: LogisticsNodeConfig[] = [
  {
    key: LogisticsNodeKey.PRIZE_PENDING_SHIPMENT,
    title: 'Pending Shipment',
    description: 'Prize is being prepared for shipment',
    dayIndex: 0, // 提交地址后立即激活
  },
  {
    key: LogisticsNodeKey.PRIZE_SHIPPED,
    title: 'Shipped',
    description: 'Prize has been shipped',
    dayIndex: null, // 运营手动激活
  },
  {
    key: LogisticsNodeKey.PRIZE_DELIVERED,
    title: 'Delivered',
    description: 'Prize has been delivered',
    dayIndex: null, // 运营手动激活或自动激活
  },
];

@Injectable()
export class LogisticsService {
  constructor(
    @InjectRepository(LogisticsTimeline)
    private readonly timelineRepository: Repository<LogisticsTimeline>,
  ) {}

  /**
   * 为订单初始化物流时间线
   */
  async initializeLogisticsTimeline(
    order: Order,
  ): Promise<LogisticsTimeline[]> {
    if (order.type !== 'INSTANT_BUY') {
      return [];
    }

    // 创建正常流程的节点
    const nodes = NORMAL_LOGISTICS_NODES.map((config) =>
      this.timelineRepository.create({
        orderId: order.id,
        nodeKey: config.key,
        title: config.title,
        description: config.description,
        dayIndex: config.dayIndex,
        activatedAt: null,
      }),
    );

    return await this.timelineRepository.save(nodes);
  }

  /**
   * 推进物流时间线（根据订单创建后的天数）
   */
  async advanceLogisticsTimeline(order: Order): Promise<void> {
    if (order.type !== 'INSTANT_BUY') {
      return;
    }

    // 计算订单创建后的天数
    const now = new Date();
    const daysSinceOrder = Math.floor(
      (now.getTime() - order.createdAt.getTime()) / (1000 * 60 * 60 * 24),
    );

    // 获取所有物流节点
    const timelines = await this.timelineRepository.find({
      where: { orderId: order.id },
      order: { dayIndex: 'ASC' },
    });

    // 激活应该激活的节点
    for (const timeline of timelines) {
      if (
        !timeline.activatedAt &&
        timeline.dayIndex !== null &&
        daysSinceOrder >= timeline.dayIndex
      ) {
        timeline.activate();
        await this.timelineRepository.save(timeline);
      }
    }

    // 第29-30天：检查是否需要切换到清关失败流程
    if (daysSinceOrder >= 29 && daysSinceOrder <= 30) {
      await this.handleCustomsFailure(order);
    }

    // 第30天：检查是否需要自动取消订单
    if (
      daysSinceOrder >= 30 &&
      order.instantBuyStatus !== InstantBuyOrderStatus.CANCELLED
    ) {
      // 这里应该调用订单服务的自动取消方法
      // 暂时只处理物流节点
    }
  }

  /**
   * 处理清关失败流程
   */
  async handleCustomsFailure(order: Order): Promise<void> {
    // 检查是否已经处理过清关失败
    const existingFailureNode = await this.timelineRepository.findOne({
      where: {
        orderId: order.id,
        nodeKey: LogisticsNodeKey.CUSTOMS_CLEARANCE_FAILED,
      },
    });

    if (existingFailureNode) {
      return; // 已经处理过
    }

    // 创建清关失败节点
    const failureNodes = CUSTOMS_FAILED_NODES.map((config) =>
      this.timelineRepository.create({
        orderId: order.id,
        nodeKey: config.key,
        title: config.title,
        description: config.description,
        dayIndex: config.dayIndex,
        activatedAt: null,
      }),
    );

    await this.timelineRepository.save(failureNodes);

    // 激活清关失败节点（第29天）
    const daysSinceOrder = Math.floor(
      (new Date().getTime() - order.createdAt.getTime()) /
        (1000 * 60 * 60 * 24),
    );

    if (daysSinceOrder >= 29) {
      const customsFailedNode = failureNodes.find(
        (n) => n.nodeKey === LogisticsNodeKey.CUSTOMS_CLEARANCE_FAILED,
      );
      if (customsFailedNode) {
        customsFailedNode.activate();
        await this.timelineRepository.save(customsFailedNode);
      }
    }

    // 如果已经超过30天，也激活退回节点
    if (daysSinceOrder >= 30) {
      const returnNode = failureNodes.find(
        (n) => n.nodeKey === LogisticsNodeKey.RETURN_TO_SENDER,
      );
      if (returnNode) {
        returnNode.activate();
        await this.timelineRepository.save(returnNode);
      }
    }
  }

  /**
   * 处理停止配送（用户申请退款后）
   */
  async handleDeliveryStopped(order: Order): Promise<void> {
    // 检查是否已经处理过停止配送
    const existingNode = await this.timelineRepository.findOne({
      where: {
        orderId: order.id,
        nodeKey: LogisticsNodeKey.DELIVERY_STOPPED,
      },
    });

    if (existingNode) {
      return; // 已经处理过
    }

    // 创建停止配送节点并立即激活
    const stoppedNode = this.timelineRepository.create({
      orderId: order.id,
      nodeKey: LogisticsNodeKey.DELIVERY_STOPPED,
      title: DELIVERY_STOPPED_NODE.title,
      description: DELIVERY_STOPPED_NODE.description,
      dayIndex: null,
      activatedAt: new Date(),
    });

    await this.timelineRepository.save(stoppedNode);
  }

  /**
   * 获取订单的物流时间线
   */
  async getOrderLogisticsTimeline(
    orderId: number,
  ): Promise<LogisticsTimeline[]> {
    return await this.timelineRepository.find({
      where: { orderId },
      order: { dayIndex: 'ASC', createdAt: 'ASC' },
    });
  }

  /**
   * 获取订单当前物流状态
   */
  async getCurrentLogisticsStatus(
    orderId: number,
  ): Promise<LogisticsTimeline | null> {
    const timelines = await this.getOrderLogisticsTimeline(orderId);

    // 找到最后一个已激活的节点
    const activatedNodes = timelines.filter((t) => t.isActivated());
    if (activatedNodes.length === 0) {
      return null;
    }

    return activatedNodes[activatedNodes.length - 1];
  }

  // ==================== 一元购实物奖品物流管理 ====================

  /**
   * 为一元购实物奖品初始化物流时间线
   */
  async initializePrizeShippingTimeline(
    drawResult: DrawResult,
  ): Promise<LogisticsTimeline[]> {
    // 创建一元购物流节点
    const nodes = PRIZE_SHIPPING_NODES.map((config) =>
      this.timelineRepository.create({
        orderId: null,
        drawResultId: drawResult.id,
        sourceType: LogisticsSourceType.PRIZE_SHIPPING,
        nodeKey: config.key,
        title: config.title,
        description: config.description,
        dayIndex: config.dayIndex,
        activatedAt: config.dayIndex === 0 ? new Date() : null, // dayIndex=0 立即激活
      }),
    );

    return await this.timelineRepository.save(nodes);
  }

  /**
   * 一元购实物奖品发货
   */
  async shipPrize(
    drawResult: DrawResult,
    logisticsCompany: string,
    trackingNumber: string,
  ): Promise<void> {
    // 激活"已发货"节点
    const shippedNode = await this.timelineRepository.findOne({
      where: {
        drawResultId: drawResult.id,
        sourceType: LogisticsSourceType.PRIZE_SHIPPING,
        nodeKey: LogisticsNodeKey.PRIZE_SHIPPED,
      },
    });

    if (shippedNode && !shippedNode.activatedAt) {
      shippedNode.activatedAt = new Date();
      shippedNode.description = `Shipped via ${logisticsCompany}, Tracking: ${trackingNumber}`;
      await this.timelineRepository.save(shippedNode);
    }
  }

  /**
   * 一元购实物奖品确认签收
   */
  async confirmPrizeDelivery(drawResult: DrawResult): Promise<void> {
    // 激活"已签收"节点
    const deliveredNode = await this.timelineRepository.findOne({
      where: {
        drawResultId: drawResult.id,
        sourceType: LogisticsSourceType.PRIZE_SHIPPING,
        nodeKey: LogisticsNodeKey.PRIZE_DELIVERED,
      },
    });

    if (deliveredNode && !deliveredNode.activatedAt) {
      deliveredNode.activatedAt = new Date();
      await this.timelineRepository.save(deliveredNode);
    }
  }

  /**
   * 获取一元购实物奖品的物流时间线
   */
  async getPrizeShippingTimeline(
    drawResultId: number,
  ): Promise<LogisticsTimeline[]> {
    return await this.timelineRepository.find({
      where: {
        drawResultId,
        sourceType: LogisticsSourceType.PRIZE_SHIPPING,
      },
      order: { createdAt: 'ASC' },
    });
  }

  /**
   * 获取一元购实物奖品当前物流状态
   */
  async getCurrentPrizeShippingStatus(
    drawResultId: number,
  ): Promise<LogisticsTimeline | null> {
    const timelines = await this.getPrizeShippingTimeline(drawResultId);
    const activatedNodes = timelines.filter((t) => t.isActivated());

    if (activatedNodes.length === 0) {
      return null;
    }

    return activatedNodes[activatedNodes.length - 1];
  }
}
