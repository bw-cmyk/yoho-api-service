# 安全审计报告

**项目名称：** YOHO API Service (加密货币平台)
**审计日期：** 2026-02-06
**审计人员：** Security Review Agent
**审计范围：** 全代码库安全审计

---

## 执行摘要

本次审计针对 YOHO 加密货币平台的 NestJS API 服务进行了全面的安全检查。由于该平台处理真实资金和加密货币交易，发现的安全漏洞具有极高的风险等级。

### 问题统计

| 严重程度 | 数量 | 状态 |
|---------|------|------|
| 🔴 严重 (Critical) | 8 | 需立即修复 |
| 🟠 高危 (High) | 9 | 上线前必须修复 |
| 🟡 中危 (Medium) | 7 | 建议尽快修复 |
| 🔵 低危 (Low) | 4 | 建议修复 |
| **总计** | **28** | |

**总体风险评级：🔴 严重 (CRITICAL)**

### 主要风险类别

1. **硬编码密钥问题** - 4个严重问题
2. **缺失认证/授权** - 6个严重/高危问题
3. **敏感信息泄露** - 5个高危/中危问题
4. **安全配置错误** - 6个高危/中危问题
5. **输入验证不足** - 4个中危问题
6. **其他安全问题** - 3个低危问题

---

## 🔴 严重问题 (Critical) - 需立即修复

### 1. 硬编码的 JWT 密钥 (认证绕过)

**文件位置：** `src/common-modules/auth/auth.module.ts:15`
**CWE-798:** Use of Hard-coded Credentials
**CVSS评分：** 9.8 (Critical)

#### 问题描述

JWT 密钥直接硬编码在源代码中：

```typescript
JwtModule.register({
  secret: 'w40Obx1sz0ynrEOAyLoYPX0ciU95uoN5Xu-7tARvKEE=',
  signOptions: { expiresIn: '24h' },
}),
```

#### 风险影响

- ✅ **认证完全绕过** - 任何获取源代码的人可以伪造有效 JWT token
- ✅ **账户完全接管** - 攻击者可以冒充任何用户（包括管理员）
- ✅ **资金被盗风险** - 可以访问任何用户的钱包和资产
- ✅ **合规违规** - 违反 PCI DSS、SOC 2 等安全标准

#### 攻击场景

```bash
# 攻击者使用暴露的密钥伪造 token
import jwt from 'jsonwebtoken';

const fakeToken = jwt.sign(
  { userId: 'any-user-id', role: 'admin' },
  'w40Obx1sz0ynrEOAyLoYPX0ciU95uoN5Xu-7tARvKEE=',
  { expiresIn: '24h' }
);

# 使用伪造的 token 访问所有受保护的端点
curl -H "Authorization: Bearer ${fakeToken}" https://api.yoho.app/api/v1/user/profile
```

#### 修复方案

**步骤 1：** 修改 `src/common-modules/auth/auth.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtStrategy } from './jwt.strategy';
import { HeaderApiKeyStrategy } from './headerapikey.strategy';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    // 使用异步配置从环境变量读取密钥
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        const secret = configService.get<string>('JWT_SECRET');

        // 如果密钥未设置，应用启动失败（fail-fast 原则）
        if (!secret || secret.length < 32) {
          throw new Error(
            'JWT_SECRET environment variable must be set and at least 32 characters long'
          );
        }

        return {
          secret,
          signOptions: {
            expiresIn: '24h',
            issuer: 'yoho-api',
            audience: 'yoho-users',
          },
        };
      },
      inject: [ConfigService],
    }),
  ],
  providers: [JwtStrategy, HeaderApiKeyStrategy],
  exports: [JwtModule, PassportModule],
})
export class AuthModule {}
```

**步骤 2：** 生成强密钥并添加到环境变量

```bash
# 生成 256-bit 随机密钥
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# 输出示例: 8xKzP+vN2mQ7rY4fE9wH3sT6aL1uC5dG0iJ8bV9nM2k=
```

**步骤 3：** 更新环境变量配置

在 `.env.example` 和生产环境中添加：

```bash
# JWT Configuration (生成方法: node -e "console.log(require('crypto').randomBytes(32).toString('base64'))")
JWT_SECRET=YOUR_GENERATED_SECRET_HERE

# 注意：不同环境使用不同的密钥
# Development: .env.development
# Staging: .env.staging
# Production: Heroku Config Vars
```

**步骤 4：** 在 Heroku 上设置环境变量

```bash
# 为生产环境设置密钥
heroku config:set JWT_SECRET="YOUR_GENERATED_SECRET_HERE" -a yoho-api-production

# 为 staging 环境设置不同的密钥
heroku config:set JWT_SECRET="ANOTHER_GENERATED_SECRET" -a yoho-api-staging
```

#### 验证修复

```bash
# 1. 删除硬编码密钥后，未设置环境变量时应用应启动失败
npm run start:dev
# 预期输出: Error: JWT_SECRET environment variable must be set...

# 2. 设置环境变量后应用正常启动
export JWT_SECRET="8xKzP+vN2mQ7rY4fE9wH3sT6aL1uC5dG0iJ8bV9nM2k="
npm run start:dev
# 预期输出: Application is running on: http://localhost:3001

# 3. 使用旧密钥生成的 token 应被拒绝
curl -H "Authorization: Bearer OLD_TOKEN" http://localhost:3001/api/v1/user/profile
# 预期输出: 401 Unauthorized
```

---

### 2. JWT Strategy 中的硬编码密钥 (认证绕过)

**文件位置：** `src/common-modules/auth/jwt.strategy.ts:11`
**CWE-798:** Use of Hard-coded Credentials
**CVSS评分：** 9.8 (Critical)

#### 问题描述

JWT Strategy 中使用了不同的硬编码密钥：

```typescript
constructor() {
  super({
    jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
    ignoreExpiration: false,
    secretOrKey: 'P-w8Iewr3efdfd8r-dsdsrew4556y6vwq=',
  });
}
```

#### 风险影响

- 与问题 #1 相同，但更严重的是：**使用了不同的密钥**
- 这可能导致 JWT 签名和验证不匹配，破坏整个认证系统

#### 修复方案

**修改 `src/common-modules/auth/jwt.strategy.ts`：**

```typescript
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private configService: ConfigService) {
    const secret = configService.get<string>('JWT_SECRET');

    if (!secret) {
      throw new Error('JWT_SECRET must be configured in JwtStrategy');
    }

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
      // 添加额外的验证选项
      issuer: 'yoho-api',
      audience: 'yoho-users',
    });
  }

  async validate(payload: any) {
    // 验证 payload 结构
    if (!payload.id) {
      throw new UnauthorizedException('Invalid token payload');
    }

    // 可以在这里添加额外的验证逻辑，例如：
    // - 检查用户是否仍然存在
    // - 检查用户是否被禁用
    // - 检查 token 是否在黑名单中

    return {
      id: payload.id,
      email: payload.email,
      role: payload.role,
    };
  }
}
```

#### 验证修复

创建测试文件 `src/common-modules/auth/jwt.strategy.spec.ts`：

```typescript
import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { JwtStrategy } from './jwt.strategy';

describe('JwtStrategy', () => {
  it('should throw error if JWT_SECRET is not configured', () => {
    const configService = {
      get: jest.fn().mockReturnValue(undefined),
    };

    expect(() => {
      new JwtStrategy(configService as any);
    }).toThrow('JWT_SECRET must be configured');
  });

  it('should validate payload correctly', async () => {
    const configService = {
      get: jest.fn().mockReturnValue('test-secret'),
    };

    const strategy = new JwtStrategy(configService as any);
    const result = await strategy.validate({
      id: '123',
      email: 'test@example.com',
      role: 'user',
    });

    expect(result).toEqual({
      id: '123',
      email: 'test@example.com',
      role: 'user',
    });
  });
});
```

---

### 3. 硬编码的 Session 密钥 (会话劫持)

**文件位置：** `src/main.ts:61`
**CWE-798:** Use of Hard-coded Credentials
**CVSS评分：** 8.5 (High)

#### 问题描述

Express Session 使用弱密钥：

```typescript
app.use(
  session({
    store: new RedisStore({ client: redis }),
    secret: 'my-secret',
    resave: false,
    saveUninitialized: false,
  }),
);
```

#### 风险影响

- ✅ **会话劫持** - 攻击者可以伪造会话 cookie
- ✅ **CSRF 攻击** - 弱密钥使 CSRF token 容易被破解
- ✅ **会话重放攻击** - 攻击者可以重用或修改会话数据

