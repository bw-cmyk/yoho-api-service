# 保底中奖 API 文档

**Base URL**: `/api/v1/ecommerce/draws`

## 概述

保底中奖是为所有用户提供的兜底福利机制。用户在全局范围内（跨所有一元购商品）第 N 次常规参与时，**保证当期中奖**。N 为后台全局可配置项，默认为 1（即所有用户首次参与必中）。

### 规则说明

| 项目 | 说明 |
|------|------|
| 触发条件 | 用户累计常规参与次数（不含新用户机会、不含保底参与）达到第 N 次 |
| 触发次数 | 每个用户终身仅触发一次 |
| 开奖方式 | 系统自动在私有轮次中完成，不影响公开轮次其他用户 |
| 费用 | 与正常购买相同，按商品价格扣费 |
| 可见性 | 私有轮次仅本人可见，不出现在公开跑马灯 |

---

## API 接口

### 获取当前用户保底中奖状态

查询当前登录用户是否符合保底中奖条件，以及距离触发保底还需参与几次。前端可通过此接口决定是否展示保底相关引导文案。

**请求**

```
GET /guaranteed-win/status
```

**Headers**

| 名称 | 类型 | 必填 | 说明 |
|------|------|------|------|
| Authorization | string | 是 | Bearer \<token\> |

**响应示例 — 未参与过（即将触发保底）**

```json
{
  "enabled": true,
  "onNthParticipation": 1,
  "currentGlobalParticipationCount": 0,
  "hasTriggered": false,
  "isEligible": true,
  "remainingUntilGuarantee": 1
}
```

**响应示例 — 已触发过保底**

```json
{
  "enabled": true,
  "onNthParticipation": 1,
  "currentGlobalParticipationCount": 3,
  "hasTriggered": true,
  "isEligible": false,
  "remainingUntilGuarantee": 0
}
```

**响应示例 — 保底功能已关闭**

```json
{
  "enabled": false,
  "onNthParticipation": 1,
  "currentGlobalParticipationCount": 0,
  "hasTriggered": false,
  "isEligible": false,
  "remainingUntilGuarantee": 1
}
```

**响应字段说明**

| 字段 | 类型 | 说明 |
|------|------|------|
| enabled | boolean | 系统保底功能是否开启（由后台配置） |
| onNthParticipation | number | 第几次常规参与触发保底（全局配置，默认 1） |
| currentGlobalParticipationCount | number | 用户当前累计常规参与次数（不含新用户机会次数、不含保底参与次数） |
| hasTriggered | boolean | 是否已触发过保底中奖（终身仅触发一次） |
| isEligible | boolean | 当前是否符合保底条件：`enabled = true` 且 `hasTriggered = false` 且 `currentGlobalParticipationCount < onNthParticipation` |
| remainingUntilGuarantee | number | 距触发保底还需参与几次；已触发则为 `0` |

**错误响应**

| HTTP 状态码 | 说明 |
|------------|------|
| 401 | 未登录或 token 无效 |

---

## 前端使用建议

### isEligible 为 true 时

用户下一次或本次参与有机会触发保底，可展示引导文案，例如：

> 🎉 首次参与必中！现在购买，保底赢得奖品。

### hasTriggered 为 true 时

用户已享受过保底，后续参与恢复正常概率，无需展示保底相关提示。

### enabled 为 false 时

保底功能已关闭，隐藏所有保底相关文案与入口。

### remainingUntilGuarantee 大于 1 时

用户需要再参与若干次才能触发保底，可展示进度提示，例如：

> 再参与 2 次即可触发保底中奖！

---

## 注意事项

- 本接口为**只读**查询，不触发任何业务逻辑
- 每次调用实时查询，数据无缓存，参与后立即反映最新状态
- 常规参与次数统计**不包含**：新用户免费机会参与、保底私有轮次参与
- 保底触发后，私有轮次开奖结果会出现在用户的**中奖历史**（`GET /my-wins`）中
