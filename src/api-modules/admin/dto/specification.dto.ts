import { IsString, IsOptional, IsNumber, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type, Transform } from 'class-transformer';

export class CreateSpecificationDto {
  @ApiProperty({ description: '规格键，如 color, size' })
  @IsString()
  key: string;

  @ApiProperty({ description: '规格值，如 Red, Large' })
  @IsString()
  value: string;

  @ApiPropertyOptional({ description: '是否默认' })
  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  isDefault?: boolean;

  @ApiPropertyOptional({ description: '排序' })
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  sort?: number;
}

export class UpdateSpecificationDto {
  @ApiPropertyOptional({ description: '规格键' })
  @IsString()
  @IsOptional()
  key?: string;

  @ApiPropertyOptional({ description: '规格值' })
  @IsString()
  @IsOptional()
  value?: string;

  @ApiPropertyOptional({ description: '是否默认' })
  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  isDefault?: boolean;

  @ApiPropertyOptional({ description: '排序' })
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  sort?: number;
}
