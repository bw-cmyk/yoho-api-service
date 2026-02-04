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
import { DrawResult, PrizeType } from '../entities/draw-result.entity';
import { CreateShowcaseDto, ShowcaseQueryDto } from '../dto/showcase.dto';
import { UserService } from '../../user/service/user.service';

@Injectable()
export class ShowcaseService {
  constructor(
    @InjectRepository(Showcase)
    private readonly showcaseRepo: Repository<Showcase>,
    @InjectRepository(ShowcaseLike)
    private readonly likeRepo: Repository<ShowcaseLike>,
    @InjectRepository(DrawResult)
    private readonly drawResultRepo: Repository<DrawResult>,
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
      ipAddress: dto.ipAddress,
      location: dto.location,
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
        where: showcaseIds.map((id) => ({
          showcaseId: id,
          userId: currentUserId,
        })),
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
      commentCount: item.commentCount,
      shareCount: item.shareCount,
      isLiked: likedMap.get(item.id) || false,
      isPinned: item.isPinned,
      isWinnerShowcase: item.isWinnerShowcase,
      isVerified: item.isVerified,
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
      commentCount: showcase.commentCount,
      shareCount: showcase.shareCount,
      isWinnerShowcase: showcase.isWinnerShowcase,
      isVerified: showcase.isVerified,
      verificationNote: showcase.verificationNote,
      winningNumber: showcase.winningNumber,
      prizeType: showcase.prizeType,
      prizeValue: showcase.prizeValue,
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

        // 使用 GREATEST 函数确保 likeCount 不会小于 0
        await manager
          .createQueryBuilder()
          .update(Showcase)
          .set({
            likeCount: () => 'GREATEST(like_count - 1, 0)',
          })
          .where('id = :id', { id: showcaseId })
          .execute();

        const updated = await manager.findOne(Showcase, {
          where: { id: showcaseId },
        });
        return { liked: false, likeCount: updated.likeCount };
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
    page = 1,
    limit = 20,
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

  /**
   * 从中奖记录创建晒单
   */
  async createFromDrawResult(
    userId: string,
    drawResultId: number,
    dto: CreateShowcaseDto,
    req?: Request,
  ): Promise<Showcase> {
    if (!dto.media || dto.media.length === 0) {
      throw new BadRequestException('请至少上传一个图片或视频');
    }

    // 验证用户是否是中奖者
    const canCreate = await this.canCreateWinnerShowcase(userId, drawResultId);
    if (!canCreate) {
      throw new ForbiddenException('您不是该抽奖的中奖者');
    }

    // 获取中奖记录
    const drawResult = await this.drawResultRepo.findOne({
      where: { id: drawResultId },
    });

    if (!drawResult) {
      throw new NotFoundException('中奖记录不存在');
    }

    // 检查是否已创建晒单
    const existingShowcase = await this.showcaseRepo.findOne({
      where: { drawResultId, userId },
    });
    if (existingShowcase) {
      throw new BadRequestException('您已为该中奖记录创建过晒单');
    }

    // 获取用户信息
    const user = await this.userService.getUser(userId);
    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    // 获取 IP 地址和地理位置
    let ipAddress: string | null = null;
    let location: string | null = null;

    if (req) {
      try {
        const geoData = await this.geolocationService.getLocationFromRequest(
          req,
        );
        ipAddress = geoData.ip;
        // 格式化地理位置显示
        if (geoData.city && geoData.country) {
          location = `${geoData.city}, ${geoData.country}`;
        } else if (geoData.country) {
          location = geoData.country;
        }
      } catch (error) {
        // 地理位置获取失败不影响晒单创建，只记录日志
        console.error('Failed to get geolocation:', error);
      }
    }

    // 获取发货地址快照（如果是实物奖品）
    const shippingAddressSnapshot = null;
    if (drawResult.prizeType === PrizeType.PHYSICAL) {
      // TODO: 从 ShippingAddressService 获取用户默认地址
      // 暂时留空，后续实现
    }

    const showcase = this.showcaseRepo.create({
      userId,
      userName: user.nickname || user.botimName || user.username,
      userAvatar: user.botimAvatar,
      content: dto.content,
      media: dto.media,
      productId: dto.productId, // 使用 DTO 中的 productId
      drawRoundId: drawResult.drawRoundId,
      prizeInfo:
        dto.prizeInfo || `${drawResult.prizeType} - ${drawResult.prizeValue}`,
      drawResultId,
      isWinnerShowcase: true,
      winningNumber: drawResult.winningNumber,
      prizeType: drawResult.prizeType,
      prizeValue: drawResult.prizeValue.toString(),
      shippingAddressSnapshot,
      ipAddress,
      location,
      status: ShowcaseStatus.APPROVED, // 中奖晒单默认直接通过
    });

    return await this.showcaseRepo.save(showcase);
  }

  /**
   * 验证用户是否是中奖者
   */
  async canCreateWinnerShowcase(
    userId: string,
    drawResultId: number,
  ): Promise<boolean> {
    const drawResult = await this.drawResultRepo.findOne({
      where: { id: drawResultId },
    });

    if (!drawResult) {
      return false;
    }

    return drawResult.winnerUserId === userId;
  }

  /**
   * 获取中奖晒单列表
   */
  async findWinnerShowcases(
    query: ShowcaseQueryDto,
    currentUserId?: string,
  ): Promise<{
    items: any[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const { page = 1, limit = 20 } = query;

    const [items, total] = await this.showcaseRepo.findAndCount({
      where: {
        status: ShowcaseStatus.APPROVED,
        isWinnerShowcase: true,
      },
      order: { isPinned: 'DESC', priority: 'DESC', createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    // 如果有当前用户，查询是否已点赞
    let likedMap = new Map<number, boolean>();
    if (currentUserId && items.length > 0) {
      const showcaseIds = items.map((item) => item.id);
      const likes = await this.likeRepo.find({
        where: showcaseIds.map((id) => ({
          showcaseId: id,
          userId: currentUserId,
        })),
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
      commentCount: item.commentCount,
      shareCount: item.shareCount,
      isLiked: likedMap.get(item.id) || false,
      isPinned: item.isPinned,
      isWinnerShowcase: item.isWinnerShowcase,
      isVerified: item.isVerified,
      winningNumber: item.winningNumber,
      prizeType: item.prizeType,
      prizeValue: item.prizeValue,
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
   * Admin: 设置/取消验证标识
   */
  async toggleVerified(
    showcaseId: number,
    verificationNote?: string,
  ): Promise<Showcase> {
    const showcase = await this.showcaseRepo.findOne({
      where: { id: showcaseId },
    });

    if (!showcase) {
      throw new NotFoundException('晒单不存在');
    }

    const isVerified = !showcase.isVerified;

    await this.showcaseRepo.update(showcaseId, {
      isVerified,
      verifiedAt: isVerified ? new Date() : null,
      verificationNote: isVerified ? verificationNote || '官方认证' : null,
    });

    return await this.showcaseRepo.findOne({ where: { id: showcaseId } });
  }
}
