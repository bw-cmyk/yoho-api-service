import { IsEnum, IsString } from 'class-validator';
import { Currency } from '../../assets/entities/balance/user-asset.entity';

// 通用设置DTO
export class SetSettingDto {
  @IsString()
  value: string;
}

// 货币偏好DTO
export class SetCurrencyDto {
  @IsEnum(Currency, { message: 'Currency must be USD, AED, or INR' })
  currency: string; // 'USD' | 'AED' | 'INR'
}

export class CurrencyPreferenceResponseDto {
  currency: string;
}

export class AvailableCurrencyDto {
  currency: string;
  symbol: string;
  name: string;
  decimals: number;
  displayOrder: number;
}
