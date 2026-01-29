import { CurrencyRate } from '../entities/currency-rate.entity';
import Decimal from 'decimal.js';

export const CURRENCY_SEEDS: Partial<CurrencyRate>[] = [
  {
    currency: 'USD',
    rateToUSD: new Decimal(1.0),
    symbol: '$',
    name: 'US Dollar',
    decimals: 2,
    isActive: true,
    displayOrder: 1,
  },
  {
    currency: 'AED',
    rateToUSD: new Decimal(3.67),
    symbol: 'د.إ',
    name: 'UAE Dirham',
    decimals: 2,
    isActive: true,
    displayOrder: 2,
  },
  {
    currency: 'INR',
    rateToUSD: new Decimal(83.12),
    symbol: '₹',
    name: 'Indian Rupee',
    decimals: 2,
    isActive: true,
    displayOrder: 3,
  },
];
