import { UniversalAccount } from '@particle-network/universal-account-sdk';
import { Wallet } from 'ethers';
import * as jwt from 'jsonwebtoken';

const endpoint = 'http://localhost:3000';
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

// 获取存款签名的示例
async function getDepositSignature() {
  try {
    const depositData = {
      amount: '1000000000000000000', // 1 ETH (in wei)
      chainId: 56, // BSC mainnet
      type: 'bnb', // 币种类型 (bnb, usdt)
    };

    console.log('请求存款签名...');
    console.log('请求数据:', depositData);

    const response = await fetch(
      `${endpoint}/api/v1/deposit-withdraw/deposit`,
      {
        method: 'POST',
        headers: authHeader,
        body: JSON.stringify(depositData),
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const result = await response.json();
    console.log('存款签名响应:', result);

    // 返回的签名数据包含:
    // - signature: 签名
    // - contract: 合约地址
    // - systemId: 系统订单ID
    // - orderId: 订单ID
    // - deadline: 过期时间
    // - user: 用户钱包地址
    // - token: 代币合约地址
    // - amount: 金额

    return result;
  } catch (error) {
    console.error('获取存款签名失败:', error);
    throw error;
  }
}

// 获取提款签名的示例
async function getWithdrawSignature() {
  try {
    const withdrawData = {
      amount: '500000000000000000', // 0.5 ETH (in wei)
      chainId: 56, // BSC mainnet
      type: 'bnb', // 币种类型
      notifyUrl: 'https://your-callback-url.com/withdraw-notify', // 回调URL (可选)
    };

    console.log('请求提款签名...');
    console.log('请求数据:', withdrawData);

    const response = await fetch(
      `${endpoint}/api/v1/deposit-withdraw/withdraw`,
      {
        method: 'POST',
        headers: authHeader,
        body: JSON.stringify(withdrawData),
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const result = await response.json();
    console.log('提款签名响应:', result);

    return result;
  } catch (error) {
    console.error('获取提款签名失败:', error);
    throw error;
  }
}

// 查询订单状态的示例
async function getOrderStatus() {
  try {
    const queryParams = new URLSearchParams({
      limit: '10',
      offset: '0',
    });

    console.log('查询订单状态...');

    const response = await fetch(
      `${endpoint}/api/v1/deposit-withdraw/orders?${queryParams}`,
      {
        method: 'GET',
        headers: authHeader,
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const result = await response.json();
    console.log('订单状态响应:', result);

    return result;
  } catch (error) {
    console.error('查询订单状态失败:', error);
    throw error;
  }
}

// 执行示例
async function runExamples() {
  try {
    console.log('=== 存款签名示例 ===');
    const depositResult = await getDepositSignature();

    console.log('\n=== 提款签名示例 ===');
    const withdrawResult = await getWithdrawSignature();

    console.log('\n=== 查询订单状态示例 ===');
    const ordersResult = await getOrderStatus();

    console.log('\n=== 所有示例执行完成 ===');
  } catch (error) {
    console.error('示例执行失败:', error);
  }
}

// 如果直接运行此文件，则执行示例
if (require.main === module) {
  runExamples();
}
