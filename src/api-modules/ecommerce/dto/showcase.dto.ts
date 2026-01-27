import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsNumber,
  IsArray,
  MaxLength,
  ArrayMaxSize,
  ValidateNested,
  IsEnum,
} from 'class-validator';
import { Type } from 'class-transformer';
import { MediaType } from '../entities/showcase.entity';

class MediaItemDto {
  @ApiProperty({ enum: MediaType, description: '媒体类型' })
  @IsEnum(MediaType)
  type: MediaType;

  @ApiProperty({ description: '媒体URL' })
  @IsString()
  url: string;

  @ApiPropertyOptional({ description: '视频缩略图URL' })
  @IsOptional()
  @IsString()
  thumbnailUrl?: string;

  @ApiPropertyOptional({ description: 'Cloudflare文件ID' })
  @IsOptional()
  @IsString()
  cloudflareId?: string;
}

export class CreateShowcaseDto {
  @ApiPropertyOptional({ description: '文案内容', maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  content?: string;

  @ApiProperty({ description: '媒体文件列表', type: [MediaItemDto] })
  @IsArray()
  @ArrayMaxSize(9)
  @ValidateNested({ each: true })
  @Type(() => MediaItemDto)
  media: MediaItemDto[];

  @ApiPropertyOptional({ description: '关联商品ID' })
  @IsOptional()
  @IsNumber()
  productId?: number;

  @ApiPropertyOptional({ description: '关联抽奖期次ID' })
  @IsOptional()
  @IsNumber()
  drawRoundId?: number;

  @ApiPropertyOptional({ description: '奖品信息' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  prizeInfo?: string;
}

export class ShowcaseQueryDto {
  @ApiPropertyOptional({ description: '页码', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  page?: number = 1;

  @ApiPropertyOptional({ description: '每页数量', default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  limit?: number = 20;

  @ApiPropertyOptional({ description: '用户ID' })
  @IsOptional()
  @IsString()
  userId?: string;
}
