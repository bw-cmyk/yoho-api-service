import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThanOrEqual, LessThanOrEqual } from 'typeorm';
import { Banner } from '../entities/banner.entity';
import { CreateBannerDto, UpdateBannerDto, QueryBannersDto } from '../dto/banner.dto';

@Injectable()
export class BannerService {
  constructor(
    @InjectRepository(Banner)
    private readonly bannerRepo: Repository<Banner>,
  ) {}

  /**
   * 创建 Banner
   */
  async create(dto: CreateBannerDto): Promise<Banner> {
    const banner = this.bannerRepo.create({
      ...dto,
      startDate: dto.startDate ? new Date(dto.startDate) : null,
      endDate: dto.endDate ? new Date(dto.endDate) : null,
    });

    return await this.bannerRepo.save(banner);
  }

  /**
   * 获取 Banner 列表（用户端 - 只返回应该显示的）
   */
  async findAllActive(): Promise<Banner[]> {
    const now = new Date();

    const banners = await this.bannerRepo.find({
      where: {
        isActive: true,
      },
      order: {
        sortOrder: 'DESC',
        createdAt: 'DESC',
      },
    });

    // 过滤出在有效期内的 Banner
    return banners.filter((banner) => banner.isInValidPeriod());
  }

  /**
   * 获取 Banner 列表（管理端 - 返回所有）
   */
  async findAll(
    query: QueryBannersDto,
  ): Promise<{
    items: Banner[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const { page = 1, limit = 20, isActive } = query;

    const where: any = {};
    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    const [items, total] = await this.bannerRepo.findAndCount({
      where,
      order: {
        sortOrder: 'DESC',
        createdAt: 'DESC',
      },
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
   * 获取 Banner 详情
   */
  async findOne(id: number): Promise<Banner> {
    const banner = await this.bannerRepo.findOne({ where: { id } });

    if (!banner) {
      throw new NotFoundException('Banner 不存在');
    }

    return banner;
  }

  /**
   * 更新 Banner
   */
  async update(id: number, dto: UpdateBannerDto): Promise<Banner> {
    const banner = await this.findOne(id);

    const updateData: any = { ...dto };
    if (dto.startDate) {
      updateData.startDate = new Date(dto.startDate);
    }
    if (dto.endDate) {
      updateData.endDate = new Date(dto.endDate);
    }

    Object.assign(banner, updateData);

    return await this.bannerRepo.save(banner);
  }

  /**
   * 删除 Banner
   */
  async remove(id: number): Promise<void> {
    const banner = await this.findOne(id);
    await this.bannerRepo.remove(banner);
  }

  /**
   * 切换 Banner 激活状态
   */
  async toggleActive(id: number): Promise<Banner> {
    const banner = await this.findOne(id);
    banner.isActive = !banner.isActive;
    return await this.bannerRepo.save(banner);
  }

  /**
   * 记录 Banner 浏览
   */
  async incrementViewCount(id: number): Promise<void> {
    await this.bannerRepo.increment({ id }, 'viewCount', 1);
  }

  /**
   * 记录 Banner 点击
   */
  async incrementClickCount(id: number): Promise<void> {
    await this.bannerRepo.increment({ id }, 'clickCount', 1);
  }

  /**
   * 批量更新排序
   */
  async updateSortOrder(sortData: Array<{ id: number; sortOrder: number }>): Promise<void> {
    for (const item of sortData) {
      await this.bannerRepo.update(item.id, { sortOrder: item.sortOrder });
    }
  }
}
