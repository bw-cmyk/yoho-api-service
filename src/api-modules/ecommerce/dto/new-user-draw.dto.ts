import { IsNumber, IsOptional } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class NewUserDrawChanceDto {
  @ApiProperty({ description: '机会ID' })
  id: number;

  @ApiProperty({ description: '状态' })
  status: string;

  @ApiProperty({ description: '机会金额（元）' })
  chanceAmount: string;

  @ApiProperty({ description: 'Bonus金额（元）' })
  bonusAmount: string;

  @ApiProperty({ description: '过期时间' })
  expiresAt: Date;

  @ApiProperty({ description: '剩余秒数' })
  remainingSeconds: number;
}

export class UseNewUserChanceDto {
  @ApiPropertyOptional({
    description: '商品ID（可选，不指定则参与进行中的期次）',
  })
  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => parseInt(value))
  productId?: number;
}

export class NewUserDrawStatusResponseDto {
  @ApiProperty({ description: '是否有可用机会' })
  hasChance: boolean;

  @ApiPropertyOptional({ description: '机会详情' })
  chance?: NewUserDrawChanceDto;
}
