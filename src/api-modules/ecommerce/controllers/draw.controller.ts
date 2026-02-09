import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Request as ExpressRequest } from 'express';
import { JwtAuthGuard } from 'src/common-modules/auth/jwt-auth.guard';
import { DrawService } from '../services/draw.service';
import {
  PurchaseSpotsDto,
  QueryDrawRoundsDto,
  QueryParticipationsDto,
  MyWinningHistoryQueryDto,
  RecentWinnersQueryDto,
  MyPhysicalPrizesQueryDto,
  ClaimPhysicalPrizeDto,
} from '../dto/draw.dto';

@ApiTags('一元购抽奖')
@ApiBearerAuth()
@Controller('/api/v1/ecommerce/draws')
export class DrawController {
  constructor(private readonly drawService: DrawService) {}

  @Post('purchase')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '购买抽奖号码' })
  async purchaseSpots(
    @Request() req: ExpressRequest,
    @Body() dto: PurchaseSpotsDto,
  ) {
    const { id: userId } = req.user as any;
    return await this.drawService.purchaseSpots(
      userId,
      dto.productId,
      dto.quantity,
    );
  }

  @Get('rounds')
  @ApiOperation({ summary: '获取期次列表' })
  async getDrawRounds(@Query() query: QueryDrawRoundsDto) {
    if (query.productId) {
      return await this.drawService.getProductRounds(
        query.productId,
        query.page || 1,
        query.limit || 20,
      );
    }
    throw new Error('请提供商品ID');
  }

  @Get('rounds/ongoing')
  @ApiOperation({ summary: '获取当前期次' })
  async getAllOngoingRounds() {
    return await this.drawService.getAllOngoingRounds();
  }

  @Get('rounds/ongoing/detail')
  @ApiOperation({ summary: '获取当前期次' })
  async getOngoingRoundDetail(@Query() query: QueryDrawRoundsDto) {
    return await this.drawService.getOngoingRoundDetail(query.productId);
  }

  @Get('rounds/:id')
  @ApiOperation({ summary: '获取期次详情' })
  async getRoundDetail(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: ExpressRequest,
  ) {
    const userId = req.user ? (req.user as any).id : undefined;
    return await this.drawService.getRoundDetail(id, userId);
  }

  @Get('rounds/:id/participations')
  @ApiOperation({ summary: '获取期次参与记录' })
  async getRoundParticipations(
    @Param('id', ParseIntPipe) drawRoundId: number,
    @Query() query: QueryParticipationsDto,
  ) {
    // 这里可以通过drawRoundId获取参与记录
    // 暂时返回空，可以根据需要实现
    return {
      items: [],
      total: 0,
      page: query.page || 1,
      limit: query.limit || 20,
    };
  }

  @Get('participations/me')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '获取我的参与记录' })
  async getMyParticipations(
    @Request() req: ExpressRequest,
    @Query() query: QueryParticipationsDto,
  ) {
    const { id: userId } = req.user as any;
    return await this.drawService.getUserParticipations(
      userId,
      query.productId,
      query.page || 1,
      query.limit || 20,
    );
  }

  @Get('create')
  @ApiOperation({ summary: '创建抽奖' })
  async createDraw(@Query() query: any) {
    const productId = query.productId as string;
    return await this.drawService.getOrCreateCurrentRound(parseInt(productId));
  }

  @Post('rounds/:id/process')
  @ApiOperation({ summary: '手动触发开奖（管理员）' })
  async processDraw(@Param('id', ParseIntPipe) id: number) {
    // 注意：这里应该添加管理员权限检查
    return await this.drawService.processDraw(id);
  }

  @Post('results/:id/convert-to-cash')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '将物理奖品转换成 Cash 奖品' })
  async convertPhysicalPrizeToCashPrize(@Param('id', ParseIntPipe) id: number) {
    return await this.drawService.convertPhysicalPrizeToCashPrize(id);
  }

  // ==================== 新用户抽奖 ====================

  @Get('new-user/status')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '获取新用户抽奖机会状态' })
  async getNewUserChanceStatus(@Request() req: ExpressRequest) {
    const { id: userId } = req.user as any;
    return await this.drawService.getNewUserChanceStatus(userId);
  }

  @Post('new-user/claim')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '认领新用户抽奖机会' })
  async claimNewUserChance(@Request() req: ExpressRequest) {
    const { id: userId } = req.user as any;
    return await this.drawService.claimNewUserChance(userId);
  }

  @Post('new-user/use')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '使用新用户机会参与抽奖' })
  async useNewUserChance(
    @Request() req: ExpressRequest,
    @Body() dto: PurchaseSpotsDto,
  ) {
    const { id: userId } = req.user as any;
    return await this.drawService.useNewUserChance(userId, dto.productId);
  }

  // ==================== 中奖历史（用于晒单） ====================

  @Get('my-wins')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '获取我的中奖历史列表（用于创建晒单）' })
  async getMyWinningHistory(
    @Request() req: ExpressRequest,
    @Query() query: MyWinningHistoryQueryDto,
  ) {
    const { id: userId } = req.user as any;
    return await this.drawService.getMyWinningHistory(
      userId,
      query.page || 1,
      query.limit || 20,
    );
  }

  @Get('my-wins/:drawResultId')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '获取中奖详情（用于创建晒单）' })
  async getDrawResultForShowcase(
    @Request() req: ExpressRequest,
    @Param('drawResultId', ParseIntPipe) drawResultId: number,
  ) {
    const { id: userId } = req.user as any;
    const result = await this.drawService.getDrawResultForShowcase(
      drawResultId,
      userId,
    );
    if (!result) {
      throw new Error('中奖记录不存在或不属于当前用户');
    }
    return result;
  }

  // ==================== 中奖跑马灯 ====================

  @Get('recent-winners')
  @ApiOperation({ summary: '获取最近中奖记录（用于跑马灯展示）' })
  async getRecentWinners(@Query() query: RecentWinnersQueryDto) {
    return await this.drawService.getRecentWinners(query.limit || 50);
  }

  // ==================== 实物奖品领取（新方案：创建 Order） ====================

  @Post('prizes/physical/:drawResultId/claim')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '领取实物奖品（提交收货地址，创建订单）' })
  async claimPhysicalPrize(
    @Request() req: ExpressRequest,
    @Param('drawResultId', ParseIntPipe) drawResultId: number,
    @Body() dto: ClaimPhysicalPrizeDto,
  ) {
    const { id: userId } = req.user as any;
    return await this.drawService.claimPhysicalPrize(
      drawResultId,
      userId,
      dto.shippingAddressId,
    );
  }

  @Get('prizes/physical/:drawResultId/order')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '获取实物奖品订单详情（含物流信息）' })
  async getPhysicalPrizeOrder(
    @Request() req: ExpressRequest,
    @Param('drawResultId', ParseIntPipe) drawResultId: number,
  ) {
    const { id: userId } = req.user as any;
    return await this.drawService.getPhysicalPrizeOrder(drawResultId, userId);
  }
}
