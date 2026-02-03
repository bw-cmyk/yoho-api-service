-- 修复 Showcase 表中的负数 likeCount
-- 执行时间：请在数据库维护窗口执行

-- 1. 查看当前有多少记录的 likeCount 为负数
SELECT
    id,
    user_id,
    like_count,
    created_at
FROM yoho_showcase
WHERE like_count < 0
ORDER BY like_count ASC;

-- 2. 修复方案A：将所有负数的 likeCount 重置为实际的点赞数
UPDATE yoho_showcase s
SET like_count = (
    SELECT COUNT(*)
    FROM yoho_showcase_like l
    WHERE l.showcase_id = s.id
)
WHERE s.like_count < 0;

-- 3. 验证修复结果
SELECT
    id,
    user_id,
    like_count,
    created_at
FROM yoho_showcase
WHERE like_count < 0;
-- 应该返回 0 条记录

-- 4. 可选：修复所有 showcase 的 likeCount（确保完全同步）
-- 注意：这会覆盖所有现有的 likeCount，请谨慎使用
-- UPDATE yoho_showcase s
-- SET like_count = (
--     SELECT COUNT(*)
--     FROM yoho_showcase_like l
--     WHERE l.showcase_id = s.id
-- );

-- 5. 验证总体数据一致性
SELECT
    s.id,
    s.like_count as stored_count,
    COUNT(l.id) as actual_count,
    s.like_count - COUNT(l.id) as difference
FROM yoho_showcase s
LEFT JOIN yoho_showcase_like l ON l.showcase_id = s.id
GROUP BY s.id, s.like_count
HAVING s.like_count != COUNT(l.id)
ORDER BY difference DESC
LIMIT 20;
