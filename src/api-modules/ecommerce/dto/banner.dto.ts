import {
  IsString,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsNumber,
  IsUrl,
  IsDateString,
  MaxLength,
  Min,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BannerActionType } from '../entities/banner.entity';

export class CreateBannerDto {
  @ApiProperty({ description: '主标题', maxLength: 255 })
  @IsString()
  @MaxLength(255)
  title: string;

  @ApiPropertyOptional({ description: '副标题', maxLength: 255 })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  subtitle?: string;

  @ApiPropertyOptional({ description: '详细描述' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Banner 图片 URL' })
  @IsString()
  imageUrl: string;

  @ApiPropertyOptional({ description: '移动端图片 URL' })
  @IsOptional()
  @IsString()
  mobileImageUrl?: string;

  @ApiProperty({
    description: '动作类型',
    enum: BannerActionType,
    default: BannerActionType.NONE,
  })
  @IsEnum(BannerActionType)
  actionType: BannerActionType;

  @ApiPropertyOptional({ description: '动作值（路由路径、外部链接、商品ID等）' })
  @IsOptional()
  @IsString()
  @MaxLength(512)
  actionValue?: string;

  @ApiPropertyOptional({ description: '按钮文字', maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  buttonText?: string;

  @ApiPropertyOptional({ description: '背景颜色（十六进制或CSS渐变）', maxLength: 50 })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  backgroundColor?: string;

  @ApiPropertyOptional({ description: '是否激活', default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: '排序（数字越大越靠前）', default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  sortOrder?: number;

  @ApiPropertyOptional({ description: '开始时间（ISO 8601格式）' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: '结束时间（ISO 8601格式）' })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}

export class UpdateBannerDto {
  @ApiPropertyOptional({ description: '主标题', maxLength: 255 })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  title?: string;

  @ApiPropertyOptional({ description: '副标题', maxLength: 255 })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  subtitle?: string;

  @ApiPropertyOptional({ description: '详细描述' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Banner 图片 URL' })
  @IsOptional()
  @IsString()
  imageUrl?: string;

  @ApiPropertyOptional({ description: '移动端图片 URL' })
  @IsOptional()
  @IsString()
  mobileImageUrl?: string;

  @ApiPropertyOptional({
    description: '动作类型',
    enum: BannerActionType,
  })
  @IsOptional()
  @IsEnum(BannerActionType)
  actionType?: BannerActionType;

  @ApiPropertyOptional({ description: '动作值（路由路径、外部链接、商品ID等）' })
  @IsOptional()
  @IsString()
  @MaxLength(512)
  actionValue?: string;

  @ApiPropertyOptional({ description: '按钮文字', maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  buttonText?: string;

  @ApiPropertyOptional({ description: '背景颜色（十六进制或CSS渐变）', maxLength: 50 })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  backgroundColor?: string;

  @ApiPropertyOptional({ description: '是否激活' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: '排序（数字越大越靠前）' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  sortOrder?: number;

  @ApiPropertyOptional({ description: '开始时间（ISO 8601格式）' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: '结束时间（ISO 8601格式）' })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}

export class QueryBannersDto {
  @ApiPropertyOptional({ description: '是否只返回激活的 Banner', default: true })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: '页码', default: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Transform(({ value }) => parseInt(value))
  page?: number;

  @ApiPropertyOptional({ description: '每页数量', default: 20 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Transform(({ value }) => parseInt(value))
  limit?: number;
}

export class BannerResponseDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  title: string;

  @ApiProperty()
  subtitle: string | null;

  @ApiProperty()
  description: string | null;

  @ApiProperty()
  imageUrl: string;

  @ApiProperty()
  mobileImageUrl: string | null;

  @ApiProperty({ enum: BannerActionType })
  actionType: BannerActionType;

  @ApiProperty()
  actionValue: string | null;

  @ApiProperty()
  buttonText: string | null;

  @ApiProperty()
  backgroundColor: string | null;

  @ApiProperty()
  isActive: boolean;

  @ApiProperty()
  sortOrder: number;

  @ApiProperty()
  startDate: Date | null;

  @ApiProperty()
  endDate: Date | null;

  @ApiProperty()
  clickCount: number;

  @ApiProperty()
  viewCount: number;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
