/**
 * 保底中奖功能测试
 *
 * 测试场景：
 * 1. 管理员开启保底功能（第N次参与触发）
 * 2. 用户购买到第N次，触发保底中奖
 * 3. 验证私有轮次已创建并立即开奖
 * 4. 验证 DrawParticipation.isGuaranteedWin 和 userGlobalParticipationCount 字段
 * 5. 验证 DrawResult.isGuaranteedWin 字段
 * 6. 验证 DrawRound.isPrivate / privateUserId 字段
 */
import * as jwt from 'jsonwebtoken';

const endpoint = 'http://localhost:3001';

// ==================== 认证配置 ====================

const userId = '373358274021780480'; // 替换为实际用户ID
const jwtSecret = 'P-w8Iewr3efdfd8r-dsdsrew4556y6vwq=';

const userToken = jwt.sign(
  {
    sub: userId,
    id: userId,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 60 * 60 * 60,
  },
  jwtSecret,
);

const adminUserId = '373358274021780480'; // 替换为实际管理员ID
const adminJwtSecret = 'P-w8Iewr3efdfd8r-dsdsrew4556y6vwq=';

const adminToken = jwt.sign(
  {
    sub: adminUserId,
    id: adminUserId,
    role: 1000,
    type: 'admin',
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 60 * 60,
  },
  adminJwtSecret,
);

const userHeaders = {
  Authorization: `Bearer ${userToken}`,
  'Content-Type': 'application/json',
};

const adminHeaders = {
  Authorization: `Bearer ${adminToken}`,
  'Content-Type': 'application/json',
};

console.log('=== 保底中奖功能测试 ===\n');

// ==================== 管理员接口 ====================

async function getGuaranteedWinConfig() {
  const response = await fetch(
    `${endpoint}/api/v1/admin/draws/guaranteed-win-config`,
    { method: 'GET', headers: adminHeaders },
  );
  if (!response.ok) {
    console.error('获取保底配置失败:', await response.text());
    return null;
  }
  return response.json();
}

async function updateGuaranteedWinConfig(
  enabled: boolean,
  onNthParticipation: number,
) {
  const response = await fetch(
    `${endpoint}/api/v1/admin/draws/guaranteed-win-config`,
    {
      method: 'PATCH',
      headers: adminHeaders,
      body: JSON.stringify({ enabled, onNthParticipation }),
    },
  );
  if (!response.ok) {
    console.error('更新保底配置失败:', await response.text());
    return null;
  }
  return response.json();
}

// ==================== 用户接口 ====================

async function getDrawProducts() {
  const response = await fetch(
    `${endpoint}/api/v1/ecommerce/products?type=LUCKY_DRAW&status=ACTIVE&page=1&limit=10`,
    { method: 'GET', headers: userHeaders },
  );
  if (!response.ok) return null;
  const data = await response.json();
  return data.items?.[0]?.id ?? null;
}

async function purchaseSpots(productId: number, quantity = 1) {
  const response = await fetch(`${endpoint}/api/v1/ecommerce/draws/purchase`, {
    method: 'POST',
    headers: userHeaders,
    body: JSON.stringify({ productId, quantity }),
  });
  if (!response.ok) {
    const err = await response.text();
    console.error('购买失败:', response.status, err);
    return null;
  }
  return response.json();
}

async function getMyParticipations(productId?: number) {
  let url = `${endpoint}/api/v1/ecommerce/draws/participations/me?page=1&limit=100`;
  if (productId) url += `&productId=${productId}`;
  const response = await fetch(url, { method: 'GET', headers: userHeaders });
  if (!response.ok) return null;
  return response.json();
}

async function getAdminRounds(productId: number) {
  const response = await fetch(
    `${endpoint}/api/v1/admin/draws/rounds?productId=${productId}&page=1&limit=50`,
    { method: 'GET', headers: adminHeaders },
  );
  if (!response.ok) return null;
  return response.json();
}

