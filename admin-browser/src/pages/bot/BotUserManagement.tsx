import { useState, useEffect } from 'react'
import { Bot, Plus, DollarSign, Power, PowerOff, Trash2, RefreshCw, Wallet } from 'lucide-react'
import DataTable from '../../components/DataTable'
import Modal from '../../components/Modal'
import { botApi, type BotUser, type BotUserStats } from '../../services/api'

export default function BotUserManagement() {
  const [bots, setBots] = useState<BotUser[]>([])
  const [stats, setStats] = useState<BotUserStats | null>(null)
  const [loading, setLoading] = useState(false)
  const [statsLoading, setStatsLoading] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showRechargeModal, setShowRechargeModal] = useState(false)
  const [showBatchRechargeModal, setShowBatchRechargeModal] = useState(false)
  const [selectedBot, setSelectedBot] = useState<BotUser | null>(null)
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0 })
  const [enabledFilter, setEnabledFilter] = useState<boolean | undefined>(undefined)

  const [createForm, setCreateForm] = useState({
    count: 10,
    displayNamePrefix: '',
    initialBalance: 100,
  })

  const [rechargeForm, setRechargeForm] = useState({
    amount: 100,
  })

  const [batchRechargeForm, setBatchRechargeForm] = useState({
    amountPerBot: 50,
  })

  const fetchBots = async (page = 1, limit = 20) => {
    setLoading(true)
    try {
      const res = await botApi.getList({
        page,
        limit,
        enabled: enabledFilter,
      })
      setBots(res.items)
      setPagination({ page: res.page, limit: res.limit, total: res.total })
    } catch (error) {
      console.error('Failed to fetch bots:', error)
      alert('获取机器人列表失败')
    } finally {
      setLoading(false)
    }
  }

  const fetchStats = async () => {
    setStatsLoading(true)
    try {
      const res = await botApi.getStats()
      setStats(res.stats)
    } catch (error) {
      console.error('Failed to fetch bot stats:', error)
    } finally {
      setStatsLoading(false)
    }
  }

  useEffect(() => {
    fetchBots()
    fetchStats()
  }, [enabledFilter])

  const handleBatchCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (createForm.count < 1 || createForm.count > 100) {
      alert('创建数量必须在 1-100 之间')
      return
    }
    if (createForm.initialBalance < 0) {
      alert('初始余额不能为负数')
      return
    }

    try {
      const res = await botApi.batchCreate({
        count: createForm.count,
        displayNamePrefix: createForm.displayNamePrefix || undefined,
        initialBalance: createForm.initialBalance,
      })
      alert(`成功创建 ${res.count} 个机器人用户`)
      setShowCreateModal(false)
      setCreateForm({ count: 10, displayNamePrefix: '', initialBalance: 100 })
      fetchBots()
      fetchStats()
    } catch (error: any) {
      console.error('Failed to create bots:', error)
      alert(error.response?.data?.message || '创建失败')
    }
  }

  const handleRecharge = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedBot) return
    if (rechargeForm.amount <= 0) {
      alert('充值金额必须大于 0')
      return
    }

    try {
      await botApi.recharge(selectedBot.userId, rechargeForm.amount)
      alert('充值成功')
      setShowRechargeModal(false)
      setRechargeForm({ amount: 100 })
      fetchBots()
      fetchStats()
    } catch (error: any) {
      console.error('Failed to recharge:', error)
      alert(error.response?.data?.message || '充值失败')
    }
  }

  const handleBatchRecharge = async (e: React.FormEvent) => {
    e.preventDefault()
    if (batchRechargeForm.amountPerBot <= 0) {
      alert('充值金额必须大于 0')
      return
    }

    if (!confirm(`确定要为所有机器人用户充值 $${batchRechargeForm.amountPerBot} 吗？`)) {
      return
    }

    try {
      const res = await botApi.batchRecharge(batchRechargeForm.amountPerBot)
      alert(`充值完成：成功 ${res.success} 个，失败 ${res.failed} 个`)
      setShowBatchRechargeModal(false)
      setBatchRechargeForm({ amountPerBot: 50 })
      fetchBots()
      fetchStats()
    } catch (error: any) {
      console.error('Failed to batch recharge:', error)
      alert(error.response?.data?.message || '批量充值失败')
    }
  }

  const handleToggleStatus = async (bot: BotUser) => {
    if (!confirm(`确定要${bot.enabled ? '禁用' : '启用'}机器人 ${bot.displayName} 吗？`)) {
      return
    }

    try {
      await botApi.toggleStatus(bot.userId, !bot.enabled)
      fetchBots()
      fetchStats()
    } catch (error: any) {
      console.error('Failed to toggle status:', error)
      alert(error.response?.data?.message || '状态更新失败')
    }
  }

  const handleDelete = async (bot: BotUser) => {
    if (!confirm(`确定要删除机器人 ${bot.displayName} 吗？此操作不可恢复。`)) {
      return
    }

    try {
      await botApi.delete(bot.userId)
      alert('删除成功')
      fetchBots()
      fetchStats()
    } catch (error: any) {
      console.error('Failed to delete bot:', error)
      alert(error.response?.data?.message || '删除失败')
    }
  }

  const columns = [
    {
      key: 'userId',
      label: 'UID',
      render: (value: string) => (
        <span className="font-mono text-sm text-gray-600">{value.slice(0, 12)}...</span>
      ),
    },
    {
      key: 'displayName',
      label: '名称',
      render: (value: string, row: BotUser) => (
        <div className="flex items-center gap-3">
          <img
            src={row.displayAvatar}
            alt=""
            className="w-8 h-8 rounded-full bg-gray-200"
            onError={(e) => {
              e.currentTarget.src = 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + row.userId
            }}
          />
          <span className="font-medium text-gray-900">{value}</span>
        </div>
      ),
    },
    {
      key: 'balance',
      label: '余额',
      render: (value: string | undefined) => (
        <span className="font-medium text-emerald-600">
          ${parseFloat(value || '0').toFixed(2)}
        </span>
      ),
    },
    {
      key: 'enabled',
      label: '状态',
      render: (value: boolean) => (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
          value ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-600'
        }`}>
          {value ? '已启用' : '已禁用'}
        </span>
      ),
    },
    {
      key: 'createdAt',
      label: '创建时间',
      render: (value: string) => (
        <span className="text-sm text-gray-500">
          {new Date(value).toLocaleDateString('zh-CN')}
        </span>
      ),
    },
  ]

  const actions = (bot: BotUser) => (
    <div className="flex items-center gap-2">
      <button
        onClick={() => {
          setSelectedBot(bot)
          setShowRechargeModal(true)
        }}
        className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded transition-colors"
        title="充值"
      >
        <DollarSign className="w-4 h-4" />
      </button>
      <button
        onClick={() => handleToggleStatus(bot)}
        className={`p-1.5 rounded transition-colors ${
          bot.enabled
            ? 'text-amber-600 hover:bg-amber-50'
            : 'text-emerald-600 hover:bg-emerald-50'
        }`}
        title={bot.enabled ? '禁用' : '启用'}
      >
        {bot.enabled ? <PowerOff className="w-4 h-4" /> : <Power className="w-4 h-4" />}
      </button>
      <button
        onClick={() => handleDelete(bot)}
        className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
        title="删除"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  )

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <Bot className="w-8 h-8 text-blue-600" />
            <h1 className="text-2xl font-bold text-gray-900">Bot 用户管理</h1>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                fetchBots()
                fetchStats()
              }}
              disabled={loading}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              刷新
            </button>
            <button
              onClick={() => setShowBatchRechargeModal(true)}
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors flex items-center gap-2"
            >
              <Wallet className="w-4 h-4" />
              批量充值
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              批量创建
            </button>
          </div>
        </div>
        <p className="text-gray-600 text-sm">
          管理机器人用户，支持批量创建、充值、启用/禁用等操作
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-600 mb-1">总机器人</div>
              <div className="text-2xl font-bold text-gray-900">
                {statsLoading ? '-' : stats?.totalBots || 0}
              </div>
            </div>
            <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
              <Bot className="w-5 h-5 text-blue-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-600 mb-1">已启用</div>
              <div className="text-2xl font-bold text-emerald-600">
                {statsLoading ? '-' : stats?.enabledBots || 0}
              </div>
            </div>
            <div className="w-10 h-10 bg-emerald-50 rounded-lg flex items-center justify-center">
              <Power className="w-5 h-5 text-emerald-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-600 mb-1">总余额</div>
              <div className="text-2xl font-bold text-gray-900">
                ${statsLoading ? '-' : parseFloat(stats?.totalBalance || '0').toFixed(2)}
              </div>
            </div>
            <div className="w-10 h-10 bg-amber-50 rounded-lg flex items-center justify-center">
              <Wallet className="w-5 h-5 text-amber-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-600 mb-1">低余额</div>
              <div className="text-2xl font-bold text-red-600">
                {statsLoading ? '-' : stats?.botsWithLowBalance || 0}
              </div>
            </div>
            <div className="w-10 h-10 bg-red-50 rounded-lg flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-red-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Filter */}
      <div className="mb-4 flex items-center gap-4">
        <span className="text-sm text-gray-600">筛选:</span>
        <div className="flex gap-2">
          <button
            onClick={() => setEnabledFilter(undefined)}
            className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
              enabledFilter === undefined
                ? 'bg-blue-100 text-blue-700'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            全部
          </button>
          <button
            onClick={() => setEnabledFilter(true)}
            className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
              enabledFilter === true
                ? 'bg-blue-100 text-blue-700'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            已启用
          </button>
          <button
            onClick={() => setEnabledFilter(false)}
            className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
              enabledFilter === false
                ? 'bg-blue-100 text-blue-700'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            已禁用
          </button>
        </div>
      </div>

      {/* Bot List */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="w-10 h-10 border-4 border-gray-200 border-t-blue-500 rounded-full animate-spin"></div>
          </div>
        ) : (
          <DataTable columns={columns} data={bots} actions={actions} />
        )}
      </div>

      {/* Pagination */}
      {pagination.total > 0 && (
        <div className="mt-4 flex justify-between items-center">
          <span className="text-gray-500">共 {pagination.total} 条记录</span>
          <div className="flex space-x-2">
            <button
              onClick={() => fetchBots(pagination.page - 1, pagination.limit)}
              disabled={pagination.page <= 1}
              className="px-3 py-1 border rounded disabled:opacity-50"
            >
              上一页
            </button>
            <span className="px-3 py-1">
              {pagination.page} / {Math.ceil(pagination.total / pagination.limit)}
            </span>
            <button
              onClick={() => fetchBots(pagination.page + 1, pagination.limit)}
              disabled={pagination.page >= Math.ceil(pagination.total / pagination.limit)}
              className="px-3 py-1 border rounded disabled:opacity-50"
            >
              下一页
            </button>
          </div>
        </div>
      )}

      {/* Batch Create Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="批量创建机器人"
        size="md"
      >
        <form onSubmit={handleBatchCreate} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              创建数量 <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              min="1"
              max="100"
              value={createForm.count}
              onChange={(e) => setCreateForm({ ...createForm, count: parseInt(e.target.value) || 1 })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
            <p className="text-xs text-gray-500 mt-1">一次最多创建 100 个机器人</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              名称前缀
            </label>
            <input
              type="text"
              value={createForm.displayNamePrefix}
              onChange={(e) => setCreateForm({ ...createForm, displayNamePrefix: e.target.value })}
              placeholder="如: LuckyBot"
              maxLength={20}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">留空则自动生成随机名称</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              初始余额 (USD) <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2 text-gray-500">$</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={createForm.initialBalance}
                onChange={(e) => setCreateForm({ ...createForm, initialBalance: parseFloat(e.target.value) || 0 })}
                className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={() => setShowCreateModal(false)}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              取消
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              创建
            </button>
          </div>
        </form>
      </Modal>

      {/* Recharge Modal */}
      <Modal
        isOpen={showRechargeModal}
        onClose={() => {
          setShowRechargeModal(false)
          setSelectedBot(null)
        }}
        title="充值"
        size="sm"
      >
        <form onSubmit={handleRecharge} className="space-y-4">
          {selectedBot && (
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <img
                src={selectedBot.displayAvatar}
                alt=""
                className="w-10 h-10 rounded-full bg-gray-200"
              />
              <div>
                <div className="font-medium">{selectedBot.displayName}</div>
                <div className="text-sm text-gray-500">当前余额: ${parseFloat(selectedBot.balance || '0').toFixed(2)}</div>
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              充值金额 (USD) <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2 text-gray-500">$</span>
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={rechargeForm.amount}
                onChange={(e) => setRechargeForm({ amount: parseFloat(e.target.value) || 0 })}
                className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                required
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={() => {
                setShowRechargeModal(false)
                setSelectedBot(null)
              }}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              取消
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
            >
              充值
            </button>
          </div>
        </form>
      </Modal>

      {/* Batch Recharge Modal */}
      <Modal
        isOpen={showBatchRechargeModal}
        onClose={() => setShowBatchRechargeModal(false)}
        title="批量充值"
        size="sm"
      >
        <form onSubmit={handleBatchRecharge} className="space-y-4">
          <div className="p-3 bg-blue-50 rounded-lg">
            <div className="text-sm text-blue-800">
              将为所有 <span className="font-semibold">{stats?.totalBots || 0}</span> 个机器人用户充值
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              每个机器人充值金额 (USD) <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2 text-gray-500">$</span>
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={batchRechargeForm.amountPerBot}
                onChange={(e) => setBatchRechargeForm({ amountPerBot: parseFloat(e.target.value) || 0 })}
                className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                required
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              预计总金额: ${(stats?.totalBots || 0) * batchRechargeForm.amountPerBot}
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={() => setShowBatchRechargeModal(false)}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              取消
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
            >
              批量充值
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
