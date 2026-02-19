import { useState, useEffect } from 'react'
import { Plus, Search, Edit, Trash2, Play, Pause, Square, ChevronDown, ChevronRight, Eye, EyeOff } from 'lucide-react'
import DataTable from '../components/DataTable'
import Modal from '../components/Modal'
import {
  campaignApi,
  type Campaign,
  type CampaignStatus,
  type CampaignTask,
  type TaskReward,
  type CampaignStats,
  type TaskType,
  type TaskRepeatType,
  type RewardType,
  type RewardGrantType,
} from '../services/api'

const STATUS_OPTIONS: { value: CampaignStatus; label: string; color: string }[] = [
  { value: 'DRAFT', label: '草稿', color: 'bg-gray-100 text-gray-600' },
  { value: 'ACTIVE', label: '进行中', color: 'bg-emerald-50 text-emerald-600' },
  { value: 'PAUSED', label: '已暂停', color: 'bg-amber-50 text-amber-600' },
  { value: 'ENDED', label: '已结束', color: 'bg-red-50 text-red-600' },
]

const TASK_TYPE_OPTIONS: { value: TaskType; label: string }[] = [
  { value: 'REGISTER', label: '注册' },
  { value: 'DEPOSIT', label: '充值' },
  { value: 'CHECK_IN', label: '签到' },
  { value: 'ADD_BOTIM_FRIEND', label: '添加Botim好友' },
  { value: 'FOLLOW_BOTIM_OFFICIAL', label: '关注Botim公众号' },
  { value: 'TRADE_BTC', label: '交易BTC' },
  { value: 'PLAY_PREDICTION', label: '玩猜涨跌' },
  { value: 'TRADE_VOLUME', label: '交易流水' },
  { value: 'GAME_VOLUME', label: '游戏流水' },
  { value: 'TRADE_VOLUME_FIRST_DEPOSIT', label: '首充交易流水' },
  { value: 'CUSTOM', label: '自定义' },
]

const REPEAT_TYPE_OPTIONS: { value: TaskRepeatType; label: string }[] = [
  { value: 'ONCE', label: '一次性' },
  { value: 'DAILY', label: '每日' },
  { value: 'WEEKLY', label: '每周' },
  { value: 'MONTHLY', label: '每月' },
  { value: 'UNLIMITED', label: '无限制' },
]

const REWARD_TYPE_OPTIONS: { value: RewardType; label: string }[] = [
  { value: 'CASH', label: '现金' },
  { value: 'POINTS', label: '积分' },
  { value: 'BONUS', label: '赠金' },
  { value: 'CUSTOM', label: '自定义' },
]

const GRANT_TYPE_OPTIONS: { value: RewardGrantType; label: string }[] = [
  { value: 'FIXED', label: '固定金额' },
  { value: 'RANDOM', label: '随机金额' },
  { value: 'PROGRESSIVE', label: '渐进式' },
  { value: 'FIRST_DEPOSIT', label: '首充百分比' },
]

const USER_SCOPE_OPTIONS = [
  { value: 'ALL', label: '全部用户' },
  { value: 'NEW', label: '新用户' },
  { value: 'EXISTING', label: '老用户' },
  { value: 'FIRST_DEPOSIT', label: '首充用户' },
]

