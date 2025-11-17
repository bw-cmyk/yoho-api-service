import { registerEnumType } from '@nestjs/graphql';

export enum ProductType {
  INSTANT_BUY = 'INSTANT_BUY',
  LUCKY_DRAW = 'LUCKY_DRAW',
}

export enum ProductStatus {
  DRAFT = 'DRAFT',
  SCHEDULED = 'SCHEDULED',
  ACTIVE = 'ACTIVE',
  PAUSED = 'PAUSED',
  SOLD_OUT = 'SOLD_OUT',
  ARCHIVED = 'ARCHIVED',
}

export enum OrderType {
  INSTANT_BUY = 'INSTANT_BUY',
  LUCKY_DRAW = 'LUCKY_DRAW',
}

export enum InstantBuyOrderStatus {
  CONFIRMED = 'CONFIRMED',
  PROCESSING = 'PROCESSING',
  SHIPPED = 'SHIPPED',
  OUT_FOR_DELIVERY = 'OUT_FOR_DELIVERY',
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED',
  REFUNDING = 'REFUNDING',
  REFUNDED = 'REFUNDED',
}

export enum LuckyDrawOrderStatus {
  ONGOING = 'ONGOING',
  LOST = 'LOST',
  WON = 'WON',
  CANCELLED = 'CANCELLED',
}

export enum PaymentStatus {
  UNPAID = 'UNPAID',
  PAID = 'PAID',
  REFUNDED = 'REFUNDED',
}

export enum LogisticsNodeKey {
  ORDER_CONFIRMED = 'ORDER_CONFIRMED',
  ORDER_PROCESSING = 'ORDER_PROCESSING',
  SHIPPED_FROM_ORIGIN = 'SHIPPED_FROM_ORIGIN',
  ARRIVED_ORIGIN_HUB = 'ARRIVED_ORIGIN_HUB',
  EXPORT_CLEARANCE = 'EXPORT_CLEARANCE',
  EXPORT_CLEARED = 'EXPORT_CLEARED',
  AT_ORIGIN_PORT = 'AT_ORIGIN_PORT',
  DEPARTED_ORIGIN_PORT = 'DEPARTED_ORIGIN_PORT',
  IN_VESSEL = 'IN_VESSEL',
  AT_DESTINATION_PORT = 'AT_DESTINATION_PORT',
  IMPORT_CLEARANCE = 'IMPORT_CLEARANCE',
  IMPORT_CLEARED = 'IMPORT_CLEARED',
  ARRIVED_DESTINATION_HUB = 'ARRIVED_DESTINATION_HUB',
  OUT_FOR_DELIVERY = 'OUT_FOR_DELIVERY',
  DELIVERED = 'DELIVERED',
  CUSTOMS_FAILED = 'CUSTOMS_FAILED',
  CUSTOMS_CLEARANCE_FAILED = 'CUSTOMS_CLEARANCE_FAILED',
  RETURN_TO_SENDER = 'RETURN_TO_SENDER',
  DELIVERY_STOPPED = 'DELIVERY_STOPPED',
}

// Optional GraphQL enum exposure (won't affect REST usage)
try {
  registerEnumType(ProductType, { name: 'ProductType' });
  registerEnumType(ProductStatus, { name: 'ProductStatus' });
  registerEnumType(OrderType, { name: 'OrderType' });
  registerEnumType(InstantBuyOrderStatus, { name: 'InstantBuyOrderStatus' });
  registerEnumType(LuckyDrawOrderStatus, { name: 'LuckyDrawOrderStatus' });
  registerEnumType(PaymentStatus, { name: 'PaymentStatus' });
  registerEnumType(LogisticsNodeKey, { name: 'LogisticsNodeKey' });
} catch (err) {
  // ignore register errors when GraphQL module not loaded
}
