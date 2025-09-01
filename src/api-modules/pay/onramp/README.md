# AlchemyPayment 重构说明

## 📋 重构概述

对 `AlchemyPayment.ts` 进行了全面的重构，修复了原有的错误，改进了代码结构，并增加了类型安全和错误处理。

## 🔧 主要改进

### 1. 类型安全 ✅

- 添加了完整的 TypeScript 接口定义
- 所有方法都有明确的返回类型
- 移除了 `any` 类型的使用

### 2. 错误处理 ✅

- 添加了 try-catch 错误处理
- 统一的错误日志记录
- 友好的错误消息

### 3. 代码结构 ✅

- 将全局函数移到类内部作为私有方法
- 添加了构造函数和配置管理
- 改进了方法的组织结构

### 4. 功能完善 ✅

- 实现了所有抽象方法
- 添加了模拟响应用于测试
- 支持多种支付方式和货币

## 📁 文件结构

```
src/api-modules/pay/onramp/
├── AlchemyPayment.ts           # 重构后的主类
├── AlchemyPayment.example.ts   # 使用示例
├── BasePayment.ts              # 基础支付类（假设存在）
└── README.md                   # 本文档
```

## 🏗️ 核心接口

### 配置接口

```typescript
export interface AlchemyPaymentConfig {
  apiKey: string;
  secretKey: string;
  baseUrl: string;
}
```

### 支付响应接口

```typescript
export interface AlchemyPaymentResponse {
  paymentId: string;
  status: string;
  amount: number;
  currency: string;
  createdAt: string;
  expiresAt?: string;
  paymentUrl?: string;
}
```

### 支付状态接口

```typescript
export interface AlchemyPaymentStatus {
  paymentId: string;
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  amount: number;
  currency: string;
  updatedAt: string;
  transactionHash?: string;
}
```

## 🚀 使用方法

### 1. 初始化

```typescript
import { AlchemyPayment, createAlchemyPayment } from './AlchemyPayment';

const config = {
  apiKey: 'your_api_key',
  secretKey: 'your_secret_key',
  baseUrl: 'https://api.alchemy.com',
};

const alchemyPayment = createAlchemyPayment(config);
```

### 2. 创建支付订单

```typescript
const payment = await alchemyPayment.createPayment(
  'USD',
  'credit_card',
  100,
);

console.log('支付订单:', payment);
// 输出: {
//   paymentId: 'alchemy_1234567890_abc123',
//   status: 'pending',
//   amount: 100,
//   currency: 'USD',
//   createdAt: '2024-01-01T00:00:00.000Z',
//   expiresAt: '2024-01-01T00:30:00.000Z',
//   paymentUrl: 'https://alchemy.com/pay/...'
// }
```

### 3. 获取支付状态

```typescript
const status = await alchemyPayment.getPaymentStatus(payment.paymentId);
console.log('支付状态:', status);
```

### 4. 获取支持的支付方式

```typescript
const methods = await alchemyPayment.getPaymentMethods('USD');
console.log('USD 支付方式:', methods);
// 输出: ['credit_card', 'bank_transfer', 'crypto']
```

## 🔐 签名机制

重构后的签名机制更加安全和可靠：

```typescript
private generateSignature(
  timestamp: number,
  method: string,
  requestUrl: string,
  body: string,
): string {
  const content =
    timestamp +
    method.toUpperCase() +
    this.getPath(requestUrl) +
    this.getJsonBody(body);

  return crypto
    .createHmac('sha256', this.config.secretKey)
    .update(content, 'utf8')
    .digest('base64');
}
```

### 签名步骤

1. **时间戳**：使用当前时间戳
2. **方法**：HTTP 方法（GET、POST 等）
3. **路径**：请求路径和查询参数
4. **请求体**：JSON 格式的请求体（排序后）
5. **HMAC-SHA256**：使用密钥生成签名

## 🎯 支持的功能

### 支付方式

| 货币 | 支持的支付方式 |
|------|----------------|
| USD | credit_card, bank_transfer, crypto |
| USDT | crypto, bank_transfer |
| BTC | crypto |
| ETH | crypto |

### 支付状态

- `pending`：待处理
- `completed`：已完成
- `failed`：失败
- `cancelled`：已取消

