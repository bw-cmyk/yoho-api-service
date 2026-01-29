import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsNumber,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateCommentDto {
  @ApiProperty({ description: '评论内容', maxLength: 500, minLength: 1 })
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  content: string;

  @ApiPropertyOptional({ description: '父评论ID（回复时提供）' })
  @IsOptional()
  @IsNumber()
  parentId?: number;

  @ApiPropertyOptional({ description: '回复的用户ID（@提及）' })
  @IsOptional()
  @IsString()
  replyToUserId?: string;
}

export class CommentQueryDto {
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
}

export class CommentResponseDto {
  @ApiProperty({ description: '评论ID' })
  id: number;

  @ApiProperty({ description: '晒单ID' })
  showcaseId: number;

  @ApiProperty({ description: '用户ID' })
  userId: string;

  @ApiProperty({ description: '用户名' })
  userName: string;

  @ApiProperty({ description: '用户头像' })
  userAvatar: string;

  @ApiProperty({ description: '评论内容' })
  content: string;

  @ApiPropertyOptional({ description: '父评论ID' })
  parentId?: number;

  @ApiPropertyOptional({ description: '回复的用户ID' })
  replyToUserId?: string;

  @ApiPropertyOptional({ description: '回复的用户名' })
  replyToUserName?: string;

  @ApiProperty({ description: '回复数量', default: 0 })
  replyCount: number;

  @ApiProperty({ description: '创建时间' })
  createdAt: Date;

  @ApiProperty({ description: '更新时间' })
  updatedAt: Date;

  @ApiPropertyOptional({ description: '回复列表', type: [CommentResponseDto] })
  replies?: CommentResponseDto[];
}
