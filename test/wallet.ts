import {
  CHAIN_ID,
  UniversalAccount,
} from '@particle-network/universal-account-sdk';
import { Wallet, JsonRpcProvider, Contract, getBytes } from 'ethers';
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

const provider = new JsonRpcProvider('https://bsc-dataseed.binance.org');
const bindAAWallet = async () => {
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

  // 授权交易

  // const approveData = await fetch('http://localhost:3000/api/v1/dex/approve-transaction?chainIndex=56&tokenContractAddress=0x55d398326f99059ff775485246999027b3197955&approveAmount=1000000').then((res) => res.json());
  // const approveData = {
  //   data: '0x095ea7b30000000000000000000000002c34a2fb1d0b4f55de51e1d0bdefaddce6b7cdd600000000000000000000000000000000000000000000000000000000000f4240',
  //   dexContractAddress: '0x2c34A2Fb1d0b4f55de51E1d0bDEfaDDce6b7cDD6',
  //   gasLimit: '70000',
  //   gasPrice: '60192874',
  // };

  // const appoveTransaction = {
  //   from: smartAccountOptions.smartAccountAddress,
  //   data: approveData.data,
  //   to: '0x55d398326f99059ff775485246999027b3197955',
  // };

  // const transaction = await universalAccount.createUniversalTransaction({
  //   chainId: CHAIN_ID.BSC_MAINNET,
  //   expectTokens: [],
  //   transactions: [
  //     {
  //       ...appoveTransaction,
  //     },
  //   ],
  // });

  // const sendResult = await universalAccount.sendTransaction(
  //   transaction,
  //   wallet.signMessageSync(getBytes(transaction.rootHash)),
  // );

  // console.log(smartAccountOptions.smartAccountAddress);
  const data = await fetch(
    'http://localhost:3000/api/v1/dex/swap?chainIndex=56&amount=100000000000&toTokenAddress=0x2170ed0880ac9a755fd29b2688956bd959f933f8&fromTokenAddress=0x55d398326f99059ff775485246999027b3197955&slippagePercent=0.5&userWalletAddress=' +
      // smartAccountOptions.smartAccountAddress,
      wallet.address,
  ).then((res) => res.json());

  const swapData = data.data[0].tx;
  const transactionRaw = {
    from: swapData.from,
    to: swapData.to,
    data: swapData.data,
    value: swapData.value || '0x0',
    chainIndex: 56,
  };

  const transaction = await universalAccount.createUniversalTransaction({
    chainId: CHAIN_ID.BSC_MAINNET,
    expectTokens: [],
    transactions: [
      {
        ...transactionRaw,
      },
    ],
  });

  const sendResult = await universalAccount.sendTransaction(
    transaction,
    wallet.signMessageSync(getBytes(transaction.rootHash)),
  );

  console.log('sendResult', sendResult);
  console.log('explorer url', `https://universalx.app/activity/details?id=${sendResult.transactionId}`);
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
  // const userProfile = await fetch(`${endpoint}/api/v1/user/profile`, {
  //   method: 'GET',
  //   headers: authHeader,
  // }).then((res) => res.json());

  // console.log(userProfile);

  // bindEOAWallet(userProfile);

  bindAAWallet();
}

main();
