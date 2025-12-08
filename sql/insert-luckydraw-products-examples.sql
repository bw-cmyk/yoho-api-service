-- 一元购抽奖商品示例SQL
-- 包含多个常见的奖品类型示例

-- ============================================
-- 示例1: 0.005 BTC（根据图片）
-- ============================================
INSERT INTO yoho_ecommerce_products (
  type, priority, badge, name, description, thumbnail, images,
  original_price, sale_price, status, created_at, updated_at
) VALUES (
  'LUCKY_DRAW', 10, 'HOT',
  '0.005 BTC',
  'Win 0.005 Bitcoin in our lucky draw!',
  'https://example.com/images/btc-thumbnail.jpg',
  ARRAY['https://example.com/images/btc-detail.jpg']::text[],
  250.00,  -- 0.005 BTC @ $50,000
  0.10,    -- $0.1 per spot
  'ACTIVE',
  NOW(),
  NOW()
);

-- ============================================
-- 示例2: $10 现金（USDT）
-- ============================================
INSERT INTO yoho_ecommerce_products (
  type, priority, badge, name, description, thumbnail, images,
  original_price, sale_price, status, created_at, updated_at
) VALUES (
  'LUCKY_DRAW', 9, 'EASY',
  '$10',
  'Win $10 USDT cash prize!',
  'https://example.com/images/cash-thumbnail.jpg',
  ARRAY['https://example.com/images/cash-detail.jpg']::text[],
  10.00,   -- $10 现金
  0.10,    -- $0.1 per spot
  'ACTIVE',
  NOW(),
  NOW()
);

-- ============================================
-- 示例3: 0.01 BTC
-- ============================================
INSERT INTO yoho_ecommerce_products (
  type, priority, badge, name, description, thumbnail, images,
  original_price, sale_price, status, created_at, updated_at
) VALUES (
  'LUCKY_DRAW', 8, 'NEW',
  '0.01 BTC',
  'Win 0.01 Bitcoin!',
  'https://example.com/images/btc-0.01-thumbnail.jpg',
  ARRAY['https://example.com/images/btc-0.01-detail.jpg']::text[],
  500.00,  -- 0.01 BTC @ $50,000
  0.10,    -- $0.1 per spot
  'ACTIVE',
  NOW(),
  NOW()
);

-- ============================================
-- 示例4: iPhone 16 Pro（实物奖品）
-- ============================================
INSERT INTO yoho_ecommerce_products (
  type, priority, badge, name, description, thumbnail, images,
  original_price, sale_price, status, created_at, updated_at
) VALUES (
  'LUCKY_DRAW', 7, NULL,
  'iPhone 16 Pro',
  'Win an iPhone 16 Pro!',
  'https://example.com/images/iphone-thumbnail.jpg',
  ARRAY['https://example.com/images/iphone-detail-1.jpg', 'https://example.com/images/iphone-detail-2.jpg']::text[],
  999.00,  -- iPhone 16 Pro 价格
  0.10,    -- $0.1 per spot
  'ACTIVE',
  NOW(),
  NOW()
);

-- ============================================
-- 示例5: 0.1 ETH
-- ============================================
INSERT INTO yoho_ecommerce_products (
  type, priority, badge, name, description, thumbnail, images,
  original_price, sale_price, status, created_at, updated_at
) VALUES (
  'LUCKY_DRAW', 6, NULL,
  '0.1 ETH',
  'Win 0.1 Ethereum!',
  'https://example.com/images/eth-thumbnail.jpg',
  ARRAY['https://example.com/images/eth-detail.jpg']::text[],
  300.00,  -- 0.1 ETH @ $3,000
  0.10,    -- $0.1 per spot
  'ACTIVE',
  NOW(),
  NOW()
);

-- ============================================
-- 批量查询所有LUCKY_DRAW商品
-- ============================================
-- SELECT 
--   id,
--   name,
--   original_price as prize_value,
--   sale_price as price_per_spot,
--   status,
--   priority,
--   badge,
--   created_at
-- FROM yoho_ecommerce_products
-- WHERE type = 'LUCKY_DRAW'
--   AND deleted_at IS NULL
-- ORDER BY priority DESC, created_at DESC;

-- ============================================
-- 计算每个商品的总号码数（用于验证）
-- ============================================
-- SELECT 
--   id,
--   name,
--   original_price,
--   sale_price,
--   CEIL((original_price * 1.1) / sale_price) as total_spots,
--   (original_price * 1.1) as total_revenue
-- FROM yoho_ecommerce_products
-- WHERE type = 'LUCKY_DRAW'
--   AND deleted_at IS NULL;

-- ============================================
-- 注意事项：
-- ============================================
-- 1. 所有价格单位都是 USD
-- 2. 每个号码默认价格为 $0.1
-- 3. 系统会自动计算总号码数：ceil((original_price * 1.1) / sale_price)
-- 4. 溢价默认为 10%
-- 5. 商品创建后，系统会在首次购买时自动创建第一期
-- 6. 图片URL需要替换为实际的图片地址
-- 7. 可以根据需要调整 priority（优先级）来控制显示顺序

