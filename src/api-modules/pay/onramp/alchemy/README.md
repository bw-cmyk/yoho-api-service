# AlchemyPayment 使用指南

## 概述

`AlchemyPayment` 类提供了与 Alchemy Pay API 交互的完整功能，包括支付创建、状态查询、支付方式查询等。

## 主要特性

- ✅ 通用请求方法，自动处理签名
- ✅ 支持 Payment Method Query
- ✅ 支持 Fiat Query
- ✅ 完整的错误处理
- ✅ TypeScript 类型支持

## 配置

```typescript
import { AlchemyPayment } from './AlchemyPayment';

const alchemyPayment = new AlchemyPayment({
  appId: 'your_app_id_here',
  secretKey: 'your_secret_key_here',
  baseUrl: 'https://openapi-test.alchemypay.org', // 测试环境
  // baseUrl: 'https://openapi.alchemypay.org',   // 生产环境
});
```

## API 方法

### 1. Fiat Query - 查询支持的法币

查询支持的法币货币和对应的支付方式。

```typescript
// 查询 Onramp (BUY) 支持的法币
const onrampFiatList = await alchemyPayment.getFiatList({ type: 'BUY' });

// 查询 Offramp (SELL) 支持的法币
const offrampFiatList = await alchemyPayment.getFiatList({ type: 'SELL' });

// 使用默认类型 (BUY)
const defaultFiatList = await alchemyPayment.getFiatList();
```

**响应示例：**
```json
{
  "success": true,
  "returnCode": "0000",
  "returnMsg": "SUCCESS",
  "extend": "",
  "data": [
    {
      "currency": "USD",
      "country": "US",
      "payWayCode": "10001",
      "payWayName": "Credit Card",
      "fixedFee": 0.300000,
      "feeRate": 0.051000,
      "payMin": 30.000000,
      "payMax": 2000.000000,
      "countryName": "United State"
    }
  ]
}
```

### 2. Payment Method Query - 查询支付方式

基于法币和加密货币查询支持的支付方式。

```typescript
const paymentMethods = await alchemyPayment.queryCryptoFiatMethod({
  fiat: 'USD',      // 法币代码
  crypto: 'USDT',   // 加密货币
  network: 'TRX',   // 网络
  side: 'BUY',      // 交易类型
});
```

**响应示例：**
```json
{
  "success": true,
  "returnCode": "0000",
  "returnMsg": "SUCCESS",
  "extend": "",
  "data": [
    {
      "country": "US",
      "payWayCode": "53001",
      "minPurchaseAmount": "100.00",
      "maxPurchaseAmount": "2000.00"
    }
  ],
  "traceId": "6538b94dd2b15a185f6477e36beeb234"
}
```

### 3. 获取支付方式（兼容性方法）

```typescript
const methods = await alchemyPayment.getPaymentMethods('USD');
// 返回: ['10001', '501', '701']
```

### 4. 创建支付订单

```typescript
const payment = await alchemyPayment.createPayment('USD', '10001', 100);
```

### 5. 获取支付状态

```typescript
const status = await alchemyPayment.getPaymentStatus('payment_id_here');
```

### 6. 获取访问令牌

```typescript
const token = await alchemyPayment.getToken({ uid: 'user123' });
// 或者
const token = await alchemyPayment.getToken({ email: 'user@example.com' });
```

### 7. 查询支付方式表单字段

```typescript
const formData = await alchemyPayment.getPaymentMethodForm({
  payWayCode: '10001', // Visa/Master Card
  fiat: 'USD',
  side: 'BUY',
});
```

**响应示例：**
```json
{
  "success": true,
  "returnCode": "0000",
  "returnMsg": "SUCCESS",
  "extend": "",
  "data": {
    "fields": [
      {
        "fieldName": "firstName",
        "fieldType": "String",
        "regex": "^[a-zA-Z]{1,128}$",
        "formElement": "text"
      },
      {
        "fieldName": "cardNumber",
        "fieldType": "String",
        "regex": "^[0-9]{16}$",
        "formElement": "text"
      }
    ],
    "dataSource": {}
  }
}
```