#### 修复方案

**修改 `src/main.ts`：**

```typescript
import * as session from 'express-session';
import * as RedisStore from 'connect-redis';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  // 获取配置
  const sessionSecret = configService.get<string>('SESSION_SECRET');
  const nodeEnv = configService.get<string>('NODE_ENV');

  // 验证密钥必须存在
  if (!sessionSecret || sessionSecret.length < 32) {
    throw new Error(
      'SESSION_SECRET environment variable must be set and at least 32 characters long'
    );
  }

  // Redis 客户端配置
  const redis = createRedisClient(configService);

  // 配置会话
  app.use(
    session({
      store: new RedisStore({
        client: redis,
        prefix: 'yoho:sess:',
        ttl: 86400, // 24 小时
      }),
      secret: sessionSecret,
      resave: false,
      saveUninitialized: false,
      name: 'yoho.sid', // 自定义 cookie 名称，避免使用默认的 connect.sid
      cookie: {
        secure: nodeEnv === 'production', // 生产环境强制 HTTPS
        httpOnly: true, // 防止 XSS 攻击
        maxAge: 86400000, // 24 小时
        sameSite: 'strict', // 防止 CSRF 攻击
        domain: nodeEnv === 'production' ? '.yoho.app' : undefined,
      },
      rolling: true, // 每次请求刷新过期时间
    }),
  );

  // ... 其余代码
}
```

**添加到 `.env.example`：**

```bash
# Session Secret (生成方法: node -e "console.log(require('crypto').randomBytes(32).toString('base64'))")
SESSION_SECRET=YOUR_SESSION_SECRET_HERE

# 注意：生产环境必须使用不同的密钥
```

**生成并设置密钥：**

```bash
# 生成密钥
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# 设置到 Heroku
heroku config:set SESSION_SECRET="YOUR_GENERATED_SECRET" -a yoho-api-production
```

#### 验证修复

```bash
# 测试会话功能
curl -c cookies.txt http://localhost:3001/api/v1/user/login -d '{"email":"test@example.com"}'
curl -b cookies.txt http://localhost:3001/api/v1/user/profile

# 验证 cookie 属性
# 应该看到: secure=true (生产环境), httpOnly=true, sameSite=strict
```

---

### 4. 管理员 JWT 密钥有弱回退值

**文件位置：** `src/api-modules/admin/admin.module.ts:60`
**CWE-798:** Use of Hard-coded Credentials
**CVSS评分：** 9.5 (Critical)

#### 问题描述

管理员 JWT 配置使用了危险的回退值：

```typescript
JwtModule.register({
  secret: process.env.JWT_SECRET || 'admin-secret-key',
  signOptions: { expiresIn: '24h' },
}),
```

#### 风险影响

- ✅ **管理员账户被接管** - 如果 JWT_SECRET 未设置，使用弱密钥
- ✅ **系统完全控制** - 攻击者获得管理员权限后可以：
  - 修改所有用户数据
  - 窃取资金
  - 删除数据
  - 关闭系统

#### 修复方案

**修改 `src/api-modules/admin/admin.module.ts`：**

```typescript
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AdminJwtStrategy } from './strategies/admin-jwt.strategy';
import { GoogleStrategy } from './strategies/google.strategy';
import { AdminAuthController } from './controllers/admin-auth.controller';
import { AdminAuthService } from './services/admin-auth.service';

@Module({
  imports: [
    ConfigModule,
    PassportModule.register({ defaultStrategy: 'admin-jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        // 使用单独的管理员 JWT 密钥，与用户 JWT 分离
        const adminSecret = configService.get<string>('ADMIN_JWT_SECRET');

        if (!adminSecret || adminSecret.length < 32) {
          throw new Error(
            'ADMIN_JWT_SECRET environment variable must be set and at least 32 characters long. ' +
            'This is separate from JWT_SECRET to provide additional security for admin access.'
          );
        }

        return {
          secret: adminSecret,
          signOptions: {
            expiresIn: '8h', // 管理员 token 更短的过期时间
            issuer: 'yoho-admin-api',
            audience: 'yoho-admin',
          },
        };
      },
      inject: [ConfigService],
    }),
  ],
  controllers: [AdminAuthController],
  providers: [AdminAuthService, AdminJwtStrategy, GoogleStrategy],
  exports: [AdminAuthService],
})
export class AdminModule {}
```

**修改 `src/api-modules/admin/strategies/admin-jwt.strategy.ts`：**

```typescript
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { AdminAuthService } from '../services/admin-auth.service';

@Injectable()
export class AdminJwtStrategy extends PassportStrategy(Strategy, 'admin-jwt') {
  constructor(
    private configService: ConfigService,
    private adminAuthService: AdminAuthService,
  ) {
    const secret = configService.get<string>('ADMIN_JWT_SECRET');

    if (!secret) {
      throw new Error('ADMIN_JWT_SECRET must be configured');
    }

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
      issuer: 'yoho-admin-api',
      audience: 'yoho-admin',
    });
  }

  async validate(payload: any) {
    // 验证管理员用户仍然存在且有权限
    const admin = await this.adminAuthService.validateAdminById(payload.id);

    if (!admin) {
      throw new UnauthorizedException('Admin user not found or access revoked');
    }

    // 可以添加额外的检查，例如：
    // - 检查 IP 白名单
    // - 检查是否启用了 2FA
    // - 检查最后密码修改时间

    return admin;
  }
}
```

**更新环境变量：**

```bash
# .env.example
# Admin JWT Secret (必须与 JWT_SECRET 不同，提供额外的安全层)
ADMIN_JWT_SECRET=YOUR_ADMIN_JWT_SECRET_HERE

# 生成并设置
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
heroku config:set ADMIN_JWT_SECRET="YOUR_ADMIN_SECRET" -a yoho-api-production
```

#### 额外安全措施

**在 `src/api-modules/admin/guards/admin-jwt.guard.ts` 中添加 IP 白名单：**

```typescript
import { Injectable, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AdminJwtGuard extends AuthGuard('admin-jwt') {
  constructor(private configService: ConfigService) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();

    // 可选：在生产环境启用 IP 白名单
    if (this.configService.get('NODE_ENV') === 'production') {
      const allowedIPs = this.configService.get<string>('ADMIN_ALLOWED_IPS')?.split(',') || [];
      const clientIP = request.ip || request.connection.remoteAddress;

      if (allowedIPs.length > 0 && !allowedIPs.includes(clientIP)) {
        throw new UnauthorizedException(
          `Admin access not allowed from IP: ${clientIP}`
        );
      }
    }

    return super.canActivate(context);
  }
}
```

---

### 5. OAuth 重定向 URL 验证被禁用 (开放重定向)

**文件位置：** `src/api-modules/user/socialmedia/utils.ts:1-18`
**CWE-601:** URL Redirection to Untrusted Site ('Open Redirect')
**CVSS评分：** 9.0 (Critical)

#### 问题描述

URL 验证函数被完全禁用，永远返回 true：

```typescript
export const isValidUltiverseUrl = (urlString: string) => {
  const url = new URL(urlString);
  // const allowedDomains = ['.ultiverse.io', ...];
  // 所有验证代码都被注释掉了
  return true;  // ⚠️ 永远返回 true
};
```

#### 风险影响

- ✅ **OAuth token 被盗** - 攻击者可以将 OAuth 回调重定向到恶意网站
- ✅ **钓鱼攻击** - 使用合法的 OAuth 流程进行钓鱼
- ✅ **账户接管** - 通过窃取 OAuth token 接管用户账户

#### 攻击场景

```javascript
// 攻击者构造恶意 OAuth 链接
https://api.yoho.app/api/v1/auth/google?redirect_uri=https://evil.com/steal

// 用户点击后：
// 1. 用户授权 Google OAuth
// 2. Google 回调到 https://evil.com/steal?code=OAUTH_CODE
// 3. 攻击者获取 OAuth code
// 4. 攻击者使用 code 换取 access token
// 5. 攻击者访问用户账户
```

#### 修复方案

**修改 `src/api-modules/user/socialmedia/utils.ts`：**

