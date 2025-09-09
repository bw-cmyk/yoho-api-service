import { AlchemyPayment } from '../src/api-modules/pay/onramp/alchemy/AlchemyPayment';

// 创建 AlchemyPayment 实例
const alchemyPayment = new AlchemyPayment({
  appId: 'f83Is2y7L425rxl8',
  secretKey: '5Zp9SmtLWQ4Fh2a1',
  baseUrl: 'https://openapi-test.alchemypay.org',
});

// 测试 Fiat Query 方法
async function testFiatQuery() {
  try {
    console.log('=== Testing Fiat Query ===');

    // 查询 Onramp (BUY) 支持的法币
    const onrampFiatList = await alchemyPayment.getFiatList({ type: 'BUY' });
    console.log('Onramp Fiat List:', JSON.stringify(onrampFiatList, null, 2));

    // 查询 Offramp (SELL) 支持的法币
    const offrampFiatList = await alchemyPayment.getFiatList({ type: 'SELL' });
    console.log('Offramp Fiat List:', JSON.stringify(offrampFiatList, null, 2));

    // 使用默认类型 (BUY)
    const defaultFiatList = await alchemyPayment.getFiatList();
    console.log('Default Fiat List:', JSON.stringify(defaultFiatList, null, 2));
  } catch (error) {
    console.error('Fiat Query test failed:', error);
  }
}

// 测试 Payment Method Query 方法
async function testPaymentMethodQuery() {
  try {
    console.log('\n=== Testing Payment Method Query ===');

    const paymentMethods = await alchemyPayment.queryCryptoFiatMethod({
      fiat: 'USD',
      crypto: 'USDT',
      network: 'TRX',
      side: 'BUY',
    });

    console.log('Payment Methods:', JSON.stringify(paymentMethods, null, 2));
  } catch (error) {
    console.error('Payment Method Query test failed:', error);
  }
}

// 测试获取支付方式
async function testGetPaymentMethods() {
  try {
    console.log('\n=== Testing Get Payment Methods ===');

    const methods = await alchemyPayment.getPaymentMethods(
      'USD',
      'USDT',
      'TRX',
    );
    console.log('Payment Methods for USD:', methods);
  } catch (error) {
    console.error('Get Payment Methods test failed:', error);
  }
}

// 测试 Estimate Price
async function testEstimatePrice() {
  try {
    console.log('\n=== Testing Estimate Price ===');

    const estimatePrice = await alchemyPayment.estimatePrice({
      crypto: 'USDT',
      network: 'TRX',
      currency: 'USD',
      amount: 100,
      payMethod: 'CREDIT_CARD' as any, // 添加必需的 payMethod 参数
    });

    console.log('Estimate Price:', JSON.stringify(estimatePrice, null, 2));
  } catch (error) {
    console.error('Estimate Price test failed:', error);
  }
}

// 测试 Get Pay Type (Ramp URL)
async function testGetPayType() {
  try {
    console.log('\n=== Testing Get Pay Type ===');

    const payType = await alchemyPayment.getPayType({
      crypto: 'USDT',
      network: 'TRX',
      currency: 'USD',
      amount: 100,
      payMethod: 'CREDIT_CARD' as any,
      uid: 'user123',
      merchantOrderNo: 'ORDER_' + Date.now(), // 生成唯一的订单号
    });

    console.log('Pay Type:', JSON.stringify(payType, null, 2));
    console.log('Generated URL:', payType.url);
  } catch (error) {
    console.error('Get Pay Type test failed:', error);
  }
}

// 运行所有测试
async function runAllTests() {
  console.log('Starting AlchemyPayment tests...\n');

  await testFiatQuery();
  await testPaymentMethodQuery();
  await testGetPaymentMethods();
  await testEstimatePrice();
  await testGetPayType();

  console.log('\nAll tests completed!');
}

// 如果直接运行此文件，则执行测试
if (require.main === module) {
  runAllTests().catch(console.error);
}

export {
  testFiatQuery,
  testPaymentMethodQuery,
  testGetPaymentMethods,
  testEstimatePrice,
  testGetPayType,
};
