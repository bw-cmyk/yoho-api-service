import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
} from '@nestjs/swagger';
import { AdminJwtGuard } from '../guards/admin-jwt.guard';
import { AdminNotificationService } from '../services/admin-notification.service';
import {
  CreateSystemNotificationDto,
  SendUserNotificationDto,
  QueryAdminNotificationsDto,
  NotificationStatsDto,
} from '../dto/admin-notification.dto';
import { Notification } from '../../notification/entities/notification.entity';

@ApiTags('Admin - Notification Management')
@ApiBearerAuth()
@UseGuards(AdminJwtGuard)
@Controller('/api/v1/admin/notifications')
export class AdminNotificationController {
  constructor(
    private readonly adminNotificationService: AdminNotificationService,
  ) {}

  @Get()
  @ApiOperation({ summary: '获取所有通知列表' })
  @ApiResponse({ status: 200, description: '返回分页通知列表' })
  async getAllNotifications(@Query() query: QueryAdminNotificationsDto): Promise<{
    data: Notification[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    return await this.adminNotificationService.getAllNotifications(query);
  }

  @Get('stats')
  @ApiOperation({ summary: '获取通知统计数据' })
  @ApiResponse({ status: 200, type: NotificationStatsDto })
  async getStats(): Promise<NotificationStatsDto> {
    return await this.adminNotificationService.getStats();
  }

  @Get(':id')
  @ApiOperation({ summary: '获取通知详情' })
  @ApiResponse({ status: 200, type: Notification })
  async getNotificationById(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<Notification> {
    return await this.adminNotificationService.getNotificationById(id);
  }

  @Post('system')
  @ApiOperation({ summary: '创建系统广播通知' })
  @ApiResponse({ status: 201, type: Notification })
  async createSystemNotification(
    @Body() dto: CreateSystemNotificationDto,
  ): Promise<Notification> {
    return await this.adminNotificationService.createSystemNotification(dto);
  }

  @Post('user')
  @ApiOperation({ summary: '发送给指定用户' })
  @ApiResponse({ status: 201, type: Notification })
  async sendToUser(@Body() dto: SendUserNotificationDto): Promise<Notification> {
    return await this.adminNotificationService.sendToUser(dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除通知' })
  @ApiResponse({ status: 200, description: '删除成功' })
  async deleteNotification(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<{ success: boolean }> {
    await this.adminNotificationService.deleteNotification(id);
    return { success: true };
  }
}
