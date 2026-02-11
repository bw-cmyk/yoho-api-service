import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, FindOptionsWhere, Between, Like } from 'typeorm';
import { Notification } from '../entities/notification.entity';
import {
  NotificationType,
  NotificationStatus,
  NotificationTargetType,
} from '../enums/notification.enums';
import {
  QueryNotificationsDto,
  PaginatedNotificationsResponseDto,
} from '../dto/notification.dto';

export interface CreateNotificationParams {
  type: NotificationType;
  targetType: NotificationTargetType;
  userId?: string | null;
  title: string;
  content: string;
  metadata?: Record<string, any>;
  imageUrl?: string;
  actionType?: string;
  actionValue?: string;
}

@Injectable()
export class NotificationService {
  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,
  ) {}

  /**
   * 获取用户通知列表 (包括系统广播和个人通知)
   */
  async getUserNotifications(
    userId: string,
    query: QueryNotificationsDto,
  ): Promise<PaginatedNotificationsResponseDto> {
    const { status, type, page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    // 查询条件：用户的个人通知 + 系统广播
    const whereConditions: FindOptionsWhere<Notification>[] = [
      { userId, ...(status && { status }), ...(type && { type }) },
      {
        targetType: NotificationTargetType.ALL,
        ...(status && { status }),
        ...(type && { type }),
      },
    ];

    const [data, total] = await this.notificationRepository.findAndCount({
      where: whereConditions,
      skip,
      take: limit,
      order: { createdAt: 'DESC' },
    });

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * 获取未读数量
   */
  async getUnreadCount(userId: string): Promise<number> {
    const count = await this.notificationRepository.count({
      where: [
        { userId, status: NotificationStatus.UNREAD },
        { targetType: NotificationTargetType.ALL, status: NotificationStatus.UNREAD },
      ],
    });
    return count;
  }

  /**
   * 标记通知为已读
   */
  async markAsRead(userId: string, notificationIds: number[]): Promise<void> {
    const now = new Date();
    await this.notificationRepository.update(
      {
        id: In(notificationIds),
        userId,
        status: NotificationStatus.UNREAD,
      },
      {
        status: NotificationStatus.READ,
        readAt: now,
      },
    );

    // 也更新系统广播通知（如果用户查看了）
    await this.notificationRepository.update(
      {
        id: In(notificationIds),
        targetType: NotificationTargetType.ALL,
        status: NotificationStatus.UNREAD,
      },
      {
        status: NotificationStatus.READ,
        readAt: now,
      },
    );
  }

  /**
   * 标记所有通知为已读
   */
  async markAllAsRead(userId: string): Promise<void> {
    const now = new Date();
    await this.notificationRepository.update(
      {
        userId,
        status: NotificationStatus.UNREAD,
      },
      {
        status: NotificationStatus.READ,
        readAt: now,
      },
    );
  }

  /**
   * 删除通知 (软删除)
   */
  async deleteNotification(
    userId: string,
    notificationId: number,
  ): Promise<void> {
    const notification = await this.notificationRepository.findOne({
      where: { id: notificationId, userId },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    await this.notificationRepository.softDelete(notificationId);
  }

  /**
   * 创建通知
   */
  async createNotification(
    params: CreateNotificationParams,
  ): Promise<Notification> {
    const notification = this.notificationRepository.create({
      type: params.type,
      targetType: params.targetType,
      userId: params.userId || null,
      title: params.title,
      content: params.content,
      metadata: params.metadata || null,
      imageUrl: params.imageUrl || null,
      actionType: params.actionType || null,
      actionValue: params.actionValue || null,
      status: NotificationStatus.UNREAD,
    });

    return await this.notificationRepository.save(notification);
  }

  /**
   * 创建系统广播
   */
  async createSystemBroadcast(params: {
    title: string;
    content: string;
    type?: NotificationType;
    imageUrl?: string;
    actionType?: string;
    actionValue?: string;
  }): Promise<Notification> {
    return this.createNotification({
      type: params.type || NotificationType.SYSTEM,
      targetType: NotificationTargetType.ALL,
      userId: null,
      title: params.title,
      content: params.content,
      imageUrl: params.imageUrl,
      actionType: params.actionType,
      actionValue: params.actionValue,
    });
  }

  /**
   * 发送给指定用户
   */
  async sendToUser(params: {
    userId: string;
    title: string;
    content: string;
    type?: NotificationType;
    imageUrl?: string;
    actionType?: string;
    actionValue?: string;
    metadata?: Record<string, any>;
  }): Promise<Notification> {
    return this.createNotification({
      type: params.type || NotificationType.ACCOUNT,
      targetType: NotificationTargetType.SINGLE_USER,
      userId: params.userId,
      title: params.title,
      content: params.content,
      imageUrl: params.imageUrl,
      actionType: params.actionType,
      actionValue: params.actionValue,
      metadata: params.metadata,
    });
  }

  /**
   * 发送中奖通知
   */
  async notifyPrizeWon(
    userId: string,
    data: {
      drawResultId: number;
      productName: string;
      productImage?: string;
      // 新增字段
      productId?: number;
      drawRoundId?: number;
      roundNumber?: number;
      winningNumber?: number;
      prizeType?: string;
      prizeValue?: string;
      totalParticipants?: number;
      userTicketCount?: number;
      winnerUserName?: string;
    },
  ): Promise<Notification> {
    return this.sendToUser({
      userId,
      title: 'Congratulations! You Won!',
      content: `You have won ${data.productName} in the lucky draw!`,
      type: NotificationType.PRIZE_WON,
      imageUrl: data.productImage,
      actionType: 'ROUTER',
      actionValue: `/orders/draw/${data.drawResultId}`,
      metadata: {
        drawResultId: data.drawResultId,
        // 产品信息
        product: {
          id: data.productId,
          name: data.productName,
          image: data.productImage,
        },
        // 轮次信息
        drawRound: {
          id: data.drawRoundId,
          roundNumber: data.roundNumber,
          totalParticipants: data.totalParticipants,
        },
        // 中奖结果
        result: {
          winningNumber: data.winningNumber,
          prizeType: data.prizeType,
          prizeValue: data.prizeValue,
          userTicketCount: data.userTicketCount,
          winnerUserName: data.winnerUserName,
        },
      },
    });
  }

  /**
   * 发送发货更新通知
   */
  async notifyShippingUpdate(
    userId: string,
    data: {
      orderId?: number;
      orderNumber: string;
      status: string;
      productName: string;
      // 新增字段
      productId?: number;
      productImage?: string;
      drawResultId?: number;
      drawRoundId?: number;
      roundNumber?: number;
      logisticsCompany?: string;
      trackingNumber?: string;
      prizeValue?: string;
    },
  ): Promise<Notification> {
    const statusMessages: Record<string, string> = {
      SHIPPED: `Your order ${data.orderNumber} for ${data.productName} has been shipped!`,
      DELIVERED: `Your order ${data.orderNumber} for ${data.productName} has been delivered!`,
      IN_TRANSIT: `Your order ${data.orderNumber} is in transit.`,
    };

    const message =
      statusMessages[data.status] ||
      `Shipping update for order ${data.orderNumber}: ${data.status}`;

    return this.sendToUser({
      userId,
      title: 'Shipping Update',
      content: message,
      type: NotificationType.SHIPPING_UPDATE,
      imageUrl: data.productImage,
      actionType: 'ROUTER',
      actionValue: `/orders/${data.orderId || data.orderNumber}`,
      metadata: {
        orderId: data.orderId,
        orderNumber: data.orderNumber,
        // 产品信息
        product: {
          id: data.productId,
          name: data.productName,
          image: data.productImage,
        },
        // 抽奖关联
        draw: {
          resultId: data.drawResultId,
          roundId: data.drawRoundId,
          roundNumber: data.roundNumber,
        },
        // 物流信息
        logistics: {
          status: data.status,
          company: data.logisticsCompany,
          trackingNumber: data.trackingNumber,
        },
        // 奖品价值
        prizeValue: data.prizeValue,
      },
    });
  }

  /**
   * 发送订单更新通知
   */
  async notifyOrderUpdate(
    userId: string,
    data: {
      orderId: number;
      orderNumber: string;
      status: string;
      productName: string;
    },
  ): Promise<Notification> {
    const statusMessages: Record<string, string> = {
      CONFIRMED: `Your order ${data.orderNumber} for ${data.productName} has been confirmed!`,
      REFUNDED: `Your order ${data.orderNumber} has been refunded.`,
      CANCELLED: `Your order ${data.orderNumber} has been cancelled.`,
    };

    const message =
      statusMessages[data.status] ||
      `Order update for ${data.orderNumber}: ${data.status}`;

    return this.sendToUser({
      userId,
      title: 'Order Update',
      content: message,
      type: NotificationType.ORDER_UPDATE,
      actionType: 'ROUTER',
      actionValue: `/orders/${data.orderId}`,
      metadata: { orderId: data.orderId, orderNumber: data.orderNumber },
    });
  }
}