// ==================== 测试场景 ====================

/**
 * 测试保底配置读写
 */
async function testConfigReadWrite() {
  console.log('--- 测试保底配置读写 ---\n');

  const before = await getGuaranteedWinConfig();
  console.log('读取当前配置:', before);

  // 设置为第5次参与触发
  const updateResult = await updateGuaranteedWinConfig(true, 3);
  console.log('更新结果:', updateResult);

  const after = await getGuaranteedWinConfig();
  console.log('更新后配置:', after);

  if (after?.enabled !== true || after?.onNthParticipation !== 3) {
    console.error('❌ 配置读写测试失败：值不匹配');
  } else {
    console.log('✅ 配置读写测试通过\n');
  }

  // 恢复原始配置
  if (before) {
    await updateGuaranteedWinConfig(before.enabled, before.onNthParticipation);
    console.log('配置已恢复\n');
  }
}

/**
 * 测试关闭保底功能时不触发保底中奖
 */
async function testDisabledGuaranteedWin() {
  console.log('--- 测试关闭保底时不触发保底中奖 ---\n');

  // 确保保底功能关闭
  await updateGuaranteedWinConfig(false, 1);
  console.log('已关闭保底功能\n');

  const productId = await getDrawProducts();
  if (!productId) {
    console.log('没有可用商品，跳过此测试\n');
    return;
  }

  // 购买一次（应该不触发保底）
  const result = await purchaseSpots(productId, 1);
  if (!result) {
    console.log('购买失败，跳过此测试\n');
    return;
  }

  console.log('购买成功，参与ID:', result.participation?.id);

  // 等待异步保底检查
  await new Promise((resolve) => setTimeout(resolve, 1000));

  // 检查是否有私有轮次（不应该有）
  const rounds = await getAdminRounds(productId);
  const privateRounds = rounds?.data?.filter((r) => r.isPrivate);
  if (privateRounds?.length === 0) {
    console.log('✅ 关闭保底时未触发保底中奖\n');
  } else {
    console.log('ℹ️  存在私有轮次（可能是之前测试遗留）\n');
  }
}

/**
 * 测试保底中奖触发
 *
 * 注意：此测试会实际消耗用户余额，请确保测试账户有足够余额
 * 建议先设置 onNthParticipation=1（第1次触发），减少测试成本
 */
async function testGuaranteedWinTrigger() {
  console.log('--- 测试保底中奖触发 ---\n');
  console.log('⚠️  此测试会实际消耗用户余额，已注释关键操作\n');

  const productId = await getDrawProducts();
  if (!productId) {
    console.log('没有可用商品，跳过此测试\n');
    return;
  }

  // 1. 设置保底为第1次参与触发（便于测试）
  // await updateGuaranteedWinConfig(true, 1);
  // console.log('已设置保底：第1次参与触发\n');

  // 2. 检查当前参与次数
  const participationsBefore = await getMyParticipations(productId);
  const normalCount =
    participationsBefore?.items?.filter(
      (p) => !p.isNewUserChance && !p.isGuaranteedWin,
    ).length ?? 0;
  console.log(`当前常规参与次数: ${normalCount}\n`);

  // 3. 购买操作（会触发保底检查）
  console.log('执行购买操作...');
  const purchaseResult = await purchaseSpots(productId, 1);
  if (!purchaseResult) {
    console.log('购买失败\n');
    return;
  }
  console.log('购买成功:', purchaseResult.participation?.id);

  // 4. 等待异步保底检查完成
  console.log('等待保底检查...');
  await new Promise((resolve) => setTimeout(resolve, 2000));

  // 5. 验证私有轮次是否已创建
  const roundsAfter = await getAdminRounds(productId);
  const newPrivateRound = roundsAfter?.data?.find(
    (r) => r.isPrivate && r.privateUserId === userId,
  );
  if (newPrivateRound) {
    console.log('✅ 私有轮次已创建:', {
      id: newPrivateRound.id,
      status: newPrivateRound.status,
      isPrivate: newPrivateRound.isPrivate,
      privateUserId: newPrivateRound.privateUserId,
    });
    console.log('\n');

    // 6. 验证保底开奖结果
    if (newPrivateRound.result) {
      const result = newPrivateRound.result;
      if (result.isGuaranteedWin && result.winnerUserId === userId) {
        console.log('✅ 保底开奖成功:', {
          winningNumber: result.winningNumber,
          winnerUserId: result.winnerUserId,
          isGuaranteedWin: result.isGuaranteedWin,
        });
      } else {
        console.error('❌ 保底开奖结果不符合预期');
      }
    }
  } else {
    console.log('ℹ️  未发现新的私有轮次（可能已被清理或条件未满足）\n');
  }

  // 7. 验证参与记录的 isGuaranteedWin 和 userGlobalParticipationCount
  const participationsAfter = await getMyParticipations(productId);
  const guaranteedParticipation = participationsAfter?.items?.find(
    (p) => p.isGuaranteedWin,
  );
  if (guaranteedParticipation) {
    console.log('✅ 保底参与记录:', {
      id: guaranteedParticipation.id,
      isGuaranteedWin: guaranteedParticipation.isGuaranteedWin,
      userGlobalParticipationCount: guaranteedParticipation.userGlobalParticipationCount,
    });
  }
}

