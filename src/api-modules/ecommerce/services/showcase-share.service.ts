import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { ShowcaseShare, SharePlatform } from '../entities/showcase-share.entity';
import { Showcase } from '../entities/showcase.entity';
import {
  CreateShareDto,
  ShareDataResponseDto,
  ShareStatsDto,
} from '../dto/showcase-share.dto';

@Injectable()
export class ShowcaseShareService {
  constructor(
    @InjectRepository(ShowcaseShare)
    private readonly shareRepo: Repository<ShowcaseShare>,
    @InjectRepository(Showcase)
    private readonly showcaseRepo: Repository<Showcase>,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * 记录分享（transaction 更新 shareCount）
   */
  async recordShare(
    showcaseId: number,
    userId: string,
    dto: CreateShareDto,
    metadata?: {
      userAgent?: string;
      ipAddress?: string;
    },
  ): Promise<ShowcaseShare> {
    // 验证晒单存在
    const showcase = await this.showcaseRepo.findOne({
      where: { id: showcaseId },
    });
    if (!showcase) {
      throw new NotFoundException('晒单不存在');
    }

    return await this.dataSource.transaction(async (manager) => {
      // 创建分享记录
      const share = manager.create(ShowcaseShare, {
        showcaseId,
        userId,
        platform: dto.platform,
        shareUrl: dto.shareUrl || null,
        userAgent: metadata?.userAgent || null,
        ipAddress: metadata?.ipAddress || null,
      });
      await manager.save(share);

      // 更新计数器
      await manager.increment(Showcase, { id: showcaseId }, 'shareCount', 1);

      return share;
    });
  }

  /**
   * 生成分享数据（标题、描述、图片）
   */
  async generateShareData(showcaseId: number): Promise<ShareDataResponseDto> {
    const showcase = await this.showcaseRepo.findOne({
      where: { id: showcaseId },
    });

    if (!showcase) {
      throw new NotFoundException('晒单不存在');
    }

    // 获取第一个媒体文件作为分享图片
    const firstMedia = showcase.media && showcase.media[0];
    const imageUrl = firstMedia
      ? firstMedia.type === 'VIDEO'
        ? firstMedia.thumbnailUrl || firstMedia.url
        : firstMedia.url
      : '';

    // 生成分享标题和描述
    const title = showcase.prizeInfo
      ? `${showcase.userName} 的晒单 - ${showcase.prizeInfo}`
      : `${showcase.userName} 的晒单`;

    const description =
      showcase.content || '快来看看我的晒单！';

    // 构建分享URL（假设前端在 /showcase/:id）
    const shareUrl = `${process.env.FRONTEND_URL || 'https://yoho.com'}/showcase/${showcaseId}`;

    return {
      url: shareUrl,
      title,
      description,
      image: imageUrl,
      shareCount: showcase.shareCount,
    };
  }

  /**
   * 获取分享统计
   */
  async getShareStats(showcaseId: number): Promise<ShareStatsDto> {
    const showcase = await this.showcaseRepo.findOne({
      where: { id: showcaseId },
    });

    if (!showcase) {
      throw new NotFoundException('晒单不存在');
    }

    // 获取所有分享记录
    const shares = await this.shareRepo.find({
      where: { showcaseId },
      order: { createdAt: 'DESC' },
    });

    // 按平台统计
    const byPlatform: Record<SharePlatform, number> = {
      [SharePlatform.TWITTER]: 0,
      [SharePlatform.TELEGRAM]: 0,
      [SharePlatform.FACEBOOK]: 0,
      [SharePlatform.LINK]: 0,
      [SharePlatform.OTHER]: 0,
    };

    shares.forEach((share) => {
      byPlatform[share.platform]++;
    });

    return {
      totalShares: shares.length,
      byPlatform,
      lastSharedAt: shares.length > 0 ? shares[0].createdAt : null,
    };
  }

  /**
   * Admin: 获取指定晒单的分享记录
   */
  async findByShowcase(
    showcaseId: number,
    page: number = 1,
    limit: number = 20,
  ): Promise<{
    items: ShowcaseShare[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const [items, total] = await this.shareRepo.findAndCount({
      where: { showcaseId },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Admin: 获取分享统计（全局）
   */
  async getGlobalStats(): Promise<{
    totalShares: number;
    byPlatform: Record<SharePlatform, number>;
    topShowcases: Array<{ showcaseId: number; shareCount: number }>;
  }> {
    // 获取总分享数和按平台统计
    const shares = await this.shareRepo.find();

    const byPlatform: Record<SharePlatform, number> = {
      [SharePlatform.TWITTER]: 0,
      [SharePlatform.TELEGRAM]: 0,
      [SharePlatform.FACEBOOK]: 0,
      [SharePlatform.LINK]: 0,
      [SharePlatform.OTHER]: 0,
    };

    shares.forEach((share) => {
      byPlatform[share.platform]++;
    });

    // 获取分享最多的晒单
    const topShowcases = await this.showcaseRepo
      .createQueryBuilder('showcase')
      .select('showcase.id', 'showcaseId')
      .addSelect('showcase.shareCount', 'shareCount')
      .where('showcase.shareCount > 0')
      .orderBy('showcase.shareCount', 'DESC')
      .limit(10)
      .getRawMany();

    return {
      totalShares: shares.length,
      byPlatform,
      topShowcases,
    };
  }
}
