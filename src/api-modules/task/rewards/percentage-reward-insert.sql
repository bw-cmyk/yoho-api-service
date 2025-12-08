-- 插入 PercentageRewardHandler 类型的奖励配置
-- 该奖励处理器用于首次充值奖励，根据充值金额的百分比计算奖励
-- PostgreSQL 语法版本
-- 
-- 参数说明：
-- @campaign_id: 活动ID（需要根据实际情况修改）
-- @task_id: 任务ID（需要根据实际情况修改）
-- @percentage: 奖励百分比（例如：0.25 表示 25%，即充值金额的 25% 作为奖励）
-- 
-- 示例：如果用户首次充值 $100，percentage 为 0.25，则奖励金额为 $25

INSERT INTO yoho_campaign_task_rewards (
  campaign_id,
  task_id,
  reward_type,
  grant_type,
  amount,
  amount_config,
  currency,
  target_balance,
  metadata,
  created_at,
  updated_at
) VALUES (
  1,  -- campaign_id: 活动ID，请根据实际情况修改
  1,  -- task_id: 任务ID，请根据实际情况修改
  'BONUS',  -- reward_type: 奖励类型，BONUS 表示赠金
  'FIRST_DEPOSIT',  -- grant_type: 发放类型，FIRST_DEPOSIT 表示首次充值奖励
  NULL,  -- amount: 固定金额，百分比奖励不需要固定金额
  json_build_object(
    'percentage', 0.25  -- 奖励百分比：0.25 表示 25%（可根据需要修改为其他值，如 0.5 表示 50%）
  ),  -- amount_config: 金额配置，包含百分比
  'USD',  -- currency: 货币类型
  'GAME_BALANCE',  -- target_balance: 目标余额类型，GAME_BALANCE 表示游戏余额
  json_build_object(
    'description', 'First deposit percentage reward',
    'maxReward', 120  -- 可选：最大奖励金额限制（美元），例如最多奖励 $120
  ),  -- metadata: 额外配置信息
  NOW(),  -- created_at: 创建时间
  NOW()   -- updated_at: 更新时间
);

-- 示例2：带最大奖励限制的百分比奖励
-- 如果用户充值 $1000，percentage 为 0.25，计算奖励为 $250
-- 但由于 maxReward 限制为 $120，实际奖励为 $120
INSERT INTO yoho_campaign_task_rewards (
  campaign_id,
  task_id,
  reward_type,
  grant_type,
  amount,
  amount_config,
  currency,
  target_balance,
  metadata,
  created_at,
  updated_at
) VALUES (
  1,
  1,
  'BONUS',
  'FIRST_DEPOSIT',
  NULL,
  json_build_object(
    'percentage', 0.25
  ),
  'USD',
  'GAME_BALANCE',
  json_build_object(
    'description', 'First deposit percentage reward with max limit',
    'maxReward', 120
  ),
  NOW(),
  NOW()
);

-- 查询示例：查看已插入的百分比奖励配置
-- SELECT 
--   id,
--   campaign_id,
--   task_id,
--   reward_type,
--   grant_type,
--   amount_config->>'percentage' as percentage,
--   currency,
--   target_balance,
--   metadata
-- FROM yoho_campaign_task_rewards
-- WHERE grant_type = 'FIRST_DEPOSIT'
--   AND deleted_at IS NULL;

