import * as jwt from 'jsonwebtoken';

const endpoint = 'http://localhost:3000';

// 生成 JWT Token（请根据实际情况修改用户ID和密钥）
const userId = '373358274021780480'; // 替换为实际的用户ID
const jwtSecret = 'P-w8Iewr3efdfd8r-dsdsrew4556y6vwq='; // 替换为实际的JWT密钥

const token = jwt.sign(
  {
    sub: userId,
    id: userId,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 60 * 60, // 1小时有效期
  },
  jwtSecret,
);

const authHeader = {
  Authorization: `Bearer ${token}`,
  'Content-Type': 'application/json',
};

console.log('=== 一元购抽奖 API 测试 ===\n');
console.log('Token:', token);
console.log('Auth Header:', authHeader);
console.log('\n');

/**
 * 获取抽奖商品列表
 */
async function getDrawProducts() {
  console.log('--- 获取抽奖商品列表 ---\n');

  try {
    const response = await fetch(
      `${endpoint}/api/v1/ecommerce/products?type=LUCKY_DRAW&status=ACTIVE&page=1&limit=10`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('获取商品列表失败:', response.status, errorText);
      return null;
    }

    const data = await response.json();
    console.log('抽奖商品列表:', JSON.stringify(data, null, 2));
    console.log('\n');

    if (data.items && data.items.length > 0) {
      return data.items[0].id; // 返回第一个商品的ID
    }

    return null;
  } catch (error) {
    console.error('获取商品列表失败:', error);
    return null;
  }
}

/**
 * 获取期次列表
 */
async function getDrawRounds(productId: number) {
  console.log('--- 获取期次列表 ---\n');

  try {
    const response = await fetch(
      `${endpoint}/api/v1/ecommerce/draws/rounds?productId=${productId}&page=1&limit=10`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('获取期次列表失败:', response.status, errorText);
      return null;
    }

    const data = await response.json();
    console.log('期次列表:', JSON.stringify(data, null, 2));
    console.log('\n');

    if (data.items && data.items.length > 0) {
      return data.items[0].id; // 返回第一个期次的ID
    }

    return null;
  } catch (error) {
    console.error('获取期次列表失败:', error);
    return null;
  }
}

/**
 * 获取期次详情
 */
