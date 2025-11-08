import { IsOptional, IsString, IsEnum, IsNumber, IsBoolean, IsDateString, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { TaskType, TaskRepeatType } from '../entities/task.entity';
import { RewardType, RewardGrantType } from '../entities/task-reward.entity';

export class CreateTaskRewardDto {
  @IsEnum(RewardType)
  rewardType: RewardType;

  @IsEnum(RewardGrantType)
  grantType: RewardGrantType;

  @IsOptional()
  @IsNumber()
  amount?: number;

  @IsOptional()
  amountConfig?: Record<string, any>;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsString()
  targetBalance?: string;
}

export class CreateTaskDto {
  @IsNumber()
  campaignId: number;

  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsEnum(TaskType)
  type: TaskType;

  @IsOptional()
  @IsEnum(TaskRepeatType)
  repeatType?: TaskRepeatType;

  @IsOptional()
  @IsNumber()
  maxCompletions?: number;

  @IsOptional()
  completionConditions?: Record<string, any>;

  @IsOptional()
  @IsDateString()
  deadline?: string;

  @IsOptional()
  @IsString()
  redirectUrl?: string;

  @IsOptional()
  @IsNumber()
  sortOrder?: number;

  @IsOptional()
  @IsBoolean()
  isLocked?: boolean;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateTaskRewardDto)
  rewards?: CreateTaskRewardDto[];
}

export class UpdateTaskDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(TaskType)
  type?: TaskType;

  @IsOptional()
  @IsEnum(TaskRepeatType)
  repeatType?: TaskRepeatType;

  @IsOptional()
  @IsNumber()
  maxCompletions?: number;

  @IsOptional()
  completionConditions?: Record<string, any>;

  @IsOptional()
  @IsDateString()
  deadline?: string;

  @IsOptional()
  @IsString()
  redirectUrl?: string;

  @IsOptional()
  @IsNumber()
  sortOrder?: number;

  @IsOptional()
  @IsBoolean()
  isLocked?: boolean;

  @IsOptional()
  @IsString()
  status?: string;
}

export class CompleteTaskDto {
  @IsOptional()
  completionData?: Record<string, any>;

  @IsOptional()
  @IsString()
  referenceId?: string;
}

export class ClaimCampaignRewardDto {
  @IsNumber()
  campaignId: number;
}

