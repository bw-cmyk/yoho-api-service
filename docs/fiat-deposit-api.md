# 法币入金 API 文档

## 基础信息

- Base URL: `/api/v1/pay`
- 认证方式: Bearer Token (JWT)
- 请求头: `Authorization: Bearer <token>`, `Content-Type: application/json`

---

## 1. 获取支持的法币列表

**GET** `/api/v1/pay/fiat/currencies`

### 响应示例

```json
["AED"]
```

---

## 2. 获取法币可用支付渠道

**GET** `/api/v1/pay/fiat/channels?currency={currency}`

### 请求参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| currency | string | 是 | 法币代码，如 `AED` |

### 响应示例

```json
[
  { "code": "Botim", "name": "Botim" }
]
```

---

## 3. 创建法币入金订单

**POST** `/api/v1/pay/fiat/deposit`

### 请求参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| fiatCurrency | string | 是 | 法币代码，如 `AED` |
| amount | number | 是 | 充值金额，必须大于 0 |
| payType | string | 是 | 支付渠道，从 `/fiat/channels` 接口获取的 `code` 值 |
| successUrl | string | 否 | 支付成功跳转地址 |
| errorUrl | string | 否 | 支付失败跳转地址 |

### 请求示例

```json
{
  "fiatCurrency": "AED",
  "amount": 5,
  "payType": "Botim",
  "successUrl": "https://yoursite.com/pay/success",
  "errorUrl": "https://yoursite.com/pay/error"
}
```

### 响应示例

```json
{
  "orderId": "FIAT_1776848793828TE0GUB",
  "payUrl": "https://api.tkpays.com/index.php/thpay/xxx.do?order_no=I222062897146277",
  "fiatCurrency": "AED",
  "fiatAmount": "5",
  "targetCurrency": "AED",
  "targetAmount": null,
  "exchangeRate": null
}
```

### 前端处理

收到响应后，将用户跳转到 `payUrl` 进行支付：

```javascript
const res = await fetch('/api/v1/pay/fiat/deposit', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    fiatCurrency: 'AED',
    amount: 5,
    payType: 'Botim',
    successUrl: `${window.location.origin}/pay/success`,
    errorUrl: `${window.location.origin}/pay/error`,
  }),
});
const data = await res.json();

// 跳转到支付页
window.location.href = data.payUrl;
```

### 错误码

| HTTP 状态码 | 说明 |
|-------------|------|
| 400 | 参数错误（金额 <= 0 等） |
| 401 | 未认证 |
| 500 | 支付渠道创建订单失败 |

---

## 4. 查询法币入金订单列表

**GET** `/api/v1/pay/fiat/orders?page={page}&limit={limit}`

### 请求参数

| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| page | number | 否 | 1 | 页码 |
| limit | number | 否 | 20 | 每页条数 |

### 响应示例

```json
{
  "orders": [
    {
      "id": 1,
      "orderId": "FIAT_1776848793828TE0GUB",
      "uid": "358801635322889216",
      "provider": "tkpays",
      "providerOrderNo": "I222062897146277",
      "fiatCurrency": "AED",
      "fiatAmount": "5.00",
      "fiatAmountTrue": "5.00",
      "targetCurrency": "AED",
      "targetAmount": "5.00000000",
      "payType": "Botim",
      "status": "success",
      "createdAt": "2026-04-22T09:06:34.000Z",
      "updatedAt": "2026-04-22T09:07:01.000Z"
    }
  ],
  "total": 1
}
```

### 订单状态

| 状态 | 说明 |
|------|------|
| pending | 待支付 |
| success | 支付成功，已充值到余额 |
| failed | 支付失败 |
| expired | 订单过期 |

---

## 接入流程

```
1. GET /fiat/currencies          → 获取支持的法币列表，展示给用户选择
2. GET /fiat/channels?currency=  → 根据用户选择的法币，获取可用支付渠道
3. POST /fiat/deposit            → 用户输入金额后，创建订单，获取 payUrl
4. 跳转 payUrl                   → 用户在第三方支付页完成支付
5. 支付完成                       → 用户被跳转回 successUrl / errorUrl
6. GET /fiat/orders              → 轮询或在 successUrl 页面查询订单状态确认到账
```
