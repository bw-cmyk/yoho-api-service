import * as jwt from 'jsonwebtoken';

const endpoint = 'http://localhost:3001';

// ==================== 管理员认证配置 ====================

const adminUserId = 'admin-user-id'; // 替换为实际的管理员用户ID
const adminJwtSecret = 'Hfdr3-easdfer3-dsfsdfewew-43rjknmfdsf='; // 替换为实际的管理员JWT密钥

const adminToken = jwt.sign(
  {
    sub: adminUserId,
    id: adminUserId,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 60 * 60,
  },
  adminJwtSecret,
);

const adminAuthHeader = {
  Authorization: `Bearer ${adminToken}`,
  'Content-Type': 'application/json',
};

console.log('=== Admin 抽奖管理 API 测试 ===\n');
console.log('管理员 Token:', adminToken);
console.log('\n');

// ==================== 轮次管理 ====================

/**
 * 获取商品的抽奖轮次列表
 */
async function getRounds(productId: number, page = 1, limit = 10) {
  console.log(`--- 获取轮次列表 (productId: ${productId}) ---\n`);

  try {
    const url = `${endpoint}/api/v1/admin/draws/rounds?productId=${productId}&page=${page}&limit=${limit}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: adminAuthHeader,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('获取轮次列表失败:', response.status, errorText);
      return null;
    }

    const data = await response.json();
    console.log('轮次列表:', JSON.stringify(data, null, 2));
    console.log('\n');

    return data;
  } catch (error) {
    console.error('获取轮次列表失败:', error);
    return null;
  }
}

/**
 * 获取轮次详情
 */
async function getRoundDetail(id: number) {
  console.log(`--- 获取轮次详情 (id: ${id}) ---\n`);

  try {
    const response = await fetch(
      `${endpoint}/api/v1/admin/draws/rounds/${id}`,
      {
        method: 'GET',
        headers: adminAuthHeader,
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('获取轮次详情失败:', response.status, errorText);
      return null;
    }

    const data = await response.json();
    console.log('轮次详情:', JSON.stringify(data, null, 2));
    console.log('\n');

    return data;
  } catch (error) {
    console.error('获取轮次详情失败:', error);
    return null;
  }
}

/**
 * 手动开奖
 */
async function processDraw(roundId: number) {
  console.log(`--- 手动开奖 (roundId: ${roundId}) ---\n`);

  try {
    const response = await fetch(
      `${endpoint}/api/v1/admin/draws/rounds/${roundId}/process`,
      {
        method: 'POST',
        headers: adminAuthHeader,
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('手动开奖失败:', response.status, errorText);
      return null;
    }

    const data = await response.json();
    console.log('开奖结果:', JSON.stringify(data, null, 2));
    console.log('\n');

    return data;
  } catch (error) {
    console.error('手动开奖失败:', error);
    return null;
  }
}

/**
 * 创建新轮次
 */
async function createRound(productId: number) {
  console.log(`--- 创建新轮次 (productId: ${productId}) ---\n`);

  try {
    const response = await fetch(
      `${endpoint}/api/v1/admin/draws/products/${productId}/create-round`,
      {
        method: 'POST',
        headers: adminAuthHeader,
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('创建轮次失败:', response.status, errorText);
      return null;
    }

    const data = await response.json();
    console.log('新轮次:', JSON.stringify(data, null, 2));
    console.log('\n');

    return data;
  } catch (error) {
    console.error('创建轮次失败:', error);
    return null;
  }
}

// ==================== 实物奖品订单管理 ====================

/**
 * 获取实物奖品订单统计
 */
async function getPrizeOrderStats() {
  console.log('--- 获取实物奖品订单统计 ---\n');

  try {
    const response = await fetch(
      `${endpoint}/api/v1/admin/draws/prize-orders/stats`,
      {
        method: 'GET',
        headers: adminAuthHeader,
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('获取统计失败:', response.status, errorText);
      return null;
    }

    const data = await response.json();
    console.log('实物奖品订单统计:', JSON.stringify(data, null, 2));
    console.log('\n');

    return data;
  } catch (error) {
    console.error('获取统计失败:', error);
    return null;
  }
}

/**
 * 获取实物奖品订单列表
 */
async function getPrizeOrders(query?: {
  status?: string;
  keyword?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}) {
  console.log('--- 获取实物奖品订单列表 ---\n');

  try {
    const params = new URLSearchParams();
    if (query?.status) params.append('status', query.status);
    if (query?.keyword) params.append('keyword', query.keyword);
    if (query?.startDate) params.append('startDate', query.startDate);
    if (query?.endDate) params.append('endDate', query.endDate);
    if (query?.page) params.append('page', String(query.page));
    if (query?.limit) params.append('limit', String(query.limit));

    const url = `${endpoint}/api/v1/admin/draws/prize-orders?${params.toString()}`;
    console.log('请求 URL:', url);

    const response = await fetch(url, {
      method: 'GET',
      headers: adminAuthHeader,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('获取订单列表失败:', response.status, errorText);
      return null;
    }

    const data = await response.json();
    console.log('订单列表:', JSON.stringify(data, null, 2));
    console.log('\n');

    return data;
  } catch (error) {
    console.error('获取订单列表失败:', error);
    return null;
  }
}

/**
 * 获取实物奖品订单详情
 */
async function getPrizeOrderDetail(drawResultId: number) {
  console.log(`--- 获取实物奖品订单详情 (drawResultId: ${drawResultId}) ---\n`);

  try {
    const response = await fetch(
      `${endpoint}/api/v1/admin/draws/prize-orders/${drawResultId}`,
      {
        method: 'GET',
        headers: adminAuthHeader,
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('获取订单详情失败:', response.status, errorText);
      return null;
    }

    const data = await response.json();
    console.log('订单详情:', JSON.stringify(data, null, 2));
    console.log('\n');

    return data;
  } catch (error) {
    console.error('获取订单详情失败:', error);
    return null;
  }
}

/**
 * 发货
 */
async function shipPrizeOrder(
  drawResultId: number,
  logisticsCompany: string,
  trackingNumber: string,
) {
  console.log(
    `--- 发货 (drawResultId: ${drawResultId}, ${logisticsCompany} ${trackingNumber}) ---\n`,
  );

  try {
    const response = await fetch(
      `${endpoint}/api/v1/admin/draws/prize-orders/${drawResultId}/ship`,
      {
        method: 'POST',
        headers: adminAuthHeader,
        body: JSON.stringify({ logisticsCompany, trackingNumber }),
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('发货失败:', response.status, errorText);
      return null;
    }

    const data = await response.json();
    console.log('发货成功:', JSON.stringify(data, null, 2));
    console.log('\n');

    return data;
  } catch (error) {
    console.error('发货失败:', error);
    return null;
  }
}

/**
 * 确认签收
 */
async function confirmPrizeDelivery(drawResultId: number) {
  console.log(`--- 确认签收 (drawResultId: ${drawResultId}) ---\n`);

  try {
    const response = await fetch(
      `${endpoint}/api/v1/admin/draws/prize-orders/${drawResultId}/confirm-delivery`,
      {
        method: 'POST',
        headers: adminAuthHeader,
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('确认签收失败:', response.status, errorText);
      return null;
    }

    const data = await response.json();
    console.log('确认签收成功:', JSON.stringify(data, null, 2));
    console.log('\n');

    return data;
  } catch (error) {
    console.error('确认签收失败:', error);
    return null;
  }
}

/**
 * 批量发货
 */
async function batchShipPrizeOrders(
  orders: Array<{
    drawResultId: number;
    logisticsCompany: string;
    trackingNumber: string;
  }>,
) {
  console.log(`--- 批量发货 (${orders.length} 个订单) ---\n`);
  console.log('批量发货数据:', JSON.stringify(orders, null, 2));

  try {
    const response = await fetch(
      `${endpoint}/api/v1/admin/draws/prize-orders/batch-ship`,
      {
        method: 'POST',
        headers: adminAuthHeader,
        body: JSON.stringify({ orders }),
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('批量发货失败:', response.status, errorText);
      return null;
    }

    const data = await response.json();
    console.log('批量发货结果:', JSON.stringify(data, null, 2));
    console.log('\n');

    return data;
  } catch (error) {
    console.error('批量发货失败:', error);
    return null;
  }
}

// ==================== 保底中奖配置 ====================

/**
 * 获取保底中奖全局配置
 */
async function getGuaranteedWinConfig() {
  console.log('--- 获取保底中奖全局配置 ---\n');

  try {
    const response = await fetch(
      `${endpoint}/api/v1/admin/draws/guaranteed-win-config`,
      {
        method: 'GET',
        headers: adminAuthHeader,
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('获取保底配置失败:', response.status, errorText);
      return null;
    }

    const data = await response.json();
    console.log('保底中奖配置:', JSON.stringify(data, null, 2));
    console.log('\n');

    return data;
  } catch (error) {
    console.error('获取保底配置失败:', error);
    return null;
  }
}

/**
 * 更新保底中奖全局配置
 */
async function updateGuaranteedWinConfig(
  enabled: boolean,
  onNthParticipation: number,
) {
  console.log(
    `--- 更新保底中奖配置 (enabled: ${enabled}, onNthParticipation: ${onNthParticipation}) ---\n`,
  );

  try {
    const response = await fetch(
      `${endpoint}/api/v1/admin/draws/guaranteed-win-config`,
      {
        method: 'PATCH',
        headers: adminAuthHeader,
        body: JSON.stringify({ enabled, onNthParticipation }),
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('更新保底配置失败:', response.status, errorText);
      return null;
    }

    const data = await response.json();
    console.log('更新结果:', JSON.stringify(data, null, 2));
    console.log('\n');

    return data;
  } catch (error) {
    console.error('更新保底配置失败:', error);
    return null;
  }
}

// ==================== 完整流程测试 ====================

/**
 * 测试轮次管理流程
 */
async function testRoundsManagement() {
  console.log('=== 测试轮次管理流程 ===\n');

  const productId = 1; // 替换为实际商品ID

  try {
    // 1. 获取轮次列表
    const roundsData = await getRounds(productId);
    if (!roundsData || roundsData.data.length === 0) {
      console.log('没有轮次，尝试创建...\n');
      await createRound(productId);
      return;
    }

    console.log(`共 ${roundsData.total} 个轮次，当前页 ${roundsData.data.length} 条\n`);

    // 2. 获取第一个轮次的详情
    const firstRound = roundsData.data[0];
    await getRoundDetail(firstRound.id);

    // 3. 如果有已满员（COMPLETED）的轮次，尝试手动开奖
    const completedRound = roundsData.data.find(
      (r) => r.status === 'COMPLETED',
    );
    if (completedRound) {
      console.log(`发现已满员轮次 ID: ${completedRound.id}，尝试手动开奖...\n`);
      // 注释掉避免误操作
      // await processDraw(completedRound.id);
    }

    console.log('=== 轮次管理流程测试完成 ===\n');
  } catch (error) {
    console.error('轮次管理流程测试失败:', error);
  }
}

/**
 * 测试实物奖品订单管理流程
 */
async function testPrizeOrderManagement() {
  console.log('=== 测试实物奖品订单管理流程 ===\n');

  try {
    // 1. 获取统计数据
    const stats = await getPrizeOrderStats();
    if (stats) {
      console.log('当前订单统计:', {
        待提交地址: stats.pendingAddress,
        待发货: stats.pendingShipment,
        已发货: stats.shipped,
        已签收: stats.delivered,
        总计: stats.total,
      });
      console.log('\n');
    }

    // 2. 获取所有订单列表
    const allOrders = await getPrizeOrders({ page: 1, limit: 10 });
    if (allOrders) {
      console.log(`共 ${allOrders.total} 个订单\n`);
    }

    // 3. 按状态筛选 - 待发货
    const pendingShipmentOrders = await getPrizeOrders({
      status: 'PENDING_SHIPMENT',
      page: 1,
      limit: 5,
    });
    if (pendingShipmentOrders) {
      console.log(`待发货订单: ${pendingShipmentOrders.total} 个\n`);
    }

    // 4. 按状态筛选 - 待提交地址
    const pendingAddressOrders = await getPrizeOrders({
      status: 'PENDING_ADDRESS',
      page: 1,
      limit: 5,
    });
    if (pendingAddressOrders) {
      console.log(`待提交地址订单: ${pendingAddressOrders.total} 个\n`);
    }

    // 5. 关键词搜索
    await getPrizeOrders({ keyword: 'DHL', page: 1, limit: 5 });

    // 6. 日期范围筛选
    await getPrizeOrders({
      startDate: '2025-01-01',
      endDate: '2025-12-31',
      page: 1,
      limit: 5,
    });

    // 7. 如果有待发货订单，获取第一个的详情
    if (
      pendingShipmentOrders &&
      pendingShipmentOrders.data &&
      pendingShipmentOrders.data.length > 0
    ) {
      const firstOrder = pendingShipmentOrders.data[0];
      console.log(
        `获取待发货订单详情 (drawResultId: ${firstOrder.drawResultId})...\n`,
      );
      await getPrizeOrderDetail(firstOrder.drawResultId);

      // 8. 发货操作（注释掉避免误操作）
      // console.log('执行发货操作...\n');
      // await shipPrizeOrder(firstOrder.drawResultId, 'DHL Express', 'DHL1234567890');
    }

    console.log('=== 实物奖品订单管理流程测试完成 ===\n');
  } catch (error) {
    console.error('实物奖品订单管理流程测试失败:', error);
  }
}

/**
 * 测试保底中奖配置管理
 */
async function testGuaranteedWinConfig() {
  console.log('=== 测试保底中奖配置管理 ===\n');

  try {
    // 1. 获取当前配置
    const currentConfig = await getGuaranteedWinConfig();
    if (currentConfig) {
      console.log('当前保底配置:', {
        enabled: currentConfig.enabled,
        onNthParticipation: currentConfig.onNthParticipation,
      });
      console.log('\n');
    }

    // 2. 更新配置：开启保底，第10次参与触发
    const updateResult = await updateGuaranteedWinConfig(true, 10);
    if (updateResult && updateResult.success) {
      console.log('配置更新成功\n');
    }

    // 3. 验证配置已更新
    const updatedConfig = await getGuaranteedWinConfig();
    if (updatedConfig) {
      console.log('更新后配置:', {
        enabled: updatedConfig.enabled,
        onNthParticipation: updatedConfig.onNthParticipation,
      });
      console.log('\n');
    }

    // 4. 测试关闭保底功能
    // await updateGuaranteedWinConfig(false, 10);

    // 5. 验证参数校验（onNthParticipation 必须 >= 1）
    console.log('--- 测试参数校验 ---\n');
    const invalidResult = await updateGuaranteedWinConfig(true, 0);
    if (!invalidResult) {
      console.log('参数校验正常：onNthParticipation=0 被拒绝\n');
    }

    console.log('=== 保底中奖配置管理测试完成 ===\n');
  } catch (error) {
    console.error('保底中奖配置管理测试失败:', error);
  }
}

/**
 * 测试批量发货流程
 */
async function testBatchShipping() {
  console.log('=== 测试批量发货流程 ===\n');

  try {
    // 获取待发货订单
    const pendingOrders = await getPrizeOrders({
      status: 'PENDING_SHIPMENT',
      page: 1,
      limit: 3,
    });

    if (!pendingOrders || pendingOrders.data.length === 0) {
      console.log('没有待发货的订单，跳过批量发货测试\n');
      return;
    }

    const batchData = pendingOrders.data.map((order, index) => ({
      drawResultId: order.drawResultId,
      logisticsCompany: 'DHL Express',
      trackingNumber: `DHL${Date.now()}${index}`,
    }));

    console.log('准备批量发货订单数:', batchData.length);
    console.log('批量发货数据:', JSON.stringify(batchData, null, 2));
    console.log('\n');

    // 注释掉实际批量发货操作，避免误操作
    // const batchResult = await batchShipPrizeOrders(batchData);
    // if (batchResult) {
    //   console.log('批量发货结果:', {
    //     成功: batchResult.success,
    //     失败: batchResult.failed,
    //     错误详情: batchResult.errors,
    //   });
    // }

    console.log('=== 批量发货流程测试完成 ===\n');
  } catch (error) {
    console.error('批量发货流程测试失败:', error);
  }
}

/**
 * 主测试函数
 */
async function run() {
  try {
    console.log('开始执行管理员抽奖测试...\n');

    // 1. 测试保底中奖配置
    await testGuaranteedWinConfig();

    // 2. 测试轮次管理
    // await testRoundsManagement();

    // 3. 测试实物奖品订单管理
    // await testPrizeOrderManagement();

    // 4. 测试批量发货
    // await testBatchShipping();

    console.log('=== 所有测试完成 ===');
  } catch (error) {
    console.error('测试执行失败:', error);
  }
}

// 运行测试
run();
