-- 插入一元购抽奖商品：0.005 BTC
-- 根据图片信息：0.005 BTC, 3 spots, 67.2% progress, Ongoing

-- 假设当前BTC价格为 $50,000（请根据实际情况调整）
-- 0.005 BTC = $250

-- 计算参数：
-- - 奖品价值（original_price）: $250
-- - 每个号码价格（sale_price）: $0.1（默认）
-- - 溢价10%后总收入: $250 * 1.1 = $275
-- - 总号码数: $275 / $0.1 = 2750 个号码

-- 插入商品
INSERT INTO yoho_ecommerce_products (
  type,
  priority,
  badge,
  name,
  description,
  thumbnail,
  images,
  detail,
  original_price,
  sale_price,
  stock,
  status,
  total_rating,
  review_count,
  created_at,
  updated_at
) VALUES (
  'LUCKY_DRAW',                    -- 类型：一元购抽奖
  10,                              -- 优先级：10（较高优先级，用于排序）
  'HOT',                           -- 运营角标：HOT（热门）
  '0.005 BTC',                     -- 商品名称：0.005 BTC
  'Win 0.005 Bitcoin in our lucky draw!',  -- 商品描述
  'https://example.com/images/btc-thumbnail.jpg',  -- 缩略图URL（请替换为实际图片）
  ARRAY['https://example.com/images/btc-detail-1.jpg', 'https://example.com/images/btc-detail-2.jpg']::text[],  -- 详情页图片（请替换为实际图片）
  '<p>Participate in our Bitcoin lucky draw! Purchase spots for a chance to win 0.005 BTC.</p>',  -- 商品详情（富文本）
  500.00,                          -- 原价（奖品价值）：$250 (0.005 BTC @ $50,000)
  0.10,                            -- 售价（每个号码价格）：$0.1
  0,                               -- 库存：0（一元购不需要设置库存，由系统自动计算）
  'ACTIVE',                        -- 状态：ACTIVE（激活状态）
  0.00,                            -- 累计评分：0
  0,                               -- 评价数：0
  NOW(),                           -- 创建时间
  NOW()                            -- 更新时间
);

-- 获取刚插入的商品ID（用于后续操作）
-- SELECT id FROM yoho_ecommerce_products WHERE name = '0.005 BTC' ORDER BY id DESC LIMIT 1;

-- 注意：
-- 1. 系统会根据 original_price 和 sale_price 自动计算总号码数
-- 2. 总号码数 = ceil((original_price * 1.1) / sale_price) = ceil(275 / 0.1) = 2750
-- 3. 当用户购买时，系统会自动创建期次（DrawRound）
-- 4. 图片URL需要替换为实际的图片地址

-- 如果需要立即创建第一期，可以执行以下SQL（需要先获取商品ID）：
-- INSERT INTO yoho_ecommerce_draw_rounds (
--   product_id,
--   round_number,
--   total_spots,
--   sold_spots,
--   price_per_spot,
--   prize_value,
--   status,
--   auto_create_next,
--   created_at,
--   updated_at
-- ) VALUES (
--   (SELECT id FROM yoho_ecommerce_products WHERE name = '0.005 BTC' ORDER BY id DESC LIMIT 1),
--   1,                              -- 第1期
--   2750,                           -- 总号码数
--   0,                              -- 已售号码数
--   0.10,                           -- 每个号码价格
--   250.00,                         -- 奖品价值
--   'ONGOING',                      -- 状态：进行中
--   true,                           -- 自动创建下一期
--   NOW(),
--   NOW()
-- );

