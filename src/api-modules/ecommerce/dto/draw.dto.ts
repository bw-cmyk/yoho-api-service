import {
  IsNumber,
  IsOptional,
  Min,
  IsInt,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PurchaseSpotsDto {
  @ApiProperty({ description: '商品ID' })
  @IsNumber()
  productId: number;

  @ApiProperty({ description: '购买号码数量', minimum: 1 })
  @IsInt()
  @Min(1)
  quantity: number;
}

export class QueryDrawRoundsDto {
  @ApiPropertyOptional({ description: '商品ID' })
  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => parseInt(value))
  productId?: number;

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

export class QueryParticipationsDto {
  @ApiPropertyOptional({ description: '商品ID' })
  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => parseInt(value))
  productId?: number;

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

export class MyWinningHistoryQueryDto {
  @ApiPropertyOptional({ description: '页码', default: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Transform(({ value }) => parseInt(value))
  page?: number = 1;

  @ApiPropertyOptional({ description: '每页数量', default: 20 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Transform(({ value }) => parseInt(value))
  limit?: number = 20;
}

export class RecentWinnersQueryDto {
  @ApiPropertyOptional({ description: '返回数量', default: 50, maximum: 100 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Transform(({ value }) => parseInt(value))
  limit?: number = 50;
}

