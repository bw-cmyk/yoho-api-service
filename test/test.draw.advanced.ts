import * as jwt from 'jsonwebtoken';

const endpoint = 'http://localhost:3000';

// 生成 JWT Token
const userId = '373358274021780480';
const jwtSecret = 'P-w8Iewr3efdfd8r-dsdsrew4556y6vwq=';

const token = jwt.sign(
  {
    sub: userId,
    id: userId,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 60 * 60,
  },
  jwtSecret,
);

const authHeader = {
  Authorization: `Bearer ${token}`,
  'Content-Type': 'application/json',
};

console.log('=== 一元购高级测试 ===\n');

/**
 * 测试错误情况
 */
async function testErrorCases() {
  console.log('--- 测试错误情况 ---\n');

  // 1. 测试购买数量为0
  console.log('1. 测试购买数量为0...');
  try {
    const response = await fetch(
      `${endpoint}/api/v1/ecommerce/draws/purchase`,
      {
        method: 'POST',
        headers: authHeader,
        body: JSON.stringify({
          productId: 1,
          quantity: 0,
        }),
      },
    );
    const data = await response.json();
    console.log('结果:', response.status, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('错误:', error);
  }
  console.log('\n');

  // 2. 测试购买数量为负数
  console.log('2. 测试购买数量为负数...');
  try {
    const response = await fetch(
      `${endpoint}/api/v1/ecommerce/draws/purchase`,
      {
        method: 'POST',
        headers: authHeader,
        body: JSON.stringify({
          productId: 1,
          quantity: -1,
        }),
      },
    );
    const data = await response.json();
    console.log('结果:', response.status, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('错误:', error);
  }
  console.log('\n');

  // 3. 测试不存在的商品ID
  console.log('3. 测试不存在的商品ID...');
  try {
    const response = await fetch(
      `${endpoint}/api/v1/ecommerce/draws/purchase`,
      {
        method: 'POST',
        headers: authHeader,
        body: JSON.stringify({
          productId: 999999,
          quantity: 1,
        }),
      },
    );
    const data = await response.json();
    console.log('结果:', response.status, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('错误:', error);
  }
  console.log('\n');

  // 4. 测试余额不足的情况
  console.log('4. 测试余额不足（购买大量号码）...');
  try {
    const response = await fetch(
      `${endpoint}/api/v1/ecommerce/draws/purchase`,
      {
        method: 'POST',
        headers: authHeader,
        body: JSON.stringify({
          productId: 1,
          quantity: 1000000, // 购买大量号码
        }),
      },
    );
    const data = await response.json();
    console.log('结果:', response.status, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('错误:', error);
  }
  console.log('\n');

  // 5. 测试未授权访问
  console.log('5. 测试未授权访问...');
  try {
    const response = await fetch(
      `${endpoint}/api/v1/ecommerce/draws/purchase`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          productId: 1,
          quantity: 1,
        }),
      },
    );
    const data = await response.json();
    console.log('结果:', response.status, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('错误:', error);
  }
  console.log('\n');
}

/**
 * 测试并发购买
 */
async function testConcurrentPurchase(productId: number, quantity = 1) {
  console.log(
    `--- 测试并发购买 (商品ID: ${productId}, 数量: ${quantity}) ---\n`,
  );

  const promises = [];
  for (let i = 0; i < 5; i++) {
    promises.push(
      fetch(`${endpoint}/api/v1/ecommerce/draws/purchase`, {
        method: 'POST',
        headers: authHeader,
        body: JSON.stringify({
          productId: productId,
          quantity: quantity,
        }),
      }).then(async (res) => {
        const data = await res.json();
        return { index: i, status: res.status, data };
      }),
    );
  }

  try {
    const results = await Promise.allSettled(promises);
    console.log('并发购买结果:');
    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        console.log(`请求 ${index + 1}:`, {
          status: result.value.status,
          success: result.value.status === 200 || result.value.status === 201,
        });
      } else {
        console.log(`请求 ${index + 1}: 失败`, result.reason);
      }
    });
    console.log('\n');
  } catch (error) {
    console.error('并发购买测试失败:', error);
  }
}

/**
 * 测试号码分配的正确性
 */
async function testNumberAllocation(productId: number) {
  console.log('--- 测试号码分配的正确性 ---\n');

  try {
    // 获取当前期次
    const roundsResponse = await fetch(
      `${endpoint}/api/v1/ecommerce/draws/rounds?productId=${productId}&page=1&limit=1`,
    );
    const roundsData = await roundsResponse.json();

    if (!roundsData.items || roundsData.items.length === 0) {
      console.log('没有找到期次');
      return;
    }

    const roundId = roundsData.items[0].id;
    const initialSoldSpots = roundsData.items[0].soldSpots;

    console.log('当前已售号码数:', initialSoldSpots);
    console.log('购买3个号码...\n');

    // 购买3个号码
    const purchaseResponse = await fetch(
      `${endpoint}/api/v1/ecommerce/draws/purchase`,
      {
        method: 'POST',
        headers: authHeader,
        body: JSON.stringify({
          productId: productId,
          quantity: 3,
        }),
      },
    );

    if (!purchaseResponse.ok) {
      const errorText = await purchaseResponse.text();
      console.error('购买失败:', purchaseResponse.status, errorText);
      return;
    }

    const purchaseData = await purchaseResponse.json();
    const participation = purchaseData.participation;

    console.log('分配的号码范围:', {
      startNumber: participation.startNumber,
      endNumber: participation.endNumber,
      quantity: participation.quantity,
    });

    // 验证号码分配是否正确
    const expectedStartNumber = initialSoldSpots + 1;
    const expectedEndNumber = initialSoldSpots + 3;

    if (
      participation.startNumber === expectedStartNumber &&
      participation.endNumber === expectedEndNumber
    ) {
      console.log('✓ 号码分配正确');
    } else {
      console.error('✗ 号码分配错误');
      console.error('期望:', {
        startNumber: expectedStartNumber,
        endNumber: expectedEndNumber,
      });
      console.error('实际:', {
        startNumber: participation.startNumber,
        endNumber: participation.endNumber,
      });
    }

    // 获取更新后的期次详情
    const roundDetailResponse = await fetch(
      `${endpoint}/api/v1/ecommerce/draws/rounds/${roundId}`,
    );
    const roundDetail = await roundDetailResponse.json();

    console.log('更新后的已售号码数:', roundDetail.drawRound.soldSpots);
    console.log('剩余号码数:', roundDetail.drawRound.remainingSpots);
    console.log('\n');
  } catch (error) {
    console.error('号码分配测试失败:', error);
  }
}

