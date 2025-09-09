export interface AlchemyPaymentConfig {
  secretKey: string;
  baseUrl: string;
  appId: string; // 添加 appId 用于 getToken API
}

export interface AlchemyPaymentRequest {
  currency: string;
  method: string;
  amount: number;
  userId?: string;
  metadata?: Record<string, any>;
}

export interface GetTokenRequest {
  email?: string;
  uid?: string;
}

export interface GetTokenResponse {
  success: boolean;
  returnCode: string;
  returnMsg: string;
  extend: string;
  data: {
    id?: string;
    accessToken: string;
    email?: string;
  };
  traceId: string;
}

export interface AlchemyPaymentResponse {
  paymentId: string;
  status: string;
  amount: number;
  currency: string;
  createdAt: string;
  expiresAt?: string;
  paymentUrl?: string;
}

export interface AlchemyPaymentStatus {
  paymentId: string;
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  amount: number;
  currency: string;
  updatedAt: string;
  transactionHash?: string;
}

export interface RequestOptions {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  path: string;
  data?: any;
  headers?: Record<string, string>;
}

// Payment Method Query 相关类型定义
export interface QueryCryptoFiatMethodRequest {
  fiat: string; // 3-letter fiat code, e.g., USD
  crypto: string; // Cryptocurrency, e.g., USDT
  network: string; // Cryptocurrency network, e.g., ETH/BSC/BTC
  side: 'BUY'; // Order type, currently only supports BUY
}

export interface PaymentMethodData {
  country: string; // Country code, e.g., US, DE
  payWayCode: string; // Payment method code
  minPurchaseAmount: string; // Minimum purchase amount
  maxPurchaseAmount: string; // Maximum purchase amount
}

export interface QueryCryptoFiatMethodResponse {
  success: boolean;
  returnCode: string;
  returnMsg: string;
  extend: string;
  data: PaymentMethodData[];
  traceId: string;
}

// Fiat Query 相关类型定义
export interface FiatListRequest {
  type?: 'BUY' | 'SELL'; // BUY: Onramp, SELL: Offramp, default BUY
}

export interface FiatCurrencyData {
  currency: string; // 3 digit currency code
  country: string; // 2 digit country code
  payWayCode: string; // payment method code
  payWayName: string; // payment method
  fixedFee: number; // ramp fixed fee
  feeRate: number; // ramp percent fee
  payMin: number; // minimal fiat amount
  payMax: number; // maximum fiat amount
  countryName: string; // country name
}

export interface FiatListResponse {
  success: boolean;
  returnCode: string;
  returnMsg: string;
  extend: string;
  data: FiatCurrencyData[];
}

// Payment Method Form Query 相关类型定义
export interface PaymentMethodFormRequest {
  payWayCode: string; // Payment method code
  fiat: string; // 3-letter fiat code (ISO 4217)
  side: 'BUY' | 'SELL'; // BUY/SELL
}

export interface FormField {
  fieldName: string; // Field name
  fieldType: string; // Field type (String, etc.)
  regex: string; // Validation regex
  formElement: string; // Form element type (text, select, input)
  dataSourceKey?: string; // Data source key for select fields
}

export interface DataSourceItem {
  [key: string]: any; // Flexible structure for different data sources
}

export interface PaymentMethodFormResponse {
  success: boolean;
  returnCode: string;
  returnMsg: string;
  extend: string;
  data: {
    fields: FormField[];
    dataSource: Record<string, DataSourceItem[]>;
  };
}

// Order Quoted Result 相关类型定义
export interface OrderQuotedRequest {
  side: 'BUY' | 'SELL'; // BUY or SELL
  fiatAmount?: string; // The amount of fiat currency
  fiatCurrency?: string; // Fiat code (USD/EUR, etc.)
  cryptoQuantity?: string; // The number of crypto digits
  cryptoCurrency?: string; // Crypto name (USDT, etc.)
  network?: string; // Crypto acquiring network (ETH/BSC/BTC, etc.)
  payWayCode?: string; // Payment method code
}

export interface OrderQuotedData {
  cryptoPrice: string; // The price of the cryptocurrency, denominated in fiat currency
  side: 'BUY' | 'SELL'; // BUY or SELL
  fiatAmount: string; // Fiat amount
  cryptoQuantity: string; // Estimated amount of crypto the user will receive
  rampFee: string; // Ramp fee, denominated in fiat currency
  networkFee: string; // Network fee, denominated in fiat currency
  fiat: string; // Fiat currency code
  crypto: string; // Crypto currency code
  payWayCode: string; // Payment method code
  cryptoNetworkFee: string; // Network fee, denominated in crypto units
  rawRampFee: string; // Raw ramp fee
}

export interface OrderQuotedResponse {
  success: boolean;
  returnCode: string;
  returnMsg: string;
  extend: string;
  data: OrderQuotedData;
  traceId: string;
}
