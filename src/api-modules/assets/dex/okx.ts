import * as crypto from 'node:crypto';

export interface OKXConfig {
  apiKey: string;
  secretKey: string;
  apiPassphrase: string;
  projectId: string;
  baseUrl: string;
}

export interface OKXRequestOptions {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  path: string;
  data?: any;
  queryParams?: Record<string, string>;
  headers?: Record<string, string>;
}

export interface OKXResponse<T = any> {
  code: string;
  msg: string;
  data: T;
}

export interface HistoricalCandlesParams {
  chainIndex: string;
  tokenContractAddress: string;
  after?: string;
  before?: string;
  bar?: string;
  limit?: string;
}

export type CandleData = string[];

export interface SupportedChainParams {
  chainIndex?: string; // 链的唯一标识，可选
}

export interface SupportedChainData {
  chainIndex: string; // 链的唯一标识
  chainName: string; // 链名称 (如Optimism)
  dexTokenApproveAddress: string; // dex 授权合约地址，如果未产生授权，返回为空
}

export interface AllTokensParams {
  chainIndex: string; // 链的唯一标识，必传
}

export interface TokenData {
  decimals: string; // 币种精度 (如: 18)
  tokenContractAddress: string; // 币种合约地址 (如: 0x382bb369d343125bfb2117af9c149795c6c65c50)
  tokenLogoUrl: string; // 币种标识 (如: https://static.okx.com/cdn/wallet/logo/USDT-991ffed9-e495-4d1b-80c2-a4c5f96ce22d.png)
  tokenName: string; // 币种全称 (如: Tether)
  tokenSymbol: string; // 币种简称 (如: USDT)
}

export interface SwapQuoteParams {
  chainIndex: string;
  fromTokenAddress: string;
  toTokenAddress: string;
  amount: string;
  slippagePercent?: string; // 默认 "0.5"
}

export interface SwapQuoteData {
  buyAmount: string;
  sellAmount: string;
  buyTokenAddress: string;
  sellTokenAddress: string;
  buyTokenSymbol: string;
  sellTokenSymbol: string;
  buyTokenDecimals: string;
  sellTokenDecimals: string;
  priceImpact: string;
  gas: string;
  estimatedGas: string;
  gasPrice: string;
  txValue: string;
  data: string;
  routerContract: string;
  routerContractAbi: any[];
  allowanceTarget: string;
  allowanceTargetAbi: any[];
}

export interface SwapParams {
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
  directRoute?: boolean;
  callDataMemo?: string;
  computeUnitPrice?: string;
  computeUnitLimit?: string;
  tips?: string;
  excludeDexIds?: string;
  disableRFQ?: boolean;
  priceImpactProtectionPercent?: string;
  autoSlippage?: boolean;
  maxAutoslippagePercent?: string;
}

export interface SwapTokenInfo {
  fromTokenIndex?: string;
  tokenContractAddress: string;
  tokenSymbol: string;
  tokenUnitPrice: string | null;
  decimal: string;
  isHoneyPot: boolean;
  taxRate: string;
  toTokenIndex?: string;
}

export interface SwapDexProtocol {
  dexName: string;
  percent: string;
}

export interface SwapRouterResult {
  chainIndex?: string;
  fromTokenAmount: string;
  toTokenAmount: string;
  tradeFee: string;
  estimateGasFee: string;
  dexRouterList: Array<{
    router: string;
    dexProtocol: SwapDexProtocol[];
  }>;
  fromToken: SwapTokenInfo;
  toToken: SwapTokenInfo;
  priceImpactPercent: string;
  tx: {
    signatureData?: string[];
    from: string;
    gas: string;
    gasPrice: string;
    maxPriorityFeePerGas?: string;
    to: string;
    value: string;
    maxSpendAmount?: string;
    minReceiveAmount: string;
    data: string;
    slippagePercent: string;
  };
}

// SwapData 实际上是 SwapRouterResult，因为 API 返回的 data 字段直接是 routerResult 对象
export type SwapData = SwapRouterResult;

export class OKXDEX {
  private readonly config: OKXConfig;

  constructor(config: OKXConfig) {
    this.config = config;
  }

  /**
   * 生成OKX API请求头
   */
  private getHeaders(
    timestamp: string,
    method: string,
    requestPath: string,
    queryString = '',
  ): Record<string, string> {
    const { apiKey, secretKey, apiPassphrase, projectId } = this.config;

    if (!apiKey || !secretKey || !apiPassphrase || !projectId) {
      throw new Error('Missing required OKX configuration');
    }

    const stringToSign = timestamp + method + requestPath + queryString;
    const hmac = crypto.createHmac('sha256', secretKey);
    hmac.update(stringToSign);
    const signature = hmac.digest('base64');

    return {
      'Content-Type': 'application/json',
      'OK-ACCESS-KEY': apiKey,
      'OK-ACCESS-SIGN': signature,
      'OK-ACCESS-TIMESTAMP': timestamp,
      'OK-ACCESS-PASSPHRASE': apiPassphrase,
      'OK-ACCESS-PROJECT': projectId,
    };
  }