### 8. 获取订单报价结果

```typescript
const quotedResult = await alchemyPayment.getOrderQuotedResult({
  side: 'BUY',
  fiatAmount: '100',
  fiatCurrency: 'USD',
  cryptoCurrency: 'USDT',
  network: 'TRX',
  payWayCode: '10001',
});
```

**响应示例：**
```json
{
  "success": true,
  "returnCode": "0000",
  "returnMsg": "SUCCESS",
  "extend": "",
  "data": {
    "cryptoPrice": "1.000",
    "side": "BUY",
    "fiatAmount": "100",
    "cryptoQuantity": "95.32000000",
    "rampFee": "3.82",
    "networkFee": "0.86",
    "fiat": "USD",
    "crypto": "USDT",
    "payWayCode": "52004",
    "cryptoNetworkFee": "0.86",
    "rawRampFee": "3.82"
  },
  "traceId": "68b9588a700408023d9c80d1911111"
}
```

### 9. 估算价格

```typescript
const estimatePrice = await alchemyPayment.estimatePrice({
  crypto: 'USDT',
  network: 'TRX',
  currency: 'USD',
  amount: 100,
  payMethod: 'CREDIT_CARD',
});
```

**响应示例：**
```json
{
  "cryptoPrice": "1.000",
  "currencyAmount": "100",
  "cryptoQuantity": "95.32000000",
  "rampFee": "3.82",
  "networkFee": "0.86",
  "payment": "[AlchemyPayment instance]"
}
```

### 10. 获取支付类型（Ramp URL）

生成带有签名的 Ramp 页面 URL，用于跳转到 Alchemy Pay 的支付页面。

```typescript
const payType = await alchemyPayment.getPayType({
  crypto: 'USDT',
  network: 'TRX',
  currency: 'USD',
  amount: 100,
  payMethod: 'CREDIT_CARD',
  uid: 'user123',
  merchantOrderNo: 'ORDER_123456789', // 可选的商户订单号
});
```

**响应示例：**
```json
{
  "type": "external",
  "url": "https://ramptest.alchemypay.org?appId=f83Is2y7L425rxl8&crypto=USDT&fiat=USD&fiatAmount=100&merchantOrderNo=ORDER_123456789&network=TRX&timestamp=1538054050234&sign=JY9JcOwBosncT19Nn9DIfTH%2BvfSt6xL%2BI%2BRVCl9YGgE%3D"
}
```

**注意事项：**
- URL 包含完整的签名验证
- `merchantOrderNo` 是可选的，但建议提供以确保订单唯一性
- 生成的 URL 可以直接用于重定向到支付页面

## 错误处理

所有方法都包含完整的错误处理：

```typescript
try {
  const result = await alchemyPayment.getFiatList();
  console.log('Success:', result);
} catch (error) {
  console.error('Error:', error.message);
}
```

## 通用请求方法

`AlchemyPayment` 类内部使用通用的 `request` 方法，自动处理：

- 签名生成
- 请求头设置
- 错误处理
- 响应解析

## 测试

运行测试文件：

```bash
# 编译 TypeScript
npm run build

# 运行测试
node test/alchemy-payment-test.js
```

## 注意事项

1. **环境配置**：确保使用正确的 `baseUrl`（测试环境 vs 生产环境）
2. **API 密钥**：妥善保管 `appId` 和 `secretKey`
3. **时间戳**：API 使用 UTC 13 位时间戳，有效期为 5 分钟
4. **签名验证**：所有请求都会自动生成签名，无需手动处理

## 支持的支付方式代码

- `10001`: Visa/Master Card
- `501`: Apple Pay
- `701`: Google Pay
- `53001`, `53002`: 其他支付方式（根据 API 响应）

## 更新日志

- 2024: 添加 Fiat Query 和 Payment Method Query 支持
- 重构通用请求方法，提升代码质量和可维护性


