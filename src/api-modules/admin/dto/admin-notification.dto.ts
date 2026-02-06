import {
  IsString,
  IsOptional,
  IsEnum,
  IsObject,
  MaxLength,
  IsNotEmpty,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  NotificationType,
  NotificationTargetType,
} from '../../notification/enums/notification.enums';

export class CreateSystemNotificationDto {
  @ApiProperty({ description: '标题', maxLength: 255 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title: string;

  @ApiProperty({ description: '内容' })
  @IsString()
  @IsNotEmpty()
  content: string;

  @ApiPropertyOptional({
    enum: NotificationType,
    description: '通知类型',
    default: NotificationType.SYSTEM,
  })
  @IsEnum(NotificationType)
  @IsOptional()
  type?: NotificationType = NotificationType.SYSTEM;

  @ApiPropertyOptional({ description: '图片URL' })
  @IsString()
  @IsOptional()
  imageUrl?: string;

  @ApiPropertyOptional({ description: '操作类型 (ROUTER, EXTERNAL_LINK)' })
  @IsString()
  @IsOptional()
  actionType?: string;

  @ApiPropertyOptional({ description: '操作值 (路由路径或URL)' })
  @IsString()
  @IsOptional()
  actionValue?: string;
}

export class SendUserNotificationDto {
  @ApiProperty({ description: '用户ID' })
  @IsString()
  @IsNotEmpty()
  userId: string;

  @ApiProperty({ description: '标题', maxLength: 255 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title: string;

  @ApiProperty({ description: '内容' })
  @IsString()
  @IsNotEmpty()
  content: string;

  @ApiPropertyOptional({
    enum: NotificationType,
    description: '通知类型',
    default: NotificationType.ACCOUNT,
  })
  @IsEnum(NotificationType)
  @IsOptional()
  type?: NotificationType = NotificationType.ACCOUNT;

  @ApiPropertyOptional({ description: '图片URL' })
  @IsString()
  @IsOptional()
  imageUrl?: string;

  @ApiPropertyOptional({ description: '操作类型 (ROUTER, EXTERNAL_LINK)' })
  @IsString()
  @IsOptional()
  actionType?: string;

  @ApiPropertyOptional({ description: '操作值 (路由路径或URL)' })
  @IsString()
  @IsOptional()
  actionValue?: string;

  @ApiPropertyOptional({ description: '附加数据' })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}

export class QueryAdminNotificationsDto {
  @ApiPropertyOptional({ enum: NotificationType, description: '通知类型' })
  @IsEnum(NotificationType)
  @IsOptional()
  type?: NotificationType;

  @ApiPropertyOptional({ enum: NotificationTargetType, description: '目标类型' })
  @IsEnum(NotificationTargetType)
  @IsOptional()
  targetType?: NotificationTargetType;

  @ApiPropertyOptional({ description: '开始日期 (YYYY-MM-DD)' })
  @IsString()
  @IsOptional()
  startDate?: string;

  @ApiPropertyOptional({ description: '结束日期 (YYYY-MM-DD)' })
  @IsString()
  @IsOptional()
  endDate?: string;

  @ApiPropertyOptional({ description: '搜索关键词 (标题/内容)' })
  @IsString()
  @IsOptional()
  keyword?: string;

  @ApiPropertyOptional({ description: '页码', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: '每页数量', default: 20 })
  @IsOptional()
  @Type(() => Number)
  @Min(1)
  limit?: number = 20;
}

export class NotificationStatsDto {
  @ApiProperty({ description: '总发送数' })
  totalSent: number;

  @ApiProperty({ description: '系统广播数' })
  systemBroadcasts: number;

  @ApiProperty({ description: '用户通知数' })
  userNotifications: number;

  @ApiProperty({ description: '今日发送数' })
  todaySent: number;
}
