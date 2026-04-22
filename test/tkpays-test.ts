import * as jwt from 'jsonwebtoken';

const endpoint = 'http://localhost:3001';
// const endpoint = 'https://yoho-api-service-dev-ff05bf602cab.herokuapp.com'
const token = jwt.sign(
  {
    sub: '358801635322889216',
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24,
  },
  'P-w8Iewr3efdfd8r-dsdsrew4556y6vwq=',
);
console.log('JWT Token:', token);

const authHeader = {
  Authorization: `Bearer ${token}`,
  'Content-Type': 'application/json',
};

const main = async () => {
  // 1. 获取支持的法币列表
  console.log('\n=== 1. 获取支持的法币列表 ===');
  const currenciesRes = await fetch(`${endpoint}/api/v1/pay/fiat/currencies`, {
    method: 'GET',
    headers: authHeader,
  });
  const currencies = await currenciesRes.json();
  console.log('支持的法币:', currencies);

  // 2. 根据法币获取可用支付渠道
  console.log('\n=== 2. 获取 AED 可用支付渠道 ===');
  const channelsRes = await fetch(
    `${endpoint}/api/v1/pay/fiat/channels?currency=AED`,
    {
      method: 'GET',
      headers: authHeader,
    },
  );
  const channels = await channelsRes.json();
  console.log('AED 支付渠道:', channels);

  // 3. 创建法币入金订单
  console.log('\n=== 3. 创建法币入金订单 ===');
  const depositRes = await fetch(`${endpoint}/api/v1/pay/fiat/deposit`, {
    method: 'POST',
    headers: authHeader,
    body: JSON.stringify({
      fiatCurrency: 'AED',
      amount: 5,
      payType: 'Botim',
      successUrl: 'http://localhost:3001/pay/success',
      errorUrl: 'http://localhost:3001/pay/error',
    }),
  });
  const deposit = await depositRes.json();
  console.log('订单创建结果:', deposit);

  // 4. 查询法币入金订单列表
  console.log('\n=== 4. 查询法币入金订单 ===');
  const ordersRes = await fetch(
    `${endpoint}/api/v1/pay/fiat/orders?page=1&limit=10`,
    {
      method: 'GET',
      headers: authHeader,
    },
  );
  const orders = await ordersRes.json();
  console.log('订单列表:', JSON.stringify(orders, null, 2));
};

main().catch(console.error);
