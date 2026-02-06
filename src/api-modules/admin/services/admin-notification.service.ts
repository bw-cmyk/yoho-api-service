import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere, Between, Like, MoreThanOrEqual } from 'typeorm';
import { Notification } from '../../notification/entities/notification.entity';
import {
  NotificationType,
  NotificationTargetType,
} from '../../notification/enums/notification.enums';
import {
  CreateSystemNotificationDto,
  SendUserNotificationDto,
  QueryAdminNotificationsDto,
  NotificationStatsDto,
} from '../dto/admin-notification.dto';

@Injectable()
export class AdminNotificationService {
  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,
  ) {}

  /**
   * 创建系统广播通知
   */
  async createSystemNotification(
    dto: CreateSystemNotificationDto,
  ): Promise<Notification> {
    const notification = this.notificationRepository.create({
      type: dto.type || NotificationType.SYSTEM,
      targetType: NotificationTargetType.ALL,
      userId: null,
      title: dto.title,
      content: dto.content,
      imageUrl: dto.imageUrl || null,
      actionType: dto.actionType || null,
      actionValue: dto.actionValue || null,
    });

    return await this.notificationRepository.save(notification);
  }

  /**
   * 发送给指定用户
   */
  async sendToUser(dto: SendUserNotificationDto): Promise<Notification> {
    const notification = this.notificationRepository.create({
      type: dto.type || NotificationType.ACCOUNT,
      targetType: NotificationTargetType.SINGLE_USER,
      userId: dto.userId,
      title: dto.title,
      content: dto.content,
      imageUrl: dto.imageUrl || null,
      actionType: dto.actionType || null,
      actionValue: dto.actionValue || null,
      metadata: dto.metadata || null,
    });

    return await this.notificationRepository.save(notification);
  }

  /**
   * 获取所有通知（管理员视角）
   */
  async getAllNotifications(query: QueryAdminNotificationsDto): Promise<{
    data: Notification[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const { type, targetType, startDate, endDate, keyword, page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const where: FindOptionsWhere<Notification> = {};

    if (type) {
      where.type = type;
    }

    if (targetType) {
      where.targetType = targetType;
    }

    // 日期范围
    if (startDate && endDate) {
      where.createdAt = Between(
        new Date(startDate),
        new Date(endDate + 'T23:59:59'),
      );
    } else if (startDate) {
      where.createdAt = MoreThanOrEqual(new Date(startDate));
    }

    // 关键词搜索需要使用 QueryBuilder
    let queryBuilder = this.notificationRepository
      .createQueryBuilder('notification')
      .where(where);

    if (keyword) {
      queryBuilder = queryBuilder.andWhere(
        '(notification.title LIKE :keyword OR notification.content LIKE :keyword)',
        { keyword: `%${keyword}%` },
      );
    }

    const [data, total] = await queryBuilder
      .orderBy('notification.createdAt', 'DESC')
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * 获取通知统计
   */
  async getStats(): Promise<NotificationStatsDto> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [totalSent, systemBroadcasts, userNotifications, todaySent] =
      await Promise.all([
        this.notificationRepository.count(),
        this.notificationRepository.count({
          where: { targetType: NotificationTargetType.ALL },
        }),
        this.notificationRepository.count({
          where: { targetType: NotificationTargetType.SINGLE_USER },
        }),
        this.notificationRepository.count({
          where: { createdAt: MoreThanOrEqual(today) },
        }),
      ]);

    return {
      totalSent,
      systemBroadcasts,
      userNotifications,
      todaySent,
    };
  }

  /**
   * 删除通知
   */
  async deleteNotification(id: number): Promise<void> {
    const notification = await this.notificationRepository.findOne({
      where: { id },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    await this.notificationRepository.softDelete(id);
  }

  /**
   * 获取单个通知详情
   */
  async getNotificationById(id: number): Promise<Notification> {
    const notification = await this.notificationRepository.findOne({
      where: { id },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    return notification;
  }
}
