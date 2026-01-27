import {
  IsString,
  IsOptional,
  IsNumber,
  IsEnum,
  IsArray,
  IsDateString,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ProductType,
  ProductStatus,
} from '../../ecommerce/enums/ecommerce.enums';

export class CreateProductDto {
  @ApiProperty({ enum: ProductType, description: '商品类型' })
  @IsEnum(ProductType)
  type: ProductType;

  @ApiProperty({ description: '商品名称' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: '商品描述' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ description: '原价' })
  @IsString()
  originalPrice: string;

  @ApiProperty({ description: '售价' })
  @IsString()
  salePrice: string;

  @ApiPropertyOptional({ description: '库存' })
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  stock?: number;

  @ApiPropertyOptional({ description: '缩略图URL' })
  @IsString()
  @IsOptional()
  thumbnail?: string;

  @ApiPropertyOptional({ description: '商品图片数组' })
  @IsArray()
  @IsOptional()
  images?: string[];

  @ApiPropertyOptional({ description: '商品详情(富文本)' })
  @IsString()
  @IsOptional()
  detail?: string;

  @ApiPropertyOptional({ description: '运营角标' })
  @IsString()
  @IsOptional()
  badge?: string;

  @ApiPropertyOptional({ description: '优先级' })
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  priority?: number;

  @ApiPropertyOptional({ description: '售卖开始时间' })
  @IsDateString()
  @IsOptional()
  saleStartTime?: string;

  @ApiPropertyOptional({ description: '售卖结束时间' })
  @IsDateString()
  @IsOptional()
  saleEndTime?: string;

  @ApiPropertyOptional({ description: '单用户购买上限' })
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  purchaseLimit?: number;
}

export class UpdateProductDto {
  @ApiPropertyOptional({ enum: ProductType, description: '商品类型' })
  @IsEnum(ProductType)
  @IsOptional()
  type?: ProductType;

  @ApiPropertyOptional({ description: '商品名称' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ description: '商品描述' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ description: '原价' })
  @IsString()
  @IsOptional()
  originalPrice?: string;

  @ApiPropertyOptional({ description: '售价' })
  @IsString()
  @IsOptional()
  salePrice?: string;

  @ApiPropertyOptional({ enum: ProductStatus, description: '状态' })
  @IsEnum(ProductStatus)
  @IsOptional()
  status?: ProductStatus;

  @ApiPropertyOptional({ description: '库存' })
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  stock?: number;

  @ApiPropertyOptional({ description: '缩略图URL' })
  @IsString()
  @IsOptional()
  thumbnail?: string;

  @ApiPropertyOptional({ description: '商品图片数组' })
  @IsArray()
  @IsOptional()
  images?: string[];

  @ApiPropertyOptional({ description: '商品详情(富文本)' })
  @IsString()
  @IsOptional()
  detail?: string;

  @ApiPropertyOptional({ description: '运营角标' })
  @IsString()
  @IsOptional()
  badge?: string;

  @ApiPropertyOptional({ description: '优先级' })
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  priority?: number;

  @ApiPropertyOptional({ description: '售卖开始时间' })
  @IsDateString()
  @IsOptional()
  saleStartTime?: string;

  @ApiPropertyOptional({ description: '售卖结束时间' })
  @IsDateString()
  @IsOptional()
  saleEndTime?: string;

  @ApiPropertyOptional({ description: '单用户购买上限' })
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  purchaseLimit?: number;
}

export class QueryProductDto {
  @ApiPropertyOptional({ description: '页码', default: 1 })
  @IsOptional()
  @Type(() => Number)
  page?: number;

  @ApiPropertyOptional({ description: '每页数量', default: 10 })
  @IsOptional()
  @Type(() => Number)
  limit?: number;

  @ApiPropertyOptional({ description: '搜索关键词' })
  @IsString()
  @IsOptional()
  keyword?: string;

  @ApiPropertyOptional({ enum: ProductType, description: '类型筛选' })
  @IsEnum(ProductType)
  @IsOptional()
  type?: ProductType;

  @ApiPropertyOptional({ enum: ProductStatus, description: '状态筛选' })
  @IsEnum(ProductStatus)
  @IsOptional()
  status?: ProductStatus;
}
