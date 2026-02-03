import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, IsEnum, IsOptional, IsIP } from 'class-validator';

/**
 * 地理定位响应 DTO
 */
export class GeolocationResponseDto {
  @ApiProperty({
    description: 'IP 地址',
    example: '8.8.8.8',
  })
  @IsIP()
  ip: string;

  @ApiProperty({
    description: '国家名称',
    example: 'United States',
  })
  @IsString()
  country: string;

  @ApiProperty({
    description: '国家代码（ISO 3166-1 alpha-2）',
    example: 'US',
  })
  @IsString()
  countryCode: string;

  @ApiProperty({
    description: '城市名称',
    example: 'Mountain View',
  })
  @IsString()
  city: string;

  @ApiProperty({
    description: '地区/省份名称',
    example: 'California',
    required: false,
  })
  @IsOptional()
  @IsString()
  region?: string;

  @ApiProperty({
    description: '纬度',
    example: 37.386,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  latitude?: number;

  @ApiProperty({
    description: '经度',
    example: -122.0838,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  longitude?: number;

  @ApiProperty({
    description: '时区',
    example: 'America/Los_Angeles',
    required: false,
  })
  @IsOptional()
  @IsString()
  timezone?: string;

  @ApiProperty({
    description: '数据来源',
    enum: ['cache', 'offline', 'online-primary', 'online-fallback'],
    example: 'offline',
  })
  @IsEnum(['cache', 'offline', 'online-primary', 'online-fallback'])
  source: 'cache' | 'offline' | 'online-primary' | 'online-fallback';

  @ApiProperty({
    description: '数据置信度',
    enum: ['high', 'medium', 'low'],
    example: 'high',
  })
  @IsEnum(['high', 'medium', 'low'])
  confidence: 'high' | 'medium' | 'low';

  @ApiProperty({
    description: '时间戳（Unix 毫秒）',
    example: 1706897654321,
  })
  @IsNumber()
  timestamp: number;
}

/**
 * IP 查询请求 DTO
 */
export class LookupIpQueryDto {
  @ApiProperty({
    description: '要查询的 IP 地址',
    example: '8.8.8.8',
  })
  @IsIP()
  ip: string;
}
