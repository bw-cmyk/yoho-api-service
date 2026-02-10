import * as jwt from 'jsonwebtoken';

const endpoint = 'http://localhost:3001';

// ==================== 用户认证配置 ====================

// 普通用户 JWT Token（用于测试用户接口）
const userId = '358801635322889216'; // 替换为实际的用户ID
const jwtSecret = 'P-w8Iewr3efdfd8r-dsdsrew4556y6vwq='; // 替换为实际的JWT密钥

const userToken = jwt.sign(
  {
    sub: userId,
    id: userId,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 60 * 60, // 1小时有效期
  },
  jwtSecret,
);

const userAuthHeader = {
  Authorization: `Bearer ${userToken}`,
  'Content-Type': 'application/json',
};

// 管理员 JWT Token（用于测试管理员接口）
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

console.log('=== 一元购实物奖品发货系统测试 (Order-based) ===\n');
console.log('用户 Token:', userToken);
console.log('管理员 Token:', adminToken);
console.log('\n');

// ==================== 用户接口测试 ====================

/**
 * 获取我的待领取实物奖品
 */
async function getMyPendingPhysicalPrizes() {
  console.log('--- 获取我的待领取实物奖品 ---\n');

  try {
    const response = await fetch(
      `${endpoint}/api/v1/ecommerce/draws/participations/me?page=1&limit=30`,
      {
        method: 'GET',
        headers: userAuthHeader,
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('获取待领取奖品失败:', response.status, errorText);
      return null;
    }

    const data = await response.json();
    // console.log('待领取实物奖品列表:', JSON.stringify(data, null, 2));
    console.log('\n');

    return data.items;
  } catch (error) {
    console.error('获取待领取奖品失败:', error);
    return null;
  }
}

/**
 * 提交收货地址并创建订单（领取实物奖品）
 */
async function claimPhysicalPrize(
  drawResultId: number,
  shippingAddressId: number,
) {
  console.log(
    `--- 提交收货地址并创建订单 (drawResultId: ${drawResultId}, addressId: ${shippingAddressId}) ---\n`,
  );

  try {
    const requestData = {
      shippingAddressId,
    };

    console.log('请求数据:', JSON.stringify(requestData, null, 2));
    console.log('\n');

    const response = await fetch(
      `${endpoint}/api/v1/ecommerce/draws/prizes/physical/${drawResultId}/claim`,
      {
        method: 'POST',
        headers: userAuthHeader,
        body: JSON.stringify(requestData),
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('领取奖品失败:', response.status, errorText);
      return null;
    }

    const data = await response.json();
    console.log('领取奖品成功:', JSON.stringify(data, null, 2));
    console.log('\n');

    return data;
  } catch (error) {
    console.error('领取奖品失败:', error);
    return null;
  }
}

/**
 * 获取实物奖品订单详情（用户侧）
 */
async function getPhysicalPrizeOrder(drawResultId: number) {
  console.log(`--- 获取实物奖品订单详情 (drawResultId: ${drawResultId}) ---\n`);

  try {
    const response = await fetch(
      `${endpoint}/api/v1/ecommerce/draws/prizes/physical/${drawResultId}/order`,
      {
        method: 'GET',
        headers: userAuthHeader,
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

// ==================== 管理员接口测试 ====================

/**
 * 获取实物奖品订单统计
 */
async function getPrizeOrderStats() {
  console.log('--- 获取实物奖品订单统计 ---\n');

  try {
    const response = await fetch(
      `${endpoint}/api/v1/admin/draws/prizes/stats`,
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
 * 获取实物奖品订单列表（管理员）
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
    params.append('page', String(query?.page || 1));
    params.append('limit', String(query?.limit || 20));

    const url = `${endpoint}/api/v1/admin/draws/prizes/orders?${params.toString()}`;
    console.log('请求 URL:', url);
    console.log('\n');

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
 * 获取实物奖品订单详情（管理员）
 */
async function getPrizeOrderDetail(drawResultId: number) {
  console.log(
    `--- 获取实物奖品订单详情（管理员）(drawResultId: ${drawResultId}) ---\n`,
  );

  try {
    const response = await fetch(
      `${endpoint}/api/v1/admin/draws/prizes/orders/${drawResultId}`,
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
    console.log('订单详情（管理员视图）:', JSON.stringify(data, null, 2));
    console.log('\n');

    return data;
  } catch (error) {
    console.error('获取订单详情失败:', error);
    return null;
  }
}

/**
 * 发货操作
 */
async function shipPrizeOrder(
  drawResultId: number,
  logisticsCompany: string,
  trackingNumber: string,
) {
  console.log(
    `--- 发货操作 (drawResultId: ${drawResultId}, ${logisticsCompany} ${trackingNumber}) ---\n`,
  );

  try {
    const requestData = {
      logisticsCompany,
      trackingNumber,
    };

    console.log('请求数据:', JSON.stringify(requestData, null, 2));
    console.log('\n');

    const response = await fetch(
      `${endpoint}/api/v1/admin/draws/prizes/orders/${drawResultId}/ship`,
      {
        method: 'POST',
        headers: adminAuthHeader,
        body: JSON.stringify(requestData),
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
      `${endpoint}/api/v1/admin/draws/prizes/orders/${drawResultId}/confirm-delivery`,
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
 * 批量发货测试
 */
async function batchShipPrizeOrders(
  orders: Array<{
    drawResultId: number;
    logisticsCompany: string;
    trackingNumber: string;
  }>,
) {
  console.log('--- 批量发货测试 ---\n');

  try {
    const requestData = { orders };

    console.log('请求数据:', JSON.stringify(requestData, null, 2));
    console.log('\n');

    const response = await fetch(
      `${endpoint}/api/v1/admin/draws/prizes/orders/batch-ship`,
      {
        method: 'POST',
        headers: adminAuthHeader,
        body: JSON.stringify(requestData),
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

// ==================== 完整流程测试 ====================

/**
 * 测试用户领取实物奖品完整流程
 */
async function testUserClaimPrizeFlow() {
  console.log('=== 测试用户领取实物奖品完整流程 ===\n');

  try {
    // 1. 获取待领取的实物奖品
    const prizes = await getMyPendingPhysicalPrizes();
    if (!prizes || prizes.length === 0) {
      console.log('没有待领取的实物奖品');
      return;
    }

    console.log(prizes);

    // const firstPrize = prizes[0];
    // console.log('第一个待领取奖品:', {
    //   drawResultId: firstPrize.drawResultId,
    //   // productName: firstPrize.product.name,
    //   winningNumber: firstPrize.winningNumber,
    // });
    // console.log('\n');

    // // 2. 提交收货地址并创建订单（需要先有收货地址，这里使用假的ID演示）
    // const shippingAddressId = 8; // 替换为实际的收货地址ID
    // console.log(
    //   `准备领取奖品，使用收货地址ID: ${shippingAddressId}\n（注意：需要先创建收货地址）\n`,
    // );

    // // 注释掉实际领取操作，避免误操作
    // const claimResult = await claimPhysicalPrize(
    //   firstPrize.drawResultId,
    //   shippingAddressId,
    // );
    // if (!claimResult) {
    //   console.error('领取奖品失败');
    //   return;
    // }

    // console.log('订单创建成功:', {
    //   orderId: claimResult.order.id,
    //   orderNumber: claimResult.order.orderNumber,
    //   prizeShippingStatus: claimResult.order.prizeShippingStatus,
    // });
    // console.log('\n');

    // // 3. 获取订单详情
    // const orderDetail = await getPhysicalPrizeOrder(firstPrize.drawResultId);
    // if (orderDetail) {
    //   console.log('订单详情获取成功');
    //   console.log('物流时间线节点数:', orderDetail.timeline.length);
    // }

    // console.log('=== 用户领取实物奖品完整流程测试完成 ===\n');
  } catch (error) {
    console.error('用户领取流程测试失败:', error);
  }
}

/**
 * 测试管理员发货完整流程
 */
async function testAdminShippingFlow() {
  console.log('=== 测试管理员发货完整流程 ===\n');

  try {
    // 1. 获取实物奖品订单统计
    const stats = await getPrizeOrderStats();
    if (stats) {
      console.log('订单统计:', {
        pendingAddress: stats.pendingAddress,
        pendingShipment: stats.pendingShipment,
        shipped: stats.shipped,
        delivered: stats.delivered,
        total: stats.total,
      });
      console.log('\n');
    }

    // 2. 获取待发货订单列表
    const pendingOrders = await getPrizeOrders({
      status: 'PENDING_SHIPMENT',
      page: 1,
      limit: 10,
    });

    if (!pendingOrders || pendingOrders.data.length === 0) {
      console.log('没有待发货的订单');
      return;
    }

    const firstOrder = pendingOrders.data[0];
    console.log('第一个待发货订单:', {
      drawResultId: firstOrder.drawResultId,
      productName: firstOrder.product.name,
      winnerName: firstOrder.winner.userName,
      shippingAddress: firstOrder.shippingAddress?.fullAddress,
    });
    console.log('\n');

    // 3. 获取订单详情
    const orderDetail = await getPrizeOrderDetail(firstOrder.drawResultId);
    if (orderDetail) {
      console.log('订单详情获取成功');
      console.log('当前状态:', orderDetail.prizeShippingStatus);
    }

    // 4. 执行发货操作（注释掉避免误操作）
    // const shipResult = await shipPrizeOrder(
    //   firstOrder.drawResultId,
    //   'DHL Express',
    //   'DHL1234567890',
    // );
    // if (!shipResult) {
    //   console.error('发货失败');
    //   return;
    // }

    // console.log('发货成功:', {
    //   orderId: shipResult.orderId,
    //   prizeShippingStatus: shipResult.prizeShippingStatus,
    // });
    // console.log('\n');

    // 5. 再次获取订单详情，查看物流信息
    // const updatedDetail = await getPrizeOrderDetail(firstOrder.drawResultId);
    // if (updatedDetail) {
    //   console.log('发货后订单详情:', {
    //     prizeShippingStatus: updatedDetail.prizeShippingStatus,
    //     logisticsCompany: updatedDetail.logistics?.company,
    //     trackingNumber: updatedDetail.logistics?.trackingNumber,
    //   });
    // }

    // 6. 确认签收（需要等待实际签收后再操作）
    // await new Promise((resolve) => setTimeout(resolve, 2000));
    // const deliveryResult = await confirmPrizeDelivery(firstOrder.drawResultId);
    // if (deliveryResult) {
    //   console.log('签收确认成功:', {
    //     prizeShippingStatus: deliveryResult.prizeShippingStatus,
    //     prizeStatus: deliveryResult.prizeStatus,
    //     deliveredAt: deliveryResult.deliveredAt,
    //   });
    // }

    console.log('=== 管理员发货完整流程测试完成 ===\n');
  } catch (error) {
    console.error('管理员发货流程测试失败:', error);
  }
}

/**
 * 测试订单筛选功能
 */
async function testOrderFiltering() {
  console.log('=== 测试订单筛选功能 ===\n');

  try {
    // 测试不同状态的订单查询
    const statuses = [
      'PENDING_ADDRESS',
      'PENDING_SHIPMENT',
      'SHIPPED',
      'DELIVERED',
    ];

    for (const status of statuses) {
      console.log(`--- 查询状态为 ${status} 的订单 ---\n`);
      const orders = await getPrizeOrders({
        status,
        page: 1,
        limit: 5,
      });

      if (orders) {
        console.log(`${status} 订单数量:`, orders.data.length);
        console.log('\n');
      }

      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    // 测试关键词搜索
    console.log('--- 测试关键词搜索 ---\n');
    const searchResult = await getPrizeOrders({
      keyword: 'DHL',
      page: 1,
      limit: 10,
    });

    if (searchResult) {
      console.log('搜索结果数量:', searchResult.data.length);
    }

    console.log('\n=== 订单筛选功能测试完成 ===\n');
  } catch (error) {
    console.error('订单筛选测试失败:', error);
  }
}

/**
 * 测试批量发货
 */
async function testBatchShipping() {
  console.log('=== 测试批量发货 ===\n');

  try {
    // 获取待发货订单
    const pendingOrders = await getPrizeOrders({
      status: 'PENDING_SHIPMENT',
      page: 1,
      limit: 3,
    });

    if (!pendingOrders || pendingOrders.data.length === 0) {
      console.log('没有待发货的订单');
      return;
    }

    // 构造批量发货数据（注释掉避免误操作）
    const batchData = pendingOrders.data.map((order, index) => ({
      drawResultId: order.drawResultId,
      logisticsCompany: 'DHL Express',
      trackingNumber: `DHL${Date.now()}${index}`,
    }));

    console.log('准备批量发货订单数:', batchData.length);
    console.log('批量发货数据:', JSON.stringify(batchData, null, 2));
    console.log('\n');

    // 注释掉实际批量发货操作
    // const batchResult = await batchShipPrizeOrders(batchData);
    // if (batchResult) {
    //   console.log('批量发货结果:', {
    //     success: batchResult.success,
    //     failed: batchResult.failed,
    //     errors: batchResult.errors,
    //   });
    // }

    console.log('=== 批量发货测试完成 ===\n');
  } catch (error) {
    console.error('批量发货测试失败:', error);
  }
}

/**
 * 主测试函数
 */
async function run() {
  try {
    console.log('开始执行测试...\n');

    // 测试选项（取消注释以运行相应的测试）

    // 1. 测试用户领取实物奖品完整流程
    await testUserClaimPrizeFlow();

    // 2. 测试管理员发货完整流程
    // await testAdminShippingFlow();

    // 3. 测试订单筛选功能
    // await testOrderFiltering();

    // 4. 测试批量发货
    // await testBatchShipping();

    console.log('=== 所有测试完成 ===');
  } catch (error) {
    console.error('测试执行失败:', error);
  }
}

// 运行测试
run();
