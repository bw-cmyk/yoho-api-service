import {
  Controller,
  Get,
  Put,
  Param,
  Body,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Request as ExpressRequest } from 'express';
import { JwtAuthGuard } from '../../../common-modules/auth/jwt-auth.guard';
import { UserSettingService } from '../services/user-setting.service';
import { SetSettingDto } from '../dto/preference.dto';

@ApiTags('User - 通用设置')
@ApiBearerAuth()
@Controller('api/v1/user/settings')
export class UserSettingsController {
  constructor(private userSettingService: UserSettingService) {}

  @UseGuards(JwtAuthGuard)
  @Get(':key')
  @ApiOperation({ summary: '获取单个设置' })
  async getSetting(
    @Request() req: ExpressRequest,
    @Param('key') key: string,
  ): Promise<{ key: string; value: string }> {
    const userId = (req.user as any).id;
    const value = await this.userSettingService.get(userId, key);
    return { key, value };
  }

  @UseGuards(JwtAuthGuard)
  @Put(':key')
  @ApiOperation({ summary: '设置单个设置' })
  async setSetting(
    @Request() req: ExpressRequest,
    @Param('key') key: string,
    @Body() dto: SetSettingDto,
  ): Promise<void> {
    const userId = (req.user as any).id;
    await this.userSettingService.set(userId, key, dto.value);
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  @ApiOperation({ summary: '获取所有设置' })
  async getAllSettings(
    @Request() req: ExpressRequest,
  ): Promise<Record<string, string>> {
    const userId = (req.user as any).id;
    // 暂时返回空对象,未来可以实现获取所有设置
    return {};
  }
}
