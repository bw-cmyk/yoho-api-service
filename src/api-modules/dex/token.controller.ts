import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import {
  TokenService,
  TokenUpdateRequest,
  TokenListQuery,
} from './token.service';
import { Token } from './token.entity';
import { Decimal } from 'decimal.js';
import { TokenPriceUpdaterService } from './token-updater.service';

@ApiTags('Token Management')
@Controller('api/v1/tokens')
export class TokenController {
  constructor(
    private readonly tokenService: TokenService,
    private readonly tokenUpdaterService: TokenPriceUpdaterService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get token list with pagination and filters' })
  @ApiResponse({
    status: 200,
    description: 'Token list retrieved successfully',
  })
  @ApiQuery({
    name: 'chainIndex',
    required: false,
    description: 'Filter by chain index',
  })
  @ApiQuery({
    name: 'tokenSymbol',
    required: false,
    description: 'Filter by token symbol',
  })
  @ApiQuery({
    name: 'isActive',
    required: false,
    description: 'Filter by active status',
  })
  @ApiQuery({ name: 'page', required: false, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page' })
  @ApiQuery({ name: 'sortBy', required: false, description: 'Sort by field' })
  @ApiQuery({ name: 'sortOrder', required: false, description: 'Sort order' })
  async getTokens(
    @Query() query: TokenListQuery,
  ): Promise<{ tokens: Token[]; total: number }> {
    return this.tokenService.getTokens(query);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get token statistics' })
  @ApiResponse({
    status: 200,
    description: 'Token statistics retrieved successfully',
  })
  async getTokenStats(): Promise<{
    totalTokens: number;
    activeTokens: number;
    tokensByChain: Record<string, number>;
    totalMarketCap: Decimal;
    totalVolume24h: Decimal;
  }> {
    return this.tokenService.getTokenStats();
  }

  @Get('contract/:chainIndex/:contractAddress')
  @ApiOperation({ summary: 'Get token by contract address' })
  @ApiResponse({
    status: 200,
    description: 'Token retrieved successfully',
    type: Token,
  })
  @ApiResponse({ status: 404, description: 'Token not found' })
  @ApiParam({ name: 'chainIndex', description: 'Chain index' })
  @ApiParam({ name: 'contractAddress', description: 'Token contract address' })
  async getTokenByContractAddress(
    @Param('chainIndex') chainIndex: string,
    @Param('contractAddress') contractAddress: string,
  ): Promise<Token> {
    return this.tokenService.getTokenByContractAddress(
      chainIndex,
      contractAddress,
    );
  }

  @Post('sync/:chainIndex')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Sync tokens from OKX for a specific chain' })
  @ApiResponse({ status: 200, description: 'Tokens synced successfully' })
  @ApiParam({ name: 'chainIndex', description: 'Chain index to sync' })
  async syncTokensFromOKX(
    @Param('chainIndex') chainIndex: string,
  ): Promise<Token[]> {
    return this.tokenService.syncTokensFromOKX(chainIndex);
  }

  @Get('transactions')
  @ApiOperation({ summary: 'Get token transactions' })
  @ApiResponse({
    status: 200,
    description: 'Token transactions retrieved successfully',
  })
  @ApiParam({
    name: 'tokenContractAddress',
    description: 'Token contract address',
  })
  async getTokenTransactions(
    @Query('tokenContractAddress') tokenContractAddress: string,
    @Query('limit') limit: number,
    @Query('offset') offset: number,
  ) {
    return this.tokenService.getTokensTransactions(
      tokenContractAddress,
      limit,
      offset,
    );
  }

  @Get('sync-all')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Sync all tokens from OKX' })
  @ApiResponse({ status: 200, description: 'Tokens synced successfully' })
  async syncAllTokensFromOKX(): Promise<void> {
    await this.tokenUpdaterService.updateTokensForChain('56', [
      { contractAddress: '0x000ae314e2a2172a039b26378814c252734f556a' },
    ]);
    return;
  }
}
