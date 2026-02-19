import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { Decimal } from 'decimal.js';
import { AdminJwtGuard } from '../../admin/guards/admin-jwt.guard';
import { BotUserService } from '../core/services/bot-user.service';
import { BotSchedulerService } from '../core/services/bot-scheduler.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BotTask } from '../core/entities/bot-task.entity';
import { BotTaskLog } from '../core/entities/bot-task-log.entity';
import { BotLuckyDrawConfig } from '../executors/lucky-draw/lucky-draw.config.entity';
import { BOT_TASK_TYPES } from '../constants/bot.constants';
import {
  BatchCreateBotUsersDto,
  RechargeDto,
  BatchRechargeDto,
  ToggleStatusDto,
  UpdateLuckyDrawConfigDto,
  CreateLuckyDrawTaskDto,
  GetBotUsersQueryDto,
  GetTasksQueryDto,
  GetTaskLogsQueryDto,
} from '../dto/bot-admin.dto';

@Controller('api/v1/admin/bot')
@UseGuards(AdminJwtGuard)
export class BotAdminController {
  constructor(
    private readonly botUserService: BotUserService,
    private readonly schedulerService: BotSchedulerService,
    @InjectRepository(BotTask)
    private readonly botTaskRepository: Repository<BotTask>,
    @InjectRepository(BotTaskLog)
    private readonly botTaskLogRepository: Repository<BotTaskLog>,
    @InjectRepository(BotLuckyDrawConfig)
    private readonly luckyDrawConfigRepository: Repository<BotLuckyDrawConfig>,
  ) {}

  // ========== Bot User Management ==========

  @Post('users/batch-create')
  async batchCreateBotUsers(@Body() dto: BatchCreateBotUsersDto) {
    const botUsers = await this.botUserService.createBotUsers(dto.count, {
      displayNamePrefix: dto.displayNamePrefix,
      initialBalance: dto.initialBalance
        ? new Decimal(dto.initialBalance)
        : undefined,
    });

    return {
      success: true,
      count: botUsers.length,
      botUsers: botUsers.map((bot) => ({
        userId: bot.userId,
        displayName: bot.displayName,
        displayAvatar: bot.displayAvatar,
        enabled: bot.enabled,
      })),
    };
  }

  @Get('users')
  async getBotUsers(@Query() query: GetBotUsersQueryDto) {
    const result = await this.botUserService.getBotUsers({
      enabled: query.enabled,
      hasBalance: query.hasBalance,
      page: query.page,
      limit: query.limit,
    });

    return {
      success: true,
      ...result,
    };
  }

  @Post('users/:id/recharge')
  async rechargeBotUser(@Param('id') id: string, @Body() dto: RechargeDto) {
    await this.botUserService.rechargeBotUser(id, new Decimal(dto.amount));

    return {
      success: true,
      message: `Bot user ${id} recharged with ${dto.amount} USD`,
    };
  }

  @Post('users/batch-recharge')
  async batchRechargeBotUsers(@Body() dto: BatchRechargeDto) {
    const result = await this.botUserService.batchRechargeBotUsers(
      new Decimal(dto.amountPerBot),
    );

    return {
      success: true,
      ...result,
    };
  }

  @Get('users/stats')
  async getBotStats() {
    const stats = await this.botUserService.getBotBalanceStats();

    return {
      success: true,
      stats: {
        totalBots: stats.totalBots,
        enabledBots: stats.enabledBots,
        totalBalance: stats.totalBalance.toString(),
        avgBalance: stats.avgBalance.toString(),
        botsWithLowBalance: stats.botsWithLowBalance,
      },
    };
  }

  @Patch('users/:id/toggle')
  async toggleBotStatus(@Param('id') id: string, @Body() dto: ToggleStatusDto) {
    await this.botUserService.toggleBotStatus(id, dto.enabled);

    return {
      success: true,
      message: `Bot user ${id} ${dto.enabled ? 'enabled' : 'disabled'}`,
    };
  }

  @Delete('users/:id')
  async deleteBotUser(@Param('id') id: string) {
    await this.botUserService.deleteBotUser(id);

    return {
      success: true,
      message: `Bot user ${id} deleted`,
    };
  }

  // ========== Task Management ==========

  @Get('tasks')
  async getTasks(@Query() query: GetTasksQueryDto) {
    const queryBuilder = this.botTaskRepository.createQueryBuilder('task');

    if (query.taskType) {
      queryBuilder.andWhere('task.task_type = :taskType', {
        taskType: query.taskType,
      });
    }

    if (query.enabled !== undefined) {
      queryBuilder.andWhere('task.enabled = :enabled', {
        enabled: query.enabled,
      });
    }

    const [items, total] = await queryBuilder
      .orderBy('task.created_at', 'DESC')
      .skip((query.page - 1) * query.limit)
      .take(query.limit)
      .getManyAndCount();

    return {
      success: true,
      items,
      total,
      page: query.page,
      limit: query.limit,
    };
  }

  @Post('tasks/:id/start')
  async startTask(@Param('id', ParseIntPipe) id: number) {
    await this.schedulerService.startTask(id);

    return {
      success: true,
      message: `Task ${id} started`,
    };
  }

  @Post('tasks/:id/stop')
  async stopTask(@Param('id', ParseIntPipe) id: number) {
    await this.schedulerService.stopTask(id);

    return {
      success: true,
      message: `Task ${id} stopped`,
    };
  }