```typescript
/**
 * 验证重定向 URL 是否属于允许的域名白名单
 *
 * @param urlString - 要验证的 URL
 * @returns 如果 URL 合法返回 true，否则返回 false
 * @throws Error 如果 URL 格式无效
 */
export const isValidUltiverseUrl = (urlString: string): boolean => {
  try {
    const url = new URL(urlString);

    // 允许的域名白名单
    const allowedDomains = [
      '.ultiverse.io',
      '.ultiverse.dev',
      '.yoho.app',
      'yoho.app',
      'ultiverse.io',
    ];

    // 生产环境只允许白名单域名
    if (process.env.NODE_ENV === 'production') {
      return allowedDomains.some(domain => {
        if (domain.startsWith('.')) {
          // 支持子域名匹配：.example.com 匹配 app.example.com
          return url.hostname.endsWith(domain) || url.hostname === domain.substring(1);
        }
        // 精确匹配
        return url.hostname === domain;
      });
    }

    // 开发/测试环境额外允许 localhost
    if (process.env.NODE_ENV !== 'production') {
      const isLocalhost = url.hostname === 'localhost' ||
                          url.hostname === '127.0.0.1' ||
                          url.hostname.endsWith('.localhost');

      if (isLocalhost) {
        return true;
      }
    }

    // 检查是否在白名单中
    return allowedDomains.some(domain => {
      if (domain.startsWith('.')) {
        return url.hostname.endsWith(domain) || url.hostname === domain.substring(1);
      }
      return url.hostname === domain;
    });

  } catch (error) {
    // URL 格式无效
    console.error('Invalid URL format:', urlString, error);
    return false;
  }
};

/**
 * 获取默认的重定向 URL（如果客户端没有提供）
 */
export const getDefaultRedirectUrl = (): string => {
  if (process.env.NODE_ENV === 'production') {
    return 'https://yoho.app';
  }
  return process.env.DEFAULT_REDIRECT_URL || 'http://localhost:3000';
};

/**
 * 安全地处理重定向 URL
 * 如果 URL 无效，返回默认 URL
 */
export const getSafeRedirectUrl = (urlString: string | undefined): string => {
  if (!urlString) {
    return getDefaultRedirectUrl();
  }

  if (isValidUltiverseUrl(urlString)) {
    return urlString;
  }

  console.warn('Invalid redirect URL attempted:', urlString);
  return getDefaultRedirectUrl();
};
```

**添加单元测试 `src/api-modules/user/socialmedia/utils.spec.ts`：**

```typescript
import { isValidUltiverseUrl, getSafeRedirectUrl } from './utils';

describe('URL Validation', () => {
  beforeEach(() => {
    process.env.NODE_ENV = 'production';
  });

  describe('isValidUltiverseUrl', () => {
    it('should allow whitelisted domains', () => {
      expect(isValidUltiverseUrl('https://yoho.app')).toBe(true);
      expect(isValidUltiverseUrl('https://www.yoho.app')).toBe(true);
      expect(isValidUltiverseUrl('https://app.yoho.app')).toBe(true);
      expect(isValidUltiverseUrl('https://ultiverse.io')).toBe(true);
      expect(isValidUltiverseUrl('https://app.ultiverse.io')).toBe(true);
    });

    it('should reject non-whitelisted domains', () => {
      expect(isValidUltiverseUrl('https://evil.com')).toBe(false);
      expect(isValidUltiverseUrl('https://yoho.app.evil.com')).toBe(false);
      expect(isValidUltiverseUrl('https://fake-yoho.app')).toBe(false);
    });

    it('should reject invalid URLs', () => {
      expect(isValidUltiverseUrl('not-a-url')).toBe(false);
      expect(isValidUltiverseUrl('javascript:alert(1)')).toBe(false);
    });

    it('should allow localhost in development', () => {
      process.env.NODE_ENV = 'development';
      expect(isValidUltiverseUrl('http://localhost:3000')).toBe(true);
      expect(isValidUltiverseUrl('http://127.0.0.1:3000')).toBe(true);
    });

    it('should reject localhost in production', () => {
      process.env.NODE_ENV = 'production';
      expect(isValidUltiverseUrl('http://localhost:3000')).toBe(false);
    });
  });

  describe('getSafeRedirectUrl', () => {
    it('should return valid URL as-is', () => {
      const validUrl = 'https://yoho.app/callback';
      expect(getSafeRedirectUrl(validUrl)).toBe(validUrl);
    });

    it('should return default for invalid URL', () => {
      const invalidUrl = 'https://evil.com';
      const result = getSafeRedirectUrl(invalidUrl);
      expect(result).toBe('https://yoho.app');
    });

    it('should return default for undefined', () => {
      const result = getSafeRedirectUrl(undefined);
      expect(result).toBe('https://yoho.app');
    });
  });
});
```

**更新所有 OAuth 策略使用安全验证：**

修改 `src/api-modules/user/socialmedia/strategies/*.strategy.ts`：

```typescript
import { getSafeRedirectUrl } from '../utils';

// 在所有 OAuth callback 中使用
async callback(req: Request, res: Response) {
  const redirectUrl = getSafeRedirectUrl(req.query.redirect_uri as string);

  // ... 处理 OAuth

  res.redirect(redirectUrl);
}
```

---

### 6. 支付 Webhook 端点缺少认证 (支付欺诈)

**文件位置：** `src/api-modules/pay/controllers/pay.controller.ts:35-42`
**CWE-306:** Missing Authentication for Critical Function
**CVSS评分：** 9.8 (Critical)

#### 问题描述

支付 webhook 端点完全没有认证或签名验证：

```typescript
@Post('/webhook')
async handleWebhook(@Req() req: ExpressRequest) {
  console.log('Webhook received:', req.body);
  return { success: true };
}
```

#### 风险影响

- ✅ **支付欺诈** - 攻击者可以伪造支付成功通知
- ✅ **资金损失** - 虚假充值导致平台资金损失
- ✅ **用户欺诈** - 用户使用虚假充值进行提现

#### 攻击场景

```bash
# 攻击者发送伪造的支付成功通知
curl -X POST https://api.yoho.app/api/v1/pay/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "event": "payment.success",
    "user_id": "victim-user-id",
    "amount": "10000",
    "currency": "USDT"
  }'

# 系统接受伪造通知，为用户充值 10000 USDT
# 攻击者提现 → 平台资金损失
```

#### 修复方案

**步骤 1：** 创建 Webhook 签名验证服务

创建 `src/api-modules/pay/services/webhook-signature.service.ts`：

```typescript
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

@Injectable()
export class WebhookSignatureService {
  constructor(private configService: ConfigService) {}

  /**
   * 验证 Webhook 签名
   *
   * @param payload - Webhook 请求体
   * @param signature - 请求头中的签名
   * @param timestamp - 请求头中的时间戳
   * @param provider - 支付提供商 (alchemy-pay, onramper, etc.)
   * @returns 签名是否有效
   */
  verifyWebhookSignature(
    payload: any,
    signature: string,
    timestamp: string,
    provider: 'alchemy-pay' | 'onramper',
  ): boolean {
    // 1. 检查时间戳，防止重放攻击（5分钟内有效）
    const now = Date.now();
    const requestTime = parseInt(timestamp, 10);
    const fiveMinutes = 5 * 60 * 1000;

    if (Math.abs(now - requestTime) > fiveMinutes) {
      console.warn('Webhook timestamp expired:', {
        now,
        requestTime,
        diff: now - requestTime,
      });
      return false;
    }

    // 2. 根据不同提供商验证签名
    switch (provider) {
      case 'alchemy-pay':
        return this.verifyAlchemyPaySignature(payload, signature, timestamp);
      case 'onramper':
        return this.verifyOnramperSignature(payload, signature, timestamp);
      default:
        console.error('Unknown payment provider:', provider);
        return false;
    }
  }

  private verifyAlchemyPaySignature(
    payload: any,
    signature: string,
    timestamp: string,
  ): boolean {
    const secret = this.configService.get<string>('ALCHEMY_PAY_WEBHOOK_SECRET');

    if (!secret) {
      throw new Error('ALCHEMY_PAY_WEBHOOK_SECRET not configured');
    }

    // Alchemy Pay 签名算法: HMAC-SHA256(timestamp + payload)
    const message = timestamp + JSON.stringify(payload);
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(message)
      .digest('hex');

    // 使用时间安全的比较防止时序攻击
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature),
    );
  }

  private verifyOnramperSignature(
    payload: any,
    signature: string,
    timestamp: string,
  ): boolean {
    const secret = this.configService.get<string>('ONRAMPER_WEBHOOK_SECRET');

    if (!secret) {
      throw new Error('ONRAMPER_WEBHOOK_SECRET not configured');
    }

    // OnRamper 签名算法
    const message = timestamp + JSON.stringify(payload);
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(message)
      .digest('base64');

    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature),
    );
  }

  /**
   * 生成 webhook 签名（用于测试）
   */
  generateSignature(
    payload: any,
    timestamp: string,
    provider: string,
  ): string {
    const secret = this.configService.get<string>(
      `${provider.toUpperCase()}_WEBHOOK_SECRET`,
    );

    const message = timestamp + JSON.stringify(payload);
    return crypto.createHmac('sha256', secret).update(message).digest('hex');
  }
}
```

