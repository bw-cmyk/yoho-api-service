-- 商品主表
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
  daily_sales_range,
  tags,
  sale_start_time,
  sale_end_time,
  purchase_limit,
  total_rating,
  review_count,
  delivery_days_min,
  delivery_days_max,
  status,
  created_at,
  updated_at
) VALUES (
  'INSTANT_BUY',
  100,
  '70% OFF',
  'iPhone 17 Pro Max',
  'Flash deal · 256GB Natural Titanium',
  'https://cdn.example.com/iphone17pm/thumb.jpg',
  '["https://cdn.example.com/iphone17pm/1.jpg","https://cdn.example.com/iphone17pm/2.jpg","https://cdn.example.com/iphone17pm/3.jpg"]'::json,
  '<p>6.7&quot; Super Retina XDR · A18 Pro · 48MP Main + 12MP Ultra Wide · Up to 29h video playback · 5G</p>',
  999.00,
  299.00,
  500,
  1000,
  '[{"icon":"truck","text":"Free Shipping"},{"icon":"shield","text":"Shipping Insurance"},{"icon":"refresh","text":"7-Day Free Returns"},{"icon":"clock","text":"15-Day Refund"}]'::json,
  NOW() - INTERVAL '1 day',
  NOW() + INTERVAL '5 hours 23 minutes',
  2,
  1146.6,
  234,
  3,
  5,
  'ACTIVE',
  NOW(),
  NOW()
);

-- 商品规格（颜色 & 存储）
INSERT INTO yoho_ecommerce_product_specifications (product_id, key, value, is_default, sort, created_at, updated_at)
VALUES
  (1, 'Color', 'Natural Titanium', true, 1, NOW(), NOW()),
  (1, 'Color', 'Black Titanium', false, 2, NOW(), NOW()),
  (1, 'Storage', '256GB', true, 1, NOW(), NOW()),
  (1, 'Storage', '512GB', false, 2, NOW(), NOW()),
  (1, 'Storage', '1TB', false, 3, NOW(), NOW());

-- 商品详情规格（展示在详情页“Product Specifications”区域，可按需扩展）
INSERT INTO yoho_ecommerce_product_specifications (product_id, key, value, is_default, sort, created_at, updated_at)
VALUES
  (1, 'Display', '6.7" Super Retina XDR', false, 10, NOW(), NOW()),
  (1, 'Chip', 'A18 Pro', false, 11, NOW(), NOW()),
  (1, 'Camera', '48MP Main + 12MP Ultra Wide', false, 12, NOW(), NOW()),
  (1, 'Battery', 'Up to 29 hours video playback', false, 13, NOW(), NOW()),
  (1, '5G', 'Yes', false, 14, NOW(), NOW());

-- 模拟几条用户评价（评分 4.9，标签取自截图）
INSERT INTO yoho_ecommerce_product_reviews (
  product_id,
  reviewer_name,
  reviewer_avatar,
  rating,
  content,
  tags,
  review_time,
  created_at
) VALUES
  (
    1,
    'Alex_lucky_guy',
    'https://cdn.example.com/avatars/alex.png',
    5.0,
    'Great quality and super fast delivery. Totally worth the price!',
    '["Great quality","Value for money"]'::json,
    NOW() - INTERVAL '2 hours',
    NOW()
  ),
  (
    1,
    'Sophie99',
    'https://cdn.example.com/avatars/sophie.png',
    4.9,
    'Convenient purchase experience, comes with shipping insurance.',
    '["Convenient","Shipping Insurance"]'::json,
    NOW() - INTERVAL '6 hours',
    NOW()
  ),
  (
    1,
    'TechGuru',
    'https://cdn.example.com/avatars/techguru.png',
    4.8,
    'Extra refreshing deal—A18 Pro is blazing fast!',
    '["Extra refreshing","Good flavor"]'::json,
    NOW() - INTERVAL '1 day',
    NOW()
  );