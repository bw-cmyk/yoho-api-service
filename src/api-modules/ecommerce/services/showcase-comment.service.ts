import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { ShowcaseComment } from '../entities/showcase-comment.entity';
import { Showcase } from '../entities/showcase.entity';
import { UserService } from '../../user/service/user.service';
import { CreateCommentDto, CommentQueryDto } from '../dto/showcase-comment.dto';

@Injectable()
export class ShowcaseCommentService {
  constructor(
    @InjectRepository(ShowcaseComment)
    private readonly commentRepo: Repository<ShowcaseComment>,
    @InjectRepository(Showcase)
    private readonly showcaseRepo: Repository<Showcase>,
    private readonly userService: UserService,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * 创建评论（使用 transaction 更新 commentCount）
   */
  async create(
    showcaseId: number,
    userId: string,
    dto: CreateCommentDto,
  ): Promise<ShowcaseComment> {
    // 验证晒单存在
    const showcase = await this.showcaseRepo.findOne({
      where: { id: showcaseId },
    });
    if (!showcase) {
      throw new NotFoundException('晒单不存在');
    }

    // 如果有父评论，验证父评论存在
    if (dto.parentId) {
      const parentComment = await this.commentRepo.findOne({
        where: { id: dto.parentId, showcaseId, isDeleted: false },
      });
      if (!parentComment) {
        throw new BadRequestException('父评论不存在');
      }
    }

    return await this.dataSource.transaction(async (manager) => {
      // 获取用户信息快照
      const user = await this.userService.getUser(userId);
      if (!user) {
        throw new NotFoundException('用户不存在');
      }

      // 获取回复用户信息
      let replyToUserName: string | null = null;
      if (dto.replyToUserId) {
        const replyToUser = await this.userService.getUser(dto.replyToUserId);
        replyToUserName = replyToUser
          ? replyToUser.nickname || replyToUser.botimName || replyToUser.username
          : null;
      }

      // 创建评论
      const comment = manager.create(ShowcaseComment, {
        showcaseId,
        userId,
        userName: user.nickname || user.botimName || user.username,
        userAvatar: user.botimAvatar,
        content: dto.content,
        parentId: dto.parentId || null,
        replyToUserId: dto.replyToUserId || null,
        replyToUserName,
        isDeleted: false,
      });
      await manager.save(comment);

      // 更新计数器
      await manager.increment(Showcase, { id: showcaseId }, 'commentCount', 1);

      return comment;
    });
  }

  /**
   * 获取晒单的评论列表（带分页）
   */
  async findByShowcase(
    showcaseId: number,
    query: CommentQueryDto,
  ): Promise<{
    items: ShowcaseComment[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const { page = 1, limit = 20 } = query;

    // 只获取顶级评论（没有父评论的）
    const [items, total] = await this.commentRepo.findAndCount({
      where: {
        showcaseId,
        parentId: null,
        isDeleted: false,
      },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    // 为每个评论获取回复数量
    const itemsWithReplyCount = await Promise.all(
      items.map(async (comment) => {
        const replyCount = await this.commentRepo.count({
          where: {
            parentId: comment.id,
            isDeleted: false,
          },
        });
        return { ...comment, replyCount };
      }),
    );

    return {
      items: itemsWithReplyCount as any,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * 获取评论的回复列表
   */
  async findReplies(
    commentId: number,
    query: CommentQueryDto,
  ): Promise<{
    items: ShowcaseComment[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const { page = 1, limit = 20 } = query;

    // 验证父评论存在
    const parentComment = await this.commentRepo.findOne({
      where: { id: commentId, isDeleted: false },
    });
    if (!parentComment) {
      throw new NotFoundException('评论不存在');
    }

    const [items, total] = await this.commentRepo.findAndCount({
      where: {
        parentId: commentId,
        isDeleted: false,
      },
      order: { createdAt: 'ASC' },
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
   * 删除评论（软删除，transaction 更新计数）
   */
  async delete(commentId: number, userId: string): Promise<void> {
    const comment = await this.commentRepo.findOne({
      where: { id: commentId },
    });

    if (!comment) {
      throw new NotFoundException('评论不存在');
    }

    if (comment.userId !== userId) {
      throw new ForbiddenException('无权删除此评论');
    }

    if (comment.isDeleted) {
      throw new BadRequestException('评论已删除');
    }

    await this.dataSource.transaction(async (manager) => {
      // 软删除评论
      await manager.update(ShowcaseComment, { id: commentId }, {
        isDeleted: true,
        deletedAt: new Date(),
      });

      // 更新计数器
      await manager.decrement(
        Showcase,
        { id: comment.showcaseId },
        'commentCount',
        1,
      );
    });
  }

  /**
   * Admin：硬删除评论
   */
  async adminDelete(commentId: number): Promise<void> {
    const comment = await this.commentRepo.findOne({
      where: { id: commentId },
    });

    if (!comment) {
      throw new NotFoundException('评论不存在');
    }

    await this.dataSource.transaction(async (manager) => {
      // 硬删除评论
      await manager.delete(ShowcaseComment, { id: commentId });

      // 如果评论未被标记为已删除，更新计数器
      if (!comment.isDeleted) {
        await manager.decrement(
          Showcase,
          { id: comment.showcaseId },
          'commentCount',
          1,
        );
      }
    });
  }

  /**
   * Admin：获取所有评论
   */
  async findAll(query: CommentQueryDto & { showcaseId?: number }): Promise<{
    items: ShowcaseComment[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const { page = 1, limit = 20, showcaseId } = query;

    const where: any = {};
    if (showcaseId) {
      where.showcaseId = showcaseId;
    }

    const [items, total] = await this.commentRepo.findAndCount({
      where,
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
   * Admin：批量硬删除评论
   */
  async adminBatchDelete(commentIds: number[]): Promise<void> {
    // 获取所有待删除的评论
    const comments = await this.commentRepo.findByIds(commentIds);

    await this.dataSource.transaction(async (manager) => {
      // 按晒单分组，计算每个晒单需要减少的评论数
      const showcaseCountMap = new Map<number, number>();

      for (const comment of comments) {
        if (!comment.isDeleted) {
          const currentCount = showcaseCountMap.get(comment.showcaseId) || 0;
          showcaseCountMap.set(comment.showcaseId, currentCount + 1);
        }
      }

      // 硬删除所有评论
      await manager.delete(ShowcaseComment, commentIds);

      // 更新每个晒单的计数器
      for (const [showcaseId, decrementCount] of showcaseCountMap.entries()) {
        await manager.decrement(
          Showcase,
          { id: showcaseId },
          'commentCount',
          decrementCount,
        );
      }
    });
  }
}