async function getRoundDetail(drawRoundId: number) {
  console.log(`--- 获取期次详情 (ID: ${drawRoundId}) ---\n`);

  try {
    const response = await fetch(
      `${endpoint}/api/v1/ecommerce/draws/rounds/${drawRoundId}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('获取期次详情失败:', response.status, errorText);
      return null;
    }

    const data = await response.json();
    console.log('期次详情:', JSON.stringify(data, null, 2));
    console.log('\n');

    return data;
  } catch (error) {
    console.error('获取期次详情失败:', error);
    return null;
  }
}

/**
 * 购买抽奖号码
 */
async function purchaseSpots(productId: number, quantity = 1) {
  console.log(
    `--- 购买抽奖号码 (商品ID: ${productId}, 数量: ${quantity}) ---\n`,
  );

  try {
    const requestData = {
      productId: productId,
      quantity: quantity,
    };

    console.log('请求数据:', JSON.stringify(requestData, null, 2));
    console.log('\n');

    const response = await fetch(
      `${endpoint}/api/v1/ecommerce/draws/purchase`,
      {
        method: 'POST',
        headers: authHeader,
        body: JSON.stringify(requestData),
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('购买失败:', response.status, errorText);
      return null;
    }

    const data = await response.json();
    console.log('购买成功:', JSON.stringify(data, null, 2));
    console.log('\n');

    return data;
  } catch (error) {
    console.error('购买失败:', error);
    return null;
  }
}

/**
 * 获取我的参与记录
 */
async function getMyParticipations(productId?: number) {
  console.log('--- 获取我的参与记录 ---\n');

  try {
    let url = `${endpoint}/api/v1/ecommerce/draws/participations/me?page=1&limit=10`;
    if (productId) {
      url += `&productId=${productId}`;
    }

    const response = await fetch(url, {
      method: 'GET',
      headers: authHeader,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('获取参与记录失败:', response.status, errorText);
      return null;
    }

    const data = await response.json();
    console.log('我的参与记录:', JSON.stringify(data, null, 2));
    console.log('\n');

    return data;
  } catch (error) {
    console.error('获取参与记录失败:', error);
    return null;
  }
}

/**
 * 手动触发开奖（管理员功能）
 */
async function processDraw(drawRoundId: number) {
  console.log(`--- 手动触发开奖 (期次ID: ${drawRoundId}) ---\n`);

  try {
    const response = await fetch(
      `${endpoint}/api/v1/ecommerce/draws/rounds/${drawRoundId}/process`,
      {
        method: 'POST',
        headers: authHeader,
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('触发开奖失败:', response.status, errorText);
      return null;
    }

    const data = await response.json();
    console.log('开奖结果:', JSON.stringify(data, null, 2));
    console.log('\n');

    return data;
  } catch (error) {
    console.error('触发开奖失败:', error);
    return null;
  }
}

/**
 * 测试完整流程
 */
async function testFullFlow() {
  console.log('=== 测试完整流程 ===\n');

  try {
    // 1. 获取抽奖商品
    const productId = await getDrawProducts();
    if (!productId) {
      console.error('没有找到可用的抽奖商品');
      return;
    }

    // 2. 获取期次列表
    const drawRoundId = await getDrawRounds(productId);
    if (drawRoundId) {
      // 3. 获取期次详情
      await getRoundDetail(drawRoundId);
    }

    // 4. 购买抽奖号码（购买1个）
    // console.log('--- 测试购买1个号码 ---\n');
    // const purchaseResult1 = await purchaseSpots(productId, 1);
    // if (purchaseResult1) {
    //   console.log('购买1个号码成功，分配的号码范围:', {
    //     startNumber: purchaseResult1.participation.startNumber,
    //     endNumber: purchaseResult1.participation.endNumber,
    //   });
    //   console.log('\n');
    // }

    // 等待一下，避免并发问题
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // // 5. 购买抽奖号码（购买5个）
    // console.log('--- 测试购买5个号码 ---\n');
    // const purchaseResult2 = await purchaseSpots(productId, 5);
    // if (purchaseResult2) {
    //   console.log('购买5个号码成功，分配的号码范围:', {
    //     startNumber: purchaseResult2.participation.startNumber,
    //     endNumber: purchaseResult2.participation.endNumber,
    //   });
    //   console.log('\n');
    // }

    // 6. 再次获取期次详情，查看进度
    if (drawRoundId) {
      await getRoundDetail(drawRoundId);
    }

    // 7. 获取我的参与记录
    await getMyParticipations(productId);

    console.log('=== 完整流程测试完成 ===\n');
  } catch (error) {
    console.error('完整流程测试失败:', error);
  }
}

/**
 * 测试批量购买（模拟多个用户购买）
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function testBatchPurchase(productId: number, rounds = 10) {
  console.log(`=== 测试批量购买 (${rounds} 次) ===\n`);

  try {
    for (let i = 0; i < rounds; i++) {
      console.log(`--- 第 ${i + 1} 次购买 ---\n`);
      const result = await purchaseSpots(
        productId,
        Math.floor(Math.random() * 5) + 1,
      );

      if (result) {
        const roundDetail = await getRoundDetail(result.drawRound.id);
        if (roundDetail) {
          console.log('当前进度:', {
            soldSpots: roundDetail.drawRound.soldSpots,
            totalSpots: roundDetail.drawRound.totalSpots,
            remainingSpots: roundDetail.drawRound.remainingSpots,
            progressPercentage: roundDetail.drawRound.progressPercentage,
          });
          console.log('\n');

          // 如果已满员，停止购买
          if (roundDetail.drawRound.isFull) {
            console.log('期次已满员，停止购买\n');
            break;
          }
        }
      }

      // 等待一下，避免并发问题
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    console.log('=== 批量购买测试完成 ===\n');
  } catch (error) {
    console.error('批量购买测试失败:', error);
  }
}

/**
 * 测试开奖流程
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function testDrawProcess(productId: number) {
  console.log('=== 测试开奖流程 ===\n');

  try {
    // 1. 获取当前期次
    const roundDetail = await getDrawRounds(productId);
    if (!roundDetail) {
      console.error('没有找到可用的期次');
      return;
    }

    // 2. 获取期次详情
    const detail = await getRoundDetail(roundDetail);
    if (!detail) {
      return;
    }

    // 3. 如果期次已满员但未开奖，可以手动触发开奖
    if (detail.drawRound.status === 'COMPLETED') {
      console.log('期次已满员，触发开奖...\n');
      const drawResult = await processDraw(roundDetail);

      if (drawResult) {
        console.log('开奖成功！');
        console.log('中奖号码:', drawResult.winningNumber);
        console.log('中奖用户:', drawResult.winnerUserId);
        console.log('验证链接:', drawResult.verificationUrl);
        console.log('\n');

        // 再次获取期次详情，查看开奖结果
        await getRoundDetail(roundDetail);
      }
    } else {
      console.log('期次尚未满员，无法开奖');
      console.log('当前状态:', detail.drawRound.status);
      console.log(
        '已售:',
        detail.drawRound.soldSpots,
        '/',
        detail.drawRound.totalSpots,
      );
      console.log('\n');
    }
  } catch (error) {
    console.error('开奖流程测试失败:', error);
  }
}

/**
 * 主测试函数
 */
async function run() {
  try {
    // 测试选项（取消注释以运行相应的测试）

    // 1. 完整流程测试
    await testFullFlow();

    // 2. 获取商品并测试批量购买（取消注释以启用）
    // const productId = await getDrawProducts();
    // if (productId) {
    //   await testBatchPurchase(productId, 20);
    // }

    // 3. 测试开奖流程（取消注释以启用）
    // const productId = await getDrawProducts();
    // if (productId) {
    //   await testDrawProcess(productId);
    // }

    console.log('=== 所有测试完成 ===');
  } catch (error) {
    console.error('测试执行失败:', error);
  }
}

// 运行测试
run();
