import { Controller, Get, Post, Delete, Body, Param } from '@nestjs/common';
import { QueueService } from './queue.service';

@Controller('queue')
export class QueueController {
  constructor(private readonly queueService: QueueService) {}

  @Get('status')
  getQueueStatus() {
    return this.queueService.getQueueStatus();
  }

  @Get('items')
  getQueueItems() {
    return this.queueService.getQueueItems();
  }

  @Delete('clear')
  clearQueue() {
    this.queueService.clearQueue();
    return { message: 'Queue cleared successfully' };
  }

  @Delete(':id')
  removeFromQueue(@Param('id') id: string) {
    const removed = this.queueService.removeFromQueue(id);
    return {
      removed,
      message: removed
        ? 'Request removed from queue'
        : 'Request not found in queue',
    };
  }

  @Post('config')
  updateConfig(@Body() config: any) {
    this.queueService.updateConfig(config);
    return { message: 'Configuration updated successfully' };
  }
}
