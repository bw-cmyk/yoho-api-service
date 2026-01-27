import {
  IsString,
  IsOptional,
  IsEnum,
  IsBoolean,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { Role } from '../../user/entity/user.entity';

export class UpdateUserDto {
  @ApiPropertyOptional({ description: '昵称' })
  @IsString()
  @IsOptional()
  nickname?: string;

  @ApiPropertyOptional({ description: '邮箱' })
  @IsString()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({ enum: Role, description: '角色' })
  @IsEnum(Role)
  @IsOptional()
  @Type(() => Number)
  role?: Role;

  @ApiPropertyOptional({ description: '是否封禁' })
  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  banned?: boolean;
}

export class QueryUserDto {
  @ApiPropertyOptional({ description: '页码', default: 1 })
  @IsOptional()
  @Type(() => Number)
  page?: number;

  @ApiPropertyOptional({ description: '每页数量', default: 10 })
  @IsOptional()
  @Type(() => Number)
  limit?: number;

  @ApiPropertyOptional({ description: '搜索关键词(用户名/邮箱/昵称)' })
  @IsString()
  @IsOptional()
  keyword?: string;

  @ApiPropertyOptional({ enum: Role, description: '角色筛选' })
  @IsEnum(Role)
  @IsOptional()
  @Type(() => Number)
  role?: Role;

  @ApiPropertyOptional({ description: '封禁状态筛选' })
  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  banned?: boolean;
}
