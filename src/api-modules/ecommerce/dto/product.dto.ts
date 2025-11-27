import {
  IsString,
  IsNumber,
  IsEnum,
  IsOptional,
  IsArray,
  IsBoolean,
  IsDateString,
  ValidateNested,
  Min,
  Max,
  IsNumberString,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ProductType, ProductStatus } from '../enums/ecommerce.enums';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ProductSpecificationDto {
  @ApiProperty({ description: '规格键，如 color, size, capacity' })
  @IsString()
  key: string;

  @ApiProperty({ description: '规格值，如 Red, Large, 256GB' })
  @IsString()
  value: string;

  @ApiPropertyOptional({ description: '是否为默认值', default: false })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @ApiPropertyOptional({ description: '排序', default: 0 })
  @IsOptional()
  @IsNumber()
  sort?: number;
}

export class ProductReviewDto {
  @ApiPropertyOptional({ description: '评价人昵称' })
  @IsOptional()
  @IsString()
  reviewerName?: string;

  @ApiPropertyOptional({ description: '评价人头像' })
  @IsOptional()
  @IsString()
  reviewerAvatar?: string;

  @ApiProperty({ description: '评分，5星评分体系', minimum: 0, maximum: 5 })
  @IsNumber()
  @Min(0)
  @Max(5)
  rating: number;

  @ApiPropertyOptional({ description: '评价文案，100字以内' })
  @IsOptional()
  @IsString()
  content?: string;

  @ApiPropertyOptional({ description: '评价标签，评价文案中的关键词', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ description: '评价时间' })
  @IsOptional()
  @IsDateString()
  reviewTime?: string;
}

export class ProductTagDto {
  @ApiPropertyOptional({ description: '标签图标' })
  @IsOptional()
  @IsString()
  icon?: string;

  @ApiProperty({ description: '标签文案' })
  @IsString()
  text: string;
}

export class CreateProductDto {
  @ApiProperty({ enum: ProductType, description: '商品类型' })
  @IsEnum(ProductType)
  type: ProductType;

  @ApiPropertyOptional({ description: '优先级，用于显示规则和列表排序', default: 0 })
  @IsOptional()
  @IsNumber()
  priority?: number;

  @ApiPropertyOptional({ description: '运营角标，2个单词内的文案' })
  @IsOptional()
  @IsString()
  badge?: string;

  @ApiProperty({ description: '商品名称' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: '商品描述，一句话运营文案' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: '商品缩略图，用于列表展示' })
  @IsOptional()
  @IsString()
  thumbnail?: string;

  @ApiPropertyOptional({ description: '商品图片，支持多张大图，用于详情页展示', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];

  @ApiPropertyOptional({ description: '商品详情，富文本' })
  @IsOptional()
  @IsString()
  detail?: string;

  @ApiProperty({ description: '原价' })
  @IsNumber()
  @Min(0)
  originalPrice: number;

  @ApiProperty({ description: '售价，用户购买实际需支付价格' })
  @IsNumber()
  @Min(0)
  salePrice: number;

  @ApiPropertyOptional({ description: '库存，配置总库存即可', default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  stock?: number;

  @ApiPropertyOptional({ description: '日销量范围值，如1000个，用于模拟数据' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  dailySalesRange?: number;

  @ApiPropertyOptional({ description: '标签，支持多个，icon+文案组合', type: [ProductTagDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductTagDto)
  tags?: ProductTagDto[];

  @ApiPropertyOptional({ description: '售卖开始时间' })
  @IsOptional()
  @IsDateString()
  saleStartTime?: string;

  @ApiPropertyOptional({ description: '售卖结束时间' })
  @IsOptional()
  @IsDateString()
  saleEndTime?: string;

  @ApiPropertyOptional({ description: '单用户购买数量上限，null视为库存范围内无上限' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  purchaseLimit?: number;

  @ApiPropertyOptional({ description: '到货时间最小值（天数）' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  deliveryDaysMin?: number;

  @ApiPropertyOptional({ description: '到货时间最大值（天数）' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  deliveryDaysMax?: number;

  @ApiPropertyOptional({ enum: ProductStatus, description: '商品状态', default: ProductStatus.DRAFT })
  @IsOptional()
  @IsEnum(ProductStatus)
  status?: ProductStatus;

  @ApiPropertyOptional({ description: '商品规格', type: [ProductSpecificationDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductSpecificationDto)
  specifications?: ProductSpecificationDto[];

  @ApiPropertyOptional({ description: '商品评价（模拟数据）', type: [ProductReviewDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductReviewDto)
  reviews?: ProductReviewDto[];
}

export class UpdateProductDto {
  @ApiPropertyOptional({ description: '优先级' })
  @IsOptional()
  @IsNumber()
  priority?: number;

  @ApiPropertyOptional({ description: '运营角标' })
  @IsOptional()
  @IsString()
  badge?: string;

  @ApiPropertyOptional({ description: '商品名称' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: '商品描述' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: '商品缩略图' })
  @IsOptional()
  @IsString()
  thumbnail?: string;

  @ApiPropertyOptional({ description: '商品图片', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];

  @ApiPropertyOptional({ description: '商品详情' })
  @IsOptional()
  @IsString()
  detail?: string;

  @ApiPropertyOptional({ description: '原价' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  originalPrice?: number;

  @ApiPropertyOptional({ description: '售价' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  salePrice?: number;

  @ApiPropertyOptional({ description: '库存' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  stock?: number;

  @ApiPropertyOptional({ description: '日销量范围值' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  dailySalesRange?: number;

  @ApiPropertyOptional({ description: '标签', type: [ProductTagDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductTagDto)
  tags?: ProductTagDto[];

  @ApiPropertyOptional({ description: '售卖开始时间' })
  @IsOptional()
  @IsDateString()
  saleStartTime?: string;

  @ApiPropertyOptional({ description: '售卖结束时间' })
  @IsOptional()
  @IsDateString()
  saleEndTime?: string;

  @ApiPropertyOptional({ description: '购买上限' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  purchaseLimit?: number;

  @ApiPropertyOptional({ description: '到货时间最小值' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  deliveryDaysMin?: number;

  @ApiPropertyOptional({ description: '到货时间最大值' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  deliveryDaysMax?: number;

  @ApiPropertyOptional({ enum: ProductStatus, description: '商品状态' })
  @IsOptional()
  @IsEnum(ProductStatus)
  status?: ProductStatus;
}

export class QueryProductsDto {
  @ApiPropertyOptional({ enum: ProductType, description: '商品类型' })
  @IsOptional()
  @IsEnum(ProductType)
  type?: ProductType;

  @ApiPropertyOptional({ enum: ProductStatus, description: '商品状态' })
  @IsOptional()
  @IsEnum(ProductStatus)
  status?: ProductStatus;

  @ApiPropertyOptional({ description: '页码', default: 1 })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ description: '每页数量', default: 20 })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @Min(1)
  limit?: number;
}
