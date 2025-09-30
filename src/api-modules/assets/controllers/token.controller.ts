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
  TokenCreateRequest,
  TokenUpdateRequest,
  TokenListQuery,
} from '../services/token.service';
import { Token } from '../entities/token.entity';
import { Decimal } from 'decimal.js';
import { TokenPriceUpdaterService } from '../services/token-price-updater.service';

@ApiTags('Token Management')
@Controller('api/v1/tokens')
export class TokenController {
  constructor(
    private readonly tokenService: TokenService,
    private readonly tokenPriceUpdaterService: TokenPriceUpdaterService,
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

  @Get('sync-price-history')
  @HttpCode(HttpStatus.OK)
  async syncTokenPriceHistoryFromOKX() {
    await this.tokenPriceUpdaterService.updateTokenPrices();
    return {
      success: true,
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get token by ID' })
  @ApiResponse({
    status: 200,
    description: 'Token retrieved successfully',
    type: Token,
  })
  @ApiResponse({ status: 404, description: 'Token not found' })
  @ApiParam({ name: 'id', description: 'Token ID' })
  async getTokenById(@Param('id') id: string): Promise<Token> {
    return this.tokenService.getTokenById(id);
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

  @Put(':id')
  @ApiOperation({ summary: 'Update token information' })
  @ApiResponse({
    status: 200,
    description: 'Token updated successfully',
    type: Token,
  })
  @ApiResponse({ status: 404, description: 'Token not found' })
  @ApiParam({ name: 'id', description: 'Token ID' })
  async updateToken(
    @Param('id') id: string,
    @Body() request: TokenUpdateRequest,
  ): Promise<Token> {
    return this.tokenService.updateToken(id, request);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete token (soft delete)' })
  @ApiResponse({ status: 204, description: 'Token deleted successfully' })
  @ApiResponse({ status: 404, description: 'Token not found' })
  @ApiParam({ name: 'id', description: 'Token ID' })
  async deleteToken(@Param('id') id: string): Promise<void> {
    return this.tokenService.deleteToken(id);
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
}
