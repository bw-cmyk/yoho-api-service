import { useState, useEffect } from 'react'
import { BotMessageSquare, Plus, Play, Square, RefreshCw, Save, Clock, Settings2 } from 'lucide-react'
import Modal from '../../components/Modal'
import { botApi, productApi, type BotLuckyDrawConfig, type Product, type BotTask } from '../../services/api'

type ProductWithConfig = Product & { botConfig?: BotLuckyDrawConfig; botTask?: BotTask }

export default function LuckyDrawBotConfig() {
  const [products, setProducts] = useState<ProductWithConfig[]>([])
  const [configs, setConfigs] = useState<BotLuckyDrawConfig[]>([])
  const [tasks, setTasks] = useState<BotTask[]>([])
  const [loading, setLoading] = useState(false)
  const [showConfigModal, setShowConfigModal] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<ProductWithConfig | null>(null)
  const [currentConfig, setCurrentConfig] = useState<Partial<BotLuckyDrawConfig>>({})

  // Fetch all data
  const fetchData = async () => {
    setLoading(true)
    try {
      const [productsRes, configsRes, tasksRes] = await Promise.all([
        productApi.getList({ page: 1, limit: 100, type: 'LUCKY_DRAW' }),
        botApi.getConfigs(),
        botApi.getTasks({ taskType: 'LUCKY_DRAW', limit: 100 }),
      ])

      // Merge configs with products
      const productsWithConfig = productsRes.data.map((p) => ({
        ...p,
        botConfig: configsRes.configs.find((c) => c.productId === p.id),
        botTask: tasksRes.items.find((t) => t.targetId === String(p.id)),
      }))

      setProducts(productsWithConfig)
      setConfigs(configsRes.configs)
      setTasks(tasksRes.items)
    } catch (error) {
      console.error('Failed to fetch data:', error)
      alert('获取数据失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const openConfigModal = async (product: ProductWithConfig) => {
    setSelectedProduct(product)

    // Fetch or create config for this product
    try {
      const res = await botApi.getConfig(product.id)
      setCurrentConfig(res.config)
    } catch (error) {
      // If config doesn't exist, create a default one
      setCurrentConfig({
        productId: product.id,
        enabled: false,
        minIntervalSeconds: 30,
        maxIntervalSeconds: 300,
        minQuantity: 1,
        maxQuantity: 5,
        dailyOrderLimit: 100,
        maxFillPercentage: 80,
        activeHours: [],
      })
    }

    setShowConfigModal(true)
  }

  const handleSaveConfig = async () => {
    if (!selectedProduct) return

    try {
      await botApi.updateConfig(selectedProduct.id, currentConfig)
      alert('配置保存成功')
      setShowConfigModal(false)
      fetchData()
    } catch (error: any) {
      console.error('Failed to save config:', error)
      alert(error.response?.data?.message || '保存失败')
    }
  }

  const handleToggleBot = async (product: ProductWithConfig) => {
    if (!product.botConfig) {
      alert('请先配置机器人参数')
      return
    }

    const action = product.botConfig.enabled ? '禁用' : '启用'
    if (!confirm(`确定要${action} ${product.name} 的自动下单机器人吗？`)) {
      return
    }

    try {
      if (product.botConfig.enabled) {
        await botApi.disableBot(product.id)
      } else {
        await botApi.enableBot(product.id)
      }
      alert(`${action}成功`)
      fetchData()
    } catch (error: any) {
      console.error('Failed to toggle bot:', error)
      alert(error.response?.data?.message || `${action}失败`)
    }
  }

  const handleStartTask = async (task: BotTask) => {
    try {
      await botApi.startTask(task.id)
      alert('任务启动成功')
      fetchData()
    } catch (error: any) {
      console.error('Failed to start task:', error)
      alert(error.response?.data?.message || '启动失败')
    }
  }

  const handleStopTask = async (task: BotTask) => {
    if (!confirm('确定要停止此任务吗？')) return
    try {
      await botApi.stopTask(task.id)
      alert('任务停止成功')
      fetchData()
    } catch (error: any) {
      console.error('Failed to stop task:', error)
      alert(error.response?.data?.message || '停止失败')
    }
  }

  const toggleHour = (hour: number) => {
    setCurrentConfig((prev) => {
      const activeHours = prev.activeHours || []
      if (activeHours.includes(hour)) {
        return { ...prev, activeHours: activeHours.filter((h) => h !== hour) }
      } else {
        return { ...prev, activeHours: [...activeHours, hour].sort((a, b) => a - b) }
      }
    })
  }

  const setAllHours = () => {
    setCurrentConfig((prev) => ({ ...prev, activeHours: Array.from({ length: 24 }, (_, i) => i) }))
  }

  const clearAllHours = () => {
    setCurrentConfig((prev) => ({ ...prev, activeHours: [] }))
  }

  const columns = [
    {
      key: 'name' as const,
      label: '商品名称',
      render: (_: unknown, row: ProductWithConfig) => (
        <div className="flex items-center gap-3">
          <img src={row.thumbnail} alt="" className="w-10 h-10 rounded-lg object-cover bg-gray-200" />
          <div>
            <div className="font-medium text-gray-900">{row.name}</div>
            <div className="text-xs text-gray-500">ID: {row.id}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'status' as const,
      label: '商品状态',
      render: (_: unknown, row: ProductWithConfig) => {
        const statusColors: Record<string, string> = {
          ACTIVE: 'bg-green-100 text-green-600',
          PAUSED: 'bg-amber-100 text-amber-600',
          DRAFT: 'bg-gray-100 text-gray-600',
          SOLD_OUT: 'bg-red-100 text-red-600',
        }
        return (
          <span className={`px-2 py-1 rounded text-xs font-medium ${statusColors[row.status] || 'bg-gray-100 text-gray-600'}`}>
            {row.status === 'ACTIVE' ? '进行中' : row.status === 'PAUSED' ? '暂停' : row.status === 'DRAFT' ? '草稿' : '已售罄'}
          </span>
        )
      },
    },
    {
      key: 'botStatus' as const,
      label: 'Bot状态',
      render: (_: unknown, row: ProductWithConfig) => (
        <div className="flex items-center gap-2">
          <span className={`px-2 py-1 rounded text-xs font-medium ${
            row.botConfig?.enabled
              ? 'bg-blue-100 text-blue-600'
              : 'bg-gray-100 text-gray-600'
          }`}>
            {row.botConfig?.enabled ? '已启用' : '未启用'}
          </span>
          {row.botTask?.enabled && (
            <span className={`px-2 py-1 rounded text-xs font-medium ${
              row.botTask?.enabled ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-100 text-gray-600'
            }`}>
              运行中
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'config' as const,
      label: '配置信息',
      render: (_: unknown, row: ProductWithConfig) => {
        if (!row.botConfig) return <span className="text-gray-400">未配置</span>
        return (
          <div className="text-xs text-gray-600">
            <div>间隔: {row.botConfig.minIntervalSeconds}-{row.botConfig.maxIntervalSeconds}s</div>
            <div>数量: {row.botConfig.minQuantity}-{row.botConfig.maxQuantity}</div>
            <div>填充率: {row.botConfig.maxFillPercentage}%</div>
          </div>
        )
      },
    },
  ]

  const actions = (row: ProductWithConfig) => (
    <div className="flex items-center gap-2">
      <button
        onClick={() => openConfigModal(row)}
        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
        title="配置"
      >
        <Settings2 className="w-4 h-4" />
      </button>
      {row.botConfig ? (
        <button
          onClick={() => handleToggleBot(row)}
          className={`p-1.5 rounded transition-colors ${
            row.botConfig.enabled
              ? 'text-amber-600 hover:bg-amber-50'
              : 'text-emerald-600 hover:bg-emerald-50'
          }`}
          title={row.botConfig.enabled ? '禁用' : '启用'}
        >
          {row.botConfig.enabled ? <Square className="w-4 h-4" /> : <Play className="w-4 h-4" />}
        </button>
      ) : (
        <button
          onClick={() => openConfigModal(row)}
          className="p-1.5 text-gray-400 cursor-not-allowed"
          title="请先配置"
        >
          <Play className="w-4 h-4" />
        </button>
      )}
    </div>
  )

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <BotMessageSquare className="w-8 h-8 text-purple-600" />
            <h1 className="text-2xl font-bold text-gray-900">一元购 Bot 配置</h1>
          </div>
          <button
            onClick={fetchData}
            disabled={loading}
            className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            刷新
          </button>
        </div>
        <p className="text-gray-600 text-sm">
          为一元购商品配置自动下单机器人，模拟真实用户下单行为
        </p>
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="w-10 h-10 border-4 border-gray-200 border-t-purple-500 rounded-full animate-spin"></div>
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            暂无一元购商品
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  {columns.map((col) => (
                    <th
                      key={String(col.key)}
                      className="px-5 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      {col.label}
                    </th>
                  ))}
                  <th className="px-5 py-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {products.map((row) => (
                  <tr key={row.id} className="hover:bg-gray-50 transition-colors">
                    {columns.map((col) => (
                      <td key={String(col.key)} className="px-5 py-4 whitespace-nowrap text-sm text-gray-700">
                        {col.render ? col.render(null, row) : String((row as any)[col.key] ?? '')}
                      </td>
                    ))}
                    <td className="px-5 py-4 whitespace-nowrap text-right">
                      {actions(row)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Config Modal */}
      <Modal
        isOpen={showConfigModal}
        onClose={() => setShowConfigModal(false)}
        title={selectedProduct ? `配置 Bot - ${selectedProduct.name}` : '配置 Bot'}
        size="lg"
      >
        <div className="space-y-6">
          {/* Enable Toggle */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <div className="font-medium text-gray-900">启用 Bot</div>
              <div className="text-sm text-gray-500">开启后机器人将自动参与此商品的一元购</div>
            </div>
            <button
              onClick={() => setCurrentConfig((prev) => ({ ...prev, enabled: !prev.enabled }))}
              className={`relative w-14 h-7 rounded-full transition-colors ${
                currentConfig.enabled ? 'bg-blue-600' : 'bg-gray-300'
              }`}
            >
              <span
                className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                  currentConfig.enabled ? 'left-8' : 'left-1'
                }`}
              />
            </button>
          </div>

          {/* Interval Settings */}
          <div>
            <h3 className="text-sm font-medium text-gray-900 mb-3 flex items-center gap-2">
              <Clock className="w-4 h-4" />
              下单间隔（随机）
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">最小间隔（秒）</label>
                <input
                  type="number"
                  min="10"
                  value={currentConfig.minIntervalSeconds || 30}
                  onChange={(e) => setCurrentConfig({ ...currentConfig, minIntervalSeconds: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">最大间隔（秒）</label>
                <input
                  type="number"
                  min="10"
                  value={currentConfig.maxIntervalSeconds || 300}
                  onChange={(e) => setCurrentConfig({ ...currentConfig, maxIntervalSeconds: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>
          </div>

          {/* Quantity Settings */}
          <div>
            <h3 className="text-sm font-medium text-gray-900 mb-3">下单数量（随机）</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">最小数量</label>
                <input
                  type="number"
                  min="1"
                  value={currentConfig.minQuantity || 1}
                  onChange={(e) => setCurrentConfig({ ...currentConfig, minQuantity: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">最大数量</label>
                <input
                  type="number"
                  min="1"
                  value={currentConfig.maxQuantity || 5}
                  onChange={(e) => setCurrentConfig({ ...currentConfig, maxQuantity: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>
          </div>

          {/* Limits */}
          <div>
            <h3 className="text-sm font-medium text-gray-900 mb-3">限制设置</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">每日订单上限</label>
                <input
                  type="number"
                  min="1"
                  value={currentConfig.dailyOrderLimit || 100}
                  onChange={(e) => setCurrentConfig({ ...currentConfig, dailyOrderLimit: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">最大填充比例（%）</label>
                <input
                  type="number"
                  min="10"
                  max="95"
                  value={currentConfig.maxFillPercentage || 80}
                  onChange={(e) => setCurrentConfig({ ...currentConfig, maxFillPercentage: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                />
                <p className="text-xs text-gray-500 mt-1">达到此比例后停止下单，留空间给真实用户</p>
              </div>
            </div>
          </div>

          {/* Active Hours */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-gray-900 flex items-center gap-2">
                <Clock className="w-4 h-4" />
                活跃时段
              </h3>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={setAllHours}
                  className="text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded"
                >
                  全选
                </button>
                <button
                  type="button"
                  onClick={clearAllHours}
                  className="text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded"
                >
                  清空
                </button>
              </div>
            </div>
            <div className="grid grid-cols-12 gap-1">
              {Array.from({ length: 24 }, (_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => toggleHour(i)}
                  className={`py-2 text-xs rounded transition-colors ${
                    (currentConfig.activeHours || []).includes(i)
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {i}
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-2">
              已选择: {(currentConfig.activeHours || []).length} 个小时
              {(currentConfig.activeHours || []).length === 0 && '（全天）'}
            </p>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={() => setShowConfigModal(false)}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              取消
            </button>
            <button
              onClick={handleSaveConfig}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              保存配置
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