**步骤 2：** 创建 Webhook Guard

创建 `src/api-modules/pay/guards/webhook.guard.ts`：

```typescript
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { Request } from 'express';
import { WebhookSignatureService } from '../services/webhook-signature.service';

@Injectable()
export class WebhookGuard implements CanActivate {
  constructor(private webhookSignatureService: WebhookSignatureService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();

    // 获取必需的请求头
    const signature = request.headers['x-webhook-signature'] as string;
    const timestamp = request.headers['x-webhook-timestamp'] as string;
    const provider = request.headers['x-payment-provider'] as string;

    // 验证必需的头部存在
    if (!signature || !timestamp || !provider) {
      throw new BadRequestException(
        'Missing required webhook headers: x-webhook-signature, x-webhook-timestamp, x-payment-provider',
      );
    }

    // 验证 provider 有效
    if (!['alchemy-pay', 'onramper'].includes(provider)) {
      throw new BadRequestException(`Invalid payment provider: ${provider}`);
    }

    // 验证签名
    const isValid = this.webhookSignatureService.verifyWebhookSignature(
      request.body,
      signature,
      timestamp,
      provider as any,
    );

    if (!isValid) {
      console.error('Invalid webhook signature:', {
        provider,
        timestamp,
        signature,
        body: request.body,
      });
      throw new UnauthorizedException('Invalid webhook signature');
    }

    return true;
  }
}
```

**步骤 3：** 更新 Pay Controller

修改 `src/api-modules/pay/controllers/pay.controller.ts`：

```typescript
import {
  Controller,
  Post,
  Req,
  UseGuards,
  HttpCode,
  Headers,
} from '@nestjs/common';
import { Request as ExpressRequest } from 'express';
import { WebhookGuard } from '../guards/webhook.guard';
import { PayService } from '../services/pay.service';

@Controller('api/v1/pay')
export class PayController {
  constructor(private readonly payService: PayService) {}

  @Post('/webhook')
  @HttpCode(200)
  @UseGuards(WebhookGuard) // 添加签名验证守卫
  async handleWebhook(
    @Req() req: ExpressRequest,
    @Headers('x-payment-provider') provider: string,
  ) {
    try {
      // 签名已验证，安全处理 webhook
      console.log('Valid webhook received:', {
        provider,
        event: req.body.event,
        orderId: req.body.orderId,
      });

      // 处理 webhook 数据
      await this.payService.processWebhook(provider, req.body);

      return {
        success: true,
        message: 'Webhook processed successfully',
      };
    } catch (error) {
      console.error('Webhook processing error:', error);

      // 仍然返回成功，避免支付提供商重试
      // 但记录错误用于后续处理
      await this.payService.logWebhookError(provider, req.body, error);

      return {
        success: true,
        message: 'Webhook received',
      };
    }
  }

  // 测试端点（仅开发环境）
  @Post('/webhook/test')
  @HttpCode(200)
  async testWebhook(@Req() req: ExpressRequest) {
    if (process.env.NODE_ENV === 'production') {
      throw new UnauthorizedException('Test endpoint not available in production');
    }

    return await this.handleWebhook(req, 'alchemy-pay');
  }
}
```

**步骤 4：** 实现 Webhook 处理服务

更新 `src/api-modules/pay/services/pay.service.ts`：

```typescript
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaymentTransaction } from '../entities/payment-transaction.entity';
import { AssetService } from '../../assets/services/asset.service';

@Injectable()
export class PayService {
  constructor(
    @InjectRepository(PaymentTransaction)
    private paymentRepo: Repository<PaymentTransaction>,
    private assetService: AssetService,
  ) {}

  async processWebhook(provider: string, payload: any): Promise<void> {
    // 1. 解析 webhook 数据
    const { event, orderId, userId, amount, currency, status } = this.parseWebhookPayload(provider, payload);

    // 2. 检查是否已处理过（防止重复处理）
    const existingTx = await this.paymentRepo.findOne({
      where: { orderId, provider },
    });

    if (existingTx) {
      console.warn('Webhook already processed:', orderId);
      return;
    }

    // 3. 创建交易记录
    const transaction = this.paymentRepo.create({
      orderId,
      provider,
      userId,
      amount,
      currency,
      status,
      webhookPayload: payload,
      processedAt: new Date(),
    });

    await this.paymentRepo.save(transaction);

    // 4. 如果支付成功，更新用户余额
    if (status === 'success') {
      await this.assetService.deposit({
        userId,
        amount,
        currency,
        source: 'onramp',
        orderId,
      });

      console.log('Payment processed successfully:', {
        orderId,
        userId,
        amount,
        currency,
      });
    }
  }

  private parseWebhookPayload(provider: string, payload: any) {
    // 根据不同提供商解析不同的 payload 格式
    switch (provider) {
      case 'alchemy-pay':
        return {
          event: payload.event,
          orderId: payload.orderNo,
          userId: payload.merchantOrderNo,
          amount: payload.cryptoAmount,
          currency: payload.cryptoCurrency,
          status: payload.status === 'COMPLETED' ? 'success' : 'pending',
        };

      case 'onramper':
        return {
          event: payload.type,
          orderId: payload.orderId,
          userId: payload.walletAddress, // 需要映射到用户ID
          amount: payload.outputAmount,
          currency: payload.outputCurrency,
          status: payload.status === 'completed' ? 'success' : 'pending',
        };

      default:
        throw new Error(`Unknown provider: ${provider}`);
    }
  }

  async logWebhookError(provider: string, payload: any, error: any): Promise<void> {
    // 记录 webhook 处理错误，用于后续人工处理
    console.error('Webhook error:', {
      provider,
      payload,
      error: error.message,
      stack: error.stack,
    });

    // 可以保存到数据库或发送告警
  }
}
```

**步骤 5：** 添加环境变量

```bash
# .env.example
# Alchemy Pay Webhook Secret
ALCHEMY_PAY_WEBHOOK_SECRET=your_alchemy_pay_webhook_secret_here

# OnRamper Webhook Secret
ONRAMPER_WEBHOOK_SECRET=your_onramper_webhook_secret_here
```

**步骤 6：** 配置支付提供商

在 Alchemy Pay 和 OnRamper 后台配置 webhook URL 和密钥：

```
Webhook URL: https://api.yoho.app/api/v1/pay/webhook
Webhook Secret: (从后台获取并添加到环境变量)
```

#### 测试验证

创建测试脚本 `test/webhook-test.ts`：

```typescript
import * as crypto from 'crypto';
import axios from 'axios';

const WEBHOOK_SECRET = 'your_test_secret';
const WEBHOOK_URL = 'http://localhost:3001/api/v1/pay/webhook';

async function testWebhook() {
  const payload = {
    event: 'payment.success',
    orderNo: 'ORDER-' + Date.now(),
    merchantOrderNo: 'user-123',
    cryptoAmount: '100',
    cryptoCurrency: 'USDT',
    status: 'COMPLETED',
  };

  const timestamp = Date.now().toString();
  const message = timestamp + JSON.stringify(payload);
  const signature = crypto
    .createHmac('sha256', WEBHOOK_SECRET)
    .update(message)
    .digest('hex');

  try {
    const response = await axios.post(WEBHOOK_URL, payload, {
      headers: {
        'Content-Type': 'application/json',
        'x-webhook-signature': signature,
        'x-webhook-timestamp': timestamp,
        'x-payment-provider': 'alchemy-pay',
      },
    });

    console.log('Webhook test success:', response.data);
  } catch (error) {
    console.error('Webhook test failed:', error.response?.data || error.message);
  }
}

testWebhook();
```

---

### 7. 充值/提现 Hook 缺少认证 (资金操纵)

**文件位置：** `src/api-modules/assets/controllers/hook.controller.ts:16-21`
**CWE-306:** Missing Authentication for Critical Function
**CVSS评分：** 10.0 (Critical)

#### 问题描述

资产 hook 端点完全没有认证：

```typescript
@Post('/hooks')
async defenderHooksPost(@Request() req: ExpressRequest) {
  await this.hookService.processDefenderEvents(req.body.events || []);
  return {};
}
```

