import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Decimal } from 'decimal.js';
import { Token } from './token.entity';
import { OKXDEX } from '../assets/dex/okx';
import { TransactionHistoryService } from '../assets/services/transaction-history.service';

export interface TokenCreateRequest {
  chainIndex: string;
  tokenContractAddress: string;
  tokenSymbol: string;
  tokenName: string;
  decimals: number;
  tokenLogoUrl?: string;
}

export interface TokenUpdateRequest {
  currentPriceUsd?: Decimal;
  priceChange24h?: Decimal;
  priceChangePercentage24h?: Decimal;
  volume24hUsd?: Decimal;
  marketCapUsd?: Decimal;
  isActive?: boolean;
}

export interface TokenListQuery {
  chainIndex?: string;
  tokenSymbol?: string;
  isActive?: boolean;
  page?: number;
  limit?: number;
  sortBy?:
    | 'currentPriceUsd'
    | 'volume24hUsd'
    | 'marketCapUsd'
    | 'priceChangePercentage24h';
  sortOrder?: 'ASC' | 'DESC';
}

export interface TokenPriceUpdateRequest {
  tokenId: string;
  currentPriceUsd: Decimal;
  priceChange24h: Decimal;
  priceChangePercentage24h: Decimal;
  volume24hUsd: Decimal;
  marketCapUsd?: Decimal;
  candleData?: any;
}

@Injectable()
export class TokenService {
  private readonly logger = new Logger(TokenService.name);

  constructor(
    @InjectRepository(Token)
    private readonly tokenRepository: Repository<Token>,

    private readonly dataSource: DataSource,

    private readonly okxDex: OKXDEX,

    private readonly transactionHistoryService: TransactionHistoryService,
  ) {}

  /**
   * 创建token
   */
  async createToken(request: TokenCreateRequest): Promise<Token> {
    // 检查token是否已存在
    const existingToken = await this.tokenRepository.findOne({
      where: {
        chainIndex: request.chainIndex,
        tokenContractAddress: request.tokenContractAddress,
      },
    });

    if (existingToken) {
      throw new BadRequestException('Token already exists');
    }

    const token = this.tokenRepository.create({
      chainIndex: request.chainIndex,
      tokenContractAddress: request.tokenContractAddress,
      tokenSymbol: request.tokenSymbol,
      tokenName: request.tokenName,
      decimals: request.decimals,
      tokenLogoUrl: request.tokenLogoUrl,
      currentPriceUsd: new Decimal(0),
      priceChange24h: new Decimal(0),
      priceChangePercentage24h: new Decimal(0),
      volume24hUsd: new Decimal(0),
      marketCapUsd: new Decimal(0),
      isActive: true,
    });

    return await this.tokenRepository.save(token);
  }

  /**
   * 获取token列表
   */
  async getTokens(
    query: TokenListQuery = {},
  ): Promise<{ tokens: Token[]; total: number }> {
    const {
      chainIndex,
      tokenSymbol,
      isActive = true,
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
    } = query;

    const queryBuilder = this.tokenRepository
      .createQueryBuilder('token')
      .where('token.isActive = :isActive', { isActive });

    if (chainIndex) {
      queryBuilder.andWhere('token.chainIndex = :chainIndex', { chainIndex });
    }

    if (tokenSymbol) {
      queryBuilder.andWhere('token.tokenSymbol ILIKE :tokenSymbol', {
        tokenSymbol: `%${tokenSymbol}%`,
      });
    }

    // 排序
    queryBuilder.orderBy(`token.${sortBy}`, sortOrder);

    // 分页
    const [tokens, total] = await queryBuilder
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { tokens, total };
  }

  /**
   * 根据ID获取token
   */
  async getTokenById(id: string): Promise<Token> {
    const token = await this.tokenRepository.findOne({
      where: { id },
    });

    if (!token) {
      throw new NotFoundException('Token not found');
    }

    return token;
  }

  /**
   * 根据合约地址获取token
   */
  async getTokenByContractAddress(
    chainIndex: string,
    tokenContractAddress: string,
  ): Promise<Token> {
    const token = await this.tokenRepository.findOne({
      where: {
        chainIndex,
        tokenContractAddress,
      },
    });

    if (!token) {
      throw new NotFoundException('Token not found');
    }

    return token;
  }

  /**
   * 更新token信息
   */
  async updateToken(id: string, request: TokenUpdateRequest): Promise<Token> {
    const token = await this.getTokenById(id);

    Object.assign(token, request);

    if (request.currentPriceUsd) {
      token.lastPriceUpdate = new Date();
    }

    return await this.tokenRepository.save(token);
  }

