import {
  Controller,
  Get,
  Post,
  Put,
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
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/common-modules/auth/jwt-auth.guard';
import { CampaignService } from '../services/campaign.service';
import { TaskService } from '../services/task.service';
import { TaskCompletionService } from '../services/task-completion.service';
import { UserTaskRewardService } from '../services/user-task-reward.service';
import { CreateCampaignDto, UpdateCampaignDto } from '../dto/campaign.dto';
import { CreateTaskDto, UpdateTaskDto, CompleteTaskDto } from '../dto/task.dto';
import { TaskRepeatType } from '../entities/task.entity';
import { TaskCompletion } from '../entities/task-completion.entity';

@ApiTags('Campaign & Task')
@Controller('/api/v1/campaigns')
export class CampaignController {
  constructor(
    private readonly campaignService: CampaignService,
    private readonly taskService: TaskService,
    private readonly taskCompletionService: TaskCompletionService,
    private readonly userTaskRewardService: UserTaskRewardService,
  ) {}

  @Get()
  @ApiOperation({ summary: '获取活动列表' })
  @ApiResponse({ status: 200, description: '活动列表' })
  async getCampaigns(@Query('status') status?: string) {
    const campaigns = await this.campaignService.getCampaigns({
      status: status as any,
      isVisible: true,
    });
    return { campaigns };
  }

  @Get(':id')
  @ApiOperation({ summary: '获取活动详情' })
  @ApiResponse({ status: 200, description: '活动详情' })
  @UseGuards(JwtAuthGuard)
  async getCampaign(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: any,
  ) {
    const campaign = await this.campaignService.getCampaignById(id, true);
    const userId = req.user.id;
    const tasks = await this.taskService.getTasksByCampaignId(id);
    const completions = await this.taskCompletionService.getTaskCompletions(
      userId,
      id,
    );
    const rewards = await this.taskService.getTaskRewards(id);

    // 批量检查今天是否已完成每个任务
    const taskIds = tasks.map((task) => task.id);
    const todayCompletedMap =
      await this.taskCompletionService.batchCheckTasksCompletedToday(
        userId,
        taskIds,
      );

    // completions to map
    const completionsMap = new Map<number, TaskCompletion>();
    completions.completions.forEach((completion) => {
      completionsMap.set(completion.taskId, completion);
    });

    // 为每个任务添加 isCompletedToday 字段
    const tasksWithTodayStatus = tasks.map((task) => ({
      ...task,
      isCompletedToday:
        task.repeatType === TaskRepeatType.DAILY
          ? todayCompletedMap.get(task.id) || false
          : undefined,
      isCompleted: completionsMap.get(task.id) ? true : false,
    }));

    return {
      campaign,
      tasks: tasksWithTodayStatus,
      completions,
      rewards,
    };
  }

  // @Post()
  // @UseGuards(JwtAuthGuard)
  // @ApiBearerAuth()
  // @ApiOperation({ summary: '创建活动（管理员）' })
  // @ApiResponse({ status: 201, description: '活动创建成功' })
  // async createCampaign(@Body() createCampaignDto: CreateCampaignDto) {
  //   const data = {
  //     ...createCampaignDto,
  //     startTime: createCampaignDto.startTime
  //       ? new Date(createCampaignDto.startTime)
  //       : undefined,
  //     endTime: createCampaignDto.endTime
  //       ? new Date(createCampaignDto.endTime)
  //       : undefined,
  //   };
  //   const campaign = await this.campaignService.createCampaign(data);
  //   return { campaign };
  // }

  // @Put(':id')
  // @UseGuards(JwtAuthGuard)
  // @ApiBearerAuth()
  // @ApiOperation({ summary: '更新活动（管理员）' })
  // @ApiResponse({ status: 200, description: '活动更新成功' })
  // async updateCampaign(
  //   @Param('id', ParseIntPipe) id: number,
  //   @Body() updateCampaignDto: UpdateCampaignDto,
  // ) {
  //   const data = {
  //     ...updateCampaignDto,
  //     startTime: updateCampaignDto.startTime
  //       ? new Date(updateCampaignDto.startTime)
  //       : undefined,
  //     endTime: updateCampaignDto.endTime
  //       ? new Date(updateCampaignDto.endTime)
  //       : undefined,
  //   };
  //   const campaign = await this.campaignService.updateCampaign(id, data);
  //   return { campaign };
  // }

  @Post(':id/participate')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '参与活动' })
  @ApiResponse({ status: 200, description: '参与成功' })
  async participateCampaign(
    @Request() req: any,
    @Param('id', ParseIntPipe) campaignId: number,
  ) {
    const userId = req.user.id;
    const progress = await this.campaignService.participateCampaign(
      userId,
      campaignId,
    );
    return { progress };
  }

  @Get(':id/progress')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取用户活动进度' })
  @ApiResponse({ status: 200, description: '活动进度' })
  async getUserCampaignProgress(
    @Request() req: any,
    @Param('id', ParseIntPipe) campaignId: number,
  ) {
    const userId = req.user.id;
    const progress = await this.campaignService.getUserCampaignProgress(
      userId,
      campaignId,
    );
    return { progress };
  }

  @Post(':id/claim')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '领取活动奖励' })
  @ApiResponse({ status: 200, description: '奖励领取成功' })
  async claimCampaignReward(
    @Request() req: any,
    @Param('id', ParseIntPipe) campaignId: number,
  ) {
    const userId = req.user.id;
    await this.campaignService.claimCampaignReward(userId, campaignId);
    return { success: true, message: 'Reward claimed successfully' };
  }

  @Get(':id/tasks')
  @ApiOperation({ summary: '获取活动下的任务列表' })
  @ApiResponse({ status: 200, description: '任务列表' })
  async getCampaignTasks(@Param('id', ParseIntPipe) campaignId: number) {
    const tasks = await this.taskService.getTasksByCampaignId(campaignId);
    return { tasks };
  }

  // @Post('tasks')
  // @UseGuards(JwtAuthGuard)
  // @ApiBearerAuth()
  // @ApiOperation({ summary: '创建任务（管理员）' })
  // @ApiResponse({ status: 201, description: '任务创建成功' })
  // async createTask(@Body() createTaskDto: CreateTaskDto) {
  //   const { rewards, deadline, ...taskData } = createTaskDto;
  //   const data = {
  //     ...taskData,
  //     deadline: deadline ? new Date(deadline) : undefined,
  //   };
  //   const task = await this.taskService.createTask(data, rewards);
  //   return { task };
  // }

  // @Put('tasks/:taskId')
  // @UseGuards(JwtAuthGuard)
  // @ApiBearerAuth()
  // @ApiOperation({ summary: '更新任务（管理员）' })
  // @ApiResponse({ status: 200, description: '任务更新成功' })
  // async updateTask(
  //   @Param('taskId', ParseIntPipe) taskId: number,
  //   @Body() updateTaskDto: UpdateTaskDto,
  // ) {
  //   const { deadline, ...rest } = updateTaskDto;
  //   const data = {
  //     ...rest,
  //     deadline: deadline ? new Date(deadline) : undefined,
  //   };
  //   const task = await this.taskService.updateTask(taskId, data);
  //   return { task };
  // }

  @Get('tasks/:taskId')
  @ApiOperation({ summary: '获取任务详情' })
  @ApiResponse({ status: 200, description: '任务详情' })
  async getTask(@Param('taskId', ParseIntPipe) taskId: number) {
    const task = await this.taskService.getTaskById(taskId);
    return { task };
  }

  @Post('tasks/:taskId/complete')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '完成任务' })
  @ApiResponse({ status: 200, description: '任务完成成功' })
  async completeTask(
    @Request() req: any,
    @Param('taskId', ParseIntPipe) taskId: number,
  ) {
    const userId = req.user.id;
    const result = await this.taskCompletionService.completeTask(
      userId,
      taskId,
    );
    return { success: true, ...result };
  }

  @Get('user/progress')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取用户的所有活动进度' })
  @ApiResponse({ status: 200, description: '用户活动进度列表' })
  async getUserCampaigns(@Request() req: any) {
    const userId = req.user.id;
    const progresses = await this.campaignService.getUserCampaigns(userId);
    return { progresses };
  }

  @Get('/:campaignId/progress')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取用户的所有活动进度' })
  @ApiResponse({ status: 200, description: '用户活动进度列表' })
  async getUserCampaign(
    @Request() req: any,
    @Param('campaignId', ParseIntPipe) campaignId: number,
  ) {
    const userId = req.user.id;
    const progress = await this.campaignService.getUserCampaignProgress(
      userId,
      campaignId,
    );
    return { progress };
  }

  @Get('/tasks/:taskId/progress')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取用户任务进度' })
  @ApiResponse({ status: 200, description: '任务进度' })
  async getUserTaskProgress(
    @Request() req: any,
    @Param('taskId', ParseIntPipe) taskId: number,
  ) {
    const userId = req.user.id;
    const progress = await this.taskCompletionService.getUserTaskProgress(
      userId,
      taskId,
    );
    return { progress };
  }

  @Get('user/tasks/progress')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取用户的所有任务进度' })
  @ApiResponse({ status: 200, description: '任务进度列表' })
  async getUserTasksProgress(
    @Request() req: any,
    @Query('campaignId') campaignId?: string,
  ) {
    const userId = req.user.id;
    const progresses = await this.taskCompletionService.getUserTasksProgress(
      userId,
      campaignId ? parseInt(campaignId) : undefined,
    );
    return { progresses };
  }

  @Get('user/completions')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取任务完成历史' })
  @ApiResponse({ status: 200, description: '完成历史' })
  async getTaskCompletions(
    @Request() req: any,
    @Query('taskId') taskId?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const userId = req.user.id;
    const result = await this.taskCompletionService.getTaskCompletions(
      userId,
      taskId ? parseInt(taskId) : undefined,
      limit ? parseInt(limit) : 20,
      offset ? parseInt(offset) : 0,
    );
    return result;
  }

  @Get('user/reward')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取用户的所有任务奖励（按类型）' })
  @ApiResponse({ status: 200, description: '用户任务奖励列表' })
  async getUserTaskRewards(@Request() req: any) {
    const userId = req.user.id;
    const rewards = await this.userTaskRewardService.getUserTaskRewards(userId);
    return { rewards };
  }

  @Get('user/reward/:rewardType')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取用户指定类型的任务奖励' })
  @ApiResponse({ status: 200, description: '用户任务奖励信息' })
  async getUserTaskReward(
    @Request() req: any,
    @Param('rewardType') rewardType: string,
  ) {
    const userId = req.user.id;
    const reward = await this.userTaskRewardService.getUserTaskRewardOrCreate(
      userId,
      rewardType as any,
    );
    return { reward };
  }
}
