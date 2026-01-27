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

@ApiTags('Admin - 晒单管理')
@ApiBearerAuth()
@Controller('api/v1/admin/showcases')
export class AdminShowcaseController {
  constructor(
    @InjectRepository(Showcase)
    private readonly showcaseRepo: Repository<Showcase>,
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
}
