-- Banner 功能数据库迁移
-- 创建 Banner 表用于管理前端轮播图

CREATE TABLE yoho_ecommerce_banners (
  id SERIAL PRIMARY KEY,

  -- 内容字段
  title VARCHAR(255) NOT NULL,
  subtitle VARCHAR(255),
  description TEXT,

  -- 图片字段
  image_url VARCHAR(512) NOT NULL,
  mobile_image_url VARCHAR(512),

  -- 动作配置
  action_type VARCHAR(20) DEFAULT 'NONE' CHECK (
    action_type IN ('NONE', 'ROUTER', 'EXTERNAL_LINK', 'PRODUCT', 'DRAW')
  ),
  action_value VARCHAR(512),
  button_text VARCHAR(100),
  background_color VARCHAR(50),

  -- 状态和排序
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,

  -- 有效期
  start_date TIMESTAMP,
  end_date TIMESTAMP,

  -- 统计字段
  click_count INTEGER DEFAULT 0,
  view_count INTEGER DEFAULT 0,

  -- 时间戳
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 创建索引
CREATE INDEX idx_banners_active_sort ON yoho_ecommerce_banners(is_active, sort_order);
CREATE INDEX idx_banners_date_range ON yoho_ecommerce_banners(start_date, end_date);
CREATE INDEX idx_banners_active_dates ON yoho_ecommerce_banners(is_active, start_date, end_date)
  WHERE is_active = true;

-- 创建更新时间的触发器
CREATE OR REPLACE FUNCTION update_banner_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_banner_updated_at
BEFORE UPDATE ON yoho_ecommerce_banners
FOR EACH ROW
EXECUTE FUNCTION update_banner_updated_at();

-- 插入示例数据
INSERT INTO yoho_ecommerce_banners (
  title,
  subtitle,
  description,
  image_url,
  action_type,
  action_value,
  button_text,
  background_color,
  is_active,
  sort_order
) VALUES
(
  'LUCKY DRAW',
  'Daily rewards waiting for you',
  'Limited Time Offer - Try your luck and win amazing prizes!',
  'https://example.com/banners/lucky-draw.jpg',
  'ROUTER',
  '/draws',
  'Try Now',
  'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  true,
  100
),
(
  'NEW USER SPECIAL',
  'Get your welcome bonus',
  'Join now and get 3 free draw chances',
  'https://example.com/banners/welcome.jpg',
  'ROUTER',
  '/register',
  'Join Now',
  'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
  true,
  90
);

-- 验证数据
SELECT * FROM yoho_ecommerce_banners ORDER BY sort_order DESC;
