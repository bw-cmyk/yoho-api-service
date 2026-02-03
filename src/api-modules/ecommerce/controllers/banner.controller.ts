import {
  Controller,
  Get,
  Post,
  Param,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { BannerService } from '../services/banner.service';

@ApiTags('Banner')
@Controller('/api/v1/ecommerce/banners')
export class BannerController {
  constructor(private readonly bannerService: BannerService) {}

  @Get()
  @ApiOperation({ summary: '获取激活的 Banner 列表（用户端）' })
  async getActiveBanners() {
    return await this.bannerService.findAllActive();
  }

  @Get(':id')
  @ApiOperation({ summary: '获取 Banner 详情' })
  async getBannerDetail(@Param('id', ParseIntPipe) id: number) {
    return await this.bannerService.findOne(id);
  }

  @Post(':id/view')
  @ApiOperation({ summary: '记录 Banner 浏览' })
  async recordView(@Param('id', ParseIntPipe) id: number) {
    await this.bannerService.incrementViewCount(id);
    return { success: true };
  }

  @Post(':id/click')
  @ApiOperation({ summary: '记录 Banner 点击' })
  async recordClick(@Param('id', ParseIntPipe) id: number) {
    await this.bannerService.incrementClickCount(id);
    return { success: true };
  }
}
