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
import { Repository, Between, In, MoreThan, LessThan } from 'typeorm';
import { Showcase, ShowcaseStatus, MediaType } from '../../ecommerce/entities/showcase.entity';
import { ShowcaseComment } from '../../ecommerce/entities/showcase-comment.entity';
import { ShowcaseShare } from '../../ecommerce/entities/showcase-share.entity';
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
    @InjectRepository(ShowcaseComment)
    private readonly commentRepo: Repository<ShowcaseComment>,
    @InjectRepository(ShowcaseShare)
    private readonly shareRepo: Repository<ShowcaseShare>,
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

  // ==================== 高级筛选 ====================

  @Get('advanced-search')
  @ApiOperation({ summary: '高级搜索晒单' })
  async advancedSearch(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
    @Query('status') status?: ShowcaseStatus,
    @Query('userId') userId?: string,
    @Query('isWinner') isWinner?: string,
    @Query('isVerified') isVerified?: string,
    @Query('isPinned') isPinned?: string,
    @Query('mediaType') mediaType?: MediaType,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('minLikes') minLikes?: string,
    @Query('minComments') minComments?: string,
    @Query('minShares') minShares?: string,
    @Query('keyword') keyword?: string,
  ) {
    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 20;

    const where: any = {};

    if (status) where.status = status;
    if (userId) where.userId = userId;
    if (isWinner === 'true') where.isWinnerShowcase = true;
    if (isVerified === 'true') where.isVerified = true;
    if (isPinned === 'true') where.isPinned = true;

    // 日期范围筛选
    if (startDate && endDate) {
      where.createdAt = Between(new Date(startDate), new Date(endDate));
    } else if (startDate) {
      where.createdAt = MoreThan(new Date(startDate));
    } else if (endDate) {
      where.createdAt = LessThan(new Date(endDate));
    }

    // 互动数据筛选
    if (minLikes) where.likeCount = MoreThan(parseInt(minLikes));
    if (minComments) where.commentCount = MoreThan(parseInt(minComments));
    if (minShares) where.shareCount = MoreThan(parseInt(minShares));

    const queryBuilder = this.showcaseRepo.createQueryBuilder('showcase');

    Object.keys(where).forEach(key => {
      if (key === 'createdAt') {
        if (startDate && endDate) {
          queryBuilder.andWhere('showcase.createdAt BETWEEN :startDate AND :endDate', {
            startDate: new Date(startDate),
            endDate: new Date(endDate),
          });
        } else if (startDate) {
          queryBuilder.andWhere('showcase.createdAt > :startDate', { startDate: new Date(startDate) });
        } else if (endDate) {
          queryBuilder.andWhere('showcase.createdAt < :endDate', { endDate: new Date(endDate) });
        }
      } else if (key === 'likeCount' || key === 'commentCount' || key === 'shareCount') {
        queryBuilder.andWhere(`showcase.${key} > :${key}`, { [key]: where[key].value });
      } else {
        queryBuilder.andWhere(`showcase.${key} = :${key}`, { [key]: where[key] });
      }
    });

    // 关键词搜索（内容或用户名）
    if (keyword) {
      queryBuilder.andWhere(
        '(showcase.content ILIKE :keyword OR showcase.userName ILIKE :keyword OR showcase.prizeInfo ILIKE :keyword)',
        { keyword: `%${keyword}%` }
      );
    }

    // 媒体类型筛选
    if (mediaType) {
      queryBuilder.andWhere(
        `EXISTS (SELECT 1 FROM jsonb_array_elements(showcase.media) AS media WHERE media->>'type' = :mediaType)`,
        { mediaType }
      );
    }

    const [items, total] = await queryBuilder
      .orderBy('showcase.createdAt', 'DESC')
      .skip((pageNum - 1) * limitNum)
      .take(limitNum)
      .getManyAndCount();

    return {
      data: items,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    };
  }

  // ==================== 批量操作 ====================

  @Post('batch-approve')
  @ApiOperation({ summary: '批量审核通过' })
  async batchApprove(@Body('ids') ids: number[]) {
    await this.showcaseRepo.update(
      { id: In(ids) },
      { status: ShowcaseStatus.APPROVED, reviewedAt: new Date() }
    );
    return { success: true, count: ids.length };
  }

  @Post('batch-reject')
  @ApiOperation({ summary: '批量拒绝' })
  async batchReject(
    @Body('ids') ids: number[],
    @Body('reason') reason?: string,
  ) {
    await this.showcaseRepo.update(
      { id: In(ids) },
      { status: ShowcaseStatus.REJECTED, rejectReason: reason, reviewedAt: new Date() }
    );
    return { success: true, count: ids.length };
  }

  @Post('batch-hide')
  @ApiOperation({ summary: '批量隐藏' })
  async batchHide(@Body('ids') ids: number[]) {
    await this.showcaseRepo.update(
      { id: In(ids) },
      { status: ShowcaseStatus.HIDDEN }
    );
    return { success: true, count: ids.length };
  }

  @Delete('batch-delete')
  @ApiOperation({ summary: '批量删除' })
  async batchDelete(@Body('ids') ids: number[]) {
    await this.showcaseRepo.delete({ id: In(ids) });
    return { success: true, count: ids.length };
  }

  @Post('batch-verify')
  @ApiOperation({ summary: '批量设置验证标识' })
  async batchVerify(
    @Body('ids') ids: number[],
    @Body('verificationNote') verificationNote?: string,
  ) {
    await this.showcaseRepo.update(
      { id: In(ids) },
      {
        isVerified: true,
        verifiedAt: new Date(),
        verificationNote: verificationNote || '官方认证',
      }
    );
    return { success: true, count: ids.length };
  }

  @Post('batch-pin')
  @ApiOperation({ summary: '批量置顶' })
  async batchPin(@Body('ids') ids: number[]) {
    await this.showcaseRepo.update(
      { id: In(ids) },
      { isPinned: true }
    );
    return { success: true, count: ids.length };
  }

  @Post('batch-unpin')
  @ApiOperation({ summary: '批量取消置顶' })
  async batchUnpin(@Body('ids') ids: number[]) {
    await this.showcaseRepo.update(
      { id: In(ids) },
      { isPinned: false }
    );
    return { success: true, count: ids.length };
  }

  // ==================== 评论高级管理 ====================

  @Get('comments/stats')
  @ApiOperation({ summary: '获取评论统计' })
  async getCommentStats() {
    const [totalComments, deletedComments, activeComments] = await Promise.all([
      this.commentRepo.count(),
      this.commentRepo.count({ where: { isDeleted: true } }),
      this.commentRepo.count({ where: { isDeleted: false } }),
    ]);

    // 获取最活跃的晒单（评论最多）
    const topShowcases = await this.showcaseRepo
      .createQueryBuilder('showcase')
      .select('showcase.id', 'id')
      .addSelect('showcase.commentCount', 'commentCount')
      .addSelect('showcase.content', 'content')
      .orderBy('showcase.commentCount', 'DESC')
      .limit(10)
      .getRawMany();

    return {
      totalComments,
      deletedComments,
      activeComments,
      topShowcases,
    };
  }

  @Post('comments/batch-delete')
  @ApiOperation({ summary: '批量硬删除评论' })
  async batchDeleteComments(@Body('ids') ids: number[]) {
    await this.commentService.adminBatchDelete(ids);
    return { success: true, count: ids.length };
  }

  @Get('comments/recent')
  @ApiOperation({ summary: '获取最近评论（实时监控）' })
  async getRecentComments(
    @Query('limit') limit: string = '50',
    @Query('hours') hours: string = '24',
  ) {
    const limitNum = parseInt(limit) || 50;
    const hoursNum = parseInt(hours) || 24;
    const since = new Date(Date.now() - hoursNum * 60 * 60 * 1000);

    const comments = await this.commentRepo.find({
      where: {
        createdAt: MoreThan(since),
      },
      order: { createdAt: 'DESC' },
      take: limitNum,
    });

    return {
      comments,
      timeRange: `Last ${hoursNum} hours`,
      count: comments.length,
    };
  }

  // ==================== 分享高级分析 ====================

  @Get('analytics/shares/platform')
  @ApiOperation({ summary: '按平台分析分享数据' })
  async getSharesByPlatform(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const queryBuilder = this.shareRepo
      .createQueryBuilder('share')
      .select('share.platform', 'platform')
      .addSelect('COUNT(*)', 'count')
      .groupBy('share.platform');

    if (startDate && endDate) {
      queryBuilder.andWhere('share.createdAt BETWEEN :startDate AND :endDate', {
        startDate: new Date(startDate),
        endDate: new Date(endDate),
      });
    }

    const platformStats = await queryBuilder.getRawMany();

    const total = platformStats.reduce((sum, stat) => sum + parseInt(stat.count), 0);

    return {
      platformStats: platformStats.map(stat => ({
        platform: stat.platform,
        count: parseInt(stat.count),
        percentage: ((parseInt(stat.count) / total) * 100).toFixed(2),
      })),
      total,
    };
  }

  @Get('analytics/shares/trend')
  @ApiOperation({ summary: '分享趋势分析（按日期）' })
  async getShareTrend(
    @Query('days') days: string = '30',
  ) {
    const daysNum = parseInt(days) || 30;
    const startDate = new Date(Date.now() - daysNum * 24 * 60 * 60 * 1000);

    const trend = await this.shareRepo
      .createQueryBuilder('share')
      .select('DATE(share.createdAt)', 'date')
      .addSelect('COUNT(*)', 'count')
      .where('share.createdAt > :startDate', { startDate })
      .groupBy('DATE(share.createdAt)')
      .orderBy('DATE(share.createdAt)', 'ASC')
      .getRawMany();

    return {
      trend: trend.map(item => ({
        date: item.date,
        count: parseInt(item.count),
      })),
      totalDays: daysNum,
      totalShares: trend.reduce((sum, item) => sum + parseInt(item.count), 0),
    };
  }

  @Get('analytics/shares/top-shared')
  @ApiOperation({ summary: '最受欢迎晒单（分享最多）' })
  async getTopSharedShowcases(@Query('limit') limit: string = '20') {
    const limitNum = parseInt(limit) || 20;

    const topShowcases = await this.showcaseRepo
      .createQueryBuilder('showcase')
      .select([
        'showcase.id',
        'showcase.content',
        'showcase.shareCount',
        'showcase.likeCount',
        'showcase.commentCount',
        'showcase.userName',
        'showcase.createdAt',
      ])
      .orderBy('showcase.shareCount', 'DESC')
      .limit(limitNum)
      .getMany();

    return {
      showcases: topShowcases,
      limit: limitNum,
    };
  }

  // ==================== 用户行为分析 ====================

  @Get('users/:userId/activity')
  @ApiOperation({ summary: '获取用户晒单活动详情' })
  async getUserActivity(@Param('userId') userId: string) {
    const [showcases, comments, shares] = await Promise.all([
      this.showcaseRepo.count({ where: { userId } }),
      this.commentRepo.count({ where: { userId } }),
      this.shareRepo.count({ where: { userId } }),
    ]);

    const recentShowcases = await this.showcaseRepo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: 10,
    });

    const totalLikes = recentShowcases.reduce((sum, s) => sum + s.likeCount, 0);
    const totalComments = recentShowcases.reduce((sum, s) => sum + s.commentCount, 0);

    return {
      userId,
      stats: {
        totalShowcases: showcases,
        totalComments: comments,
        totalShares: shares,
        totalLikesReceived: totalLikes,
        totalCommentsReceived: totalComments,
      },
      recentShowcases,
    };
  }

  @Get('users/top-contributors')
  @ApiOperation({ summary: '最活跃用户排行' })
  async getTopContributors(@Query('limit') limit: string = '20') {
    const limitNum = parseInt(limit) || 20;

    const topUsers = await this.showcaseRepo
      .createQueryBuilder('showcase')
      .select('showcase.userId', 'userId')
      .addSelect('showcase.userName', 'userName')
      .addSelect('COUNT(*)', 'showcaseCount')
      .addSelect('SUM(showcase.likeCount)', 'totalLikes')
      .addSelect('SUM(showcase.commentCount)', 'totalComments')
      .addSelect('SUM(showcase.shareCount)', 'totalShares')
      .where('showcase.status = :status', { status: ShowcaseStatus.APPROVED })
      .groupBy('showcase.userId')
      .addGroupBy('showcase.userName')
      .orderBy('COUNT(*)', 'DESC')
      .limit(limitNum)
      .getRawMany();

    return {
      topUsers: topUsers.map(user => ({
        userId: user.userId,
        userName: user.userName,
        showcaseCount: parseInt(user.showcaseCount),
        totalLikes: parseInt(user.totalLikes || 0),
        totalComments: parseInt(user.totalComments || 0),
        totalShares: parseInt(user.totalShares || 0),
      })),
      limit: limitNum,
    };
  }

  // ==================== 内容审核工具 ====================

  @Get('moderation/pending-review')
  @ApiOperation({ summary: '待审核内容列表' })
  async getPendingReview(@Query('limit') limit: string = '50') {
    const limitNum = parseInt(limit) || 50;

    const pending = await this.showcaseRepo.find({
      where: { status: ShowcaseStatus.PENDING },
      order: { createdAt: 'ASC' }, // 最早提交的优先
      take: limitNum,
    });

    return {
      pending,
      count: pending.length,
      message: `${pending.length} showcases waiting for review`,
    };
  }

  @Get('moderation/flagged')
  @ApiOperation({ summary: '被举报的晒单（需要人工审核）' })
  async getFlaggedShowcases() {
    // 这里假设有一个举报系统，可以根据实际情况调整
    // 暂时返回评论/点赞异常多的内容
    const suspicious = await this.showcaseRepo
      .createQueryBuilder('showcase')
      .where('showcase.commentCount > :threshold', { threshold: 100 })
      .orWhere('showcase.likeCount > :threshold', { threshold: 500 })
      .orderBy('showcase.createdAt', 'DESC')
      .limit(50)
      .getMany();

    return {
      flagged: suspicious,
      count: suspicious.length,
      message: 'Showcases with abnormally high engagement',
    };
  }

  // ==================== 实时监控 ====================

  @Get('dashboard/overview')
  @ApiOperation({ summary: '管理仪表盘总览' })
  async getDashboardOverview() {
    const [
      total,
      pending,
      approved,
      rejected,
      hidden,
      todayShowcases,
      todayComments,
      todayShares,
      verifiedCount,
      winnerCount,
    ] = await Promise.all([
      this.showcaseRepo.count(),
      this.showcaseRepo.count({ where: { status: ShowcaseStatus.PENDING } }),
      this.showcaseRepo.count({ where: { status: ShowcaseStatus.APPROVED } }),
      this.showcaseRepo.count({ where: { status: ShowcaseStatus.REJECTED } }),
      this.showcaseRepo.count({ where: { status: ShowcaseStatus.HIDDEN } }),
      this.showcaseRepo.count({
        where: {
          createdAt: MoreThan(new Date(new Date().setHours(0, 0, 0, 0))),
        },
      }),
      this.commentRepo.count({
        where: {
          createdAt: MoreThan(new Date(new Date().setHours(0, 0, 0, 0))),
        },
      }),
      this.shareRepo.count({
        where: {
          createdAt: MoreThan(new Date(new Date().setHours(0, 0, 0, 0))),
        },
      }),
      this.showcaseRepo.count({ where: { isVerified: true } }),
      this.showcaseRepo.count({ where: { isWinnerShowcase: true } }),
    ]);

    return {
      total,
      byStatus: {
        pending,
        approved,
        rejected,
        hidden,
      },
      today: {
        showcases: todayShowcases,
        comments: todayComments,
        shares: todayShares,
      },
      special: {
        verified: verifiedCount,
        winner: winnerCount,
      },
    };
  }

  @Get('dashboard/recent-activity')
  @ApiOperation({ summary: '最近活动（最后24小时）' })
  async getRecentActivity() {
    const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const [recentShowcases, recentComments, recentShares] = await Promise.all([
      this.showcaseRepo.find({
        where: { createdAt: MoreThan(last24Hours) },
        order: { createdAt: 'DESC' },
        take: 20,
      }),
      this.commentRepo.find({
        where: { createdAt: MoreThan(last24Hours) },
        order: { createdAt: 'DESC' },
        take: 20,
      }),
      this.shareRepo.find({
        where: { createdAt: MoreThan(last24Hours) },
        order: { createdAt: 'DESC' },
        take: 20,
      }),
    ]);

    return {
      timeRange: 'Last 24 hours',
      showcases: recentShowcases,
      comments: recentComments,
      shares: recentShares,
    };
  }
}
