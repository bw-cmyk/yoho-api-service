# 电商模块 API 文档

## 目录

- [基础信息](#基础信息)
- [商品管理 API](#商品管理-api)
- [订单管理 API](#订单管理-api)
- [收货地址管理 API](#收货地址管理-api)
- [数据模型](#数据模型)

---

## 基础信息

### Base URL
```
/api/v1/ecommerce
```

### 认证方式
大部分 API 需要 JWT Bearer Token 认证：
```
Authorization: Bearer <token>
```

### 通用响应格式

#### 成功响应
```json
{
  // 具体数据内容
}
```

#### 错误响应
```json
{
  "statusCode": 400,
  "message": "错误描述",
  "error": "Bad Request"
}
```

---

## 商品管理 API

### 1. 获取首页商品

获取首页展示的商品（Instant Buy 和 Lucky Draws）。

**接口地址：** `GET /api/v1/ecommerce/products/homepage`

**认证：** 无需认证

**响应示例：**
```json
{
  "instantBuy": {
    "id": 1001,
    "type": "INSTANT_BUY",
    "priority": 100,
    "badge": "70% OFF",
    "name": "iPhone 17 Pro Max",
    "description": "Flash deal · 256GB Natural Titanium",
    "thumbnail": "https://cdn.example.com/iphone17pm/thumb.jpg",
    "images": ["https://cdn.example.com/iphone17pm/1.jpg"],
    "originalPrice": "999.00",
    "salePrice": "299.00",
    "stock": 500,
    "tags": [
      { "icon": "truck", "text": "Free Shipping" },
      { "icon": "shield", "text": "Shipping Insurance" }
    ],
    "specifications": [
      { "key": "Color", "value": "Natural Titanium", "isDefault": true },
      { "key": "Storage", "value": "256GB", "isDefault": true }
    ],
    "averageRating": "4.9",
    "discountPercentage": 70
  },
  "luckyDraws": [
    {
      "id": 1002,
      "type": "LUCKY_DRAW",
      "priority": 90,
      "name": "MacBook Pro 16\"",
      "thumbnail": "https://cdn.example.com/mbp/thumb.jpg",
      "originalPrice": "2499.00",
      "salePrice": "0.10"
    }
  ]
}
```

---

### 2. 获取商品详情

获取商品详细信息，包含模拟数据（今日销量、总已购人数等）。

**接口地址：** `GET /api/v1/ecommerce/products/:id`

**路径参数：**
- `id` (number): 商品ID

**认证：** 无需认证

**响应示例：**
```json
{
  "id": 1001,
  "type": "INSTANT_BUY",
  "name": "iPhone 17 Pro Max",
  "description": "Flash deal · 256GB Natural Titanium",
  "thumbnail": "https://cdn.example.com/iphone17pm/thumb.jpg",
  "images": [
    "https://cdn.example.com/iphone17pm/1.jpg",
    "https://cdn.example.com/iphone17pm/2.jpg"
  ],
  "detail": "<p>Product details...</p>",
  "originalPrice": "999.00",
  "salePrice": "299.00",
  "stock": 500,
  "dailySalesRange": 1000,
  "tags": [
    { "icon": "truck", "text": "Free Shipping" },
    { "icon": "shield", "text": "Shipping Insurance" },
    { "icon": "refresh", "text": "7-Day Free Returns" },
    { "icon": "clock", "text": "15-Day Refund" }
  ],
  "saleStartTime": "2024-01-01T00:00:00Z",
  "saleEndTime": "2024-01-31T23:59:59Z",
  "purchaseLimit": 2,
  "totalRating": "1146.6",
  "reviewCount": 234,
  "averageRating": "4.9",
  "discountPercentage": 70,
  "specifications": [
    { "key": "Color", "value": "Natural Titanium", "isDefault": true },
    { "key": "Storage", "value": "256GB", "isDefault": true }
  ],
  "reviews": [
    {
      "id": 1,
      "reviewerName": "Alex_lucky_guy",
      "reviewerAvatar": "https://cdn.example.com/avatars/alex.png",
      "rating": "5.0",
      "content": "Great quality and super fast delivery!",
      "tags": ["Great quality", "Value for money"],
      "reviewTime": "2024-01-15T10:00:00Z"
    }
  ],
  "todaySold": 89,
  "totalPurchased": 2340,
  "estimatedDeliveryDays": 4,
  "remainingSaleTime": 19080
}
```

**响应字段说明：**
- `todaySold`: 今日已售数量（模拟数据）
- `totalPurchased`: 总已购人数（模拟数据）
- `estimatedDeliveryDays`: 预计到货天数（模拟数据，在 deliveryDaysMin 和 deliveryDaysMax 之间）
- `remainingSaleTime`: 剩余售卖时间（秒）

---

### 3. 查询商品列表

查询商品列表，支持按类型和状态筛选。

**接口地址：** `GET /api/v1/ecommerce/products`

**查询参数：**
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| type | string | 否 | 商品类型：`INSTANT_BUY` 或 `LUCKY_DRAW` |
| status | string | 否 | 商品状态：`DRAFT`, `SCHEDULED`, `ACTIVE`, `PAUSED`, `SOLD_OUT`, `ARCHIVED` |
| page | number | 否 | 页码，默认 1 |
| limit | number | 否 | 每页数量，默认 20 |

**认证：** 无需认证

**请求示例：**
```
GET /api/v1/ecommerce/products?type=INSTANT_BUY&status=ACTIVE&page=1&limit=20
```

**响应示例：**
```json
{
  "items": [
    {
      "id": 1001,
      "type": "INSTANT_BUY",
      "name": "iPhone 17 Pro Max",
      "salePrice": "299.00",
      "thumbnail": "https://cdn.example.com/iphone17pm/thumb.jpg"
    }
  ],
  "total": 50,
  "page": 1,
  "limit": 20
}
```

---

## 订单管理 API

### 1. 创建 Instant Buy 订单

创建直接购买订单。

**接口地址：** `POST /api/v1/ecommerce/orders/instant-buy`

**认证：** 需要认证

**请求体：**
```json
{
  "productId": 1001,
  "quantity": 1,
  "specifications": [
    { "key": "Color", "value": "Natural Titanium" },
    { "key": "Storage", "value": "256GB" }
  ],
  "shippingAddressId": 1
}
```

**请求字段说明：**
| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| productId | number | 是 | 商品ID |
| quantity | number | 是 | 购买数量，最小值为 1 |
| specifications | array | 是 | 商品规格选择 |
| shippingAddressId | number | 否 | 收货地址ID，如果不提供则使用默认地址 |

**响应示例：**
```json
{
  "id": 1,
  "orderNumber": "ORD1705315200000ABC123",
  "userId": "user123",
  "type": "INSTANT_BUY",
  "productId": 1001,
  "productInfo": {
    "name": "iPhone 17 Pro Max",
    "thumbnail": "https://cdn.example.com/iphone17pm/thumb.jpg",
    "images": ["https://cdn.example.com/iphone17pm/1.jpg"],
    "specifications": [
      { "key": "Color", "value": "Natural Titanium" },
      { "key": "Storage", "value": "256GB" }
    ],
    "originalPrice": "999.00",
    "salePrice": "299.00"
  },
  "quantity": 1,
  "paymentAmount": "299.00",
  "paymentStatus": "PAID",
  "instantBuyStatus": "CONFIRMED",
  "shippingAddressId": 1,
  "createdAt": "2024-01-15T10:00:00Z"
}
```

**错误响应：**
- `400 Bad Request`: 商品不可售卖、库存不足、余额不足、收货地址不存在等
- `401 Unauthorized`: 未认证或 token 无效

---


### 3. 获取我的订单列表

获取当前用户的订单列表。

**接口地址：** `GET /api/v1/ecommerce/orders/me`

**认证：** 需要认证

**查询参数：**
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| type | string | 否 | 订单类型：`INSTANT_BUY` 或 `LUCKY_DRAW` |
| page | number | 否 | 页码，默认 1 |
| limit | number | 否 | 每页数量，默认 20 |

**请求示例：**
```
GET /api/v1/ecommerce/orders/me?type=INSTANT_BUY&page=1&limit=20
```

**响应示例：**
```json
{
  "items": [
    {
      "id": 1,
      "orderNumber": "ORD1705315200000ABC123",
      "type": "INSTANT_BUY",
      "productInfo": {
        "name": "iPhone 17 Pro Max",
        "thumbnail": "https://cdn.example.com/iphone17pm/thumb.jpg"
      },
      "quantity": 1,
      "paymentAmount": "299.00",
      "paymentStatus": "PAID",
      "instantBuyStatus": "CONFIRMED",
      "createdAt": "2024-01-15T10:00:00Z"
    }
  ],
  "total": 10,
  "page": 1,
  "limit": 20
}
```

---

### 4. 获取订单详情

获取订单详细信息，包含物流信息。

**接口地址：** `GET /api/v1/ecommerce/orders/:id`

**路径参数：**
- `id` (number): 订单ID

**认证：** 需要认证

**响应示例：**
```json
{
  "id": 1,
  "orderNumber": "ORD1705315200000ABC123",
  "userId": "user123",
  "type": "INSTANT_BUY",
  "productId": 1001,
  "productInfo": {
    "name": "iPhone 17 Pro Max",
    "thumbnail": "https://cdn.example.com/iphone17pm/thumb.jpg",
    "images": ["https://cdn.example.com/iphone17pm/1.jpg"],
    "specifications": [
      { "key": "Color", "value": "Natural Titanium" },
      { "key": "Storage", "value": "256GB" }
    ],
    "originalPrice": "999.00",
    "salePrice": "299.00"
  },
  "quantity": 1,
  "paymentAmount": "299.00",
  "paymentStatus": "PAID",
  "instantBuyStatus": "SHIPPED",
  "shippingAddress": {
    "id": 1,
    "recipientName": "John Doe",
    "phoneNumber": "+1234567890",
    "country": "United States",
    "state": "California",
    "city": "San Francisco",
    "streetAddress": "123 Main St",
    "apartment": "Apt 4B",
    "zipCode": "94102"
  },
  "logisticsTimelines": [
    {
      "id": 1,
      "nodeKey": "ORDER_CONFIRMED",
      "title": "Order Confirmed",
      "description": "Your order has been confirmed and is being prepared",
      "dayIndex": 0,
      "activatedAt": "2024-01-15T10:00:00Z"
    },
    {
      "id": 2,
      "nodeKey": "ORDER_PROCESSING",
      "title": "Order Processing",
      "description": "Merchant is preparing your order",
      "dayIndex": 1,
      "activatedAt": "2024-01-16T10:00:00Z"
    }
  ],
  "currentLogisticsStatus": {
    "id": 2,
    "nodeKey": "ORDER_PROCESSING",
    "title": "Order Processing",
    "description": "Merchant is preparing your order",
    "activatedAt": "2024-01-16T10:00:00Z"
  },
  "createdAt": "2024-01-15T10:00:00Z",
  "updatedAt": "2024-01-16T10:00:00Z"
}
```

---

### 5. 申请退款

申请订单退款（仅限 Instant Buy 订单，且需超过 15 天）。

**接口地址：** `POST /api/v1/ecommerce/orders/:id/refund`

**路径参数：**
- `id` (number): 订单ID

**认证：** 需要认证

**响应示例：**
```json
{
  "id": 1,
  "orderNumber": "ORD1705315200000ABC123",
  "instantBuyStatus": "REFUNDING",
  "paymentStatus": "REFUNDED",
  "refundRequestedAt": "2024-01-30T10:00:00Z",
  "refundedAt": "2024-01-30T10:00:00Z"
}
```

**错误响应：**
- `400 Bad Request`: 订单未超过 15 天、已经申请过退款、订单类型不是 Instant Buy

---

## 收货地址管理 API

### 1. 创建收货地址

创建新的收货地址。

**接口地址：** `POST /api/v1/ecommerce/shipping-addresses`

**认证：** 需要认证

**请求体：**
```json
{
  "recipientName": "John Doe",
  "phoneNumber": "+1234567890",
  "country": "United States",
  "state": "California",
  "city": "San Francisco",
  "streetAddress": "123 Main St",
  "apartment": "Apt 4B",
  "zipCode": "94102",
  "isDefault": true
}
```

**请求字段说明：**
| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| recipientName | string | 是 | 收件人姓名，最大长度 128 |
| phoneNumber | string | 是 | 联系电话，最大长度 32 |
| country | string | 是 | 国家，最大长度 128 |
| state | string | 否 | 省/州，最大长度 128 |
| city | string | 是 | 城市，最大长度 128 |
| streetAddress | string | 是 | 街道地址，最大长度 255 |
| apartment | string | 否 | 公寓/套房号，最大长度 128 |
| zipCode | string | 否 | 邮政编码，最大长度 32 |
| isDefault | boolean | 否 | 是否设为默认地址，默认 false |

**响应示例：**
```json
{
  "id": 1,
  "userId": "user123",
  "recipientName": "John Doe",
  "phoneNumber": "+1234567890",
  "country": "United States",
  "state": "California",
  "city": "San Francisco",
  "streetAddress": "123 Main St",
  "apartment": "Apt 4B",
  "zipCode": "94102",
  "isDefault": true,
  "createdAt": "2024-01-15T10:00:00Z"
}
```

---

### 2. 更新收货地址

更新收货地址信息。

**接口地址：** `PUT /api/v1/ecommerce/shipping-addresses/:id`

**路径参数：**
- `id` (number): 地址ID

**认证：** 需要认证

**请求体：** 所有字段可选，只需提供要更新的字段
```json
{
  "recipientName": "Jane Doe",
  "isDefault": true
}
```

**响应示例：**
```json
{
  "id": 1,
  "recipientName": "Jane Doe",
  "phoneNumber": "+1234567890",
  "country": "United States",
  "state": "California",
  "city": "San Francisco",
  "streetAddress": "123 Main St",
  "apartment": "Apt 4B",
  "zipCode": "94102",
  "isDefault": true,
  "updatedAt": "2024-01-16T10:00:00Z"
}
```

---

### 3. 获取我的收货地址列表

获取当前用户的所有收货地址。

**接口地址：** `GET /api/v1/ecommerce/shipping-addresses/me`

**认证：** 需要认证

**响应示例：**
```json
[
  {
    "id": 1,
    "recipientName": "John Doe",
    "phoneNumber": "+1234567890",
    "country": "United States",
    "state": "California",
    "city": "San Francisco",
    "streetAddress": "123 Main St",
    "apartment": "Apt 4B",
    "zipCode": "94102",
    "isDefault": true,
    "createdAt": "2024-01-15T10:00:00Z"
  },
  {
    "id": 2,
    "recipientName": "Jane Doe",
    "phoneNumber": "+0987654321",
    "country": "United States",
    "state": "New York",
    "city": "New York",
    "streetAddress": "456 Broadway",
    "isDefault": false,
    "createdAt": "2024-01-20T10:00:00Z"
  }
]
```

**注意：** 地址列表按默认地址优先、创建时间倒序排列。

---

### 4. 获取默认收货地址

获取当前用户的默认收货地址。

**接口地址：** `GET /api/v1/ecommerce/shipping-addresses/default`

**认证：** 需要认证

**响应示例：**
```json
{
  "id": 1,
  "recipientName": "John Doe",
  "phoneNumber": "+1234567890",
  "country": "United States",
  "state": "California",
  "city": "San Francisco",
  "streetAddress": "123 Main St",
  "apartment": "Apt 4B",
  "zipCode": "94102",
  "isDefault": true
}
```

**注意：** 如果没有默认地址，返回 `null`。

---

### 5. 设置默认收货地址

将指定地址设为默认地址。

**接口地址：** `POST /api/v1/ecommerce/shipping-addresses/:id/set-default`

**路径参数：**
- `id` (number): 地址ID

**认证：** 需要认证

**响应示例：**
```json
{
  "id": 2,
  "recipientName": "Jane Doe",
  "phoneNumber": "+0987654321",
  "country": "United States",
  "state": "New York",
  "city": "New York",
  "streetAddress": "456 Broadway",
  "isDefault": true,
  "updatedAt": "2024-01-21T10:00:00Z"
}
```

**注意：** 设置新默认地址时，原默认地址会自动取消。

---

### 6. 删除收货地址

删除指定的收货地址。

**接口地址：** `DELETE /api/v1/ecommerce/shipping-addresses/:id`

**路径参数：**
- `id` (number): 地址ID

**认证：** 需要认证

**响应示例：**
```json
{
  "success": true
}
```

**注意：** 如果删除的是默认地址，系统会自动将第一个地址设为默认。

---

## 数据模型

### 枚举值

#### ProductType (商品类型)
- `INSTANT_BUY`: 直接购买
- `LUCKY_DRAW`: 抽奖

#### ProductStatus (商品状态)
- `DRAFT`: 草稿
- `SCHEDULED`: 已安排
- `ACTIVE`: 售卖中
- `PAUSED`: 已暂停
- `SOLD_OUT`: 已售罄
- `ARCHIVED`: 已归档

#### OrderType (订单类型)
- `INSTANT_BUY`: 直接购买订单
- `LUCKY_DRAW`: 抽奖订单

#### InstantBuyOrderStatus (Instant Buy 订单状态)
- `CONFIRMED`: 已确认
- `PROCESSING`: 处理中
- `SHIPPED`: 已发货
- `OUT_FOR_DELIVERY`: 派送中
- `DELIVERED`: 已送达
- `CANCELLED`: 已取消
- `REFUNDING`: 退款中
- `REFUNDED`: 已退款

#### LuckyDrawOrderStatus (Lucky Draw 订单状态)
- `ONGOING`: 进行中
- `LOST`: 未中奖
- `WON`: 已中奖
- `CANCELLED`: 已取消

#### PaymentStatus (支付状态)
- `UNPAID`: 未支付
- `PAID`: 已支付
- `REFUNDED`: 已退款

#### LogisticsNodeKey (物流节点)
- `ORDER_CONFIRMED`: 订单已确认
- `ORDER_PROCESSING`: 订单处理中
- `SHIPPED_FROM_ORIGIN`: 已从原产地发货
- `ARRIVED_ORIGIN_HUB`: 已到达原产地集散中心
- `EXPORT_CLEARANCE`: 出境清关中
- `EXPORT_CLEARED`: 出境清关完成
- `AT_ORIGIN_PORT`: 到达始发港口
- `DEPARTED_ORIGIN_PORT`: 已离开始发港口
- `IN_VESSEL`: 海运运输中
- `AT_DESTINATION_PORT`: 到达目的地港口
- `IMPORT_CLEARANCE`: 入境清关中
- `IMPORT_CLEARED`: 入境清关完成
- `ARRIVED_DESTINATION_HUB`: 到达目的地配送中心
- `OUT_FOR_DELIVERY`: 派送中
- `DELIVERED`: 已送达
- `CUSTOMS_CLEARANCE_FAILED`: 清关失败
- `RETURN_TO_SENDER`: 海关退运
- `DELIVERY_STOPPED`: 已停止配送

---

## 业务规则

### Instant Buy 订单

1. **下单流程：**
   - 用户选择商品和规格
   - 系统检查商品是否可售卖（状态、库存、时间范围）
   - 验证用户余额是否充足
   - 创建订单并扣款
   - 减少商品库存
   - 初始化物流时间线

2. **退款规则：**
   - 订单创建后 15 天内不可申请退款
   - 15 天后用户可以申请全额退款
   - 30 天后订单因物流问题自动取消并自动退款

3. **物流推进：**
   - 物流节点按预设时间自动推进
   - 第 29-30 天：如果未送达，进入清关失败流程
   - 用户申请退款后，物流状态变为"已停止配送"

### Lucky Draw 订单

1. **参与流程：**
   - 用户选择商品和参与份数
   - 系统检查商品是否可售卖
   - 验证用户余额（份数 × 每份价格）
   - 创建订单并扣款
   - 减少商品库存

2. **订单状态：**
   - `ONGOING`: 抽奖进行中
   - `WON`: 用户中奖
   - `LOST`: 用户未中奖
   - `CANCELLED`: 订单取消（异常情况）

---

## 错误码

| HTTP 状态码 | 说明 |
|------------|------|
| 200 | 请求成功 |
| 400 | 请求参数错误或业务逻辑错误 |
| 401 | 未认证或 token 无效 |
| 403 | 无权限访问 |
| 404 | 资源不存在 |
| 500 | 服务器内部错误 |

---

## 注意事项

1. **认证：** 除商品查询和详情接口外，其他接口都需要 JWT 认证
2. **金额：** 所有金额字段使用字符串类型，保留 2 位小数
3. **时间：** 所有时间字段使用 ISO 8601 格式（UTC）
4. **分页：** 列表接口支持分页，默认每页 20 条
5. **库存：** 下单时会实时检查库存，并发下单可能导致库存不足错误

