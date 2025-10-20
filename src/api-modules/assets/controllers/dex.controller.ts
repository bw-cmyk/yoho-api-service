import {
  Controller,
  Get,
  Query,
  HttpException,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { DexService } from '../services/dex.service';
import { JwtAuthGuard } from 'src/common-modules/auth/jwt-auth.guard';

export interface SwapQuoteRequest {
  chainIndex: string;
  fromTokenAddress: string;
  toTokenAddress: string;
  amount: string;
  slippagePercent?: string;
}

@ApiTags('DEX 聚合器')
@Controller('/api/v1/dex')
export class DexController {
  constructor(private readonly dexService: DexService) {}

  @Get('swap-quote')
  @ApiOperation({ summary: '获取交换报价' })
  @ApiResponse({
    status: 200,
    description: '获取交换报价成功',
  })
  @ApiQuery({
    name: 'chainIndex',
    required: true,
    description: '链索引',
    example: '1',
  })
  @ApiQuery({
    name: 'fromTokenAddress',
    required: true,
    description: '源代币合约地址',
    example: '0x...',
  })
  @ApiQuery({
    name: 'toTokenAddress',
    required: true,
    description: '目标代币合约地址',
    example: '0x...',
  })
  @ApiQuery({
    name: 'amount',
    required: true,
    description: '交换数量',
    example: '1000000000000000000',
  })
  @ApiQuery({
    name: 'slippagePercent',
    required: false,
    description: '滑点百分比，默认 0.5',
    example: '0.5',
  })
  @UseGuards(JwtAuthGuard)
  async getSwapQuote(@Query() query: SwapQuoteRequest) {
    try {
      const {
        chainIndex,
        fromTokenAddress,
        toTokenAddress,
        amount,
        slippagePercent = '0.5',
      } = query;

      // 验证必需参数
      if (!chainIndex || !fromTokenAddress || !toTokenAddress || !amount) {
        throw new HttpException(
          'Missing required parameters: chainIndex, fromTokenAddress, toTokenAddress, amount',
          HttpStatus.BAD_REQUEST,
        );
      }

      const params = {
        chainIndex,
        fromTokenAddress,
        toTokenAddress,
        amount,
        slippagePercent,
      };

      const quote = await this.dexService.getSwapQuote(params);

      return {
        success: true,
        data: quote,
        message: 'Swap quote retrieved successfully',
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: error instanceof Error ? error.message : 'Unknown error',
          error: 'Failed to get swap quote',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