  /**
   * 更新token价格
   */
  async updateTokenPrice(request: TokenPriceUpdateRequest): Promise<Token> {
    const token = await this.getTokenById(request.tokenId);

    token.currentPriceUsd = request.currentPriceUsd;
    token.priceChange24h = request.priceChange24h;
    token.priceChangePercentage24h = request.priceChangePercentage24h;
    token.volume24hUsd = request.volume24hUsd;
    token.lastPriceUpdate = new Date();
    token.candleData = request.candleData;
    if (request.marketCapUsd) {
      token.marketCapUsd = request.marketCapUsd;
    }

    return await this.tokenRepository.save(token);
  }

  /**
   * 批量更新token价格
   */
  async batchUpdateTokenPrices(
    requests: TokenPriceUpdateRequest[],
  ): Promise<Token[]> {
    const updatedTokens: Token[] = [];

    for (const request of requests) {
      try {
        const token = await this.updateTokenPrice(request);
        updatedTokens.push(token);
      } catch (error) {
        this.logger.error(`Failed to update token ${request.tokenId}:`, error);
      }
    }

    return updatedTokens;
  }

  /**
   * 从OKX同步token列表
   */
  async syncTokensFromOKX(chainIndex: string): Promise<Token[]> {
    try {
      // 获取OKX的token列表
      const okxTokens = await this.okxDex.getAllTokens({ chainIndex });

      const syncedTokens: Token[] = [];

      for (const okxToken of okxTokens) {
        try {
          // 检查token是否已存在
          let token = await this.tokenRepository.findOne({
            where: {
              chainIndex,
              tokenContractAddress: okxToken.tokenContractAddress,
            },
          });

          if (token) {
            // 更新现有token信息
            token.tokenSymbol = okxToken.tokenSymbol;
            token.tokenName = okxToken.tokenName;
            token.decimals = parseInt(okxToken.decimals);
            token.tokenLogoUrl = okxToken.tokenLogoUrl;
            token.isActive = true;
          } else {
            // 创建新token
            token = this.tokenRepository.create({
              chainIndex,
              tokenContractAddress: okxToken.tokenContractAddress,
              tokenSymbol: okxToken.tokenSymbol,
              tokenName: okxToken.tokenName,
              decimals: parseInt(okxToken.decimals),
              tokenLogoUrl: okxToken.tokenLogoUrl,
              currentPriceUsd: new Decimal(0),
              priceChange24h: new Decimal(0),
              priceChangePercentage24h: new Decimal(0),
              volume24hUsd: new Decimal(0),
              marketCapUsd: new Decimal(0),
              isActive: true,
            });
          }

          const savedToken = await this.tokenRepository.save(token);
          syncedTokens.push(savedToken);
        } catch (error) {
          this.logger.error(
            `Failed to sync token ${okxToken.tokenSymbol}:`,
            error,
          );
        }
      }

      this.logger.log(
        `Synced ${syncedTokens.length} tokens from OKX for chain ${chainIndex}`,
      );
      return syncedTokens;
    } catch (error) {
      this.logger.error(
        `Failed to sync tokens from OKX for chain ${chainIndex}:`,
        error,
      );
      throw new BadRequestException('Failed to sync tokens from OKX');
    }
  }

  /**
   * 获取token统计信息
   */
  async getTokenStats(): Promise<{
    totalTokens: number;
    activeTokens: number;
    tokensByChain: Record<string, number>;
    totalMarketCap: Decimal;
    totalVolume24h: Decimal;
  }> {
    const totalTokens = await this.tokenRepository.count();
    const activeTokens = await this.tokenRepository.count({
      where: { isActive: true },
    });

    // 按链统计
    const tokensByChain = await this.tokenRepository
      .createQueryBuilder('token')
      .select('token.chainIndex', 'chainIndex')
      .addSelect('COUNT(*)', 'count')
      .where('token.isActive = :isActive', { isActive: true })
      .groupBy('token.chainIndex')
      .getRawMany();

    const chainStats: Record<string, number> = {};
    tokensByChain.forEach((stat) => {
      chainStats[stat.chainIndex] = parseInt(stat.count);
    });

    // 总市值和24小时交易量
    const stats = await this.tokenRepository
      .createQueryBuilder('token')
      .select('SUM(token.marketCapUsd)', 'totalMarketCap')
      .addSelect('SUM(token.volume24hUsd)', 'totalVolume24h')
      .where('token.isActive = :isActive', { isActive: true })
      .getRawOne();

    return {
      totalTokens,
      activeTokens,
      tokensByChain: chainStats,
      totalMarketCap: new Decimal(stats.totalMarketCap || '0'),
      totalVolume24h: new Decimal(stats.totalVolume24h || '0'),
    };
  }

  public getTokensTransactions(
    tokenContractAddress: string,
    limit = 100,
    offset = 0,
  ) {
    return this.transactionHistoryService.getTokensTransactionsFromDB(
      tokenContractAddress,
      limit || 100,
      offset || 0,
    );
  }
}
