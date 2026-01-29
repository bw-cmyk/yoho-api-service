import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { SharePlatform } from '../entities/showcase-share.entity';

export class CreateShareDto {
  @ApiProperty({
    enum: SharePlatform,
    description: '分享平台',
    example: SharePlatform.LINK,
  })
  @IsEnum(SharePlatform)
  platform: SharePlatform;

  @ApiPropertyOptional({ description: '分享URL（可选）' })
  @IsOptional()
  @IsString()
  shareUrl?: string;
}

export class ShareDataResponseDto {
  @ApiProperty({ description: '分享URL' })
  url: string;

  @ApiProperty({ description: '标题' })
  title: string;

  @ApiProperty({ description: '描述' })
  description: string;

  @ApiProperty({ description: '图片URL' })
  image: string;

  @ApiProperty({ description: '分享次数' })
  shareCount: number;
}

export class ShareStatsDto {
  @ApiProperty({ description: '总分享次数' })
  totalShares: number;

  @ApiProperty({ description: '按平台统计' })
  byPlatform: Record<SharePlatform, number>;

  @ApiProperty({ description: '最近分享时间', required: false })
  lastSharedAt: Date | null;
}
