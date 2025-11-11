import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Campaign } from './entities/campaign.entity';
import { Task } from './entities/task.entity';
import { TaskReward } from './entities/task-reward.entity';
import { UserCampaignProgress } from './entities/user-campaign-progress.entity';
import { UserTaskProgress } from './entities/user-task-progress.entity';
import { UserTaskReward } from './entities/user-task-reward.entity';
import { TaskCompletion } from './entities/task-completion.entity';
import { CampaignService } from './services/campaign.service';
import { TaskService } from './services/task.service';
import { TaskCompletionService } from './services/task-completion.service';
import { UserTaskRewardService } from './services/user-task-reward.service';
import { CampaignController } from './controllers/campaign.controller';
import { AssetsModule } from '../assets/assets.module';
import { TaskHandlerFactory } from './handlers/task-handler-factory';
import { RegisterTaskHandler } from './handlers/register-task-handler';
import { DepositTaskHandler } from './handlers/deposit-task-handler';
import { CheckInTaskHandler } from './handlers/checkin-task-handler';
import { TradeTaskHandler } from './handlers/trade-task-handler';
import { GameTaskHandler } from './handlers/game-task-handler';
import { SocialTaskHandler } from './handlers/social-task-handler';
import { DefaultTaskHandler } from './handlers/default-task-handler';
import { RewardHandlerFactory } from './rewards/reward-handler-factory';
import { FixedRewardHandler } from './rewards/fixed-reward-handler';
import { RandomRewardHandler } from './rewards/random-reward-handler';
import { ProgressiveRewardHandler } from './rewards/progressive-reward-handler';
import { UserModule } from '../user/user.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Campaign,
      Task,
      TaskReward,
      UserCampaignProgress,
      UserTaskProgress,
      UserTaskReward,
      TaskCompletion,
    ]),
    AssetsModule,
    UserModule,
  ],
  providers: [
    CampaignService,
    TaskService,
    TaskCompletionService,
    UserTaskRewardService,
    // 任务处理器
    RegisterTaskHandler,
    DepositTaskHandler,
    CheckInTaskHandler,
    TradeTaskHandler,
    GameTaskHandler,
    SocialTaskHandler,
    DefaultTaskHandler,
    // 任务处理器工厂
    TaskHandlerFactory,
    // 奖励处理器
    FixedRewardHandler,
    RandomRewardHandler,
    ProgressiveRewardHandler,
    // 奖励处理器工厂
    RewardHandlerFactory,
  ],
  controllers: [CampaignController],
  exports: [
    CampaignService,
    TaskService,
    TaskCompletionService,
    UserTaskRewardService,
    TaskHandlerFactory,
    RewardHandlerFactory,
  ],
})
export class TaskModule {}
