# Banner 功能 API 文档

## 功能概述

Banner 管理系统，支持管理员配置前端轮播 Banner，包括图片、标题、副标题、按钮和动作配置。

### 主要功能
- ✅ 自定义 Banner 图片（支持桌面端和移动端）
- ✅ 可配置动作类型（路由跳转、外部链接、商品详情、抽奖等）
- ✅ 支持排序和激活/停用
- ✅ 支持生效时间段配置
- ✅ 点击和浏览统计
- ✅ 完整的管理后台 API

---

## API 端点

### 用户端 API（公开）

#### 1. 获取激活的 Banner 列表
**端点**: `GET /api/v1/ecommerce/banners`

**描述**: 获取所有激活且在有效期内的 Banner

**认证**: 无需认证

**响应示例**:
```json
[
  {
    "id": 1,
    "title": "LUCKY DRAW",
    "subtitle": "Daily rewards waiting for you",
    "description": "Limited Time Offer",
    "imageUrl": "https://cdn.example.com/banner1.jpg",
    "mobileImageUrl": "https://cdn.example.com/banner1-mobile.jpg",
    "actionType": "ROUTER",
    "actionValue": "/draws",
    "buttonText": "Try Now",
    "backgroundColor": "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    "isActive": true,
    "sortOrder": 100,
    "startDate": null,
    "endDate": null,
    "clickCount": 1234,
    "viewCount": 5678,
    "createdAt": "2025-02-03T10:00:00.000Z",
    "updatedAt": "2025-02-03T10:00:00.000Z"
  }
]
```

#### 2. 获取 Banner 详情
**端点**: `GET /api/v1/ecommerce/banners/:id`

**参数**:
- `id` (path, required): Banner ID

#### 3. 记录 Banner 浏览
**端点**: `POST /api/v1/ecommerce/banners/:id/view`

**描述**: 前端展示 Banner 时调用，用于统计浏览次数

**参数**:
- `id` (path, required): Banner ID

**响应**:
```json
{
  "success": true
}
```

#### 4. 记录 Banner 点击
**端点**: `POST /api/v1/ecommerce/banners/:id/click`

**描述**: 用户点击 Banner 时调用，用于统计点击次数

**参数**:
- `id` (path, required): Banner ID

---

### 管理端 API（需要认证）

所有管理端 API 需要 Admin JWT 认证。

#### 1. 创建 Banner
**端点**: `POST /api/v1/admin/banners`

**请求体**:
```json
{
  "title": "LUCKY DRAW",
  "subtitle": "Daily rewards waiting for you",
  "description": "Limited Time Offer - Try your luck!",
  "imageUrl": "https://cdn.example.com/banner.jpg",
  "mobileImageUrl": "https://cdn.example.com/banner-mobile.jpg",
  "actionType": "ROUTER",
  "actionValue": "/draws",
  "buttonText": "Try Now",
  "backgroundColor": "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
  "isActive": true,
  "sortOrder": 100,
  "startDate": "2025-02-01T00:00:00Z",
  "endDate": "2025-02-28T23:59:59Z"
}
```

**字段说明**:
| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| title | string | ✅ | 主标题（最大255字符） |
| subtitle | string | ❌ | 副标题（最大255字符） |
| description | string | ❌ | 详细描述 |
| imageUrl | string | ✅ | Banner 图片 URL |
| mobileImageUrl | string | ❌ | 移动端图片 URL（可选） |
| actionType | enum | ✅ | 动作类型（见下方枚举） |
| actionValue | string | ❌ | 动作值（路径或URL） |
| buttonText | string | ❌ | 按钮文字（如"Try Now"） |
| backgroundColor | string | ❌ | 背景颜色（十六进制或CSS渐变） |
| isActive | boolean | ❌ | 是否激活（默认true） |
| sortOrder | number | ❌ | 排序（数字越大越靠前） |
| startDate | string | ❌ | 开始时间（ISO 8601格式） |
| endDate | string | ❌ | 结束时间（ISO 8601格式） |

