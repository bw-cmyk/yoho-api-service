import {
  IsOptional,
  IsString,
  IsEnum,
  IsNumber,
  IsBoolean,
  IsDateString,
} from 'class-validator';
import { CampaignStatus } from '../entities/campaign.entity';

export class CreateCampaignDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  @IsEnum(CampaignStatus)
  status?: CampaignStatus;

  @IsOptional()
  @IsDateString()
  startTime?: string;

  @IsOptional()
  @IsDateString()
  endTime?: string;

  @IsOptional()
  participationConditions?: Record<string, any>;

  @IsOptional()
  rewardConfig?: Record<string, any>;

  @IsOptional()
  @IsNumber()
  sortOrder?: number;

  @IsOptional()
  @IsBoolean()
  isVisible?: boolean;
}

export class UpdateCampaignDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(CampaignStatus)
  status?: CampaignStatus;

  @IsOptional()
  @IsDateString()
  startTime?: string;

  @IsOptional()
  @IsDateString()
  endTime?: string;

  @IsOptional()
  participationConditions?: Record<string, any>;

  @IsOptional()
  rewardConfig?: Record<string, any>;

  @IsOptional()
  @IsNumber()
  sortOrder?: number;

  @IsOptional()
  @IsBoolean()
  isVisible?: boolean;
}

export class CampaignResponseDto {
  id: number;
  name: string;
  description?: string;
  code?: string;
  status: CampaignStatus;
  startTime?: Date;
  endTime?: Date;
  participationConditions?: Record<string, any>;
  rewardConfig?: Record<string, any>;
  sortOrder: number;
  isVisible: boolean;
  tasks?: TaskResponseDto[];
  createdAt: Date;
  updatedAt: Date;
}

export class TaskResponseDto {
  id: number;
  campaignId: number;
  name: string;
  description?: string;
  type: string;
  repeatType: string;
  maxCompletions: number;
  completionConditions?: Record<string, any>;
  deadline?: Date;
  redirectUrl?: string;
  sortOrder: number;
  isLocked: boolean;
  status: string;
  rewards?: RewardResponseDto[];
}

export class RewardResponseDto {
  id: number;
  taskId: number;
  rewardType: string;
  grantType: string;
  amount?: number;
  amountConfig?: Record<string, any>;
  currency?: string;
  targetBalance: string;
}

export class UserCampaignProgressResponseDto {
  id: number;
  userId: string;
  campaignId: number;
  status: string;
  accumulatedReward: number;
  completedAt?: Date;
  claimedAt?: Date;
  claimExpiryAt?: Date;
  campaign?: CampaignResponseDto;
}
