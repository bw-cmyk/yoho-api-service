import { UniversalAccount } from '@particle-network/universal-account-sdk';
import { Wallet } from 'ethers';
import * as jwt from 'jsonwebtoken';

const endpoint = 'http://localhost:3000';
const token = jwt.sign(
  {
    sub: '358801635322889216',
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24,
  },
  'P-w8Iewr3efdfd8r-dsdsrew4556y6vwq=',
);
console.log(token);
const authHeader = {
  Authorization: `Bearer ${token}`,
  'Content-Type': 'application/json',
};

const main = async () => {
  // request /api/v1/pay/channel
  const query: any = {
    crypto: 'USDT',
    network: 'BSC',
    currency: 'INR',
    amount: 1250,
    payMethod: 'UPI' as any, // 添加必需的 payMethod 参数
    // language: 'vi',
  };
  // const queryString = new URLSearchParams(query).toString();
  // const response = await fetch(
  //   `${endpoint}/api/v1/pay/methods?${queryString}`,
  //   {
  //     method: 'GET',
  //     headers: authHeader,
  //   },
  // );
  // const data = await response.json();
  // console.log(data);

  // get /api/v1/pay/best-channel
  const response2 = await fetch(`${endpoint}/api/v1/pay/best-channel`, {
    method: 'POST',
    headers: authHeader,
    body: JSON.stringify(query),
  });
  const data2 = await response2.json();
  console.log(data2); 
};

main();
