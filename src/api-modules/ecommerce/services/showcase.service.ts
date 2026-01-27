import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Showcase, ShowcaseStatus } from '../entities/showcase.entity';
import { ShowcaseLike } from '../entities/showcase-like.entity';
import { CreateShowcaseDto, ShowcaseQueryDto } from '../dto/showcase.dto';
import { UserService } from '../../user/service/user.service';

@Injectable()
export class ShowcaseService {
  constructor(
    @InjectRepository(Showcase)
    private readonly showcaseRepo: Repository<Showcase>,
    @InjectRepository(ShowcaseLike)
    private readonly likeRepo: Repository<ShowcaseLike>,
    private readonly userService: UserService,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * 创建晒单
   */
  async create(userId: string, dto: CreateShowcaseDto): Promise<Showcase> {
    if (!dto.media || dto.media.length === 0) {
      throw new BadRequestException('请至少上传一个图片或视频');
    }

    // 获取用户信息
    const user = await this.userService.getUser(userId);
    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    const showcase = this.showcaseRepo.create({
      userId,
      userName: user.nickname || user.botimName || user.username,
      userAvatar: user.botimAvatar,
      content: dto.content,
      media: dto.media,
      productId: dto.productId,
      drawRoundId: dto.drawRoundId,
      prizeInfo: dto.prizeInfo,
      status: ShowcaseStatus.APPROVED, // 默认直接通过，如需审核可改为 PENDING
    });

    return await this.showcaseRepo.save(showcase);
  }

  /**
   * 获取晒单列表（公开）
   */
  async findAll(
    query: ShowcaseQueryDto,
    currentUserId?: string,
  ): Promise<{
    items: any[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const { page = 1, limit = 20, userId } = query;

    const where: any = { status: ShowcaseStatus.APPROVED };
    if (userId) {
      where.userId = userId;
    }

    const [items, total] = await this.showcaseRepo.findAndCount({
      where,
      order: { isPinned: 'DESC', priority: 'DESC', createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    // 如果有当前用户，查询是否已点赞
    let likedMap = new Map<number, boolean>();
    if (currentUserId && items.length > 0) {
      const showcaseIds = items.map((item) => item.id);
      const likes = await this.likeRepo.find({
        where: showcaseIds.map((id) => ({ showcaseId: id, userId: currentUserId })),
      });
      likedMap = new Map(likes.map((like) => [like.showcaseId, true]));
    }

    const formattedItems = items.map((item) => ({
      id: item.id,
      userId: item.userId,
      userName: item.userName,
      userAvatar: item.userAvatar,
      content: item.content,
      media: item.media,
      productId: item.productId,
      prizeInfo: item.prizeInfo,
      likeCount: item.likeCount,
      viewCount: item.viewCount,
      isLiked: likedMap.get(item.id) || false,
      isPinned: item.isPinned,
      createdAt: item.createdAt,
    }));

    return {
      items: formattedItems,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * 获取晒单详情
   */
  async findOne(id: number, currentUserId?: string): Promise<any> {
    const showcase = await this.showcaseRepo.findOne({
      where: { id, status: ShowcaseStatus.APPROVED },
    });

    if (!showcase) {
      throw new NotFoundException('晒单不存在');
    }

    // 增加浏览量
    await this.showcaseRepo.increment({ id }, 'viewCount', 1);

    // 检查是否已点赞
    let isLiked = false;
    if (currentUserId) {
      const like = await this.likeRepo.findOne({
        where: { showcaseId: id, userId: currentUserId },
      });
      isLiked = !!like;
    }

    return {
      ...showcase,
      isLiked,
      viewCount: showcase.viewCount + 1,
    };
  }

  /**
   * 删除自己的晒单
   */
  async remove(id: number, userId: string): Promise<void> {
    const showcase = await this.showcaseRepo.findOne({
      where: { id },
    });

    if (!showcase) {
      throw new NotFoundException('晒单不存在');
    }

    if (showcase.userId !== userId) {
      throw new ForbiddenException('无权删除此晒单');
    }

    await this.showcaseRepo.remove(showcase);
  }

  /**
   * 点赞/取消点赞
   */
  async toggleLike(
    showcaseId: number,
    userId: string,
  ): Promise<{ liked: boolean; likeCount: number }> {
    const showcase = await this.showcaseRepo.findOne({
      where: { id: showcaseId, status: ShowcaseStatus.APPROVED },
    });

    if (!showcase) {
      throw new NotFoundException('晒单不存在');
    }

    return await this.dataSource.transaction(async (manager) => {
      const existingLike = await manager.findOne(ShowcaseLike, {
        where: { showcaseId, userId },
      });

      if (existingLike) {
        // 取消点赞
        await manager.remove(existingLike);
        await manager.decrement(Showcase, { id: showcaseId }, 'likeCount', 1);

        const updated = await manager.findOne(Showcase, {
          where: { id: showcaseId },
        });
        return { liked: false, likeCount: Math.max(0, updated.likeCount) };
      } else {
        // 点赞
        const newLike = manager.create(ShowcaseLike, { showcaseId, userId });
        await manager.save(newLike);
        await manager.increment(Showcase, { id: showcaseId }, 'likeCount', 1);

        const updated = await manager.findOne(Showcase, {
          where: { id: showcaseId },
        });
        return { liked: true, likeCount: updated.likeCount };
      }
    });
  }

  /**
   * 获取用户自己的晒单列表
   */
  async findMyShowcases(
    userId: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<{
    items: Showcase[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const [items, total] = await this.showcaseRepo.findAndCount({
      where: { userId },
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
}
