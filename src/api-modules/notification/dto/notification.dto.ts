import {
  IsString,
  IsOptional,
  IsEnum,
  IsArray,
  IsNumber,
  Min,
  ArrayMinSize,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  NotificationType,
  NotificationStatus,
} from '../enums/notification.enums';

export class QueryNotificationsDto {
  @ApiPropertyOptional({ enum: NotificationStatus, description: '通知状态' })
  @IsEnum(NotificationStatus)
  @IsOptional()
  status?: NotificationStatus;

  @ApiPropertyOptional({ enum: NotificationType, description: '通知类型' })
  @IsEnum(NotificationType)
  @IsOptional()
  type?: NotificationType;

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

export class MarkAsReadDto {
  @ApiProperty({ description: '通知ID列表', type: [Number] })
  @IsArray()
  @ArrayMinSize(1)
  @IsNumber({}, { each: true })
  @Type(() => Number)
  notificationIds: number[];
}

export class NotificationResponseDto {
  @ApiProperty({ description: '通知ID' })
  id: number;

  @ApiProperty({ enum: NotificationType, description: '通知类型' })
  type: NotificationType;

  @ApiProperty({ description: '标题' })
  title: string;

  @ApiProperty({ description: '内容' })
  content: string;

  @ApiPropertyOptional({ description: '附加数据' })
  metadata: Record<string, any> | null;

  @ApiPropertyOptional({ description: '图片URL' })
  imageUrl: string | null;

  @ApiPropertyOptional({ description: '操作类型' })
  actionType: string | null;

  @ApiPropertyOptional({ description: '操作值' })
  actionValue: string | null;

  @ApiProperty({ enum: NotificationStatus, description: '状态' })
  status: NotificationStatus;

  @ApiProperty({ description: '创建时间' })
  createdAt: Date;

  @ApiPropertyOptional({ description: '阅读时间' })
  readAt: Date | null;
}

export class PaginatedNotificationsResponseDto {
  @ApiProperty({ type: [NotificationResponseDto], description: '通知列表' })
  data: NotificationResponseDto[];

  @ApiProperty({ description: '总数' })
  total: number;

  @ApiProperty({ description: '当前页码' })
  page: number;

  @ApiProperty({ description: '每页数量' })
  limit: number;

  @ApiProperty({ description: '总页数' })
  totalPages: number;
}

export class UnreadCountResponseDto {
  @ApiProperty({ description: '未读数量' })
  unreadCount: number;
}
