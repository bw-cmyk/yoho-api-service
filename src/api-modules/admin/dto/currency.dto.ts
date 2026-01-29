import {
  IsString,
  IsNumber,
  IsBoolean,
  IsOptional,
  Length,
  Matches,
  Min,
  Max,
  MaxLength,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateCurrencyDto {
  @IsString()
  @Length(3, 3, { message: 'Currency code must be exactly 3 characters' })
  @Transform(({ value }) => value.toUpperCase())
  code: string; // 'AED'

  @IsString()
  @Matches(/^\d+(\.\d{1,8})?$/, { message: 'Rate must be a valid decimal number with up to 8 decimal places' })
  rateToUSD: string; // '3.67'

  @IsString()
  @MaxLength(10)
  symbol: string; // 'د.إ'

  @IsString()
  @MaxLength(100)
  name: string; // 'UAE Dirham'

  @IsNumber()
  @Min(0)
  @Max(8)
  @IsOptional()
  decimals?: number; // 默认2

  @IsNumber()
  @Min(0)
  displayOrder: number;
}

export class UpdateCurrencyDto {
  @IsString()
  @Matches(/^\d+(\.\d{1,8})?$/, { message: 'Rate must be a valid decimal number with up to 8 decimal places' })
  @IsOptional()
  rateToUSD?: string;

  @IsString()
  @MaxLength(10)
  @IsOptional()
  symbol?: string;

  @IsString()
  @MaxLength(100)
  @IsOptional()
  name?: string;

  @IsNumber()
  @Min(0)
  @Max(8)
  @IsOptional()
  decimals?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  displayOrder?: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class CurrencyResponseDto {
  currency: string;
  rateToUSD: string;
  symbol: string;
  name: string;
  decimals: number;
  isActive: boolean;
  displayOrder: number;
  lastUpdatedAt: Date;
  updatedBy: string;
  createdAt: Date;
}
