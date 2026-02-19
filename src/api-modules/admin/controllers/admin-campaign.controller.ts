import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AdminCampaignService } from '../services/admin-campaign.service';
import { CampaignStatus } from '../../task/entities/campaign.entity';

@ApiTags('Admin - 活动任务管理')
@ApiBearerAuth()
@Controller('api/v1/admin/campaigns')
export class AdminCampaignController {
  constructor(
    private readonly adminCampaignService: AdminCampaignService,
  ) {}

  // ==================== Campaign ====================

  @Get('stats')
  @ApiOperation({ summary: '获取活动统计' })
  getStats() {
    return this.adminCampaignService.getCampaignStats();
  }

  @Get()
  @ApiOperation({ summary: '获取活动列表' })
  findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('keyword') keyword?: string,
    @Query('status') status?: CampaignStatus,
  ) {
    return this.adminCampaignService.findAllCampaigns({
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 10,
      keyword,
      status,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: '获取活动详情（含任务和奖励）' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.adminCampaignService.findOneCampaign(id);
  }

  @Post()
  @ApiOperation({ summary: '创建活动' })
  create(
    @Body()
    body: {
      name: string;
      description?: string;
      code?: string;
      status?: CampaignStatus;
      startTime?: string;
      endTime?: string;
      participationConditions?: Record<string, any>;
      rewardConfig?: Record<string, any>;
      sortOrder?: number;
      isVisible?: boolean;
    },
  ) {
    const data = {
      ...body,
      startTime: body.startTime ? new Date(body.startTime) : undefined,
      endTime: body.endTime ? new Date(body.endTime) : undefined,
    };
    return this.adminCampaignService.createCampaign(data);
  }

  @Patch(':id')
  @ApiOperation({ summary: '更新活动' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body()
    body: {
      name?: string;
      description?: string;
      code?: string;
      status?: CampaignStatus;
      startTime?: string;
      endTime?: string;
      participationConditions?: Record<string, any>;
      rewardConfig?: Record<string, any>;
      sortOrder?: number;
      isVisible?: boolean;
    },
  ) {
    const data: any = { ...body };
    if (body.startTime !== undefined) {
      data.startTime = body.startTime ? new Date(body.startTime) : null;
    }
    if (body.endTime !== undefined) {
      data.endTime = body.endTime ? new Date(body.endTime) : null;
    }
    return this.adminCampaignService.updateCampaign(id, data);
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除活动' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.adminCampaignService.deleteCampaign(id);
  }

  @Post(':id/active')
  @ApiOperation({ summary: '激活活动' })
  setActive(@Param('id', ParseIntPipe) id: number) {
    return this.adminCampaignService.setCampaignStatus(
      id,
      CampaignStatus.ACTIVE,
    );
  }

  @Post(':id/pause')
  @ApiOperation({ summary: '暂停活动' })
  setPaused(@Param('id', ParseIntPipe) id: number) {
    return this.adminCampaignService.setCampaignStatus(
      id,
      CampaignStatus.PAUSED,
    );
  }

  @Post(':id/end')
  @ApiOperation({ summary: '结束活动' })
  setEnded(@Param('id', ParseIntPipe) id: number) {
    return this.adminCampaignService.setCampaignStatus(
      id,
      CampaignStatus.ENDED,
    );
  }

  // ==================== Task ====================

  @Get(':id/tasks')
  @ApiOperation({ summary: '获取活动下的任务列表' })
  findTasks(
    @Param('id', ParseIntPipe) campaignId: number,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.adminCampaignService.findAllTasks({
      campaignId,
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 50,
    });
  }

  @Post(':id/tasks')
  @ApiOperation({ summary: '创建任务' })
  createTask(
    @Param('id', ParseIntPipe) campaignId: number,
    @Body()
    body: {
      name: string;
      description?: string;
      type: string;
      repeatType?: string;
      maxCompletions?: number;
      completionConditions?: Record<string, any>;
      deadline?: string;
      redirectUrl?: string;
      sortOrder?: number;
      isLocked?: boolean;
      status?: string;
      rewards?: Array<{
        rewardType: string;
        grantType: string;
        amount?: number;
        amountConfig?: Record<string, any>;
        currency?: string;
        targetBalance?: string;
      }>;
    },
  ) {
    const { rewards, deadline, ...taskData } = body;
    const data = {
      ...taskData,
      campaignId,
      deadline: deadline ? new Date(deadline) : undefined,
    };
    return this.adminCampaignService.createTask(data as any, rewards as any);
  }

  @Get('tasks/:taskId')
  @ApiOperation({ summary: '获取任务详情' })
  findOneTask(@Param('taskId', ParseIntPipe) taskId: number) {
    return this.adminCampaignService.findOneTask(taskId);
  }

  @Patch('tasks/:taskId')
  @ApiOperation({ summary: '更新任务' })
  updateTask(
    @Param('taskId', ParseIntPipe) taskId: number,
    @Body()
    body: {
      name?: string;
      description?: string;
      type?: string;
      repeatType?: string;
      maxCompletions?: number;
      completionConditions?: Record<string, any>;
      deadline?: string;
      redirectUrl?: string;
      sortOrder?: number;
      isLocked?: boolean;
      status?: string;
    },
  ) {
    const { deadline, ...rest } = body;
    const data: any = { ...rest };
    if (deadline !== undefined) {
      data.deadline = deadline ? new Date(deadline) : null;
    }
    return this.adminCampaignService.updateTask(taskId, data);
  }

  @Delete('tasks/:taskId')
  @ApiOperation({ summary: '删除任务' })
  removeTask(@Param('taskId', ParseIntPipe) taskId: number) {
    return this.adminCampaignService.deleteTask(taskId);
  }

  // ==================== Task Reward ====================

  @Post('tasks/:taskId/rewards')
  @ApiOperation({ summary: '添加任务奖励' })
  addTaskReward(
    @Param('taskId', ParseIntPipe) taskId: number,
    @Body()
    body: {
      rewardType: string;
      grantType: string;
      amount?: number;
      amountConfig?: Record<string, any>;
      currency?: string;
      targetBalance?: string;
    },
  ) {
    return this.adminCampaignService.addTaskReward(taskId, body as any);
  }

  @Patch('rewards/:rewardId')
  @ApiOperation({ summary: '更新任务奖励' })
  updateTaskReward(
    @Param('rewardId', ParseIntPipe) rewardId: number,
    @Body()
    body: {
      rewardType?: string;
      grantType?: string;
      amount?: number;
      amountConfig?: Record<string, any>;
      currency?: string;
      targetBalance?: string;
    },
  ) {
    return this.adminCampaignService.updateTaskReward(rewardId, body as any);
  }

  @Delete('rewards/:rewardId')
  @ApiOperation({ summary: '删除任务奖励' })
  removeTaskReward(@Param('rewardId', ParseIntPipe) rewardId: number) {
    return this.adminCampaignService.deleteTaskReward(rewardId);
  }

  // ==================== Participants ====================

  @Get(':id/participants')
  @ApiOperation({ summary: '获取活动参与者列表' })
  getParticipants(
    @Param('id', ParseIntPipe) campaignId: number,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.adminCampaignService.getCampaignParticipants(campaignId, {
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 20,
    });
  }
}