**actionType 枚举**:
- `NONE`: 无动作（仅展示）
- `ROUTER`: 应用内路由跳转
- `EXTERNAL_LINK`: 外部链接
- `PRODUCT`: 跳转到商品详情
- `DRAW`: 跳转到抽奖页面

#### 2. 获取 Banner 列表（管理端）
**端点**: `GET /api/v1/admin/banners`

**查询参数**:
| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| isActive | boolean | ❌ | true | 是否只返回激活的 |
| page | number | ❌ | 1 | 页码 |
| limit | number | ❌ | 20 | 每页数量 |

**响应示例**:
```json
{
  "items": [...],
  "total": 10,
  "page": 1,
  "limit": 20,
  "totalPages": 1
}
```

#### 3. 获取 Banner 详情
**端点**: `GET /api/v1/admin/banners/:id`

#### 4. 更新 Banner
**端点**: `PUT /api/v1/admin/banners/:id`

**请求体**: 与创建相同，所有字段可选

#### 5. 删除 Banner
**端点**: `DELETE /api/v1/admin/banners/:id`

**响应**:
```json
{
  "success": true
}
```

#### 6. 切换 Banner 激活状态
**端点**: `POST /api/v1/admin/banners/:id/toggle-active`

**描述**: 快速切换 Banner 的激活/停用状态

**响应**: 返回更新后的 Banner 对象

#### 7. 批量更新排序
**端点**: `POST /api/v1/admin/banners/sort`

**请求体**:
```json
[
  { "id": 1, "sortOrder": 100 },
  { "id": 2, "sortOrder": 90 },
  { "id": 3, "sortOrder": 80 }
]
```

**响应**:
```json
{
  "success": true
}
```

---

## 前端集成示例

### React 轮播组件

```tsx
import { useState, useEffect } from 'react';
import axios from 'axios';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay, Pagination } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/pagination';

interface Banner {
  id: number;
  title: string;
  subtitle: string | null;
  imageUrl: string;
  mobileImageUrl: string | null;
  actionType: string;
  actionValue: string | null;
  buttonText: string | null;
  backgroundColor: string | null;
}

export function BannerCarousel() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    fetchBanners();

    // 检测设备类型
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const fetchBanners = async () => {
    try {
      const response = await axios.get('/api/v1/ecommerce/banners');
      setBanners(response.data);

      // 记录浏览
      response.data.forEach((banner: Banner) => {
        axios.post(`/api/v1/ecommerce/banners/${banner.id}/view`);
      });
    } catch (error) {
      console.error('Failed to fetch banners:', error);
    }
  };

  const handleBannerClick = (banner: Banner) => {
    // 记录点击
    axios.post(`/api/v1/ecommerce/banners/${banner.id}/click`);

    // 执行动作
    switch (banner.actionType) {
      case 'ROUTER':
        window.location.href = banner.actionValue || '/';
        break;
      case 'EXTERNAL_LINK':
        window.open(banner.actionValue, '_blank');
        break;
      case 'PRODUCT':
        window.location.href = `/products/${banner.actionValue}`;
        break;
      case 'DRAW':
        window.location.href = `/draws/${banner.actionValue}`;
        break;
    }
  };

  if (banners.length === 0) return null;

  return (
    <div className="banner-carousel">
      <Swiper
        modules={[Autoplay, Pagination]}
        autoplay={{ delay: 5000 }}
        pagination={{ clickable: true }}
        loop={banners.length > 1}
        className="mySwiper"
      >
        {banners.map((banner) => (
          <SwiperSlide key={banner.id}>
            <div
              className="banner-slide"
              style={{
                background: banner.backgroundColor || '#000',
              }}
              onClick={() => handleBannerClick(banner)}
            >
              <img
                src={isMobile && banner.mobileImageUrl
                  ? banner.mobileImageUrl
                  : banner.imageUrl}
                alt={banner.title}
                className="banner-image"
              />
              <div className="banner-content">
                {banner.subtitle && (
                  <div className="banner-badge">{banner.subtitle}</div>
                )}
                <h2 className="banner-title">{banner.title}</h2>
                {banner.buttonText && (
                  <button className="banner-button">
                    {banner.buttonText}
                  </button>
                )}
              </div>
            </div>
          </SwiperSlide>
        ))}
      </Swiper>
    </div>
  );
}
```