  @Get('tasks/:id/status')
  async getTaskStatus(@Param('id', ParseIntPipe) id: number) {
    const status = await this.schedulerService.getTaskStatus(id);

    return {
      success: true,
      status,
    };
  }

  // ========== Lucky Draw Specific ==========

  @Get('lucky-draw/configs')
  async getLuckyDrawConfigs() {
    const configs = await this.luckyDrawConfigRepository.find({
      order: { createdAt: 'DESC' },
    });

    return {
      success: true,
      configs,
    };
  }

  @Get('lucky-draw/configs/:productId')
  async getLuckyDrawConfig(
    @Param('productId', ParseIntPipe) productId: number,
  ) {
    let config = await this.luckyDrawConfigRepository.findOne({
      where: { productId },
    });

    if (!config) {
      // 如果不存在，创建默认配置
      config = this.luckyDrawConfigRepository.create({
        productId,
        enabled: false,
      });
      await this.luckyDrawConfigRepository.save(config);
    }

    return {
      success: true,
      config,
    };
  }

  @Put('lucky-draw/configs/:productId')
  async updateLuckyDrawConfig(
    @Param('productId', ParseIntPipe) productId: number,
    @Body() dto: UpdateLuckyDrawConfigDto,
  ) {
    let config = await this.luckyDrawConfigRepository.findOne({
      where: { productId },
    });

    if (!config) {
      config = this.luckyDrawConfigRepository.create({ productId });
    }

    Object.assign(config, dto);
    await this.luckyDrawConfigRepository.save(config);

    return {
      success: true,
      config,
    };
  }

  @Post('lucky-draw/tasks/create')
  async createLuckyDrawTask(@Body() dto: CreateLuckyDrawTaskDto) {
    // 创建或更新配置
    let config = await this.luckyDrawConfigRepository.findOne({
      where: { productId: dto.productId },
    });

    if (!config) {
      config = this.luckyDrawConfigRepository.create({
        productId: dto.productId,
        ...dto.config,
      });
    } else if (dto.config) {
      Object.assign(config, dto.config);
    }

    await this.luckyDrawConfigRepository.save(config);

    // 创建任务
    const task = this.botTaskRepository.create({
      taskType: BOT_TASK_TYPES.LUCKY_DRAW,
      targetId: dto.productId.toString(),
      enabled: false, // 默认不启用，需要手动启动
      config: {},
    });

    await this.botTaskRepository.save(task);

    return {
      success: true,
      task,
      config,
    };
  }

  @Post('lucky-draw/configs/:productId/enable')
  async enableLuckyDrawBot(
    @Param('productId', ParseIntPipe) productId: number,
  ) {
    const config = await this.luckyDrawConfigRepository.findOne({
      where: { productId },
    });

    if (!config) {
      throw new Error('Config not found');
    }

    config.enabled = true;
    await this.luckyDrawConfigRepository.save(config);

    // 启动对应的任务（如果不存在则自动创建）
    let task = await this.botTaskRepository.findOne({
      where: {
        taskType: BOT_TASK_TYPES.LUCKY_DRAW,
        targetId: productId.toString(),
      },
    });

    if (!task) {
      task = this.botTaskRepository.create({
        taskType: BOT_TASK_TYPES.LUCKY_DRAW,
        targetId: productId.toString(),
        enabled: false,
        config: {},
      });
      await this.botTaskRepository.save(task);
    }

    await this.schedulerService.startTask(task.id);

    return {
      success: true,
      message: `Lucky draw bot enabled for product ${productId}`,
    };
  }

  @Post('lucky-draw/configs/:productId/disable')
  async disableLuckyDrawBot(
    @Param('productId', ParseIntPipe) productId: number,
  ) {
    const config = await this.luckyDrawConfigRepository.findOne({
      where: { productId },
    });

    if (!config) {
      throw new Error('Config not found');
    }

    config.enabled = false;
    await this.luckyDrawConfigRepository.save(config);

    // 停止对应的任务
    const task = await this.botTaskRepository.findOne({
      where: {
        taskType: BOT_TASK_TYPES.LUCKY_DRAW,
        targetId: productId.toString(),
      },
    });

    if (task) {
      await this.schedulerService.stopTask(task.id);
    }

    return {
      success: true,
      message: `Lucky draw bot disabled for product ${productId}`,
    };
  }

  // ========== Logs ==========

  @Get('logs')
  async getTaskLogs(@Query() query: GetTaskLogsQueryDto) {
    const queryBuilder = this.botTaskLogRepository.createQueryBuilder('log');

    if (query.taskType) {
      queryBuilder.andWhere('log.task_type = :taskType', {
        taskType: query.taskType,
      });
    }

    if (query.taskId) {
      queryBuilder.andWhere('log.task_id = :taskId', { taskId: query.taskId });
    }

    if (query.status) {
      queryBuilder.andWhere('log.status = :status', { status: query.status });
    }

    if (query.botUserId) {
      queryBuilder.andWhere('log.bot_user_id = :botUserId', {
        botUserId: query.botUserId,
      });
    }

    const [items, total] = await queryBuilder
      .orderBy('log.created_at', 'DESC')
      .skip((query.page - 1) * query.limit)
      .take(query.limit)
      .getManyAndCount();

    return {
      success: true,
      items,
      total,
      page: query.page,
      limit: query.limit,
    };
  }
}
