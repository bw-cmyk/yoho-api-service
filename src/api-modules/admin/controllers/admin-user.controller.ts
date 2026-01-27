import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  Query,
  Post,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AdminUserService } from '../services/admin-user.service';
import { AdminAssetService } from '../services/admin-asset.service';
import { UpdateUserDto } from '../dto/user.dto';

@ApiTags('Admin - 用户管理')
@ApiBearerAuth()
@Controller('api/v1/admin/users')
export class AdminUserController {
  constructor(
    private readonly adminUserService: AdminUserService,
    private readonly adminAssetService: AdminAssetService,
  ) {}

  @Get()
  @ApiOperation({ summary: '获取用户列表' })
  findAll(@Query() query: any) {
    return this.adminUserService.findAll(query);
  }

  @Get('stats')
  @ApiOperation({ summary: '获取用户统计' })
  getStats() {
    return this.adminUserService.getStats();
  }

  // 资产相关路由必须在 :id 之前定义
  @Get(':id/assets')
  @ApiOperation({ summary: '获取用户资产概览' })
  getUserAssets(@Param('id') id: string) {
    return this.adminAssetService.getUserAssets(id);
  }

  @Get(':id/assets/transactions')
  @ApiOperation({ summary: '获取用户交易记录' })
  getUserTransactions(
    @Param('id') id: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('type') type?: string,
  ) {
    return this.adminAssetService.getUserTransactions(
      id,
      parseInt(page) || 1,
      parseInt(limit) || 20,
      type,
    );
  }

  @Get(':id/assets/chain-assets')
  @ApiOperation({ summary: '获取用户链上资产' })
  getUserChainAssets(@Param('id') id: string) {
    return this.adminAssetService.getUserChainAssets(id);
  }

  // 通用的 :id 路由放在最后
  @Get(':id')
  @ApiOperation({ summary: '获取用户详情' })
  findOne(@Param('id') id: string) {
    return this.adminUserService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: '更新用户信息' })
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.adminUserService.update(id, updateUserDto);
  }

  @Post(':id/ban')
  @ApiOperation({ summary: '封禁用户' })
  ban(@Param('id') id: string) {
    return this.adminUserService.ban(id);
  }

  @Post(':id/unban')
  @ApiOperation({ summary: '解封用户' })
  unban(@Param('id') id: string) {
    return this.adminUserService.unban(id);
  }
}
