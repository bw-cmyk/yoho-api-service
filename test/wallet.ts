import { UniversalAccount } from '@particle-network/universal-account-sdk';
import { Wallet } from 'ethers';
import * as jwt from 'jsonwebtoken';

const endpoint = 'https://yoho-api-service-dev-ff05bf602cab.herokuapp.com';
const token = jwt.sign(
  {
    sub: '271472926769848320',
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 60 * 1,
  },
  'P-w8Iewr3efdfd8r-dsdsrew4556y6vwq=',
);
const authHeader = {
  Authorization: `Bearer ${token}`,
  'Content-Type': 'application/json',
};

console.log('authHeader', authHeader);

const bindEOAWallet = async (userProfile: any) => {
  if (!userProfile.evmEOAWallet) {
    const data = await fetch(`${endpoint}/api/v1/wallets/authorization`, {
      method: 'GET',
      headers: authHeader,
    }).then((res) => res.json());
    const particleWalletJWTToken = data.access_token;
    // TODO: 调用 particle sdk 创建 wallet

    // 获取完 particle wallet 后， 调用 bind eoa 接口, 绑定 particle wallet
    // await fetch(
    //   `${endpoint}/api/v1/wallets/bind/eoa`,
    //   {
    //     method: 'POST',
    //     headers: {
    //       Authorization: `Bearer ${particleWalletJWTToken}`,
    //     },
    //   }, {
    //     address: 'xxxxx',
    //     particleUid: 'xxxxx',
    //     particleAuthToken: 'xxxxx',
    //   },
    // );
  }
};

const bindAAWallet = async (userProfile: any) => {
  // 这里用一个固定的私钥, 创建一个 wallet, 代替 particle wallet 用于测试
  const MINT_PRIVATE_KEY =
    'a5712b251725d22ac6eea60118d1452aa41d07db2500d1a1ddab24242b69fcfe';
  const wallet = new Wallet(MINT_PRIVATE_KEY);

  // 创建 universal account
  const universalAccount = new UniversalAccount({
    projectId: '894a40dc-9999-4400-94f4-de0b2171f448',
    projectClientKey: 'sP6xhnOil0UuVoog73hsqmWhYNfZJJ8oNl72twNx',
    projectAppUuid: '143c36a3-e3a8-419d-aa8a-d6eff64b8e04',
    ownerAddress: wallet.address,
  });

  const smartAccountOptions = await universalAccount.getSmartAccountOptions();
  console.log(smartAccountOptions);

  if (!userProfile.evmAAWallet) {
    await fetch(`${endpoint}/api/v1/wallets/bind/aa`, {
      method: 'POST',
      headers: authHeader,
      body: JSON.stringify({
        address: smartAccountOptions.smartAccountAddress,
      }),
    });
  }
};

async function main() {
  // botim login
  // const botimLogin = await fetch(`${endpoint}/api/v1/user/botim/login`, {
  //   method: 'POST',
  //   headers: authHeader,
  //   body: JSON.stringify({
  //     accessToken: '1234567890',
  //     refreshToken: '1234567890',
  //   }),
  // }).then((res) => res.json());
  // const accessToken = botimLogin.access_token;

  // 获取 profile
  const userProfile = await fetch(`${endpoint}/api/v1/user/profile`, {
    method: 'GET',
    headers: authHeader,
  }).then((res) => res.json());

  console.log(userProfile);

  bindEOAWallet(userProfile);

  bindAAWallet(userProfile);
}

main();