function StatusBadge({ status }: { status: string }) {
  const opt = STATUS_OPTIONS.find((s) => s.value === status)
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${opt?.color || 'bg-gray-100 text-gray-600'}`}>
      {opt?.label || status}
    </span>
  )
}

function formatDate(d: string | null) {
  if (!d) return '-'
  return new Date(d).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
}

function toInputDatetime(d: string | null) {
  if (!d) return ''
  const date = new Date(d)
  const offset = date.getTimezoneOffset()
  const local = new Date(date.getTime() - offset * 60000)
  return local.toISOString().slice(0, 16)
}

export default function Campaigns() {
  // Campaign list state
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [stats, setStats] = useState<CampaignStats | null>(null)
  const [loading, setLoading] = useState(false)
  const [keyword, setKeyword] = useState('')
  const [statusFilter, setStatusFilter] = useState<CampaignStatus | ''>('')
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 0 })

  // Campaign modal
  const [showCampaignModal, setShowCampaignModal] = useState(false)
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null)
  const [campaignForm, setCampaignForm] = useState({
    name: '',
    description: '',
    code: '',
    status: 'DRAFT' as CampaignStatus,
    startTime: '',
    endTime: '',
    userScope: 'ALL',
    totalRewardAmount: '',
    currency: 'USD',
    rewardType: 'CASH',
    requireClaim: true,
    claimExpiryDays: '7',
    sortOrder: '0',
    isVisible: true,
  })

  // Expanded campaign (to show tasks)
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [tasks, setTasks] = useState<CampaignTask[]>([])
  const [tasksLoading, setTasksLoading] = useState(false)

  // Task modal
  const [showTaskModal, setShowTaskModal] = useState(false)
  const [editingTask, setEditingTask] = useState<CampaignTask | null>(null)
  const [taskForm, setTaskForm] = useState({
    name: '',
    description: '',
    type: 'CHECK_IN' as TaskType,
    repeatType: 'ONCE' as TaskRepeatType,
    maxCompletions: '1',
    minAmount: '',
    currency: '',
    coinType: '',
    tradeVolumeMultiple: '',
    deadline: '',
    redirectUrl: '',
    sortOrder: '0',
    isLocked: true,
    status: 'ACTIVE',
  })

  // Reward modal
  const [showRewardModal, setShowRewardModal] = useState(false)
  const [editingReward, setEditingReward] = useState<TaskReward | null>(null)
  const [rewardTaskId, setRewardTaskId] = useState<number | null>(null)
  const [rewardForm, setRewardForm] = useState({
    rewardType: 'BONUS' as RewardType,
    grantType: 'FIXED' as RewardGrantType,
    amount: '',
    currency: 'USD',
    targetBalance: 'GAME_BALANCE',
    minAmount: '',
    maxAmount: '',
    percentage: '',
  })

  // ========== Fetch ==========

  const fetchCampaigns = async (page = 1) => {
    setLoading(true)
    try {
      const res = await campaignApi.getList({
        page,
        limit: pagination.limit,
        keyword: keyword || undefined,
        status: statusFilter || undefined,
      })
      setCampaigns(res.data)
      setPagination({ page: res.page, limit: res.limit, total: res.total, totalPages: res.totalPages })
    } catch (error) {
      console.error('Failed to fetch campaigns:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchStats = async () => {
    try {
      const res = await campaignApi.getStats()
      setStats(res)
    } catch (error) {
      console.error('Failed to fetch stats:', error)
    }
  }

  const fetchTasks = async (campaignId: number) => {
    setTasksLoading(true)
    try {
      const res = await campaignApi.getTasks(campaignId, { limit: 50 })
      setTasks(res.data)
    } catch (error) {
      console.error('Failed to fetch tasks:', error)
    } finally {
      setTasksLoading(false)
    }
  }

  useEffect(() => {
    fetchCampaigns()
    fetchStats()
  }, [])

  // ========== Campaign CRUD ==========

  const openCreateCampaign = () => {
    setEditingCampaign(null)
    setCampaignForm({
      name: '',
      description: '',
      code: '',
      status: 'DRAFT',
      startTime: '',
      endTime: '',
      userScope: 'ALL',
      totalRewardAmount: '',
      currency: 'USD',
      rewardType: 'CASH',
      requireClaim: true,
      claimExpiryDays: '7',
      sortOrder: '0',
      isVisible: true,
    })
    setShowCampaignModal(true)
  }

  const openEditCampaign = (c: Campaign) => {
    setEditingCampaign(c)
    setCampaignForm({
      name: c.name,
      description: c.description || '',
      code: c.code || '',
      status: c.status,
      startTime: toInputDatetime(c.startTime),
      endTime: toInputDatetime(c.endTime),
      userScope: (c.participationConditions as any)?.userScope || 'ALL',
      totalRewardAmount: String(c.rewardConfig?.totalRewardAmount || ''),
      currency: c.rewardConfig?.currency || 'USD',
      rewardType: c.rewardConfig?.rewardType || 'CASH',
      requireClaim: c.rewardConfig?.requireClaim !== false,
      claimExpiryDays: String(c.rewardConfig?.claimExpiryDays || '7'),
      sortOrder: String(c.sortOrder),
      isVisible: c.isVisible,
    })
    setShowCampaignModal(true)
  }

  const saveCampaign = async () => {
    try {
      const data: any = {
        name: campaignForm.name,
        description: campaignForm.description || undefined,
        code: campaignForm.code || undefined,
        status: campaignForm.status,
        startTime: campaignForm.startTime ? new Date(campaignForm.startTime).toISOString() : undefined,
        endTime: campaignForm.endTime ? new Date(campaignForm.endTime).toISOString() : undefined,
        participationConditions: { userScope: campaignForm.userScope },
        rewardConfig: {
          totalRewardAmount: campaignForm.totalRewardAmount ? Number(campaignForm.totalRewardAmount) : undefined,
          currency: campaignForm.currency,
          rewardType: campaignForm.rewardType,
          requireClaim: campaignForm.requireClaim,
          claimExpiryDays: Number(campaignForm.claimExpiryDays) || 7,
        },
        sortOrder: Number(campaignForm.sortOrder) || 0,
        isVisible: campaignForm.isVisible,
      }

      if (editingCampaign) {
        await campaignApi.update(editingCampaign.id, data)
      } else {
        await campaignApi.create(data)
      }
      setShowCampaignModal(false)
      fetchCampaigns(pagination.page)
      fetchStats()
    } catch (error) {
      console.error('Failed to save campaign:', error)
    }
  }

  const deleteCampaign = async (id: number) => {
    if (!confirm('确定删除此活动？')) return
    try {
      await campaignApi.delete(id)
      fetchCampaigns(pagination.page)
      fetchStats()
    } catch (error) {
      console.error('Failed to delete campaign:', error)
    }
  }

  const setCampaignStatus = async (id: number, status: CampaignStatus) => {
    try {
      if (status === 'ACTIVE') await campaignApi.setActive(id)
      else if (status === 'PAUSED') await campaignApi.setPaused(id)
      else if (status === 'ENDED') await campaignApi.setEnded(id)
      fetchCampaigns(pagination.page)
      fetchStats()
    } catch (error) {
      console.error('Failed to set status:', error)
    }
  }

  // ========== Task CRUD ==========

  const toggleExpand = (id: number) => {
    if (expandedId === id) {
      setExpandedId(null)
      setTasks([])
    } else {
      setExpandedId(id)
      fetchTasks(id)
    }
  }

  const openCreateTask = () => {
    setEditingTask(null)
    setTaskForm({
      name: '',
      description: '',
      type: 'CHECK_IN',
      repeatType: 'ONCE',
      maxCompletions: '1',
      minAmount: '',
      currency: '',
      coinType: '',
      tradeVolumeMultiple: '',
      deadline: '',
      redirectUrl: '',
      sortOrder: '0',
      isLocked: true,
      status: 'ACTIVE',
    })
    setShowTaskModal(true)
  }

  const openEditTask = (t: CampaignTask) => {
    setEditingTask(t)
    const conditions = (t.completionConditions || {}) as Record<string, any>
    setTaskForm({
      name: t.name,
      description: t.description || '',
      type: t.type,
      repeatType: t.repeatType,
      maxCompletions: String(t.maxCompletions),
      minAmount: String(conditions.minAmount || ''),
      currency: conditions.currency || '',
      coinType: conditions.coinType || '',
      tradeVolumeMultiple: String(conditions.tradeVolumeMultiple || ''),
      deadline: toInputDatetime(t.deadline),
      redirectUrl: t.redirectUrl || '',
      sortOrder: String(t.sortOrder),
      isLocked: t.isLocked,
      status: t.status,
    })
    setShowTaskModal(true)
  }

  const saveTask = async () => {
    if (!expandedId) return
    try {
      const completionConditions: Record<string, any> = {}
      if (taskForm.minAmount) completionConditions.minAmount = Number(taskForm.minAmount)
      if (taskForm.currency) completionConditions.currency = taskForm.currency
      if (taskForm.coinType) completionConditions.coinType = taskForm.coinType
      if (taskForm.tradeVolumeMultiple) completionConditions.tradeVolumeMultiple = Number(taskForm.tradeVolumeMultiple)

      const data: any = {
        name: taskForm.name,
        description: taskForm.description || undefined,
        type: taskForm.type,
        repeatType: taskForm.repeatType,
        maxCompletions: Number(taskForm.maxCompletions) || 1,
        completionConditions: Object.keys(completionConditions).length > 0 ? completionConditions : undefined,
        deadline: taskForm.deadline ? new Date(taskForm.deadline).toISOString() : undefined,
        redirectUrl: taskForm.redirectUrl || undefined,
        sortOrder: Number(taskForm.sortOrder) || 0,
        isLocked: taskForm.isLocked,
        status: taskForm.status,
      }

      if (editingTask) {
        await campaignApi.updateTask(editingTask.id, data)
      } else {
        await campaignApi.createTask(expandedId, data)
      }
      setShowTaskModal(false)
      fetchTasks(expandedId)
    } catch (error) {
      console.error('Failed to save task:', error)
    }
  }

  const deleteTask = async (taskId: number) => {
    if (!expandedId) return
    if (!confirm('确定删除此任务？')) return
    try {
      await campaignApi.deleteTask(taskId)
      fetchTasks(expandedId)
    } catch (error) {
      console.error('Failed to delete task:', error)
    }
  }

  // ========== Reward CRUD ==========

  const openAddReward = (taskId: number) => {
    setEditingReward(null)
    setRewardTaskId(taskId)
    setRewardForm({
      rewardType: 'BONUS',
      grantType: 'FIXED',
      amount: '',
      currency: 'USD',
      targetBalance: 'GAME_BALANCE',
      minAmount: '',
      maxAmount: '',
      percentage: '',
    })
    setShowRewardModal(true)
  }

  const openEditReward = (reward: TaskReward) => {
    setEditingReward(reward)
    setRewardTaskId(reward.taskId)
    const config = (reward.amountConfig || {}) as Record<string, any>
    setRewardForm({
      rewardType: reward.rewardType,
      grantType: reward.grantType,
      amount: reward.amount != null ? String(reward.amount) : '',
      currency: reward.currency || 'USD',
      targetBalance: reward.targetBalance || 'GAME_BALANCE',
      minAmount: String(config.min || ''),
      maxAmount: String(config.max || ''),
      percentage: String(config.percentage || ''),
    })
    setShowRewardModal(true)
  }

  const saveReward = async () => {
    if (!rewardTaskId || !expandedId) return
    try {
      const amountConfig: Record<string, any> = {}
      if (rewardForm.minAmount) amountConfig.min = Number(rewardForm.minAmount)
      if (rewardForm.maxAmount) amountConfig.max = Number(rewardForm.maxAmount)
      if (rewardForm.percentage) amountConfig.percentage = Number(rewardForm.percentage)

      const data: any = {
        rewardType: rewardForm.rewardType,
        grantType: rewardForm.grantType,
        amount: rewardForm.amount ? Number(rewardForm.amount) : undefined,
        amountConfig: Object.keys(amountConfig).length > 0 ? amountConfig : undefined,
        currency: rewardForm.currency || undefined,
        targetBalance: rewardForm.targetBalance || 'GAME_BALANCE',
      }

      if (editingReward) {
        await campaignApi.updateTaskReward(editingReward.id, data)
      } else {
        await campaignApi.addTaskReward(rewardTaskId, data)
      }
      setShowRewardModal(false)
      fetchTasks(expandedId)
    } catch (error) {
      console.error('Failed to save reward:', error)
    }
  }

  const deleteReward = async (rewardId: number) => {
    if (!expandedId) return
    if (!confirm('确定删除此奖励？')) return
    try {
      await campaignApi.deleteTaskReward(rewardId)
      fetchTasks(expandedId)
    } catch (error) {
      console.error('Failed to delete reward:', error)
    }
  }

  // ========== Render ==========

  const columns = [
    {
      key: 'id',
      label: 'ID',
      render: (_: unknown, row: Campaign) => (
        <button onClick={() => toggleExpand(row.id)} className="flex items-center gap-1 text-blue-600 hover:text-blue-800">
          {expandedId === row.id ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          <span>#{row.id}</span>
        </button>
      ),
    },
    { key: 'name', label: '活动名称' },
    { key: 'code', label: '代码', render: (v: unknown) => (v as string) || '-' },
    {
      key: 'status',
      label: '状态',
      render: (v: unknown) => <StatusBadge status={v as string} />,
    },
    {
      key: 'isVisible',
      label: '可见',
      render: (v: unknown) =>
        v ? <Eye size={16} className="text-emerald-500" /> : <EyeOff size={16} className="text-gray-400" />,
    },
    {
      key: 'rewardConfig',
      label: '总奖励',
      render: (v: unknown) => {
        const rc = v as Campaign['rewardConfig']
        if (!rc?.totalRewardAmount) return '-'
        return `${rc.totalRewardAmount} ${rc.currency || 'USD'}`
      },
    },
    {
      key: 'startTime',
      label: '开始时间',
      render: (v: unknown) => formatDate(v as string),
    },
    {
      key: 'endTime',
      label: '结束时间',
      render: (v: unknown) => formatDate(v as string),
    },
    { key: 'sortOrder', label: '排序' },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">活动管理</h2>
          <p className="text-gray-500 text-sm mt-1">管理活动、任务和奖励</p>
        </div>
        <button
          onClick={openCreateCampaign}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors"
        >
          <Plus size={18} /> 创建活动
        </button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-5 gap-4">
          {[
            { label: '全部', value: stats.total, color: 'text-gray-700' },
            { label: '进行中', value: stats.active, color: 'text-emerald-600' },
            { label: '草稿', value: stats.draft, color: 'text-gray-500' },
            { label: '已暂停', value: stats.paused, color: 'text-amber-600' },
            { label: '已结束', value: stats.ended, color: 'text-red-600' },
          ].map((s) => (
            <div key={s.label} className="bg-white rounded-xl border border-gray-100 p-4">
              <p className="text-xs text-gray-500">{s.label}</p>
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Search & Filter */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input
            type="text"
            placeholder="搜索活动名称..."
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchCampaigns(1)}
            className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value as CampaignStatus | '')
            setTimeout(() => fetchCampaigns(1), 0)
          }}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">全部状态</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
        <button
          onClick={() => fetchCampaigns(1)}
          className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm text-gray-600 transition-colors"
        >
          搜索
        </button>
      </div>

      {/* Campaign Table */}
      {loading ? (
        <div className="text-center py-12 text-gray-400">加载中...</div>
      ) : (
        <>
          <DataTable
            columns={columns}
            data={campaigns}
            actions={(row: Campaign) => (
              <>
                {row.status === 'DRAFT' && (
                  <button onClick={() => setCampaignStatus(row.id, 'ACTIVE')} className="p-1.5 rounded-lg text-emerald-500 hover:bg-emerald-50" title="激活">
                    <Play size={16} />
                  </button>
                )}
                {row.status === 'ACTIVE' && (
                  <button onClick={() => setCampaignStatus(row.id, 'PAUSED')} className="p-1.5 rounded-lg text-amber-500 hover:bg-amber-50" title="暂停">
                    <Pause size={16} />
                  </button>
                )}
                {(row.status === 'ACTIVE' || row.status === 'PAUSED') && (
                  <button onClick={() => setCampaignStatus(row.id, 'ENDED')} className="p-1.5 rounded-lg text-red-500 hover:bg-red-50" title="结束">
                    <Square size={16} />
                  </button>
                )}
                {row.status === 'PAUSED' && (
                  <button onClick={() => setCampaignStatus(row.id, 'ACTIVE')} className="p-1.5 rounded-lg text-emerald-500 hover:bg-emerald-50" title="恢复">
                    <Play size={16} />
                  </button>
                )}
                <button onClick={() => openEditCampaign(row)} className="p-1.5 rounded-lg text-blue-500 hover:bg-blue-50" title="编辑">
                  <Edit size={16} />
                </button>
                <button onClick={() => deleteCampaign(row.id)} className="p-1.5 rounded-lg text-red-400 hover:bg-red-50" title="删除">
                  <Trash2 size={16} />
                </button>
              </>
            )}
          />

          {/* Expanded Task Panel */}
          {expandedId && (
            <div className="bg-white rounded-xl border border-blue-100 p-6 -mt-2">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-800">
                  任务列表 - {campaigns.find((c) => c.id === expandedId)?.name}
                </h3>
                <button
                  onClick={openCreateTask}
                  className="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
                >
                  <Plus size={16} /> 添加任务
                </button>
              </div>

              {tasksLoading ? (
                <div className="text-center py-8 text-gray-400">加载中...</div>
              ) : tasks.length === 0 ? (
                <div className="text-center py-8 text-gray-400">暂无任务，点击上方按钮添加</div>
              ) : (
                <div className="space-y-3">
                  {tasks.map((task) => (
                    <div key={task.id} className="border border-gray-100 rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-800">{task.name}</span>
                            <span className="px-2 py-0.5 rounded text-xs bg-blue-50 text-blue-600">
                              {TASK_TYPE_OPTIONS.find((t) => t.value === task.type)?.label || task.type}
                            </span>
                            <span className="px-2 py-0.5 rounded text-xs bg-purple-50 text-purple-600">
                              {REPEAT_TYPE_OPTIONS.find((r) => r.value === task.repeatType)?.label || task.repeatType}
                            </span>
                            <span className={`px-2 py-0.5 rounded text-xs ${task.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-600'}`}>
                              {task.status}
                            </span>
                            {task.isLocked && (
                              <span className="px-2 py-0.5 rounded text-xs bg-amber-50 text-amber-600">锁定</span>
                            )}
                          </div>
                          {task.description && (
                            <p className="text-sm text-gray-500 mt-1">{task.description}</p>
                          )}
                          {task.completionConditions && Object.keys(task.completionConditions).length > 0 && (
                            <p className="text-xs text-gray-400 mt-1">
                              条件: {JSON.stringify(task.completionConditions)}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-1 ml-4">
                          <button onClick={() => openEditTask(task)} className="p-1.5 rounded-lg text-blue-500 hover:bg-blue-50" title="编辑">
                            <Edit size={14} />
                          </button>
                          <button onClick={() => deleteTask(task.id)} className="p-1.5 rounded-lg text-red-400 hover:bg-red-50" title="删除">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>

                      {/* Rewards */}
                      <div className="mt-3 pt-3 border-t border-gray-50">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-medium text-gray-500">奖励配置</span>
                          <button
                            onClick={() => openAddReward(task.id)}
                            className="text-xs text-blue-600 hover:text-blue-800"
                          >
                            + 添加奖励
                          </button>
                        </div>
                        {(!task.rewards || task.rewards.length === 0) ? (
                          <p className="text-xs text-gray-400">暂无奖励</p>
                        ) : (
                          <div className="space-y-1">
                            {task.rewards.map((reward) => (
                              <div key={reward.id} className="flex items-center justify-between bg-gray-50 rounded px-3 py-1.5 text-xs">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium">
                                    {REWARD_TYPE_OPTIONS.find((r) => r.value === reward.rewardType)?.label || reward.rewardType}
                                  </span>
                                  <span className="text-gray-500">
                                    {GRANT_TYPE_OPTIONS.find((g) => g.value === reward.grantType)?.label || reward.grantType}
                                  </span>
                                  {reward.amount != null && <span className="text-emerald-600">{reward.amount} {reward.currency}</span>}
                                  {reward.amountConfig && (reward.amountConfig as any).min != null && (
                                    <span className="text-gray-500">
                                      [{(reward.amountConfig as any).min} - {(reward.amountConfig as any).max}]
                                    </span>
                                  )}
                                  <span className="text-gray-400">→ {reward.targetBalance}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <button onClick={() => openEditReward(reward)} className="p-1 rounded text-blue-500 hover:bg-blue-50">
                                    <Edit size={12} />
                                  </button>
                                  <button onClick={() => deleteReward(reward.id)} className="p-1 rounded text-red-400 hover:bg-red-50">
                                    <Trash2 size={12} />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500">
                共 {pagination.total} 条，第 {pagination.page}/{pagination.totalPages} 页
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => fetchCampaigns(pagination.page - 1)}
                  disabled={pagination.page <= 1}
                  className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm disabled:opacity-50 hover:bg-gray-50"
                >
                  上一页
                </button>
                <button
                  onClick={() => fetchCampaigns(pagination.page + 1)}
                  disabled={pagination.page >= pagination.totalPages}
                  className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm disabled:opacity-50 hover:bg-gray-50"
                >
                  下一页
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* ========== Campaign Modal ========== */}
      <Modal
        isOpen={showCampaignModal}
        onClose={() => setShowCampaignModal(false)}
        title={editingCampaign ? '编辑活动' : '创建活动'}
        size="lg"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">活动名称 *</label>
            <input
              type="text"
              value={campaignForm.name}
              onChange={(e) => setCampaignForm({ ...campaignForm, name: e.target.value })}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="输入活动名称"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">活动描述</label>
            <textarea
              value={campaignForm.description}
              onChange={(e) => setCampaignForm({ ...campaignForm, description: e.target.value })}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
              placeholder="输入活动描述"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">活动代码</label>
              <input
                type="text"
                value={campaignForm.code}
                onChange={(e) => setCampaignForm({ ...campaignForm, code: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="如 WELCOME_BONUS"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">状态</label>
              <select
                value={campaignForm.status}
                onChange={(e) => setCampaignForm({ ...campaignForm, status: e.target.value as CampaignStatus })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">开始时间</label>
              <input
                type="datetime-local"
                value={campaignForm.startTime}
                onChange={(e) => setCampaignForm({ ...campaignForm, startTime: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">结束时间</label>
              <input
                type="datetime-local"
                value={campaignForm.endTime}
                onChange={(e) => setCampaignForm({ ...campaignForm, endTime: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="border-t border-gray-100 pt-4">
            <h4 className="text-sm font-semibold text-gray-700 mb-3">参与条件</h4>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">用户范围</label>
              <select
                value={campaignForm.userScope}
                onChange={(e) => setCampaignForm({ ...campaignForm, userScope: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {USER_SCOPE_OPTIONS.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="border-t border-gray-100 pt-4">
            <h4 className="text-sm font-semibold text-gray-700 mb-3">奖励配置</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">总奖励金额</label>
                <input
                  type="number"
                  value={campaignForm.totalRewardAmount}
                  onChange={(e) => setCampaignForm({ ...campaignForm, totalRewardAmount: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="如 100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">货币</label>
                <input
                  type="text"
                  value={campaignForm.currency}
                  onChange={(e) => setCampaignForm({ ...campaignForm, currency: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">奖励类型</label>
                <select
                  value={campaignForm.rewardType}
                  onChange={(e) => setCampaignForm({ ...campaignForm, rewardType: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="CASH">现金</option>
                  <option value="POINTS">积分</option>
                  <option value="BONUS">赠金</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">领取有效期(天)</label>
                <input
                  type="number"
                  value={campaignForm.claimExpiryDays}
                  onChange={(e) => setCampaignForm({ ...campaignForm, claimExpiryDays: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="flex items-center gap-4 mt-3">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={campaignForm.requireClaim}
                  onChange={(e) => setCampaignForm({ ...campaignForm, requireClaim: e.target.checked })}
                  className="rounded border-gray-300"
                />
                需要手动领取
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={campaignForm.isVisible}
                  onChange={(e) => setCampaignForm({ ...campaignForm, isVisible: e.target.checked })}
                  className="rounded border-gray-300"
                />
                前端可见
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">排序</label>
            <input
              type="number"
              value={campaignForm.sortOrder}
              onChange={(e) => setCampaignForm({ ...campaignForm, sortOrder: e.target.value })}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <button
              onClick={() => setShowCampaignModal(false)}
              className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50"
            >
              取消
            </button>
            <button
              onClick={saveCampaign}
              disabled={!campaignForm.name}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium disabled:opacity-50"
            >
              {editingCampaign ? '保存' : '创建'}
            </button>
          </div>
        </div>
      </Modal>

      {/* ========== Task Modal ========== */}
      <Modal
        isOpen={showTaskModal}
        onClose={() => setShowTaskModal(false)}
        title={editingTask ? '编辑任务' : '添加任务'}
        size="lg"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">任务名称 *</label>
            <input
              type="text"
              value={taskForm.name}
              onChange={(e) => setTaskForm({ ...taskForm, name: e.target.value })}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="输入任务名称"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">任务描述</label>
            <textarea
              value={taskForm.description}
              onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">任务类型 *</label>
              <select
                value={taskForm.type}
                onChange={(e) => setTaskForm({ ...taskForm, type: e.target.value as TaskType })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {TASK_TYPE_OPTIONS.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">重复类型</label>
              <select
                value={taskForm.repeatType}
                onChange={(e) => setTaskForm({ ...taskForm, repeatType: e.target.value as TaskRepeatType })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {REPEAT_TYPE_OPTIONS.map((r) => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">最大完成次数</label>
              <input
                type="number"
                value={taskForm.maxCompletions}
                onChange={(e) => setTaskForm({ ...taskForm, maxCompletions: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">状态</label>
              <select
                value={taskForm.status}
                onChange={(e) => setTaskForm({ ...taskForm, status: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="ACTIVE">激活</option>
                <option value="DISABLED">禁用</option>
              </select>
            </div>
          </div>

          <div className="border-t border-gray-100 pt-4">
            <h4 className="text-sm font-semibold text-gray-700 mb-3">完成条件</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">最小金额</label>
                <input
                  type="number"
                  value={taskForm.minAmount}
                  onChange={(e) => setTaskForm({ ...taskForm, minAmount: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="如交易流水≥10"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">货币</label>
                <input
                  type="text"
                  value={taskForm.currency}
                  onChange={(e) => setTaskForm({ ...taskForm, currency: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="USD"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">币种</label>
                <input
                  type="text"
                  value={taskForm.coinType}
                  onChange={(e) => setTaskForm({ ...taskForm, coinType: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="如 BTC"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">流水倍数</label>
                <input
                  type="number"
                  value={taskForm.tradeVolumeMultiple}
                  onChange={(e) => setTaskForm({ ...taskForm, tradeVolumeMultiple: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">截止时间</label>
              <input
                type="datetime-local"
                value={taskForm.deadline}
                onChange={(e) => setTaskForm({ ...taskForm, deadline: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">跳转链接</label>
              <input
                type="text"
                value={taskForm.redirectUrl}
                onChange={(e) => setTaskForm({ ...taskForm, redirectUrl: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">排序</label>
              <input
                type="number"
                value={taskForm.sortOrder}
                onChange={(e) => setTaskForm({ ...taskForm, sortOrder: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex items-end gap-4 pb-1">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={taskForm.isLocked}
                  onChange={(e) => setTaskForm({ ...taskForm, isLocked: e.target.checked })}
                  className="rounded border-gray-300"
                />
                锁定状态
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <button
              onClick={() => setShowTaskModal(false)}
              className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50"
            >
              取消
            </button>
            <button
              onClick={saveTask}
              disabled={!taskForm.name}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium disabled:opacity-50"
            >
              {editingTask ? '保存' : '添加'}
            </button>
          </div>
        </div>
      </Modal>

      {/* ========== Reward Modal ========== */}
      <Modal
        isOpen={showRewardModal}
        onClose={() => setShowRewardModal(false)}
        title={editingReward ? '编辑奖励' : '添加奖励'}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">奖励类型 *</label>
              <select
                value={rewardForm.rewardType}
                onChange={(e) => setRewardForm({ ...rewardForm, rewardType: e.target.value as RewardType })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {REWARD_TYPE_OPTIONS.map((r) => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">发放类型 *</label>
              <select
                value={rewardForm.grantType}
                onChange={(e) => setRewardForm({ ...rewardForm, grantType: e.target.value as RewardGrantType })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {GRANT_TYPE_OPTIONS.map((g) => (
                  <option key={g.value} value={g.value}>{g.label}</option>
                ))}
              </select>
            </div>
          </div>

          {rewardForm.grantType === 'FIXED' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">固定金额</label>
              <input
                type="number"
                step="0.00000001"
                value={rewardForm.amount}
                onChange={(e) => setRewardForm({ ...rewardForm, amount: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="如 1.5"
              />
            </div>
          )}

          {(rewardForm.grantType === 'RANDOM' || rewardForm.grantType === 'PROGRESSIVE') && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">最小金额</label>
                <input
                  type="number"
                  step="0.00000001"
                  value={rewardForm.minAmount}
                  onChange={(e) => setRewardForm({ ...rewardForm, minAmount: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">最大金额</label>
                <input
                  type="number"
                  step="0.00000001"
                  value={rewardForm.maxAmount}
                  onChange={(e) => setRewardForm({ ...rewardForm, maxAmount: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          )}

          {rewardForm.grantType === 'FIRST_DEPOSIT' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">百分比</label>
              <input
                type="number"
                step="0.01"
                value={rewardForm.percentage}
                onChange={(e) => setRewardForm({ ...rewardForm, percentage: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="如 0.5 表示50%"
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">货币</label>
              <input
                type="text"
                value={rewardForm.currency}
                onChange={(e) => setRewardForm({ ...rewardForm, currency: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">目标余额</label>
              <select
                value={rewardForm.targetBalance}
                onChange={(e) => setRewardForm({ ...rewardForm, targetBalance: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="GAME_BALANCE">游戏余额</option>
                <option value="CASH_BALANCE">现金余额</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <button
              onClick={() => setShowRewardModal(false)}
              className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50"
            >
              取消
            </button>
            <button
              onClick={saveReward}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium"
            >
              {editingReward ? '保存' : '添加'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
