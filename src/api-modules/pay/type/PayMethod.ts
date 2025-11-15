export enum PayMethod {
  CREDIT_CARD = 'credit_card',
  BANK_TRANSFER = 'bank_transfer',
  APPLE_PAY = 'apple_pay',
  GOOGLE_PAY = 'google_pay',
  UPI = 'upi',
}

export interface PayMethodInfo {
  name: string;
  code: PayMethod;
}

export const PayMethodMap: Record<PayMethod, PayMethodInfo> = {
  [PayMethod.CREDIT_CARD]: {
    name: 'Credit Card',
    code: PayMethod.CREDIT_CARD,
  },
  [PayMethod.BANK_TRANSFER]: {
    name: 'Bank Transfer',
    code: PayMethod.BANK_TRANSFER,
  },
  [PayMethod.APPLE_PAY]: {
    name: 'Apple Pay',
    code: PayMethod.APPLE_PAY,
  },
  [PayMethod.GOOGLE_PAY]: {
    name: 'Google Pay',
    code: PayMethod.GOOGLE_PAY,
  },
  [PayMethod.UPI]: {
    name: 'UPI',
    code: PayMethod.UPI,
  },
};

// 站外跳转支付 or 站内支付
export interface PayType {
  type: 'external' | 'internal';
  url?: string;
}
