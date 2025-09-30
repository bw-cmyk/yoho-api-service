import { Module } from '@nestjs/common';
import { RedisModule } from '../redis/redis.module';
import { RedisQueueService } from './redis-queue.service';

@Module({
  imports: [RedisModule],
  providers: [RedisQueueService],
  controllers: [],
  exports: [RedisQueueService],
})
export class QueueModule {}
