import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AdminDrawService } from '../services/admin-draw.service';
import { AdminJwtGuard } from '../guards/admin-jwt.guard';
import {
  QueryPrizeOrdersDto,
  ShipPrizeOrderDto,
  BatchShipPrizeOrdersDto,
} from '../dto/draw.dto';

@ApiTags('Admin - 抽奖管理')
@ApiBearerAuth()
@Controller('api/v1/admin/draws')
@UseGuards(AdminJwtGuard)
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

  // ==================== 实物奖品订单管理 ====================

  @Get('prize-orders/stats')
  @ApiOperation({ summary: '获取实物奖品订单统计' })
  async getPrizeOrderStats() {
    return this.drawService.getPrizeOrderStats();
  }

  @Get('prize-orders')
  @ApiOperation({ summary: '获取实物奖品订单列表' })
  async getPrizeOrders(@Query() query: QueryPrizeOrdersDto) {
    return this.drawService.getPrizeOrders({
      status: query.status,
      keyword: query.keyword,
      startDate: query.startDate,
      endDate: query.endDate,
      page: query.page,
      limit: query.limit,
    });
  }

  @Get('prize-orders/:drawResultId')
  @ApiOperation({ summary: '获取实物奖品订单详情' })
  async getPrizeOrderDetail(
    @Param('drawResultId', ParseIntPipe) drawResultId: number,
  ) {
    return this.drawService.getPrizeOrderDetail(drawResultId);
  }

  @Post('prize-orders/:drawResultId/ship')
  @ApiOperation({ summary: '发货' })
  async shipPrizeOrder(
    @Param('drawResultId', ParseIntPipe) drawResultId: number,
    @Body() dto: ShipPrizeOrderDto,
  ) {
    return this.drawService.shipPrizeOrder(
      drawResultId,
      dto.logisticsCompany,
      dto.trackingNumber,
    );
  }

  @Post('prize-orders/:drawResultId/confirm-delivery')
  @ApiOperation({ summary: '确认签收' })
  async confirmPrizeDelivery(
    @Param('drawResultId', ParseIntPipe) drawResultId: number,
  ) {
    return this.drawService.confirmPrizeDelivery(drawResultId);
  }

  @Post('prize-orders/batch-ship')
  @ApiOperation({ summary: '批量发货' })
  async batchShipPrizeOrders(@Body() dto: BatchShipPrizeOrdersDto) {
    return this.drawService.batchShipPrizeOrders(dto.orders);
  }
}