### CSS 样式

```css
.banner-carousel {
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  border-radius: 16px;
  overflow: hidden;
}

.banner-slide {
  position: relative;
  width: 100%;
  aspect-ratio: 16/9;
  cursor: pointer;
  overflow: hidden;
}

.banner-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.banner-content {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  color: white;
  text-align: center;
  padding: 32px;
}

.banner-badge {
  background: rgba(255, 255, 255, 0.2);
  border: 2px solid rgba(255, 255, 255, 0.5);
  border-radius: 24px;
  padding: 8px 24px;
  font-size: 14px;
  font-weight: 600;
  letter-spacing: 2px;
  text-transform: uppercase;
  margin-bottom: 16px;
}

.banner-title {
  font-size: 48px;
  font-weight: 900;
  font-style: italic;
  letter-spacing: 4px;
  margin: 16px 0;
  text-transform: uppercase;
}

.banner-button {
  background: linear-gradient(135deg, #ff6b6b 0%, #ff5252 100%);
  border: none;
  border-radius: 12px;
  padding: 16px 48px;
  font-size: 18px;
  font-weight: 700;
  color: white;
  cursor: pointer;
  margin-top: 24px;
  transition: transform 0.2s;
}

.banner-button:hover {
  transform: scale(1.05);
}

@media (max-width: 768px) {
  .banner-slide {
    aspect-ratio: 4/3;
  }

  .banner-title {
    font-size: 32px;
  }

  .banner-button {
    padding: 12px 32px;
    font-size: 16px;
  }
}
```

---

## 管理后台 React 页面示例

```tsx
import { useState, useEffect } from 'react';
import axios from 'axios';

export function BannerManagement() {
  const [banners, setBanners] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [currentBanner, setCurrentBanner] = useState(null);

  useEffect(() => {
    fetchBanners();
  }, []);

  const fetchBanners = async () => {
    const response = await axios.get('/api/v1/admin/banners', {
      params: { isActive: undefined }, // 获取所有
      headers: { Authorization: `Bearer ${localStorage.getItem('adminToken')}` }
    });
    setBanners(response.data.items);
  };

  const handleCreate = () => {
    setCurrentBanner({
      title: '',
      subtitle: '',
      imageUrl: '',
      actionType: 'NONE',
      isActive: true,
      sortOrder: 0,
    });
    setIsEditing(true);
  };

  const handleSave = async () => {
    try {
      if (currentBanner.id) {
        await axios.put(
          `/api/v1/admin/banners/${currentBanner.id}`,
          currentBanner,
          { headers: { Authorization: `Bearer ${localStorage.getItem('adminToken')}` }}
        );
      } else {
        await axios.post('/api/v1/admin/banners', currentBanner, {
          headers: { Authorization: `Bearer ${localStorage.getItem('adminToken')}` }
        });
      }
      setIsEditing(false);
      fetchBanners();
    } catch (error) {
      alert('保存失败');
    }
  };

  const handleToggleActive = async (id: number) => {
    await axios.post(`/api/v1/admin/banners/${id}/toggle-active`, {}, {
      headers: { Authorization: `Bearer ${localStorage.getItem('adminToken')}` }
    });
    fetchBanners();
  };

  const handleDelete = async (id: number) => {
    if (confirm('确定要删除这个 Banner 吗？')) {
      await axios.delete(`/api/v1/admin/banners/${id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('adminToken')}` }
      });
      fetchBanners();
    }
  };

  return (
    <div className="banner-management">
      <div className="header">
        <h1>Banner 管理</h1>
        <button onClick={handleCreate}>创建新 Banner</button>
      </div>

      <table>
        <thead>
          <tr>
            <th>预览</th>
            <th>标题</th>
            <th>动作类型</th>
            <th>排序</th>
            <th>状态</th>
            <th>统计</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          {banners.map((banner) => (
            <tr key={banner.id}>
              <td>
                <img src={banner.imageUrl} alt="" style={{ width: 100 }} />
              </td>
              <td>{banner.title}</td>
              <td>{banner.actionType}</td>
              <td>{banner.sortOrder}</td>
              <td>
                <span className={banner.isActive ? 'active' : 'inactive'}>
                  {banner.isActive ? '激活' : '停用'}
                </span>
              </td>
              <td>
                浏览: {banner.viewCount} / 点击: {banner.clickCount}
              </td>
              <td>
                <button onClick={() => { setCurrentBanner(banner); setIsEditing(true); }}>
                  编辑
                </button>
                <button onClick={() => handleToggleActive(banner.id)}>
                  {banner.isActive ? '停用' : '激活'}
                </button>
                <button onClick={() => handleDelete(banner.id)}>删除</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {isEditing && (
        <div className="modal">
          <h2>{currentBanner.id ? '编辑' : '创建'} Banner</h2>
          {/* 表单字段... */}
          <button onClick={handleSave}>保存</button>
          <button onClick={() => setIsEditing(false)}>取消</button>
        </div>
      )}
    </div>
  );
}
```