#### 风险影响

- ✅ **直接资金损失** - 攻击者可以注入虚假充值事件
- ✅ **余额操纵** - 可以修改任何用户的余额
- ✅ **提现欺诈** - 创建虚假提现完成通知

#### 攻击场景

```bash
# 攻击者注入虚假充值事件
curl -X POST https://api.yoho.app/api/v1/assets/hooks \
  -H "Content-Type: application/json" \
  -d '{
    "events": [{
      "type": "deposit",
      "userId": "attacker-user-id",
      "amount": "1000000",
      "currency": "USDT",
      "txHash": "fake-tx-hash"
    }]
  }'

# 攻击者账户余额增加 1,000,000 USDT
# 攻击者提现 → 平台资金损失
```

#### 修复方案

**步骤 1：** 创建 OpenZeppelin Defender 签名验证服务

创建 `src/api-modules/assets/services/defender-signature.service.ts`：

```typescript
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

@Injectable()
export class DefenderSignatureService {
  constructor(private configService: ConfigService) {}

  /**
   * 验证 OpenZeppelin Defender webhook 签名
   *
   * @param payload - Webhook 请求体
   * @param signature - 请求头中的签名
   * @returns 签名是否有效
   */
  verifyDefenderSignature(payload: any, signature: string): boolean {
    const secret = this.configService.get<string>('DEFENDER_WEBHOOK_SECRET');

    if (!secret) {
      throw new Error('DEFENDER_WEBHOOK_SECRET not configured');
    }

    // OpenZeppelin Defender 使用 HMAC-SHA256
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(JSON.stringify(payload))
      .digest('hex');

    // 时间安全比较
    try {
      return crypto.timingSafeEqual(
        Buffer.from(signature, 'hex'),
        Buffer.from(expectedSignature, 'hex'),
      );
    } catch (error) {
      console.error('Signature comparison error:', error);
      return false;
    }
  }

  /**
   * 验证 Defender webhook 请求头
   */
  validateDefenderHeaders(headers: any): {
    signature: string;
    sentinelId: string;
  } {
    const signature = headers['x-defender-signature'];
    const sentinelId = headers['x-defender-sentinel-id'];

    if (!signature) {
      throw new Error('Missing x-defender-signature header');
    }

    if (!sentinelId) {
      throw new Error('Missing x-defender-sentinel-id header');
    }

    // 验证 sentinel ID 是否在白名单中
    const allowedSentinels = this.configService
      .get<string>('DEFENDER_ALLOWED_SENTINELS')
      ?.split(',') || [];

    if (allowedSentinels.length > 0 && !allowedSentinels.includes(sentinelId)) {
      throw new Error(`Unauthorized sentinel ID: ${sentinelId}`);
    }

    return { signature, sentinelId };
  }
}
```

**步骤 2：** 创建 Defender Guard

创建 `src/api-modules/assets/guards/defender.guard.ts`：

```typescript
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { Request } from 'express';
import { DefenderSignatureService } from '../services/defender-signature.service';

@Injectable()
export class DefenderGuard implements CanActivate {
  constructor(
    private defenderSignatureService: DefenderSignatureService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();

    try {
      // 1. 验证必需的请求头
      const { signature, sentinelId } =
        this.defenderSignatureService.validateDefenderHeaders(request.headers);

      // 2. 验证签名
      const isValid = this.defenderSignatureService.verifyDefenderSignature(
        request.body,
        signature,
      );

      if (!isValid) {
        console.error('Invalid Defender signature:', {
          sentinelId,
          body: request.body,
        });
        throw new UnauthorizedException('Invalid signature');
      }

      // 3. 将 sentinel ID 附加到请求（用于日志和审计）
      (request as any).defenderSentinelId = sentinelId;

      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new BadRequestException(error.message);
    }
  }
}
```

**步骤 3：** 更新 Hook Controller

修改 `src/api-modules/assets/controllers/hook.controller.ts`：

```typescript
import {
  Body,
  Controller,
  Post,
  Request,
  UseGuards,
  HttpCode,
  BadRequestException,
} from '@nestjs/common';
import { Request as ExpressRequest } from 'express';
import { DefenderGuard } from '../guards/defender.guard';
import { HookService } from '../services/hook.service';
import { DefenderEventDto } from '../dto/defender-event.dto';

@Controller('api/v1/assets')
export class HookController {
  constructor(private readonly hookService: HookService) {}

  /**
   * OpenZeppelin Defender webhook endpoint
   * 处理链上资产事件（充值、提现等）
   */
  @Post('/hooks')
  @HttpCode(200)
  @UseGuards(DefenderGuard) // 添加签名验证守卫
  async defenderHooksPost(
    @Request() req: ExpressRequest,
    @Body() body: { events: DefenderEventDto[] },
  ) {
    // 签名已验证，安全处理事件
    const sentinelId = (req as any).defenderSentinelId;

    console.log('Defender webhook received:', {
      sentinelId,
      eventCount: body.events?.length || 0,
    });

    // 验证事件数组
    if (!Array.isArray(body.events)) {
      throw new BadRequestException('events must be an array');
    }

    // 处理事件
    try {
      await this.hookService.processDefenderEvents(body.events);

      return {
        success: true,
        processed: body.events.length,
      };
    } catch (error) {
      console.error('Defender event processing error:', error);

      // 记录错误但返回成功，避免 Defender 重试
      await this.hookService.logDefenderError(sentinelId, body.events, error);

      return {
        success: true,
        message: 'Events received',
      };
    }
  }

  /**
   * 测试端点（仅开发环境）
   */
  @Post('/hooks/test')
  @HttpCode(200)
  async testHooks(@Body() body: any) {
    if (process.env.NODE_ENV === 'production') {
      throw new BadRequestException('Test endpoint not available in production');
    }

    return await this.hookService.processDefenderEvents(body.events || []);
  }
}
```

**步骤 4：** 创建 DTO 验证

创建 `src/api-modules/assets/dto/defender-event.dto.ts`：

```typescript
import { IsString, IsNotEmpty, IsNumber, IsEnum, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export enum DefenderEventType {
  DEPOSIT = 'deposit',
  WITHDRAWAL = 'withdrawal',
  TRANSFER = 'transfer',
}

export class DefenderEventDto {
  @IsEnum(DefenderEventType)
  type: DefenderEventType;

  @IsString()
  @IsNotEmpty()
  userId: string;

  @IsString()
  @IsNotEmpty()
  txHash: string;

  @IsString()
  @IsNotEmpty()
  amount: string;

  @IsString()
  @IsNotEmpty()
  currency: string;

  @IsNumber()
  chainId: number;

  @IsString()
  @IsNotEmpty()
  contractAddress: string;

  @IsString()
  @IsNotEmpty()
  fromAddress: string;

  @IsString()
  @IsNotEmpty()
  toAddress: string;

  @IsNumber()
  blockNumber: number;

  @IsNumber()
  timestamp: number;
}
```

**步骤 5：** 更新 Hook Service 添加幂等性检查

修改 `src/api-modules/assets/services/hook.service.ts`：