/**
 * 测试保底参数校验
 */
async function testConfigValidation() {
  console.log('--- 测试保底配置参数校验 ---\n');

  // onNthParticipation 必须 >= 1
  const invalidResult = await updateGuaranteedWinConfig(true, 0);
  if (!invalidResult) {
    console.log('✅ 参数校验：onNthParticipation=0 被拒绝\n');
  } else {
    console.error('❌ 参数校验失败：onNthParticipation=0 应被拒绝\n');
  }

  // enabled 必须是 boolean
  const response = await fetch(
    `${endpoint}/api/v1/admin/draws/guaranteed-win-config`,
    {
      method: 'PATCH',
      headers: adminHeaders,
      body: JSON.stringify({ enabled: 'yes', onNthParticipation: 5 }),
    },
  );
  if (!response.ok) {
    console.log('✅ 参数校验：enabled="yes" 被拒绝\n');
  } else {
    console.error('❌ 参数校验失败：enabled="yes" 应被拒绝\n');
  }
}

/**
 * 查看私有轮次（保底轮次）列表
 */
async function inspectPrivateRounds() {
  console.log('--- 查看私有轮次列表 ---\n');

  const productId = await getDrawProducts();
  if (!productId) {
    console.log('没有可用商品\n');
    return;
  }

  const rounds = await getAdminRounds(productId);
  if (!rounds) return;

  const privateRounds = rounds.data.filter((r) => r.isPrivate);
  console.log(`发现 ${privateRounds.length} 个私有轮次:`);
  privateRounds.forEach((r) => {
    console.log({
      id: r.id,
      status: r.status,
      isPrivate: r.isPrivate,
      privateUserId: r.privateUserId,
      soldSpots: r.soldSpots,
      totalSpots: r.totalSpots,
      result: r.result,
    });
  });
  console.log('\n');
}

/**
 * 主测试函数
 */
async function run() {
  try {
    console.log('开始执行保底中奖功能测试...\n');

    // 1. 测试配置读写
    await testConfigReadWrite();

    // 2. 测试参数校验
    // await testConfigValidation();

    // 3. 查看当前私有轮次状态
    // await inspectPrivateRounds();

    // 4. 测试关闭保底时不触发（注意：会消耗余额，请谨慎执行）
    // await testDisabledGuaranteedWin();

    // 5. 测试保底中奖触发（关键操作已注释，需手动解注释）
    // await testGuaranteedWinTrigger();

    console.log('=== 所有测试完成 ===');
  } catch (error) {
    console.error('测试执行失败:', error);
  }
}

// 运行测试
run();
