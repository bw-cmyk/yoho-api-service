export interface TKPaysConfig {
  appid: string;
  token: string; // 商户密钥 (key)
  baseUrl: string;
}

// 下单请求参数
export interface TKPaysUnifiedOrderRequest {
  appid: string;
  pay_type: string;
  amount: string;
  callback_url: string;
  success_url: string;
  error_url: string;
  out_trade_no: string;
  out_uid: string;
  sign: string;
  [key: string]: string;
}

// 下单响应
export interface TKPaysUnifiedOrderResponse {
  code: number;
  msg: string;
  data: {
    qrcode?: string;
    order_no: string;
  };
  url: string;
  key: string;
  request_id: string | null;
}

// 回调参数
export interface TKPaysCallbackData {
  callbacks: 'CODE_SUCCESS' | 'CODE_FAILURE';
  appid: string;
  pay_type: string;
  success_url: string;
  error_url: string;
  out_trade_no: string;
  amount: string;
  amount_true: string;
  out_uid: string;
  sign: string;
  [key: string]: string;
}

// 查询订单请求
export interface TKPaysQueryOrderRequest {
  appid: string;
  out_trade_no: string;
  sign: string;
}

// 查询订单响应
export interface TKPaysQueryOrderResponse {
  code: number;
  msg: string;
  data: TKPaysOrderData[];
}

export interface TKPaysOrderData {
  out_trade_no: string;
  amount: string;
  status: number; // 4 = success
  pay_time: string;
  callback_status: number;
  callback_url: string;
}

// TKPays 错误码
export enum TKPaysErrorCode {
  PARAM_ERROR = 10000,
  USER_ERROR = 20000,
  SIGN_ERROR = 30000,
  CHANNEL_ERROR = 40000,
  ORDER_ERROR = 50000,
}