```typescript
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AssetService } from './asset.service';
import { DefenderEventDto } from '../dto/defender-event.dto';
import { ProcessedEvent } from '../entities/processed-event.entity';

@Injectable()
export class HookService {
  constructor(
    @InjectRepository(ProcessedEvent)
    private processedEventRepo: Repository<ProcessedEvent>,
    private assetService: AssetService,
  ) {}

  async processDefenderEvents(events: DefenderEventDto[]): Promise<void> {
    for (const event of events) {
      try {
        // 1. 检查事件是否已处理（幂等性）
        const existing = await this.processedEventRepo.findOne({
          where: {
            txHash: event.txHash,
            eventType: event.type,
          },
        });

        if (existing) {
          console.warn('Event already processed:', {
            txHash: event.txHash,
            type: event.type,
          });
          continue;
        }

        // 2. 记录事件开始处理
        const processedEvent = this.processedEventRepo.create({
          txHash: event.txHash,
          eventType: event.type,
          userId: event.userId,
          amount: event.amount,
          currency: event.currency,
          chainId: event.chainId,
          blockNumber: event.blockNumber,
          status: 'processing',
          rawEvent: event,
          processedAt: new Date(),
        });

        await this.processedEventRepo.save(processedEvent);

        // 3. 根据事件类型处理
        switch (event.type) {
          case 'deposit':
            await this.handleDeposit(event);
            break;

          case 'withdrawal':
            await this.handleWithdrawal(event);
            break;

          case 'transfer':
            await this.handleTransfer(event);
            break;

          default:
            console.warn('Unknown event type:', event.type);
        }

        // 4. 标记事件为已完成
        processedEvent.status = 'completed';
        await this.processedEventRepo.save(processedEvent);

        console.log('Event processed successfully:', {
          txHash: event.txHash,
          type: event.type,
          userId: event.userId,
        });

      } catch (error) {
        console.error('Event processing error:', {
          event,
          error: error.message,
        });

        // 标记为失败
        await this.processedEventRepo.update(
          { txHash: event.txHash, eventType: event.type },
          { status: 'failed', errorMessage: error.message },
        );
      }
    }
  }

  private async handleDeposit(event: DefenderEventDto): Promise<void> {
    // 验证充值金额
    const amount = parseFloat(event.amount);
    if (amount <= 0) {
      throw new Error('Invalid deposit amount');
    }

    // 更新用户余额
    await this.assetService.deposit({
      userId: event.userId,
      amount: event.amount,
      currency: event.currency,
      source: 'on-chain',
      txHash: event.txHash,
      chainId: event.chainId,
    });
  }

  private async handleWithdrawal(event: DefenderEventDto): Promise<void> {
    // 验证提现已完成
    await this.assetService.confirmWithdrawal({
      userId: event.userId,
      txHash: event.txHash,
      amount: event.amount,
      currency: event.currency,
    });
  }

  private async handleTransfer(event: DefenderEventDto): Promise<void> {
    // 记录内部转账
    console.log('Transfer event:', event);
  }

  async logDefenderError(
    sentinelId: string,
    events: DefenderEventDto[],
    error: any,
  ): Promise<void> {
    console.error('Defender webhook error:', {
      sentinelId,
      eventCount: events.length,
      error: error.message,
      stack: error.stack,
    });

    // 可以发送告警或保存到错误日志表
  }
}
```

**步骤 6：** 创建数据库实体

创建 `src/api-modules/assets/entities/processed-event.entity.ts`：

```typescript
import { Entity, Column, PrimaryGeneratedColumn, Index, CreateDateColumn } from 'typeorm';

@Entity('processed_events')
@Index(['txHash', 'eventType'], { unique: true })
export class ProcessedEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  txHash: string;

  @Column()
  eventType: string;

  @Column()
  userId: string;

  @Column()
  amount: string;

  @Column()
  currency: string;

  @Column()
  chainId: number;

  @Column()
  blockNumber: number;

  @Column({ default: 'processing' })
  status: 'processing' | 'completed' | 'failed';

  @Column({ nullable: true })
  errorMessage: string;

  @Column('jsonb')
  rawEvent: any;

  @CreateDateColumn()
  processedAt: Date;
}
```

**步骤 7：** 配置环境变量

```bash
# .env.example
# OpenZeppelin Defender Webhook Configuration
DEFENDER_WEBHOOK_SECRET=your_defender_webhook_secret_here
DEFENDER_ALLOWED_SENTINELS=sentinel-id-1,sentinel-id-2

# 从 OpenZeppelin Defender 控制台获取这些值：
# 1. 进入 Defender → Sentinels
# 2. 创建或编辑 Sentinel
# 3. 配置 Webhook URL: https://api.yoho.app/api/v1/assets/hooks
# 4. 复制 Webhook Secret 和 Sentinel ID
```

**步骤 8：** 配置 OpenZeppelin Defender

在 Defender 控制台：

```
Sentinel Configuration:
- Name: YOHO Deposit Monitor
- Network: Ethereum Mainnet / BSC / Polygon
- Contract Address: [Your deposit contract]
- Events to monitor: Deposit, Withdrawal
- Webhook URL: https://api.yoho.app/api/v1/assets/hooks
- Webhook Secret: [Generated secret]
```

#### 测试验证

创建测试脚本 `test/defender-webhook-test.ts`：

```typescript
import * as crypto from 'crypto';
import axios from 'axios';

const WEBHOOK_SECRET = 'your_test_secret';
const SENTINEL_ID = 'your_sentinel_id';
const WEBHOOK_URL = 'http://localhost:3001/api/v1/assets/hooks';

async function testDefenderWebhook() {
  const payload = {
    events: [
      {
        type: 'deposit',
        userId: 'test-user-123',
        txHash: '0x' + crypto.randomBytes(32).toString('hex'),
        amount: '100',
        currency: 'USDT',
        chainId: 56,
        contractAddress: '0x55d398326f99059ff775485246999027b3197955',
        fromAddress: '0xUserAddress',
        toAddress: '0xYohoDepositAddress',
        blockNumber: 12345678,
        timestamp: Date.now(),
      },
    ],
  };

  const signature = crypto
    .createHmac('sha256', WEBHOOK_SECRET)
    .update(JSON.stringify(payload))
    .digest('hex');

  try {
    const response = await axios.post(WEBHOOK_URL, payload, {
      headers: {
        'Content-Type': 'application/json',
        'x-defender-signature': signature,
        'x-defender-sentinel-id': SENTINEL_ID,
      },
    });

    console.log('Defender webhook test success:', response.data);
  } catch (error) {
    console.error('Defender webhook test failed:', error.response?.data || error.message);
  }
}

testDefenderWebhook();
```

---

### 8. IDOR 漏洞 - 可查询任意用户资产

**文件位置：** `src/api-modules/assets/controllers/asset.controller.ts:28-37`
**CWE-639:** Authorization Bypass Through User-Controlled Key
**CVSS评分：** 8.5 (High)

#### 问题描述

用户 ID 从查询参数获取，而不是从认证 token：

```typescript
@Get('chain-assets')
async getUserChainAssets(@Request() req: ExpressRequest) {
  const userId = req.query.userId;  // 来自 URL 参数，不是 JWT
  const assets = await this.assetService.updateUserChainAssets(
    userId as string,
  );
  return {
    user_id: userId,
  };
}
```

#### 风险影响

- ✅ **隐私泄露** - 攻击者可以查询任何用户的资产
- ✅ **信息收集** - 为进一步攻击收集情报
- ✅ **合规违规** - 违反数据保护法规

#### 攻击场景

```bash
# 攻击者枚举用户资产
for userId in $(seq 1 10000); do
  curl "https://api.yoho.app/api/v1/assets/chain-assets?userId=$userId"
done

# 获取所有用户的资产信息，找到高价值目标
```

#### 修复方案

**修改 `src/api-modules/assets/controllers/asset.controller.ts`：**

```typescript
import {
  Controller,
  Get,
  Post,
  Request,
  UseGuards,
  Query,
  Param,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { Request as ExpressRequest } from 'express';
import { JwtAuthGuard } from '../../common-modules/auth/jwt-auth.guard';
import { AdminJwtGuard } from '../admin/guards/admin-jwt.guard';
import { AssetService } from '../services/asset.service';

@Controller('api/v1/assets')
export class AssetController {
  constructor(private readonly assetService: AssetService) {}

  /**
   * 获取当前用户的链上资产
   * 用户只能查询自己的资产
   */
  @Get('chain-assets')
  @UseGuards(JwtAuthGuard) // 添加认证守卫
  async getUserChainAssets(@Request() req: ExpressRequest) {
    // 从 JWT token 获取用户 ID，不是从查询参数
    const { id: userId } = req.user as any;

    const assets = await this.assetService.updateUserChainAssets(userId);

    return {
      user_id: userId,
      assets,
    };
  }

  /**
   * 管理员端点：查询任意用户的资产
   * 仅管理员可以访问
   */
  @Get('admin/user/:userId/chain-assets')
  @UseGuards(AdminJwtGuard) // 需要管理员权限
  async getAdminUserChainAssets(
    @Param('userId') userId: string,
    @Request() req: ExpressRequest,
  ) {
    // 记录管理员访问日志（审计）
    const admin = req.user as any;
    console.log('Admin asset query:', {
      adminId: admin.id,
      adminEmail: admin.email,
      targetUserId: userId,
      timestamp: new Date(),
    });

    const assets = await this.assetService.updateUserChainAssets(userId);

    return {
      user_id: userId,
      assets,
      queried_by: admin.email,
    };
  }

  /**
   * 获取当前用户的所有资产余额
   */
  @Get('balances')
  @UseGuards(JwtAuthGuard)
  async getUserBalances(@Request() req: ExpressRequest) {
    const { id: userId } = req.user as any;

    const balances = await this.assetService.getUserBalances(userId);

    return {
      user_id: userId,
      balances,
    };
  }

  /**
   * 获取当前用户的交易历史
   */
  @Get('transactions')
  @UseGuards(JwtAuthGuard)
  async getUserTransactions(
    @Request() req: ExpressRequest,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
  ) {
    const { id: userId } = req.user as any;

    // 验证分页参数
    if (limit > 100) {
      throw new BadRequestException('Limit cannot exceed 100');
    }

    const transactions = await this.assetService.getUserTransactions(
      userId,
      page,
      limit,
    );

    return {
      user_id: userId,
      page,
      limit,
      transactions,
    };
  }

  /**
   * 创建用户资产快照
   * 现在需要管理员权限
   */
  @Get('/snapshot')
  @UseGuards(AdminJwtGuard) // 添加管理员守卫
  async getSnapshot(@Request() req: ExpressRequest) {
    const admin = req.user as any;

    // 记录快照创建（审计）
    console.log('Snapshot created by admin:', {
      adminId: admin.id,
      adminEmail: admin.email,
      timestamp: new Date(),
    });

    const snapshot = await this.assetService.createUserAssetSnapshots();

    return {
      success: true,
      snapshot_id: snapshot.id,
      user_count: snapshot.userCount,
      created_by: admin.email,
    };
  }
}
```

