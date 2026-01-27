import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AdminDrawService } from '../services/admin-draw.service';

@ApiTags('Admin - 抽奖管理')
@ApiBearerAuth()
@Controller('api/v1/admin/draws')
export class AdminDrawController {
  constructor(private readonly drawService: AdminDrawService) {}

  @Get('rounds')
  @ApiOperation({ summary: '获取商品的抽奖轮次列表' })
  async getRounds(
    @Query('productId', ParseIntPipe) productId: number,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.drawService.getRounds(
      productId,
      parseInt(page) || 1,
      parseInt(limit) || 20,
    );
  }

  @Get('rounds/:id')
  @ApiOperation({ summary: '获取轮次详情' })
  async getRoundDetail(@Param('id', ParseIntPipe) id: number) {
    return this.drawService.getRoundDetail(id);
  }

  @Post('rounds/:id/process')
  @ApiOperation({ summary: '手动开奖' })
  async processDraw(@Param('id', ParseIntPipe) id: number) {
    return this.drawService.processDraw(id);
  }

  @Post('products/:productId/create-round')
  @ApiOperation({ summary: '创建新轮次' })
  async createRound(@Param('productId', ParseIntPipe) productId: number) {
    return this.drawService.createRound(productId);
  }
}