  /**
   * 构建查询字符串
   */
  private buildQueryString(params: Record<string, string>): string {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        searchParams.append(key, value);
      }
    });
    return searchParams.toString();
  }

  /**
   * 通用请求方法
   */
  public async request<T>(options: OKXRequestOptions): Promise<T> {
    const { method, path, data, queryParams, headers = {} } = options;
    // 生成时间戳
    const timestamp = new Date().toISOString();

    // 构建查询字符串
    const queryString = queryParams ? this.buildQueryString(queryParams) : '';

    // 构建完整路径
    const fullPath = queryString ? `${path}?${queryString}` : path;

    // 生成请求头
    const requestHeaders = this.getHeaders(
      timestamp,
      method,
      fullPath,
      data ? JSON.stringify(data) : '',
    );

    // 合并自定义请求头
    const finalHeaders = { ...requestHeaders, ...headers };

    // 构建请求选项
    const fetchOptions: RequestInit = {
      method,
      headers: finalHeaders,
    };

    // 如果有数据且不是GET请求，添加请求体
    if (data && method !== 'GET') {
      fetchOptions.body = JSON.stringify(data);
    }

    try {
      const response = await fetch(
        `${this.config.baseUrl}${fullPath}`,
        fetchOptions,
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `HTTP error! status: ${response.status}, message: ${errorText}`,
        );
      }

      const responseData: OKXResponse<T> = await response.json();

      // 检查OKX API响应状态
      if (responseData.code !== '0') {
        console.log('responseData:', responseData);
        throw new Error(
          `OKX API error: ${responseData.msg} (code: ${responseData.code})`,
        );
      }

      return responseData.data;
    } catch (error) {
      console.error(`OKX request failed for ${method} ${fullPath}:`, error);
      throw new Error(
        `OKX request failed: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      );
    }
  }

  /**
   * GET请求
   */
  public async get<T>(
    path: string,
    queryParams?: Record<string, string>,
  ): Promise<T> {
    return this.request<T>({
      method: 'GET',
      path,
      queryParams,
    });
  }

  /**
   * POST请求
   */
  public async post<T>(path: string, data?: any): Promise<T> {
    return this.request<T>({
      method: 'POST',
      path,
      data,
    });
  }

  /**
   * PUT请求
   */
  public async put<T>(path: string, data?: any): Promise<T> {
    return this.request<T>({
      method: 'PUT',
      path,
      data,
    });
  }

  /**
   * DELETE请求
   */
  public async delete<T>(path: string, data?: any): Promise<T> {
    return this.request<T>({
      method: 'DELETE',
      path,
      data,
    });
  }

  /**
   * 获取历史K线数据
   * @param params 请求参数
   * @returns K线数据数组
   */
  public async getHistoricalCandles(
    params: HistoricalCandlesParams,
  ): Promise<CandleData[]> {
    const queryParams: Record<string, string> = {
      chainIndex: params.chainIndex,
      tokenContractAddress: params.tokenContractAddress,
    };

    // 添加可选参数
    if (params.after) {
      queryParams.after = params.after;
    }
    if (params.before) {
      queryParams.before = params.before;
    }
    if (params.bar) {
      queryParams.bar = params.bar;
    }
    if (params.limit) {
      queryParams.limit = params.limit;
    }

    return this.get<CandleData[]>(
      '/api/v5/dex/market/historical-candles',
      queryParams,
    );
  }

  /**
   * 获取支持的链信息
   * @param params 请求参数
   * @returns 支持的链数据数组
   */
  public async getSupportedChains(
    params: SupportedChainParams = {},
  ): Promise<SupportedChainData[]> {
    const queryParams: Record<string, string> = {};

    // 添加可选参数
    if (params.chainIndex) {
      queryParams.chainIndex = params.chainIndex;
    }

    return this.get<SupportedChainData[]>(
      '/api/v6/dex/aggregator/supported/chain',
      queryParams,
    );
  }

  /**
   * 获取币种列表
   * @param params 请求参数
   * @returns 币种数据数组
   */
  public async getAllTokens(params: AllTokensParams): Promise<TokenData[]> {
    const queryParams: Record<string, string> = {
      chainIndex: params.chainIndex,
    };

    return this.get<TokenData[]>(
      '/api/v6/dex/aggregator/all-tokens',
      queryParams,
    );
  }

  /**
   * 获取 DEX 聚合器交换报价
   * @param params 请求参数
   * @returns 交换报价数据
   */
  public async getSwapQuote(params: SwapQuoteParams): Promise<SwapQuoteData[]> {
    const queryParams: Record<string, string> = {
      chainIndex: params.chainIndex,
      fromTokenAddress: params.fromTokenAddress,
      toTokenAddress: params.toTokenAddress,
      amount: params.amount,
      slippagePercent: params.slippagePercent || '0.5',
    };

    return this.get<SwapQuoteData[]>(
      '/api/v5/dex/aggregator/quote',
      queryParams,
    );
  }

  /**
   * 获取 DEX 聚合器交换数据
   * @param params 请求参数
   * @returns 交换数据
   */
  public async getSwap(params: SwapParams): Promise<SwapData> {
    const queryParams: Record<string, string> = {
      chainIndex: params.chainIndex,
      amount: params.amount,
      swapMode: params.swapMode,
      fromTokenAddress: params.fromTokenAddress,
      toTokenAddress: params.toTokenAddress,
      slippagePercent: params.slippagePercent,
      userWalletAddress: params.userWalletAddress,
    };

    // 添加可选参数
    if (params.swapReceiverAddress) {
      queryParams.swapReceiverAddress = params.swapReceiverAddress;
    }
    if (params.feePercent) {
      queryParams.feePercent = params.feePercent;
    }
    if (params.fromTokenReferrerWalletAddress) {
      queryParams.fromTokenReferrerWalletAddress =
        params.fromTokenReferrerWalletAddress;
    }
    if (params.toTokenReferrerWalletAddress) {
      queryParams.toTokenReferrerWalletAddress =
        params.toTokenReferrerWalletAddress;
    }
    if (params.positiveSlippagePercent) {
      queryParams.positiveSlippagePercent = params.positiveSlippagePercent;
    }
    if (params.positiveSlippageFeeAddress) {
      queryParams.positiveSlippageFeeAddress =
        params.positiveSlippageFeeAddress;
    }
    if (params.gaslimit) {
      queryParams.gaslimit = params.gaslimit;
    }
    if (params.gasLevel) {
      queryParams.gasLevel = params.gasLevel;
    }
    if (params.dexIds) {
      queryParams.dexIds = params.dexIds;
    }
    if (params.directRoute !== undefined) {
      queryParams.directRoute = params.directRoute.toString();
    }
    if (params.callDataMemo) {
      queryParams.callDataMemo = params.callDataMemo;
    }
    if (params.computeUnitPrice) {
      queryParams.computeUnitPrice = params.computeUnitPrice;
    }
    if (params.computeUnitLimit) {
      queryParams.computeUnitLimit = params.computeUnitLimit;
    }
    if (params.tips) {
      queryParams.tips = params.tips;
    }
    if (params.excludeDexIds) {
      queryParams.excludeDexIds = params.excludeDexIds;
    }
    if (params.disableRFQ !== undefined) {
      queryParams.disableRFQ = params.disableRFQ.toString();
    }
    if (params.priceImpactProtectionPercent) {
      queryParams.priceImpactProtectionPercent =
        params.priceImpactProtectionPercent;
    }
    if (params.autoSlippage !== undefined) {
      queryParams.autoSlippage = params.autoSlippage.toString();
    }
    if (params.maxAutoslippagePercent) {
      queryParams.maxAutoslippagePercent = params.maxAutoslippagePercent;
    }

    return this.get<SwapData>('/api/v6/dex/aggregator/swap', queryParams);
  }

  /**
   * 获取配置
   */
  public getConfig(): OKXConfig {
    return { ...this.config };
  }

  /**
   * 从环境变量创建OKX实例
   */
  public static fromEnv(): OKXDEX {
    const apiKey =
      process.env.OKX_API_KEY || '09e0d711-8276-4e60-849c-d33362096db7';
    const secretKey =
      process.env.OKX_SECRET_KEY || '02A320FF85330C3CD519A7A4123FE8B9';
    const apiPassphrase = process.env.OKX_API_PASSPHRASE || 'Kimsuper1#';
    const projectId =
      process.env.OKX_PROJECT_ID || 'd9b5e4a981d347b1893d31d568766af2';
    const baseUrl = process.env.OKX_BASE_URL || 'https://web3.okx.com';

    if (!apiKey || !secretKey || !apiPassphrase || !projectId) {
      throw new Error('Missing required OKX environment variables');
    }

    return new OKXDEX({
      apiKey,
      secretKey,
      apiPassphrase,
      projectId,
      baseUrl,
    });
  }
}

/**
 * 从环境变量创建OKX实例的便捷函数
 */
export function createOKXFromEnv(): OKXDEX {
  return OKXDEX.fromEnv();
}

/**
 * 生成OKX API请求头的独立函数（保持与原有代码兼容）
 */
export function getHeaders(
  timestamp: string,
  method: string,
  requestPath: string,
  queryString = '',
): Record<string, string> {
  const apiKey = process.env.OKX_API_KEY;
  const secretKey = process.env.OKX_SECRET_KEY;
  const apiPassphrase = process.env.OKX_API_PASSPHRASE;
  const projectId = process.env.OKX_PROJECT_ID;

  if (!apiKey || !secretKey || !apiPassphrase || !projectId) {
    throw new Error('Missing required environment variables');
  }

  const stringToSign = timestamp + method + requestPath + queryString;

  // 使用Node.js crypto模块生成HMAC SHA256签名
  const hmac = crypto.createHmac('sha256', secretKey);
  hmac.update(stringToSign);
  const signature = hmac.digest('base64');

  return {
    'Content-Type': 'application/json',
    'OK-ACCESS-KEY': apiKey,
    'OK-ACCESS-SIGN': signature,
    'OK-ACCESS-TIMESTAMP': timestamp,
    'OK-ACCESS-PASSPHRASE': apiPassphrase,
    'OK-ACCESS-PROJECT': projectId,
  };
}