**添加审计日志服务：**

创建 `src/common-modules/audit/audit.service.ts`：

```typescript
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from './entities/audit-log.entity';

@Injectable()
export class AuditService {
  constructor(
    @InjectRepository(AuditLog)
    private auditRepo: Repository<AuditLog>,
  ) {}

  /**
   * 记录敏感操作
   */
  async log(data: {
    action: string;
    actorId: string;
    actorEmail: string;
    targetUserId?: string;
    details?: any;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<void> {
    const log = this.auditRepo.create({
      ...data,
      timestamp: new Date(),
    });

    await this.auditRepo.save(log);
  }

  /**
   * 查询审计日志
   */
  async getLogs(filters: {
    actorId?: string;
    action?: string;
    startDate?: Date;
    endDate?: Date;
    page?: number;
    limit?: number;
  }) {
    const query = this.auditRepo.createQueryBuilder('audit');

    if (filters.actorId) {
      query.andWhere('audit.actorId = :actorId', { actorId: filters.actorId });
    }

    if (filters.action) {
      query.andWhere('audit.action = :action', { action: filters.action });
    }

    if (filters.startDate) {
      query.andWhere('audit.timestamp >= :startDate', { startDate: filters.startDate });
    }

    if (filters.endDate) {
      query.andWhere('audit.timestamp <= :endDate', { endDate: filters.endDate });
    }

    const page = filters.page || 1;
    const limit = Math.min(filters.limit || 50, 100);
    const skip = (page - 1) * limit;

    const [logs, total] = await query
      .orderBy('audit.timestamp', 'DESC')
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return {
      logs,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}
```

**创建审计日志实体：**

```typescript
import { Entity, Column, PrimaryGeneratedColumn, Index, CreateDateColumn } from 'typeorm';

@Entity('audit_logs')
@Index(['actorId', 'timestamp'])
@Index(['action', 'timestamp'])
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  action: string; // 'view_user_assets', 'create_snapshot', etc.

  @Column()
  actorId: string; // 执行操作的用户/管理员 ID

  @Column()
  actorEmail: string;

  @Column({ nullable: true })
  targetUserId: string; // 受影响的用户 ID

  @Column('jsonb', { nullable: true })
  details: any; // 操作详情

  @Column({ nullable: true })
  ipAddress: string;

  @Column({ nullable: true })
  userAgent: string;

  @CreateDateColumn()
  timestamp: Date;
}
```

**使用审计服务：**

```typescript
@Get('admin/user/:userId/chain-assets')
@UseGuards(AdminJwtGuard)
async getAdminUserChainAssets(
  @Param('userId') userId: string,
  @Request() req: ExpressRequest,
) {
  const admin = req.user as any;

  // 记录审计日志
  await this.auditService.log({
    action: 'view_user_assets',
    actorId: admin.id,
    actorEmail: admin.email,
    targetUserId: userId,
    details: { assetType: 'chain-assets' },
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
  });

  const assets = await this.assetService.updateUserChainAssets(userId);

  return { user_id: userId, assets };
}
```

#### 测试验证

```bash
# 测试 1: 未认证访问应被拒绝
curl http://localhost:3001/api/v1/assets/chain-assets
# 预期: 401 Unauthorized

# 测试 2: 认证用户只能看到自己的资产
curl -H "Authorization: Bearer USER_TOKEN" \
  http://localhost:3001/api/v1/assets/chain-assets
# 预期: 返回当前用户的资产

# 测试 3: 尝试查询其他用户应失败（查询参数被忽略）
curl -H "Authorization: Bearer USER_TOKEN" \
  "http://localhost:3001/api/v1/assets/chain-assets?userId=other-user-id"
# 预期: 仍然返回当前用户的资产，忽略 userId 参数

# 测试 4: 管理员可以查询任意用户
curl -H "Authorization: Bearer ADMIN_TOKEN" \
  http://localhost:3001/api/v1/assets/admin/user/target-user-id/chain-assets
# 预期: 返回目标用户的资产，并记录审计日志
```

---

## 🟠 高危问题 (High) - 上线前必须修复

### 9. 用户资料更新存在批量赋值漏洞

**文件位置：** `src/api-modules/user/controller/user.controller.ts:51-62`
**CWE-915:** Improperly Controlled Modification of Dynamically-Determined Object Attributes
**CVSS评分：** 7.5 (High)

#### 问题描述

```typescript
@Post('/profile')
@HttpCode(200)
async updateProfile(@Request() req: ExpressRequest) {
  const { id } = req.user as any;
  await this.userService.updateUserProfile({
    id,
    ...req.body,  // 整个请求体被展开
  });
  return { success: true };
}
```

#### 风险影响

- 用户可能修改 `role`, `banned`, `wallet_address` 等敏感字段
- 权限提升攻击

#### 修复方案

**步骤 1：** 创建明确的 DTO

创建 `src/api-modules/user/dto/update-profile.dto.ts`：

```typescript
import { IsString, IsOptional, IsEmail, MaxLength, MinLength, Matches } from 'class-validator';

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  @Matches(/^[a-zA-Z0-9_-]+$/, {
    message: 'Username can only contain letters, numbers, underscores and hyphens',
  })
  username?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  bio?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  avatar?: string; // URL to avatar image

  @IsOptional()
  @IsString()
  @MaxLength(100)
  displayName?: string;

  // 不允许修改的字段：
  // - role (只能由管理员修改)
  // - banned (只能由管理员修改)
  // - wallet_address (只能通过单独的端点验证后修改)
  // - email (需要单独的验证流程)
}
```

**步骤 2：** 更新 Controller

```typescript
import {
  Controller,
  Post,
  Body,
  Request,
  UseGuards,
  HttpCode,
  BadRequestException,
} from '@nestjs/common';
import { Request as ExpressRequest } from 'express';
import { JwtAuthGuard } from '../../../common-modules/auth/jwt-auth.guard';
import { UpdateProfileDto } from '../dto/update-profile.dto';
import { UserService } from '../service/user.service';

@Controller('api/v1/user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post('/profile')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard)
  async updateProfile(
    @Request() req: ExpressRequest,
    @Body() updateDto: UpdateProfileDto, // 使用明确的 DTO
  ) {
    const { id } = req.user as any;

    // 更新用户资料
    const updatedUser = await this.userService.updateUserProfile(id, updateDto);

    return {
      success: true,
      user: {
        id: updatedUser.id,
        username: updatedUser.username,
        displayName: updatedUser.displayName,
        bio: updatedUser.bio,
        avatar: updatedUser.avatar,
      },
    };
  }

  /**
   * 单独的端点用于更改邮箱（需要验证）
   */
  @Post('/profile/email')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard)
  async updateEmail(
    @Request() req: ExpressRequest,
    @Body() body: { newEmail: string; verificationCode: string },
  ) {
    const { id } = req.user as any;

    // 验证验证码
    const isValid = await this.userService.verifyEmailCode(
      body.newEmail,
      body.verificationCode,
    );

    if (!isValid) {
      throw new BadRequestException('Invalid verification code');
    }

    // 更新邮箱
    await this.userService.updateUserEmail(id, body.newEmail);

    return { success: true };
  }

  /**
   * 单独的端点用于连接钱包（需要签名验证）
   */
  @Post('/profile/wallet')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard)
  async connectWallet(
    @Request() req: ExpressRequest,
    @Body() body: { walletAddress: string; signature: string; message: string },
  ) {
    const { id } = req.user as any;

    // 验证钱包签名
    const isValid = await this.userService.verifyWalletSignature(
      body.walletAddress,
      body.signature,
      body.message,
    );

    if (!isValid) {
      throw new BadRequestException('Invalid wallet signature');
    }

    // 连接钱包
    await this.userService.connectWallet(id, body.walletAddress);

    return { success: true };
  }
}
```

