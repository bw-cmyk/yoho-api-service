import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { BannerService } from '../../ecommerce/services/banner.service';
import {
  CreateBannerDto,
  UpdateBannerDto,
  QueryBannersDto,
} from '../../ecommerce/dto/banner.dto';
import { AdminJwtGuard } from '../guards/admin-jwt.guard';

@ApiTags('Admin - Banner 管理')
@ApiBearerAuth()
@UseGuards(AdminJwtGuard)
@Controller('/api/v1/admin/banners')
export class AdminBannerController {
  constructor(private readonly bannerService: BannerService) {}

  @Post()
  @ApiOperation({ summary: '创建 Banner' })
  async create(@Body() dto: CreateBannerDto) {
    return await this.bannerService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: '获取 Banner 列表（管理端）' })
  async findAll(@Query() query: QueryBannersDto) {
    return await this.bannerService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: '获取 Banner 详情' })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return await this.bannerService.findOne(id);
  }

  @Put(':id')
  @ApiOperation({ summary: '更新 Banner' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateBannerDto,
  ) {
    return await this.bannerService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除 Banner' })
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.bannerService.remove(id);
    return { success: true };
  }

  @Post(':id/toggle-active')
  @ApiOperation({ summary: '切换 Banner 激活状态' })
  async toggleActive(@Param('id', ParseIntPipe) id: number) {
    return await this.bannerService.toggleActive(id);
  }

  @Post('sort')
  @ApiOperation({ summary: '批量更新 Banner 排序' })
  async updateSort(
    @Body() sortData: Array<{ id: number; sortOrder: number }>,
  ) {
    await this.bannerService.updateSortOrder(sortData);
    return { success: true };
  }
}