---

## 数据库表结构

```sql
CREATE TABLE yoho_ecommerce_banners (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  subtitle VARCHAR(255),
  description TEXT,
  image_url VARCHAR(512) NOT NULL,
  mobile_image_url VARCHAR(512),
  action_type VARCHAR(20) DEFAULT 'NONE',
  action_value VARCHAR(512),
  button_text VARCHAR(100),
  background_color VARCHAR(50),
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  start_date TIMESTAMP,
  end_date TIMESTAMP,
  click_count INTEGER DEFAULT 0,
  view_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

---

## 最佳实践

### 1. 图片规格建议
- **桌面端**: 1920x1080 或 1600x900 (16:9)
- **移动端**: 750x1000 或 1080x1350 (3:4)
- **格式**: WebP (推荐) 或 JPG
- **大小**: < 500KB

### 2. 性能优化
- 使用 CDN 存储图片
- 图片使用懒加载
- 前端缓存 Banner 列表（5分钟）
- 浏览/点击统计异步发送（不阻塞UI）

### 3. 安全建议
- 管理端 API 必须验证管理员权限
- 图片 URL 进行验证，防止XSS
- actionValue 需要验证格式（路由或URL）

---

## 测试

### 启动服务
```bash
npm run start:dev
```

### 访问 Swagger 文档
```
http://localhost:3001/docs
```

### 测试用户端 API
```bash
# 获取 Banner 列表
curl http://localhost:3001/api/v1/ecommerce/banners

# 记录浏览
curl -X POST http://localhost:3001/api/v1/ecommerce/banners/1/view

# 记录点击
curl -X POST http://localhost:3001/api/v1/ecommerce/banners/1/click
```

### 测试管理端 API
```bash
# 创建 Banner
curl -X POST http://localhost:3001/api/v1/admin/banners \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Banner",
    "imageUrl": "https://example.com/banner.jpg",
    "actionType": "ROUTER",
    "actionValue": "/test"
  }'
```

---

## 更新日志

- **2025-02-03**: 初始版本发布
  - 完整的 Banner CRUD 功能
  - 支持排序、激活/停用
  - 支持时间段配置
  - 点击和浏览统计
