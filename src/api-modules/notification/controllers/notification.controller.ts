import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  ParseIntPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
} from '@nestjs/swagger';
import { Request as ExpressRequest } from 'express';
import { JwtAuthGuard } from '../../../common-modules/auth/jwt-auth.guard';
import { NotificationService } from '../services/notification.service';
import {
  QueryNotificationsDto,
  MarkAsReadDto,
  PaginatedNotificationsResponseDto,
  UnreadCountResponseDto,
} from '../dto/notification.dto';

@ApiTags('Notifications')
@ApiBearerAuth()
@Controller('/api/v1/notifications')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '获取通知列表' })
  @ApiResponse({ status: 200, type: PaginatedNotificationsResponseDto })
  async getNotifications(
    @Request() req: ExpressRequest,
    @Query() query: QueryNotificationsDto,
  ): Promise<PaginatedNotificationsResponseDto> {
    const { id: userId } = req.user as any;
    return await this.notificationService.getUserNotifications(userId, query);
  }

  @Get('unread-count')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '获取未读数量' })
  @ApiResponse({ status: 200, type: UnreadCountResponseDto })
  async getUnreadCount(
    @Request() req: ExpressRequest,
  ): Promise<UnreadCountResponseDto> {
    const { id: userId } = req.user as any;
    const unreadCount = await this.notificationService.getUnreadCount(userId);
    return { unreadCount };
  }

  @Post('mark-read')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '标记通知为已读' })
  @ApiResponse({ status: 200, description: '标记成功' })
  async markAsRead(
    @Request() req: ExpressRequest,
    @Body() dto: MarkAsReadDto,
  ): Promise<{ success: boolean }> {
    const { id: userId } = req.user as any;
    await this.notificationService.markAsRead(userId, dto.notificationIds);
    return { success: true };
  }

  @Post('mark-all-read')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '标记所有通知为已读' })
  @ApiResponse({ status: 200, description: '标记成功' })
  async markAllAsRead(
    @Request() req: ExpressRequest,
  ): Promise<{ success: boolean }> {
    const { id: userId } = req.user as any;
    await this.notificationService.markAllAsRead(userId);
    return { success: true };
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '删除通知' })
  @ApiResponse({ status: 200, description: '删除成功' })
  async deleteNotification(
    @Request() req: ExpressRequest,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<{ success: boolean }> {
    const { id: userId } = req.user as any;
    await this.notificationService.deleteNotification(userId, id);
    return { success: true };
  }
}
