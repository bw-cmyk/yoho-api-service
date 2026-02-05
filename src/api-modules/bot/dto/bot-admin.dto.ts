import {
  IsNumber,
  IsOptional,
  IsString,
  IsBoolean,
  IsArray,
  Min,
  Max,
  ArrayMinSize,
  ArrayMaxSize,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';

// ========== Bot User DTOs ==========

export class BatchCreateBotUsersDto {
  @IsNumber()
  @Min(1)
  @Max(100)
  count: number;

  @IsOptional()
  @IsString()
  displayNamePrefix?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  initialBalance?: number;
}

export class RechargeDto {
  @IsNumber()
  @Min(0.01)
  amount: number;
}

export class BatchRechargeDto {
  @IsNumber()
  @Min(0.01)
  amountPerBot: number;
}

export class ToggleStatusDto {
  @IsBoolean()
  enabled: boolean;
}

// ========== Lucky Draw Config DTOs ==========

export class UpdateLuckyDrawConfigDto {
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(10)
  minIntervalSeconds?: number;

  @IsOptional()
  @IsNumber()
  @Min(10)
  maxIntervalSeconds?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  minQuantity?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  maxQuantity?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  dailyOrderLimit?: number;

  @IsOptional()
  @IsNumber()
  @Min(10)
  @Max(95)
  maxFillPercentage?: number;

  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  @ArrayMinSize(0)
  @ArrayMaxSize(24)
  activeHours?: number[];
}

export class CreateLuckyDrawTaskDto {
  @IsNumber()
  productId: number;

  @IsOptional()
  @Type(() => UpdateLuckyDrawConfigDto)
  config?: UpdateLuckyDrawConfigDto;
}

// ========== Query DTOs ==========

export class GetBotUsersQueryDto {
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true')
  enabled?: boolean;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true')
  hasBalance?: boolean;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  page?: number = 1;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  limit?: number = 20;
}

export class GetTasksQueryDto {
  @IsOptional()
  @IsString()
  taskType?: string;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true')
  enabled?: boolean;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  page?: number = 1;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  limit?: number = 20;
}

export class GetTaskLogsQueryDto {
  @IsOptional()
  @IsString()
  taskType?: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  taskId?: number;

  @IsOptional()
  @IsString()
  status?: 'SUCCESS' | 'FAILED' | 'SKIPPED';

  @IsOptional()
  @IsString()
  botUserId?: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  page?: number = 1;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  limit?: number = 50;
}
