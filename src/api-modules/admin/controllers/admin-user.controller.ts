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
import { UpdateUserDto, QueryUserDto } from '../dto/user.dto';

@ApiTags('Admin - 用户管理')
@ApiBearerAuth()
@Controller('api/v1/admin/users')
export class AdminUserController {
  constructor(private readonly adminUserService: AdminUserService) {}

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
