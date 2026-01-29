import {
  Controller,
  Get,
  Post,
  Delete,
  Patch,
  Body,
  Param,
  Query,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Showcase, ShowcaseStatus, MediaType } from '../../ecommerce/entities/showcase.entity';
import { ShowcaseCommentService } from '../../ecommerce/services/showcase-comment.service';
import { ShowcaseShareService } from '../../ecommerce/services/showcase-share.service';
import { CommentQueryDto } from '../../ecommerce/dto/showcase-comment.dto';

@ApiTags('Admin - 晒单管理')
@ApiBearerAuth()
@Controller('api/v1/admin/showcases')
export class AdminShowcaseController {
  constructor(
    @InjectRepository(Showcase)
    private readonly showcaseRepo: Repository<Showcase>,
    private readonly commentService: ShowcaseCommentService,
    private readonly shareService: ShowcaseShareService,
  ) {}

  @Get()
  @ApiOperation({ summary: '获取晒单列表' })
  async findAll(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
    @Query('status') status?: ShowcaseStatus,
    @Query('userId') userId?: string,
  ) {
    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 20;

    const where: any = {};
    if (status) {
      where.status = status;
    }
    if (userId) {
      where.userId = userId;
    }

    const [items, total] = await this.showcaseRepo.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: (pageNum - 1) * limitNum,
      take: limitNum,
    });

    return {
      data: items,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    };
  }

  @Get('stats')
  @ApiOperation({ summary: '获取晒单统计' })
  async getStats() {
    const [pending, approved, rejected, total] = await Promise.all([
      this.showcaseRepo.count({ where: { status: ShowcaseStatus.PENDING } }),
      this.showcaseRepo.count({ where: { status: ShowcaseStatus.APPROVED } }),
      this.showcaseRepo.count({ where: { status: ShowcaseStatus.REJECTED } }),
      this.showcaseRepo.count(),
    ]);

    return { pending, approved, rejected, total };
  }

  @Post()
  @ApiOperation({ summary: '手动创建晒单' })
  async create(
    @Body()
    data: {
      userId: string;
      userName?: string;
      userAvatar?: string;
      content?: string;
      media: Array<{
        type: MediaType;
        url: string;
        thumbnailUrl?: string;
        cloudflareId?: string;
      }>;
      productId?: number;
      prizeInfo?: string;
    },
  ) {
    const showcase = this.showcaseRepo.create({
      userId: data.userId,
      userName: data.userName || '匿名用户',
      userAvatar: data.userAvatar,
      content: data.content,
      media: data.media,
      productId: data.productId,
      prizeInfo: data.prizeInfo,
      status: ShowcaseStatus.APPROVED, // 管理员创建的直接通过
    });

    return await this.showcaseRepo.save(showcase);
  }

  @Get(':id')
  @ApiOperation({ summary: '获取晒单详情' })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return await this.showcaseRepo.findOne({ where: { id } });
  }

  @Post(':id/approve')
  @ApiOperation({ summary: '审核通过' })
  async approve(@Param('id', ParseIntPipe) id: number) {
    await this.showcaseRepo.update(id, {
      status: ShowcaseStatus.APPROVED,
      reviewedAt: new Date(),
    });
    return { success: true };
  }

  @Post(':id/reject')
  @ApiOperation({ summary: '审核拒绝' })
  async reject(
    @Param('id', ParseIntPipe) id: number,
    @Body('reason') reason?: string,
  ) {
    await this.showcaseRepo.update(id, {
      status: ShowcaseStatus.REJECTED,
      rejectReason: reason,
      reviewedAt: new Date(),
    });
    return { success: true };
  }

  @Post(':id/hide')
  @ApiOperation({ summary: '隐藏晒单' })
  async hide(@Param('id', ParseIntPipe) id: number) {
    await this.showcaseRepo.update(id, {
      status: ShowcaseStatus.HIDDEN,
    });
    return { success: true };
  }

  @Post(':id/pin')
  @ApiOperation({ summary: '置顶/取消置顶' })
  async togglePin(@Param('id', ParseIntPipe) id: number) {
    const showcase = await this.showcaseRepo.findOne({ where: { id } });
    if (showcase) {
      await this.showcaseRepo.update(id, {
        isPinned: !showcase.isPinned,
      });
    }
    return { success: true, isPinned: !showcase?.isPinned };
  }

  @Patch(':id/priority')
  @ApiOperation({ summary: '设置优先级' })
  async setPriority(
    @Param('id', ParseIntPipe) id: number,
    @Body('priority') priority: number,
  ) {
    await this.showcaseRepo.update(id, { priority });
    return { success: true };
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除晒单' })
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.showcaseRepo.delete(id);
    return { success: true };
  }

  // ==================== 评论管理 ====================

  @Get('comments')
  @ApiOperation({ summary: '获取所有评论列表' })
  async getAllComments(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
    @Query('showcaseId') showcaseId?: string,
  ) {
    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 20;
    const showcaseIdNum = showcaseId ? parseInt(showcaseId) : undefined;

    return await this.commentService.findAll({
      page: pageNum,
      limit: limitNum,
      showcaseId: showcaseIdNum,
    });
  }

  @Get(':id/comments')
  @ApiOperation({ summary: '获取指定晒单的评论' })
  async getShowcaseComments(
    @Param('id', ParseIntPipe) showcaseId: number,
    @Query() query: CommentQueryDto,
  ) {
    return await this.commentService.findByShowcase(showcaseId, query);
  }

  @Delete('comments/:id')
  @ApiOperation({ summary: '硬删除评论' })
  async deleteComment(@Param('id', ParseIntPipe) commentId: number) {
    await this.commentService.adminDelete(commentId);
    return { success: true };
  }

  // ==================== 分享管理 ====================

  @Get(':id/shares')
  @ApiOperation({ summary: '获取指定晒单的分享记录' })
  async getShowcaseShares(
    @Param('id', ParseIntPipe) showcaseId: number,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
  ) {
    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 20;

    return await this.shareService.findByShowcase(showcaseId, pageNum, limitNum);
  }

  @Get('analytics/shares')
  @ApiOperation({ summary: '获取全局分享统计' })
  async getShareAnalytics() {
    return await this.shareService.getGlobalStats();
  }

  // ==================== 验证标识管理 ====================

  @Post(':id/verify')
  @ApiOperation({ summary: '设置验证标识（官方认证）' })
  async verify(
    @Param('id', ParseIntPipe) id: number,
    @Body('verificationNote') verificationNote?: string,
  ) {
    await this.showcaseRepo.update(id, {
      isVerified: true,
      verifiedAt: new Date(),
      verificationNote: verificationNote || '官方认证',
    });
    return { success: true };
  }

  @Post(':id/unverify')
  @ApiOperation({ summary: '取消验证标识' })
  async unverify(@Param('id', ParseIntPipe) id: number) {
    await this.showcaseRepo.update(id, {
      isVerified: false,
      verifiedAt: null,
      verificationNote: null,
    });
    return { success: true };
  }

  @Get('winners')
  @ApiOperation({ summary: '获取中奖晒单列表' })
  async getWinnerShowcases(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
  ) {
    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 20;

    const [items, total] = await this.showcaseRepo.findAndCount({
      where: { isWinnerShowcase: true },
      order: { createdAt: 'DESC' },
      skip: (pageNum - 1) * limitNum,
      take: limitNum,
    });

    return {
      data: items,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    };
  }

  @Post(':id/toggle-winner-badge')
  @ApiOperation({ summary: '切换中奖标识' })
  async toggleWinnerBadge(@Param('id', ParseIntPipe) id: number) {
    const showcase = await this.showcaseRepo.findOne({ where: { id } });
    if (showcase) {
      await this.showcaseRepo.update(id, {
        isWinnerShowcase: !showcase.isWinnerShowcase,
      });
    }
    return { success: true, isWinnerShowcase: !showcase?.isWinnerShowcase };
  }
}
