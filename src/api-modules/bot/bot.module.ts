import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';

// Core entities
import { BotUser } from './core/entities/bot-user.entity';
import { BotTask } from './core/entities/bot-task.entity';
import { BotTaskLog } from './core/entities/bot-task-log.entity';
import { User } from '../user/entity/user.entity';

// Executor entities
import { BotLuckyDrawConfig } from './executors/lucky-draw/lucky-draw.config.entity';

// Core services
import { BotUserService } from './core/services/bot-user.service';
import { BotSchedulerService } from './core/services/bot-scheduler.service';
import { BotNameGeneratorService } from './core/services/bot-name-generator.service';

// Executors
import { LuckyDrawExecutor } from './executors/lucky-draw/lucky-draw.executor';

// Controllers
import { BotAdminController } from './controllers/bot-admin.controller';

// Import other modules
import { UserModule } from '../user/user.module';
import { AssetsModule } from '../assets/assets.module';
import { EcommerceModule } from '../ecommerce/ecommerce.module';
import { IdModule } from '../../common-modules/id/id.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      // Core entities
      BotUser,
      BotTask,
      BotTaskLog,
      User,
      // Executor entities
      BotLuckyDrawConfig,
    ]),
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'admin-secret-key',
      signOptions: { expiresIn: '24h' },
    }),
    UserModule,
    AssetsModule,
    EcommerceModule,
    IdModule,
  ],
  providers: [
    // Core services
    BotUserService,
    BotSchedulerService,
    BotNameGeneratorService,
    // Executors
    LuckyDrawExecutor,
  ],
  controllers: [BotAdminController],
  exports: [BotUserService, BotSchedulerService],
})
export class BotModule {}
