import {
  IsNumber,
  IsOptional,
  IsString,
  IsEnum,
  IsArray,
  ValidateNested,
  Min,
  IsDateString,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PrizeShippingStatus } from '../../ecommerce/enums/ecommerce.enums';

// ==================== 实物奖品订单管理 DTOs ====================

export class QueryPrizeOrdersDto {
  @ApiPropertyOptional({
    description: '发货状态',
    enum: PrizeShippingStatus,
  })
  @IsOptional()
  @IsEnum(PrizeShippingStatus)
  status?: PrizeShippingStatus;

  @ApiPropertyOptional({ description: '搜索关键词（订单号、用户名、物流单号）' })
  @IsOptional()
  @IsString()
  keyword?: string;

  @ApiPropertyOptional({ description: '开始日期（YYYY-MM-DD）' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: '结束日期（YYYY-MM-DD）' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

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

export class ShipPrizeOrderDto {
  @ApiProperty({ description: '物流公司名称' })
  @IsString()
  logisticsCompany: string;

  @ApiProperty({ description: '物流单号' })
  @IsString()
  trackingNumber: string;
}

export class BatchShipOrderItemDto {
  @ApiProperty({ description: '抽奖结果ID' })
  @IsNumber()
  drawResultId: number;

  @ApiProperty({ description: '物流公司名称' })
  @IsString()
  logisticsCompany: string;

  @ApiProperty({ description: '物流单号' })
  @IsString()
  trackingNumber: string;
}

export class BatchShipPrizeOrdersDto {
  @ApiProperty({
    description: '批量发货订单列表',
    type: [BatchShipOrderItemDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BatchShipOrderItemDto)
  orders: BatchShipOrderItemDto[];
}
