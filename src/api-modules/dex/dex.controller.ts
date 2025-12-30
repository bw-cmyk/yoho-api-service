import {
  Controller,
  Get,
  Query,
  HttpException,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { DexService } from './dex.service';
import { JwtAuthGuard } from 'src/common-modules/auth/jwt-auth.guard';

export interface SwapQuoteRequest {
  chainIndex: string;
  fromTokenAddress: string;
  toTokenAddress: string;
  amount: string;
  slippagePercent?: string;
}

export interface SwapRequest {
  chainIndex: string;
  amount: string;
  swapMode: 'exactIn' | 'exactOut';
  fromTokenAddress: string;
  toTokenAddress: string;
  slippagePercent: string;
  userWalletAddress: string;
  swapReceiverAddress?: string;
  feePercent?: string;
  fromTokenReferrerWalletAddress?: string;
  toTokenReferrerWalletAddress?: string;
  positiveSlippagePercent?: string;
  positiveSlippageFeeAddress?: string;
  gaslimit?: string;
  gasLevel?: 'average' | 'fast' | 'slow';
  dexIds?: string;
  directRoute?: string | boolean;
  callDataMemo?: string;
  computeUnitPrice?: string;
  computeUnitLimit?: string;
  tips?: string;
  excludeDexIds?: string;
  disableRFQ?: string | boolean;
  priceImpactProtectionPercent?: string;
  autoSlippage?: string | boolean;
  maxAutoslippagePercent?: string;
}

export interface ApproveTransactionRequest {
  chainIndex: string;
  tokenContractAddress: string;
  approveAmount: string;
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

  @Get('swap')
  @ApiOperation({ summary: '获取交换数据' })
  @ApiResponse({
    status: 200,
    description: '获取交换数据成功',
  })
  @ApiQuery({
    name: 'chainIndex',
    required: true,
    description: '链的唯一标识，如 501: Solana',
    example: '1',
  })
  @ApiQuery({
    name: 'amount',
    required: true,
    description: '交易数量（需包含精度）',
    example: '1000000000000000000',
  })
  @ApiQuery({
    name: 'swapMode',
    required: true,
    description: '交易模式：exactIn 或 exactOut',
    enum: ['exactIn', 'exactOut'],
    example: 'exactIn',
  })
  @ApiQuery({
    name: 'fromTokenAddress',
    required: true,
    description: '卖出币种合约地址',
    example: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
  })
  @ApiQuery({
    name: 'toTokenAddress',
    required: true,
    description: '买入币种合约地址',
    example: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
  })
  @ApiQuery({
    name: 'slippagePercent',
    required: true,
    description: '滑点限制（如：0.5 代表最大滑点为0.5%）',
    example: '0.5',
  })
  @ApiQuery({
    name: 'userWalletAddress',
    required: true,
    description: '用户钱包地址',
    example: '0x3f6a3f57569358a512ccc0e513f171516b0fd42a',
  })
  @ApiQuery({
    name: 'swapReceiverAddress',
    required: false,
    description:
      '购买的资产的收件人地址，如果未设置，则用户钱包地址收到购买的资产',
    example: '0x3f6a3f57569358a512ccc0e513f171516b0fd42a',
  })
  @ApiQuery({
    name: 'feePercent',
    required: false,
    description: '发送到分佣地址的询价或者目标币种数量百分比',
    example: '1',
  })
  @ApiQuery({
    name: 'fromTokenReferrerWalletAddress',
    required: false,
    description: '收取 fromToken 分佣费用的钱包地址',
    example: '0x...',
  })
  @ApiQuery({
    name: 'toTokenReferrerWalletAddress',
    required: false,
    description: '收取 toToken 分佣费用的钱包地址',
    example: '0x...',
  })
  @ApiQuery({
    name: 'positiveSlippagePercent',
    required: false,
    description: '正滑点百分比（仅对白名单或企业用户开放）',
    example: '0',
  })
  @ApiQuery({
    name: 'positiveSlippageFeeAddress',
    required: false,
    description: '收取正滑点分佣费用的钱包地址',
    example: '0x...',
  })
  @ApiQuery({
    name: 'gaslimit',
    required: false,
    description: 'Gas 费用限额（以最小单位表示：wei），仅适用于 EVM',
    example: '21000',
  })
  @ApiQuery({
    name: 'gasLevel',
    required: false,
    description: 'Gas 价格等级',
    enum: ['average', 'fast', 'slow'],
    example: 'average',
  })
  @ApiQuery({
    name: 'dexIds',
    required: false,
    description: '限定询价的流动性池 dexId，多个组合按逗号分隔',
    example: '1,50,180',
  })
  @ApiQuery({
    name: 'directRoute',
    required: false,
    description: '启用后，将限制路由仅使用单一流动性池（仅适用于 Solana）',
    type: Boolean,
    example: false,
  })
  @ApiQuery({
    name: 'callDataMemo',
    required: false,
    description:
      '自定义 callData 中上链携带的参数（64 bytes、128 个字符长度的 16 进制字符串）',
    example: '0x...',
  })
  @ApiQuery({
    name: 'computeUnitPrice',
    required: false,
    description: '用于 Solana 网络上的交易，类似于 Ethereum 上的 gasPrice',
    example: '0',
  })
  @ApiQuery({
    name: 'computeUnitLimit',
    required: false,
    description: '用于 Solana 网络上的交易，可类比为 Ethereum 上的 gasLimit',
    example: '200000',
  })
  @ApiQuery({
    name: 'tips',
    required: false,
    description: 'Jito tips，单位为 SOL（最大为 2，最小为 0.0000000001）',
    example: '0',
  })
  @ApiQuery({
    name: 'excludeDexIds',
    required: false,
    description: '限定不会使用于询价的流动性池 dexId，多个组合按逗号分隔',
    example: '1,50,180',
  })
  @ApiQuery({
    name: 'disableRFQ',
    required: false,
    description: '禁用所有被归类为 RFQ 且依赖时效性报价的流动性来源',
    type: Boolean,
    example: false,
  })
  @ApiQuery({
    name: 'priceImpactProtectionPercent',
    required: false,
    description: '允许的价格影响百分比（介于 0 和 100 之间，默认值为 90%）',
    example: '90',
  })
  @ApiQuery({
    name: 'autoSlippage',
    required: false,
    description: '自动滑点（默认为 false）',
    type: Boolean,
    example: false,
  })
  @ApiQuery({
    name: 'maxAutoslippagePercent',
    required: false,
    description:
      '当 autoSlippage 设置为 true 时，此值为 API 所返回的 autoSlippage 的最大上限',
    example: '5',
  })
  async getSwap(@Query() query: SwapRequest) {
    try {
      const {
        chainIndex,
        amount,
        swapMode = 'exactIn',
        fromTokenAddress,
        toTokenAddress,
        slippagePercent,
        userWalletAddress,
        swapReceiverAddress,
        feePercent,
        fromTokenReferrerWalletAddress,
        toTokenReferrerWalletAddress,
        positiveSlippagePercent,
        positiveSlippageFeeAddress,
        gaslimit,
        gasLevel,
        dexIds,
        directRoute,
        callDataMemo,
        computeUnitPrice,
        computeUnitLimit,
        tips,
        excludeDexIds,
        disableRFQ,
        priceImpactProtectionPercent,
        autoSlippage,
        maxAutoslippagePercent,
      } = query;
      console.log('Received getSwap request with params:', query);
      // 验证必需参数
      if (
        !chainIndex ||
        !amount ||
        !swapMode ||
        !fromTokenAddress ||
        !toTokenAddress ||
        !slippagePercent ||
        !userWalletAddress
      ) {
        throw new HttpException(
          'Missing required parameters: chainIndex, amount, swapMode, fromTokenAddress, toTokenAddress, slippagePercent, userWalletAddress',
          HttpStatus.BAD_REQUEST,
        );
      }

      // 验证 swapMode
      if (swapMode !== 'exactIn' && swapMode !== 'exactOut') {
        throw new HttpException(
          'swapMode must be either "exactIn" or "exactOut"',
          HttpStatus.BAD_REQUEST,
        );
      }

      // 构建参数对象
      const params: any = {
        chainIndex,
        amount,
        swapMode,
        fromTokenAddress,
        toTokenAddress,
        slippagePercent,
        userWalletAddress,
      };

      // 添加可选参数
      if (swapReceiverAddress) {
        params.swapReceiverAddress = swapReceiverAddress;
      }
      if (feePercent) {
        params.feePercent = feePercent;
      }
      if (fromTokenReferrerWalletAddress) {
        params.fromTokenReferrerWalletAddress = fromTokenReferrerWalletAddress;
      }
      if (toTokenReferrerWalletAddress) {
        params.toTokenReferrerWalletAddress = toTokenReferrerWalletAddress;
      }
      if (positiveSlippagePercent) {
        params.positiveSlippagePercent = positiveSlippagePercent;
      }
      if (positiveSlippageFeeAddress) {
        params.positiveSlippageFeeAddress = positiveSlippageFeeAddress;
      }
      if (gaslimit) {
        params.gaslimit = gaslimit;
      }
      if (gasLevel) {
        params.gasLevel = gasLevel;
      }
      if (dexIds) {
        params.dexIds = dexIds;
      }
      if (directRoute !== undefined && directRoute !== '') {
        params.directRoute =
          directRoute === 'true' || directRoute === true || directRoute === '1';
      }
      if (callDataMemo) {
        params.callDataMemo = callDataMemo;
      }
      if (computeUnitPrice) {
        params.computeUnitPrice = computeUnitPrice;
      }
      if (computeUnitLimit) {
        params.computeUnitLimit = computeUnitLimit;
      }
      if (tips) {
        params.tips = tips;
      }
      if (excludeDexIds) {
        params.excludeDexIds = excludeDexIds;
      }
      if (disableRFQ !== undefined && disableRFQ !== '') {
        params.disableRFQ =
          disableRFQ === 'true' || disableRFQ === true || disableRFQ === '1';
      }
      if (priceImpactProtectionPercent) {
        params.priceImpactProtectionPercent = priceImpactProtectionPercent;
      }
      if (autoSlippage !== undefined && autoSlippage !== '') {
        params.autoSlippage =
          autoSlippage === 'true' ||
          autoSlippage === true ||
          autoSlippage === '1';
      }
      if (maxAutoslippagePercent) {
        params.maxAutoslippagePercent = maxAutoslippagePercent;
      }

      const swapData = await this.dexService.getSwap(params);

      return {
        success: true,
        data: swapData,
        message: 'Swap data retrieved successfully',
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: error instanceof Error ? error.message : 'Unknown error',
          error: 'Failed to get swap data',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('approve-transaction')
  @ApiOperation({ summary: '获取授权交易数据' })
  @ApiResponse({
    status: 200,
    description: '获取授权交易数据成功',
  })
  @ApiQuery({
    name: 'chainIndex',
    required: true,
    description: '链索引',
    example: '1',
  })
  @ApiQuery({
    name: 'tokenContractAddress',
    required: true,
    description: '代币合约地址',
    example: '0x...',
  })
  @ApiQuery({
    name: 'approveAmount',
    required: true,
    description: '授权数量',
    example: '1000000000000000000',
  })
  async getApproveTransaction(@Query() query: ApproveTransactionRequest) {
    try {
      const { chainIndex, tokenContractAddress, approveAmount } = query;

      // 验证必需参数
      if (!chainIndex || !tokenContractAddress || !approveAmount) {
        throw new HttpException(
          'Missing required parameters: chainIndex, tokenContractAddress, approveAmount',
          HttpStatus.BAD_REQUEST,
        );
      }

      const params = {
        chainIndex,
        tokenContractAddress,
        approveAmount,
      };

      const approveTransaction = await this.dexService.getApproveTransaction(
        params,
      );

      return {
        success: true,
        data: approveTransaction,
        message: 'Approve transaction retrieved successfully',
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: error instanceof Error ? error.message : 'Unknown error',
          error: 'Failed to get approve transaction',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
