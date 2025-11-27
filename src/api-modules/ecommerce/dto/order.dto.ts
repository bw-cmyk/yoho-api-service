import {
  IsNumber,
  IsEnum,
  IsOptional,
  IsArray,
  IsString,
  Min,
  Max,
  IsObject,
  ValidateNested,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { OrderType } from '../enums/ecommerce.enums';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ProductSpecificationSelectionDto {
  @ApiProperty({ description: '规格键' })
  @IsString()
  key: string;

  @ApiProperty({ description: '规格值' })
  @IsString()
  value: string;
}

export class CreateInstantBuyOrderDto {
  @ApiProperty({ description: '商品ID' })
  @IsNumber()
  productId: number;

  @ApiProperty({ description: '购买数量', minimum: 1, default: 1 })
  @IsNumber()
  @Min(1)
  quantity: number;

  @ApiProperty({
    description: '选择的商品规格',
    type: [ProductSpecificationSelectionDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductSpecificationSelectionDto)
  specifications: ProductSpecificationSelectionDto[];

  @ApiPropertyOptional({ description: '收货地址ID' })
  @IsOptional()
  @IsNumber()
  shippingAddressId?: number;
}

export class CreateLuckyDrawOrderDto {
  @ApiProperty({ description: '商品ID' })
  @IsNumber()
  productId: number;

  @ApiProperty({ description: '购买的份数', minimum: 1 })
  @IsNumber()
  @Min(1)
  spots: number;
}

export class QueryOrdersDto {
  @ApiPropertyOptional({ enum: OrderType, description: '订单类型' })
  @IsOptional()
  @IsEnum(OrderType)
  type?: OrderType;

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

export class RequestRefundDto {
  @ApiProperty({ description: '订单ID' })
  @IsNumber()
  orderId: number;
}