/**
 * 测试期次自动创建
 */
async function testAutoCreateRound(productId: number) {
  console.log('--- 测试期次自动创建 ---\n');

  try {
    // 获取当前期次
    const roundsResponse = await fetch(
      `${endpoint}/api/v1/ecommerce/draws/rounds?productId=${productId}&page=1&limit=2`,
    );
    const roundsData = await roundsResponse.json();

    console.log('当前期次列表:');
    roundsData.items.forEach((round: any) => {
      console.log(
        `  期次 ${round.roundNumber}: 状态=${round.status}, 已售=${round.soldSpots}/${round.totalSpots}`,
      );
    });
    console.log('\n');

    // 查找进行中的期次
    const ongoingRound = roundsData.items.find(
      (round: any) => round.status === 'ONGOING',
    );

    if (ongoingRound) {
      console.log(`找到进行中的期次: ${ongoingRound.roundNumber}`);
      console.log(`剩余号码: ${ongoingRound.remainingSpots}`);
    } else {
      console.log('没有找到进行中的期次，系统应该会自动创建新期次');
    }

    console.log('\n');
  } catch (error) {
    console.error('期次自动创建测试失败:', error);
  }
}

/**
 * 测试开奖算法验证
 */
async function testDrawAlgorithm(productId: number) {
  console.log('--- 测试开奖算法验证 ---\n');

  try {
    // 查找已开奖的期次
    const roundsResponse = await fetch(
      `${endpoint}/api/v1/ecommerce/draws/rounds?productId=${productId}&page=1&limit=10`,
    );
    const roundsData = await roundsResponse.json();

    const drawnRounds = roundsData.items.filter(
      (round: any) => round.status === 'DRAWN',
    );

    if (drawnRounds.length === 0) {
      console.log('没有找到已开奖的期次');
      return;
    }

    console.log(`找到 ${drawnRounds.length} 个已开奖的期次\n`);

    // 检查第一个已开奖的期次
    const drawnRound = drawnRounds[0];
    const roundDetailResponse = await fetch(
      `${endpoint}/api/v1/ecommerce/draws/rounds/${drawnRound.id}`,
    );
    const roundDetail = await roundDetailResponse.json();

    if (roundDetail.result) {
      const result = roundDetail.result;
      console.log('开奖结果详情:');
      console.log('  中奖号码:', result.winningNumber);
      console.log('  中奖用户:', result.winnerUserId);
      console.log('  区块距离:', result.blockDistance);
      console.log('  目标区块高度:', result.targetBlockHeight);
      console.log('  目标区块哈希:', result.targetBlockHash);
      console.log('  哈希最后6位数字:', result.hashLast6Digits);
      console.log('  验证链接:', result.verificationUrl);
      console.log('\n');

      // 验证计算公式
      const calculatedWinner =
        (parseInt(result.hashLast6Digits, 10) % drawnRound.totalSpots) + 1;
      console.log('验证计算:');
      console.log(
        `  (${result.hashLast6Digits} % ${drawnRound.totalSpots}) + 1 = ${calculatedWinner}`,
      );
      console.log(`  实际中奖号码: ${result.winningNumber}`);

      if (calculatedWinner === result.winningNumber) {
        console.log('  ✓ 计算结果匹配');
      } else {
        console.log('  ✗ 计算结果不匹配');
      }
      console.log('\n');
    } else {
      console.log('该期次尚未开奖');
    }
  } catch (error) {
    console.error('开奖算法验证失败:', error);
  }
}

/**
 * 主测试函数
 */
async function run() {
  try {
    // 获取商品ID
    const productsResponse = await fetch(
      `${endpoint}/api/v1/ecommerce/products?type=LUCKY_DRAW&status=ACTIVE&page=1&limit=1`,
    );
    const productsData = await productsResponse.json();

    if (!productsData.items || productsData.items.length === 0) {
      console.error('没有找到可用的抽奖商品');
      return;
    }

    const productId = productsData.items[0].id;
    console.log(`使用商品ID: ${productId}\n`);

    // 测试选项（取消注释以运行相应的测试）

    // 1. 测试错误情况
    await testErrorCases();

    // 2. 测试号码分配
    // await testNumberAllocation(productId);

    // 3. 测试并发购买
    // await testConcurrentPurchase(productId, 1);

    // 4. 测试期次自动创建
    // await testAutoCreateRound(productId);

    // 5. 测试开奖算法验证
    // await testDrawAlgorithm(productId);

    console.log('=== 高级测试完成 ===');
  } catch (error) {
    console.error('测试执行失败:', error);
  }
}

// 运行测试
run();