### API 方法

- `getPaymentMethods()` - 获取支付方式
- `createPayment()` - 创建支付订单
- `getPaymentStatus()` - 获取支付状态
- `getPaymentDetails()` - 获取支付详情
- `cancelPayment()` - 取消支付
- `getCurrencies()` - 获取支持的货币

## 🧪 测试和示例

### 运行示例

```bash
# 直接运行示例文件
npx ts-node src/api-modules/pay/onramp/AlchemyPayment.example.ts
```

### 示例输出

```
🚀 开始运行 AlchemyPayment 示例

=== 获取支持的支付方式 ===
USD 支持的支付方式: ['credit_card', 'bank_transfer', 'crypto']
USDT 支持的支付方式: ['crypto', 'bank_transfer']
BTC 支持的支付方式: ['crypto']

=== 创建支付订单 ===
USD 支付订单: {
  paymentId: 'alchemy_1234567890_abc123',
  status: 'pending',
  amount: 100,
  currency: 'USD',
  createdAt: '2024-01-01T00:00:00.000Z',
  expiresAt: '2024-01-01T00:30:00.000Z',
  paymentUrl: 'https://alchemy.com/pay/...'
}

✅ 所有示例运行完成
```

## 🔧 配置选项

### 环境变量

```env
ALCHEMY_API_KEY=your_api_key
ALCHEMY_SECRET_KEY=your_secret_key
ALCHEMY_BASE_URL=https://api.alchemy.com
```

### 配置验证

```typescript
// 验证配置
if (!config.apiKey || !config.secretKey) {
  throw new Error('Missing required configuration: apiKey and secretKey');
}
```

## 🚨 错误处理

### 常见错误

1. **配置错误**
   ```typescript
   throw new Error('Missing required configuration: apiKey and secretKey');
   ```

2. **API 调用错误**
   ```typescript
   throw new Error('Failed to create payment');
   ```

3. **参数验证错误**
   ```typescript
   throw new Error('Invalid currency or payment method');
   ```

### 错误处理示例

```typescript
try {
  const payment = await alchemyPayment.createPayment('USD', 'credit_card', 100);
  console.log('支付创建成功:', payment);
} catch (error) {
  console.error('支付创建失败:', error.message);
  // 处理错误逻辑
}
```

## 🔄 迁移指南

### 从旧版本迁移

1. **更新导入**
   ```typescript
   // 旧版本
   import { AlchemyPayment } from './AlchemyPayment';
   
   // 新版本
   import { AlchemyPayment, createAlchemyPayment } from './AlchemyPayment';
   ```

2. **初始化方式**
   ```typescript
   // 旧版本
   const payment = new AlchemyPayment();
   
   // 新版本
   const config = { apiKey: '...', secretKey: '...', baseUrl: '...' };
   const payment = createAlchemyPayment(config);
   ```

3. **方法调用**
   ```typescript
   // 所有方法现在都是异步的
   const methods = await payment.getPaymentMethods('USD');
   ```

## 📈 性能优化

### 1. 缓存机制

```typescript
// 可以添加缓存来存储支付方式和货币列表
private cachedPaymentMethods: Map<string, string[]> = new Map();
private cachedCurrencies: string[] | null = null;
```

### 2. 请求优化

```typescript
// 使用 HTTP 客户端池
private httpClient: AxiosInstance;

constructor(config: AlchemyPaymentConfig) {
  this.httpClient = axios.create({
    baseURL: config.baseUrl,
    timeout: 10000,
  });
}
```

## 🔮 未来扩展

### 计划功能

1. **Webhook 支持**
   ```typescript
   async handleWebhook(payload: any, signature: string): Promise<void>
   ```

2. **批量操作**
   ```typescript
   async batchCreatePayments(payments: AlchemyPaymentRequest[]): Promise<AlchemyPaymentResponse[]>
   ```

3. **支付链接生成**
   ```typescript
   async generatePaymentLink(paymentId: string): Promise<string>
   ```

4. **退款支持**
   ```typescript
   async refundPayment(paymentId: string, amount: number): Promise<any>
   ```

## 🤝 贡献

欢迎提交 Issue 和 Pull Request 来改进这个支付集成。

## 📄 许可证

本项目遵循 MIT 许可证。 