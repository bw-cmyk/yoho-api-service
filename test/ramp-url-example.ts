import { AlchemyPayment } from '../src/api-modules/pay/onramp/alchemy/AlchemyPayment';

/**
 * Ramp URL 生成示例
 * 演示如何生成带有签名的 Alchemy Pay Ramp 页面 URL
 */

async function generateRampUrl() {
  // 创建 AlchemyPayment 实例
  const alchemyPayment = new AlchemyPayment({
    appId: 'f83Is2y7L425rxl8',
    secretKey: '5Zp9SmtLWQ4Fh2a1',
    baseUrl: 'https://openapi-test.alchemypay.org',
  });

  try {
    console.log('=== 生成 Ramp URL 示例 ===\n');

    // 示例 1: 基本用法
    const basicPayType = await alchemyPayment.getPayType({
      crypto: 'USDT',
      network: 'TRX',
      currency: 'USD',
      amount: 100,
      payMethod: 'CREDIT_CARD' as any,
      uid: 'user123',
    });

    console.log('基本用法:');
    console.log('Type:', basicPayType.type);
    console.log('URL:', basicPayType.url);
    console.log('');

    // 示例 2: 包含商户订单号
    const orderNo = `ORDER_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const advancedPayType = await alchemyPayment.getPayType({
      crypto: 'USDT',
      network: 'TRX',
      currency: 'USD',
      amount: 200,
      payMethod: 'CREDIT_CARD' as any,
      uid: 'user456',
      merchantOrderNo: orderNo,
    });

    console.log('包含商户订单号:');
    console.log('Type:', advancedPayType.type);
    console.log('URL:', advancedPayType.url);
    console.log('');

    // 示例 3: 不同网络和货币
    const ethPayType = await alchemyPayment.getPayType({
      crypto: 'USDT',
      network: 'ETH',
      currency: 'EUR',
      amount: 150,
      payMethod: 'CREDIT_CARD' as any,
      uid: 'user789',
      merchantOrderNo: `ETH_ORDER_${Date.now()}`,
    });

    console.log('ETH 网络 + EUR 货币:');
    console.log('Type:', ethPayType.type);
    console.log('URL:', ethPayType.url);
    console.log('');

    // 解析 URL 参数以验证签名
    console.log('=== URL 参数解析 ===');
    const url = new URL(advancedPayType.url);
    const params = Object.fromEntries(url.searchParams.entries());
    
    console.log('URL 参数:');
    Object.keys(params)
      .sort()
      .forEach((key) => {
        console.log(`  ${key}: ${params[key]}`);
      });

    console.log('\n=== 使用说明 ===');
    console.log('1. 生成的 URL 可以直接用于重定向到 Alchemy Pay 支付页面');
    console.log('2. URL 包含完整的签名验证，确保安全性');
    console.log('3. 建议提供唯一的 merchantOrderNo 以便订单跟踪');
    console.log('4. 支持多种加密货币网络和法币');

  } catch (error) {
    console.error('生成 Ramp URL 失败:', error);
  }
}

// 如果直接运行此文件，则执行示例
if (require.main === module) {
  generateRampUrl().catch(console.error);
}

export { generateRampUrl };