**步骤 3：** 更新 UserService

```typescript
import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { UpdateProfileDto } from '../dto/update-profile.dto';
import * as ethers from 'ethers';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private userRepo: Repository<User>,
  ) {}

  async updateUserProfile(
    userId: string,
    updateDto: UpdateProfileDto,
  ): Promise<User> {
    // 获取用户
    const user = await this.userRepo.findOne({ where: { id: userId } });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    // 如果更新用户名，检查是否已被使用
    if (updateDto.username && updateDto.username !== user.username) {
      const existing = await this.userRepo.findOne({
        where: { username: updateDto.username },
      });

      if (existing) {
        throw new BadRequestException('Username already taken');
      }
    }

    // 只更新 DTO 中定义的字段
    Object.assign(user, updateDto);

    // 保存并返回
    return await this.userRepo.save(user);
  }

  async verifyWalletSignature(
    walletAddress: string,
    signature: string,
    message: string,
  ): Promise<boolean> {
    try {
      // 恢复签名者地址
      const recoveredAddress = ethers.utils.verifyMessage(message, signature);

      // 比较地址（不区分大小写）
      return recoveredAddress.toLowerCase() === walletAddress.toLowerCase();
    } catch (error) {
      console.error('Wallet signature verification error:', error);
      return false;
    }
  }

  async connectWallet(userId: string, walletAddress: string): Promise<void> {
    // 检查钱包是否已被其他用户使用
    const existing = await this.userRepo.findOne({
      where: { wallet_address: walletAddress },
    });

    if (existing && existing.id !== userId) {
      throw new BadRequestException('Wallet already connected to another account');
    }

    // 连接钱包
    await this.userRepo.update(userId, {
      wallet_address: walletAddress,
      wallet_connected_at: new Date(),
    });
  }

  async verifyEmailCode(email: string, code: string): Promise<boolean> {
    // 实现邮箱验证码验证逻辑
    // 这里应该从 Redis 或数据库获取之前发送的验证码
    // 并验证是否匹配且未过期
    return true; // TODO: 实现实际验证逻辑
  }

  async updateUserEmail(userId: string, newEmail: string): Promise<void> {
    // 检查邮箱是否已被使用
    const existing = await this.userRepo.findOne({
      where: { email: newEmail },
    });

    if (existing && existing.id !== userId) {
      throw new BadRequestException('Email already in use');
    }

    await this.userRepo.update(userId, { email: newEmail });
  }
}
```

---

### 10. AWS IAM ARN 暴露在代码中

**文件位置：** `src/api-modules/user/utils/kms.ts:8-11`
**CWE-200:** Exposure of Sensitive Information
**CVSS评分：** 6.5 (Medium)

#### 问题描述

```typescript
Principal: {
  AWS: [
    'arn:aws:iam::759542841547:user/mpc-wallet-cognito-service',
    'arn:aws:iam::759542841547:user/vince@ultiverse.io',
  ],
},
```

#### 修复方案

移动到环境变量：

```typescript
// src/api-modules/user/utils/kms.ts
import { ConfigService } from '@nestjs/config';

export function getKMSPolicy(configService: ConfigService) {
  const allowedPrincipals = configService
    .get<string>('AWS_KMS_ALLOWED_PRINCIPALS')
    ?.split(',') || [];

  return {
    Version: '2012-10-17',
    Statement: [
      {
        Sid: 'Enable IAM User Permissions',
        Effect: 'Allow',
        Principal: {
          AWS: allowedPrincipals,
        },
        Action: 'kms:*',
        Resource: '*',
      },
    ],
  };
}
```

```bash
# .env
AWS_KMS_ALLOWED_PRINCIPALS=arn:aws:iam::ACCOUNT_ID:user/service-user
```

---

### 11-17. 其他高危问题

由于报告长度限制，以下是剩余高危问题的简要修复方案：

**11. WebSocket CORS 允许所有源**
```typescript
@WebSocketGateway({
  path: '/ws',
  cors: {
    origin: process.env.ALLOWED_ORIGINS?.split(',') || ['https://yoho.app'],
    credentials: true,
  },
})
```

**12. 敏感 Token 记录在日志**
```typescript
// 永远不要记录 token
console.error('Invalid token provided'); // 不要包含实际 token
```

**13. 生产环境启用数据库同步**
```typescript
synchronize: process.env.NODE_ENV !== 'production',
```

**14-17. 各种端点缺少认证**
在所有敏感端点添加 `@UseGuards(JwtAuthGuard)` 或 `@UseGuards(AdminJwtGuard)`

---

## 🟡 中危问题 (Medium)

### 18. 认证端点缺少速率限制

#### 修复方案

```bash
npm install @nestjs/throttler
```

```typescript
// app.module.ts
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';

@Module({
  imports: [
    ThrottlerModule.forRoot([
      {
        ttl: 60000, // 60 秒
        limit: 10, // 最多 10 次请求
      },
    ]),
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
```

在特定端点使用：

```typescript
import { Throttle } from '@nestjs/throttler';

// 登录端点：1分钟最多 5 次尝试
@Throttle({ default: { limit: 5, ttl: 60000 } })
@Post('/login')
async login(@Body() loginDto: LoginDto) {
  // ...
}
```

---

### 19-24. 其他中危问题简要修复

**19. Webhook 缺少输入验证** - 使用 DTO 和 class-validator
**20. 错误暴露堆栈跟踪** - 使用全局异常过滤器
**21. OAuth State 未验证** - 实现 state 参数
**22. 缺少 HTTPS 强制** - 添加 helmet 中间件
**23. 生产环境调试日志** - 根据环境调整日志级别
**24. 弱密码策略** - 添加可选的密码认证和 MFA

---

## 🔵 低危问题 (Low)

### 25-28. 低危问题修复

**25. SSL 证书验证禁用**
```typescript
ssl: {
  rejectUnauthorized: process.env.NODE_ENV === 'production',
  ca: process.env.DB_CA_CERT,
}
```

**26. Console.log 语句** - 替换为 NestJS Logger
**27. 缺少安全头** - 添加 helmet
**28. 内部 API 暴露** - 网络级别限制

---

## 实施计划

### 第一阶段：严重问题（1-2天）

```bash
# Day 1 - 修复硬编码密钥
1. 生成新的 JWT_SECRET, ADMIN_JWT_SECRET, SESSION_SECRET
2. 更新所有相关模块使用环境变量
3. 在 Heroku 设置环境变量
4. 测试认证流程

# Day 2 - 修复认证问题
5. 重新启用 URL 验证
6. 为 webhook 添加签名验证
7. 修复 IDOR 漏洞
8. 部署并测试
```

### 第二阶段：高危问题（2-3天）

```bash
# Day 3-4 - 修复授权和配置
9. 添加审计日志
10. 修复批量赋值漏洞
11. 移除敏感信息
12. 限制 CORS 和 WebSocket

# Day 5 - 配置和部署
13. 关闭生产数据库同步
14. 为所有端点添加认证
15. 测试并部署
```

### 第三阶段：中低危问题（2-3天）

```bash
# Day 6-7 - 加固措施
16. 添加速率限制
17. 实现输入验证
18. 添加安全头
19. 配置 HTTPS
20. 优化日志

# Day 8 - 最终测试
21. 全面安全测试
22. 渗透测试
23. 生产部署
```

---

## 验证清单

部署后验证：

- [ ] 所有硬编码密钥已移除
- [ ] 所有 webhook 都有签名验证
- [ ] IDOR 漏洞已修复
- [ ] 管理员操作已审计
- [ ] 速率限制已生效
- [ ] 安全头已配置
- [ ] HTTPS 已强制
- [ ] 生产日志级别正确
- [ ] 数据库同步已禁用
- [ ] 所有测试通过

---

## 联系方式

如有疑问，请联系安全团队：
- 邮件：security@yoho.app
- 紧急情况：使用 PagerDuty 告警

---

**报告结束**

*本报告包含敏感安全信息，请妥善保管，不要公开分享。*
