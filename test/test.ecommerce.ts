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

console.log('=== 电商模块 API 测试 ===\n');
console.log('Token:', token);
console.log('Auth Header:', authHeader);
console.log('\n');

/**
 * 商品相关 API 测试
 */
async function testProductAPIs() {
  console.log('--- 商品 API 测试 ---\n');

  try {
    // 1. 获取首页商品
    console.log('1. 获取首页商品...');
    const homepageResponse = await fetch(
      `${endpoint}/api/v1/ecommerce/products/homepage`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      },
    );
    const homepageData = await homepageResponse.json();
    console.log('首页商品:', JSON.stringify(homepageData, null, 2));
    console.log('\n');

    // 2. 查询商品列表
    console.log('2. 查询商品列表...');
    const productsResponse = await fetch(
      `${endpoint}/api/v1/ecommerce/products?type=INSTANT_BUY&status=ACTIVE&page=1&limit=10`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      },
    );
    const productsData = await productsResponse.json();
    console.log('商品列表:', JSON.stringify(productsData, null, 2));
    console.log('\n');

    // 3. 获取商品详情（如果有商品）
    if (productsData.items && productsData.items.length > 0) {
      const productId = productsData.items[0].id;
      console.log(`3. 获取商品详情 (ID: ${productId})...`);
      const productDetailResponse = await fetch(
        `${endpoint}/api/v1/ecommerce/products/${productId}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        },
      );
      const productDetailData = await productDetailResponse.json();
      console.log('商品详情:', JSON.stringify(productDetailData, null, 2));
      console.log('\n');

      return productId; // 返回商品ID供后续测试使用
    }

    return null;
  } catch (error) {
    console.error('商品 API 测试失败:', error);
    return null;
  }
}

/**
 * 收货地址相关 API 测试
 */
async function testShippingAddressAPIs() {
  console.log('--- 收货地址 API 测试 ---\n');

  try {
    // 1. 创建收货地址
    console.log('1. 创建收货地址...');
    const createAddressData = {
      recipientName: 'John Doe',
      phoneNumber: '+1234567890',
      country: 'United States',
      state: 'California',
      city: 'San Francisco',
      streetAddress: '123 Main St',
      apartment: 'Apt 4B',
      zipCode: '94102',
      isDefault: true,
    };

    const createAddressResponse = await fetch(
      `${endpoint}/api/v1/ecommerce/shipping-addresses`,
      {
        method: 'POST',
        headers: authHeader,
        body: JSON.stringify(createAddressData),
      },
    );
    const createdAddress = await createAddressResponse.json();
    console.log('创建的地址:', JSON.stringify(createdAddress, null, 2));
    console.log('\n');

    const addressId = createdAddress.id;

    // 2. 获取我的收货地址列表
    console.log('2. 获取我的收货地址列表...');
    const addressesResponse = await fetch(
      `${endpoint}/api/v1/ecommerce/shipping-addresses/me`,
      {
        method: 'GET',
        headers: authHeader,
      },
    );
    const addressesData = await addressesResponse.json();
    console.log('地址列表:', JSON.stringify(addressesData, null, 2));
    console.log('\n');

    // 3. 获取默认收货地址
    console.log('3. 获取默认收货地址...');
    const defaultAddressResponse = await fetch(
      `${endpoint}/api/v1/ecommerce/shipping-addresses/default`,
      {
        method: 'GET',
        headers: authHeader,
      },
    );
    const defaultAddressData = await defaultAddressResponse.json();
    console.log('默认地址:', JSON.stringify(defaultAddressData, null, 2));
    console.log('\n');

    // 4. 更新收货地址
    console.log(`4. 更新收货地址 (ID: ${addressId})...`);
    const updateAddressData = {
      recipientName: 'Jane Doe',
      phoneNumber: '+0987654321',
    };

    const updateAddressResponse = await fetch(
      `${endpoint}/api/v1/ecommerce/shipping-addresses/${addressId}`,
      {
        method: 'PUT',
        headers: authHeader,
        body: JSON.stringify(updateAddressData),
      },
    );
    const updatedAddress = await updateAddressResponse.json();
    console.log('更新的地址:', JSON.stringify(updatedAddress, null, 2));
    console.log('\n');

    // 5. 设置默认地址（如果还有其他地址）
    if (addressesData.length > 1) {
      const secondAddressId = addressesData[1].id;
      console.log(`5. 设置默认地址 (ID: ${secondAddressId})...`);
      const setDefaultResponse = await fetch(
        `${endpoint}/api/v1/ecommerce/shipping-addresses/${secondAddressId}/set-default`,
        {
          method: 'POST',
          headers: authHeader,
        },
      );
      const setDefaultData = await setDefaultResponse.json();
      console.log('设置默认地址结果:', JSON.stringify(setDefaultData, null, 2));
      console.log('\n');
    }

    return addressId; // 返回地址ID供后续测试使用
  } catch (error) {
    console.error('收货地址 API 测试失败:', error);
    return null;
  }
}

/**
 * 订单相关 API 测试
 */
async function testOrderAPIs(productId = 1, shippingAddressId = 2) {
  console.log('--- 订单 API 测试 ---\n');

  try {
    // 1. 创建 Instant Buy 订单
    console.log('1. 创建 Instant Buy 订单...');
    const createInstantBuyOrderData = {
      productId: productId,
      quantity: 1,
      specifications: [
        { key: 'Color', value: 'Natural Titanium' },
        { key: 'Storage', value: '256GB' },
      ],
      shippingAddressId: shippingAddressId,
    };

    const createOrderResponse = await fetch(
      `${endpoint}/api/v1/ecommerce/orders/instant-buy`,
      {
        method: 'POST',
        headers: authHeader,
        body: JSON.stringify(createInstantBuyOrderData),
      },
    );

    if (!createOrderResponse.ok) {
      const errorText = await createOrderResponse.text();
      console.error('创建订单失败:', createOrderResponse.status, errorText);
      console.log('\n');
    } else {
      const createdOrder = await createOrderResponse.json();
      console.log('创建的订单:', JSON.stringify(createdOrder, null, 2));
      console.log('\n');

      const orderId = createdOrder.id;

      // 2. 获取我的订单列表
      console.log('2. 获取我的订单列表...');
      const ordersResponse = await fetch(
        `${endpoint}/api/v1/ecommerce/orders/me?type=INSTANT_BUY&page=1&limit=10`,
        {
          method: 'GET',
          headers: authHeader,
        },
      );
      const ordersData = await ordersResponse.json();
      console.log('订单列表:', JSON.stringify(ordersData, null, 2));
      console.log('\n');

      // 3. 获取订单详情
      console.log(`3. 获取订单详情 (ID: ${orderId})...`);
      const orderDetailResponse = await fetch(
        `${endpoint}/api/v1/ecommerce/orders/${orderId}`,
        {
          method: 'GET',
          headers: authHeader,
        },
      );
      const orderDetailData = await orderDetailResponse.json();
      console.log('订单详情:', JSON.stringify(orderDetailData, null, 2));
      console.log('\n');

      // 4. 申请退款（注意：需要订单创建后超过15天才能申请）
      console.log(`4. 申请退款 (ID: ${orderId})...`);
      console.log('注意：订单需要创建后超过15天才能申请退款');
      const refundResponse = await fetch(
        `${endpoint}/api/v1/ecommerce/orders/${orderId}/refund`,
        {
          method: 'POST',
          headers: authHeader,
        },
      );

      if (!refundResponse.ok) {
        const errorText = await refundResponse.text();
        console.log('申请退款失败（可能是订单未超过15天）:', refundResponse.status, errorText);
      } else {
        const refundData = await refundResponse.json();
        console.log('退款结果:', JSON.stringify(refundData, null, 2));
      }
      console.log('\n');
    }

    // 5. 创建 Lucky Draw 订单
    console.log('5. 创建 Lucky Draw 订单...');
    // 首先查找一个 LUCKY_DRAW 类型的商品
    const luckyDrawProductsResponse = await fetch(
      `${endpoint}/api/v1/ecommerce/products?type=LUCKY_DRAW&status=ACTIVE&page=1&limit=1`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      },
    );
    const luckyDrawProductsData = await luckyDrawProductsResponse.json();

    if (luckyDrawProductsData.items && luckyDrawProductsData.items.length > 0) {
      const luckyDrawProductId = luckyDrawProductsData.items[0].id;
      const createLuckyDrawOrderData = {
        productId: luckyDrawProductId,
        spots: 5,
      };

      const createLuckyDrawResponse = await fetch(
        `${endpoint}/api/v1/ecommerce/orders/lucky-draw`,
        {
          method: 'POST',
          headers: authHeader,
          body: JSON.stringify(createLuckyDrawOrderData),
        },
      );

      if (!createLuckyDrawResponse.ok) {
        const errorText = await createLuckyDrawResponse.text();
        console.error('创建抽奖订单失败:', createLuckyDrawResponse.status, errorText);
      } else {
        const luckyDrawOrder = await createLuckyDrawResponse.json();
        console.log('创建的抽奖订单:', JSON.stringify(luckyDrawOrder, null, 2));
      }
    } else {
      console.log('没有找到可用的抽奖商品');
    }
    console.log('\n');
  } catch (error) {
    console.error('订单 API 测试失败:', error);
  }
}

/**
 * 删除测试数据（可选）
 */
async function cleanupTestData(addressId: number) {
  console.log('--- 清理测试数据 ---\n');

  try {
    // 删除测试地址
    console.log(`删除测试地址 (ID: ${addressId})...`);
    const deleteResponse = await fetch(
      `${endpoint}/api/v1/ecommerce/shipping-addresses/${addressId}`,
      {
        method: 'DELETE',
        headers: authHeader,
      },
    );

    if (deleteResponse.ok) {
      const deleteData = await deleteResponse.json();
      console.log('删除结果:', JSON.stringify(deleteData, null, 2));
    } else {
      const errorText = await deleteResponse.text();
      console.log('删除失败:', deleteResponse.status, errorText);
    }
    console.log('\n');
  } catch (error) {
    console.error('清理测试数据失败:', error);
  }
}

/**
 * 主测试函数
 */
async function run() {
  try {
    // 1. 测试商品 API
    // const productId = await testProductAPIs();

    // // 2. 测试收货地址 API
    // const shippingAddressId = await testShippingAddressAPIs();

    // 3. 测试订单 API（需要商品ID和地址ID）
    await testOrderAPIs(1, 3);

    // 4. 清理测试数据（可选，取消注释以启用）
    // if (shippingAddressId) {
    //   await cleanupTestData(shippingAddressId);
    // }

    console.log('=== 测试完成 ===');
  } catch (error) {
    console.error('测试执行失败:', error);
  }
}

// 运行测试
run();

