import * as config from 'dotenv';
config.config();
import { OKXDEX } from '../src/api-modules/assets/dex/okx';
import Decimal from 'decimal.js';

const okx = OKXDEX.fromEnv();

const main = async () => {
  const tokens = await okx.get(
    '/api/v5/dex/market/historical-candles',
    {
      chainIndex: '56',
      tokenContractAddress: '0x000ae314e2a2172a039b26378814c252734f556a',
    },
  );

  const candles = tokens as any;
  console.log(candles)
  const latestCandle = candles[0];
  //@ts-ignore
  const previousCandle = candles[candles.length - 1];
  console.log(latestCandle, previousCandle)
  const currentPrice = new Decimal(latestCandle[4]);
  const previousPrice = new Decimal(previousCandle[4]);
  const priceChange24h = currentPrice.minus(previousPrice);
  const priceChangePercentage24h = previousPrice.gt(0)
    ? priceChange24h.div(previousPrice)
    : new Decimal(0);

  // 计算24小时交易量
  const volume24h = candles.reduce((sum, candle) => {
    return sum.plus(new Decimal(candle[6]));
  }, new Decimal(0));
  console.log(JSON.stringify(tokens, null, 2));

  console.log('currentPrice:', currentPrice.toString());
  console.log('previousPrice:', previousPrice.toString());
  console.log('priceChange24h:', priceChange24h.toString());
  console.log('priceChangePercentage24h:', priceChangePercentage24h.toString());
  console.log('volume24h:', volume24h.toString());
  console.log('candles:', JSON.stringify(candles));
};

main();
