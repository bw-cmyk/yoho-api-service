import { Module } from '@nestjs/common';
import { QueueService } from './queue.service';
import { QueueController } from './queue.controller';
import { QueueHelperService } from './queue-helper.service';
import { RedisQueueSimpleService } from './redis-queue-simple.service';
import { RedisQueueHelperService } from './redis-queue-helper.service';
import { RedisModule } from '../redis/redis.module';

@Module({
  imports: [RedisModule],
  providers: [
    QueueService,
    QueueHelperService,
    RedisQueueSimpleService,
    RedisQueueHelperService,
  ],
  controllers: [QueueController],
  exports: [
    QueueService,
    QueueHelperService,
    RedisQueueSimpleService,
    RedisQueueHelperService,
  ],
})
export class QueueModule {}
