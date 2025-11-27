import {
  IsString,
  IsNumber,
  IsOptional,
  IsBoolean,
  MinLength,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateShippingAddressDto {
  @ApiProperty({ description: '收件人姓名' })
  @IsString()
  @MinLength(1)
  @MaxLength(128)
  recipientName: string;

  @ApiProperty({ description: '联系电话' })
  @IsString()
  @MinLength(1)
  @MaxLength(32)
  phoneNumber: string;

  @ApiProperty({ description: '国家' })
  @IsString()
  @MinLength(1)
  @MaxLength(128)
  country: string;

  @ApiPropertyOptional({ description: '省/州' })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  state?: string;

  @ApiProperty({ description: '城市' })
  @IsString()
  @MinLength(1)
  @MaxLength(128)
  city: string;

  @ApiProperty({ description: '街道地址' })
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  streetAddress: string;

  @ApiPropertyOptional({ description: '公寓/套房号' })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  apartment?: string;

  @ApiPropertyOptional({ description: '邮政编码' })
  @IsOptional()
  @IsString()
  @MaxLength(32)
  zipCode?: string;

  @ApiPropertyOptional({ description: '设为默认地址', default: false })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}

export class UpdateShippingAddressDto {
  @ApiPropertyOptional({ description: '收件人姓名' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(128)
  recipientName?: string;

  @ApiPropertyOptional({ description: '联系电话' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(32)
  phoneNumber?: string;

  @ApiPropertyOptional({ description: '国家' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(128)
  country?: string;

  @ApiPropertyOptional({ description: '省/州' })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  state?: string;

  @ApiPropertyOptional({ description: '城市' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(128)
  city?: string;

  @ApiPropertyOptional({ description: '街道地址' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  streetAddress?: string;

  @ApiPropertyOptional({ description: '公寓/套房号' })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  apartment?: string;

  @ApiPropertyOptional({ description: '邮政编码' })
  @IsOptional()
  @IsString()
  @MaxLength(32)
  zipCode?: string;

  @ApiPropertyOptional({ description: '设为默认地址' })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}
