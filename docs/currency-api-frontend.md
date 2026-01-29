# 货币管理 API 文档

## 📋 概述

本文档提供货币管理相关的所有API接口说明，供前端开发使用。

**Base URL**: `/api/v1`

---

## 🔐 认证

需要 User JWT Token

```http
Authorization: Bearer <user_jwt_token>
```

**注意**: 部分接口（如获取可用货币列表）无需认证

---

## 📑 目录

1. [User - 货币偏好](#user---货币偏好)
2. [User - 通用设置](#user---通用设置)
3. [数据类型](#数据类型)
4. [错误处理](#错误处理)
5. [示例场景](#示例场景)

---

## User - 货币偏好

### 1. 获取用户货币偏好

**请求**

```http
GET /user/preferences/currency
Authorization: Bearer <user_token>
```

**响应** `200 OK`

```json
{
  "currency": "AED"
}
```

**说明**:
- 如果用户未设置偏好，默认返回 `"USD"`
- 返回的货币会影响所有API响应中的金额显示

---

### 2. 设置用户货币偏好

**请求**

```http
PUT /user/preferences/currency
Authorization: Bearer <user_token>
Content-Type: application/json
```

**请求体**

```json
{
  "currency": "AED"
}
```

**字段说明**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| currency | string | 是 | 货币代码，必须是 USD, AED 或 INR |

**响应** `200 OK`

无响应体

**错误响应** `400 Bad Request`

```json
{
  "statusCode": 400,
  "message": "Currency must be USD, AED, or INR",
  "error": "Bad Request"
}
```

**错误响应** `400 Bad Request` (货币未启用)

```json
{
  "statusCode": 400,
  "message": "Currency is not active",
  "error": "Bad Request"
}
```

---

### 3. 获取可用货币列表

获取所有已启用的货币（用户可选择的货币）

**请求**

```http
GET /user/preferences/currencies/available
```

**说明**: 此接口无需认证，所有人可访问

**响应** `200 OK`

```json
[
  {
    "currency": "USD",
    "symbol": "$",
    "name": "US Dollar",
    "decimals": 2,
    "displayOrder": 1
  },
  {
    "currency": "AED",
    "symbol": "د.إ",
    "name": "UAE Dirham",
    "decimals": 2,
    "displayOrder": 2
  },
  {
    "currency": "INR",
    "symbol": "₹",
    "name": "Indian Rupee",
    "decimals": 2,
    "displayOrder": 3
  }
]
```

**用途**:
- 前端货币选择下拉框
- 显示可用货币及其符号

---

## User - 通用设置

### 1. 获取单个设置

**请求**

```http
GET /user/settings/:key
Authorization: Bearer <user_token>
```

**路径参数**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| key | string | 是 | 设置键，如 currency, language, theme |

**示例**

```http
GET /user/settings/currency
```

**响应** `200 OK`

```json
{
  "key": "currency",
  "value": "AED"
}
```

---

### 2. 设置单个设置

**请求**

```http
PUT /user/settings/:key
Authorization: Bearer <user_token>
Content-Type: application/json
```

**请求体**

```json
{
  "value": "AED"
}
```

**响应** `200 OK`

无响应体

---

## 数据类型

### AvailableCurrency

```typescript
interface AvailableCurrency {
  currency: string;    // 货币代码
  symbol: string;      // 货币符号
  name: string;        // 货币名称
  decimals: number;    // 小数位数
  displayOrder: number; // 显示顺序
}
```

---

## 错误处理

### 错误响应格式

```typescript
interface ErrorResponse {
  statusCode: number;
  message: string | string[];
  error: string;
}
```

### 常见错误码

| 状态码 | 说明 | 示例 |
|--------|------|------|
| 400 | 请求参数错误 | 货币代码格式错误 |
| 401 | 未认证 | Token无效或过期 |
| 404 | 资源不存在 | 货币代码不存在 |
| 500 | 服务器错误 | 内部错误 |

---

## 示例场景

### 场景1: 用户切换货币显示

**步骤**:

1. **获取可用货币列表**

```javascript
const response = await fetch('/api/v1/user/preferences/currencies/available');
const currencies = await response.json();

// 显示下拉选择框
// currencies = [
//   { currency: "USD", symbol: "$", name: "US Dollar", ... },
//   { currency: "AED", symbol: "د.إ", name: "UAE Dirham", ... },
//   { currency: "INR", symbol: "₹", name: "Indian Rupee", ... }
// ]
```

2. **用户选择AED，保存偏好**

```javascript
const response = await fetch('/api/v1/user/preferences/currency', {
  method: 'PUT',
  headers: {
    'Authorization': `Bearer ${userToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ currency: 'AED' })
});

// 成功后，所有API响应的金额将自动转换为AED
```

3. **查询用户资产（自动转换）**

```javascript
const response = await fetch('/api/v1/user/assets', {
  headers: {
    'Authorization': `Bearer ${userToken}`
  }
});
const data = await response.json();

// 响应示例 (已自动转换为AED)
// {
//   "balance": "367.00",        // 原USD: 100 → AED: 367 (汇率3.67)
//   "balanceReal": "367.00",
//   "_currency": "AED"          // 货币标识
// }
```

---

## React/TypeScript 示例代码

### API Service

```typescript
// services/currencyApi.ts
import axios from 'axios';

const api = axios.create({
  baseURL: '/api/v1',
});

// 请求拦截器 - 添加token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export interface AvailableCurrency {
  currency: string;
  symbol: string;
  name: string;
  decimals: number;
  displayOrder: number;
}

export const currencyApi = {
  // User API
  getCurrencyPreference: () =>
    api.get<{ currency: string }>('/user/preferences/currency'),

  setCurrencyPreference: (currency: string) =>
    api.put('/user/preferences/currency', { currency }),

  getAvailableCurrencies: () =>
    api.get<AvailableCurrency[]>('/user/preferences/currencies/available'),
};
```

### React Component 示例

```typescript
// components/CurrencySelector.tsx
import { useState, useEffect } from 'react';
import { currencyApi, type AvailableCurrency } from '../services/currencyApi';

export function CurrencySelector() {
  const [currencies, setCurrencies] = useState<AvailableCurrency[]>([]);
  const [selected, setSelected] = useState<string>('USD');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadCurrencies();
    loadUserPreference();
  }, []);

  const loadCurrencies = async () => {
    try {
      const response = await currencyApi.getAvailableCurrencies();
      setCurrencies(response.data);
    } catch (error) {
      console.error('Failed to load currencies:', error);
    }
  };

  const loadUserPreference = async () => {
    try {
      const response = await currencyApi.getCurrencyPreference();
      setSelected(response.data.currency);
    } catch (error) {
      console.error('Failed to load preference:', error);
    }
  };

  const handleChange = async (currency: string) => {
    setLoading(true);
    try {
      await currencyApi.setCurrencyPreference(currency);
      setSelected(currency);
      // 刷新页面数据以显示新货币
      window.location.reload();
    } catch (error) {
      console.error('Failed to update preference:', error);
      alert('更新失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <label>货币显示:</label>
      <select
        value={selected}
        onChange={(e) => handleChange(e.target.value)}
        disabled={loading}
      >
        {currencies.map(c => (
          <option key={c.currency} value={c.currency}>
            {c.symbol} {c.name} ({c.currency})
          </option>
        ))}
      </select>
    </div>
  );
}
```

---

## 注意事项

### 1. 金额转换

- **存储**: 所有金额以USD存储在数据库
- **展示**: 根据用户偏好自动转换显示
- **标识**: 转换后的响应包含 `_currency` 字段

### 2. 缓存机制

- **汇率缓存**: 1小时 (3600秒)
- **用户偏好缓存**: 24小时 (86400秒)
- **更新生效**: 汇率更新后，最多1小时后对所有用户生效

### 3. USD保护

- USD不能被禁用
- USD不能被删除
- USD的汇率永远是 1.0

### 4. 性能优化

- USD用户不会触发金额转换
- 未登录用户不会触发转换
- 每个请求只查询一次汇率（带缓存）

### 5. 支持的金额字段

自动转换以下字段:
```
balance, balanceReal, balanceBonus, balanceLocked
price, salePrice, originalPrice, totalPrice
pricePerSpot, prizeValue
withdrawableBalance, availableBalance, totalBalance
amount, total, subtotal, fee, cost, value
```

---

## 相关文档

- [测试指南](./currency-transform-testing.md)
- [实施报告](./currency-implementation-report.md)
- [实施计划](../plan/currency-management-plan.md)

---

**最后更新**: 2026-01-29
**版本**: 1.0.0
