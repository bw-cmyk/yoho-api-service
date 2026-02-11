import {
  IsNumber,
  IsOptional,
  Min,
  IsInt,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PurchaseSpotsDto {
  @ApiProperty({ description: '商品ID' })
  @IsNumber()
  productId: number;

  @ApiProperty({ description: '购买号码数量', minimum: 1 })
  @IsInt()
  @Min(1)
  quantity: number;
}

export class QueryDrawRoundsDto {
  @ApiPropertyOptional({ description: '商品ID' })
  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => parseInt(value))
  productId?: number;

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

export class QueryParticipationsDto {
  @ApiPropertyOptional({ description: '商品ID' })
  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => parseInt(value))
  productId?: number;

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

export class MyWinningHistoryQueryDto {
  @ApiPropertyOptional({ description: '页码', default: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Transform(({ value }) => parseInt(value))
  page?: number = 1;

  @ApiPropertyOptional({ description: '每页数量', default: 20 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Transform(({ value }) => parseInt(value))
  limit?: number = 20;
}

export class RecentWinnersQueryDto {
  @ApiPropertyOptional({ description: '返回数量', default: 50, maximum: 100 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Transform(({ value }) => parseInt(value))
  limit?: number = 50;
}

// ==================== 实物奖品发货 DTOs ====================

export class MyPhysicalPrizesQueryDto {
  @ApiPropertyOptional({ description: '页码', default: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Transform(({ value }) => parseInt(value))
  page?: number = 1;

  @ApiPropertyOptional({ description: '每页数量', default: 20 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Transform(({ value }) => parseInt(value))
  limit?: number = 20;
}

export class ClaimPhysicalPrizeDto {
  @ApiProperty({ description: '收货地址ID' })
  @IsNumber()
  shippingAddressId: number;
}

// ==================== 参与详情响应 DTO ====================

export class ParticipationDetailProductDto {
  @ApiProperty({ description: '商品ID' })
  id: number;

  @ApiProperty({ description: '商品名称' })
  name: string;

  @ApiProperty({ description: '商品图片' })
  imageUrl: string;

  @ApiProperty({ description: '奖品类型' })
  prizeType: string;
}

export class ParticipationDetailDrawRoundDto {
  @ApiProperty({ description: '轮次ID' })
  id: number;

  @ApiProperty({ description: '轮次号' })
  roundNumber: number;

  @ApiProperty({ description: '总份数' })
  totalSpots: number;

  @ApiProperty({ description: '已售份数' })
  soldSpots: number;

  @ApiProperty({ description: '单价' })
  pricePerSpot: string;

  @ApiProperty({ description: '奖品价值' })
  prizeValue: string;

  @ApiProperty({ description: '状态' })
  status: string;

  @ApiPropertyOptional({ description: '售罄时间' })
  completedAt?: Date;

  @ApiPropertyOptional({ description: '开奖时间' })
  drawnAt?: Date;

  @ApiProperty({ description: '商品信息' })
  product: ParticipationDetailProductDto;
}

export class ParticipationDetailVerificationDto {
  @ApiProperty({ description: '目标区块高度' })
  targetBlockHeight: number;

  @ApiProperty({ description: '目标区块哈希' })
  targetBlockHash: string;

  @ApiProperty({ description: '哈希后6位' })
  hashLast6Digits: string;

  @ApiProperty({ description: '验证链接' })
  verificationUrl: string;
}

export class ParticipationDetailDrawResultDto {
  @ApiProperty({ description: '开奖结果ID' })
  id: number;

  @ApiProperty({ description: '中奖号码' })
  winningNumber: number;

  @ApiProperty({ description: '是否中奖' })
  isWinner: boolean;

  @ApiProperty({ description: '奖品类型' })
  prizeType: string;

  @ApiProperty({ description: '奖品价值' })
  prizeValue: string;

  @ApiProperty({ description: '奖品状态' })
  prizeStatus: string;

  @ApiProperty({ description: '开奖时间' })
  drawnAt: Date;

  @ApiPropertyOptional({ description: '区块链验证信息' })
  verification?: ParticipationDetailVerificationDto;
}

export class ParticipationDetailPrizeOrderDto {
  @ApiProperty({ description: '订单ID' })
  orderId: number;

  @ApiProperty({ description: '订单号' })
  orderNumber: string;

  @ApiProperty({ description: '发货状态' })
  shippingStatus: string;

  @ApiPropertyOptional({ description: '物流公司' })
  logisticsCompany?: string;

  @ApiPropertyOptional({ description: '物流单号' })
  trackingNumber?: string;

  @ApiPropertyOptional({ description: '签收时间' })
  deliveredAt?: Date;

  @ApiPropertyOptional({ description: '收货地址' })
  shippingAddress?: Record<string, any>;
}

export class ParticipationDetailResponseDto {
  @ApiProperty({ description: '参与记录ID' })
  participationId: number;

  @ApiProperty({ description: '订单号' })
  orderNumber: string;

  @ApiProperty({ description: '购买数量' })
  quantity: number;

  @ApiProperty({ description: '起始号码' })
  startNumber: number;

  @ApiProperty({ description: '结束号码' })
  endNumber: number;

  @ApiProperty({ description: '所有号码', type: [Number] })
  ticketNumbers: number[];

  @ApiProperty({ description: '总金额' })
  totalAmount: string;

  @ApiProperty({ description: '是否为新用户抽奖' })
  isNewUserChance: boolean;

  @ApiProperty({ description: '参与时间' })
  participatedAt: Date;

  @ApiProperty({ description: '轮次信息' })
  drawRound: ParticipationDetailDrawRoundDto;

  @ApiPropertyOptional({ description: '开奖结果（如已开奖）' })
  drawResult?: ParticipationDetailDrawResultDto;

  @ApiPropertyOptional({ description: '奖品订单（如中奖且为实物）' })
  prizeOrder?: ParticipationDetailPrizeOrderDto;
}

