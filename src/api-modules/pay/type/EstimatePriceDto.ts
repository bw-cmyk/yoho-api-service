import { BasePayment } from '../onramp/BasePayment';

export interface EstimatePriceDto {
  cryptoPrice: string; //The price of the cryptocurrency, denominated in fiat currency.
  currencyAmount: string; //The amount of the fiat currency, denominated in fiat currency.
  cryptoQuantity: string; //The amount of the cryptocurrency, denominated in cryptocurrency.
  rampFee: string; //The fee of the ramp, denominated in fiat currency.
  networkFee: string; //The fee of the network, denominated in fiat currency.
  payment: BasePayment;
}
