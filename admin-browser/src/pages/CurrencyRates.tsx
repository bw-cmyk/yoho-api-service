import { useState, useEffect } from 'react'
import { Edit, Plus, Trash2, RefreshCw, DollarSign, Power, PowerOff } from 'lucide-react'
import DataTable from '../components/DataTable'
import Modal from '../components/Modal'
import { currencyApi, type CurrencyRate } from '../services/api'

export default function CurrencyRates() {
  const [currencies, setCurrencies] = useState<CurrencyRate[]>([])
  const [loading, setLoading] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [editingCurrency, setEditingCurrency] = useState<CurrencyRate | null>(null)
  const [formData, setFormData] = useState({
    code: '',
    rateToUSD: '',
    symbol: '',
    name: '',
    decimals: '2',
    displayOrder: '0',
  })

  const fetchCurrencies = async () => {
    setLoading(true)
    try {
      const data = await currencyApi.getList()
      setCurrencies(data)
    } catch (error) {
      console.error('Failed to fetch currencies:', error)
      alert('获取货币列表失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCurrencies()
  }, [])

  const handleOpenModal = (currency?: CurrencyRate) => {
    if (currency) {
      setEditingCurrency(currency)
      setFormData({
        code: currency.currency,
        rateToUSD: currency.rateToUSD,
        symbol: currency.symbol,
        name: currency.name,
        decimals: currency.decimals.toString(),
        displayOrder: currency.displayOrder.toString(),
      })
    } else {
      setEditingCurrency(null)
      setFormData({
        code: '',
        rateToUSD: '',
        symbol: '',
        name: '',
        decimals: '2',
        displayOrder: '0',
      })
    }
    setShowModal(true)
  }

  const handleCloseModal = () => {
    setShowModal(false)
    setEditingCurrency(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // 验证
    if (!formData.code || !formData.rateToUSD || !formData.symbol || !formData.name) {
      alert('请填写所有必填字段')
      return
    }

    if (parseFloat(formData.rateToUSD) <= 0) {
      alert('汇率必须大于0')
      return
    }

    try {
      if (editingCurrency) {
        // 更新
        await currencyApi.update(editingCurrency.currency, {
          rateToUSD: formData.rateToUSD,
          symbol: formData.symbol,
          name: formData.name,
          decimals: parseInt(formData.decimals),
          displayOrder: parseInt(formData.displayOrder),
        })
        alert('货币更新成功')
      } else {
        // 创建
        await currencyApi.create({
          code: formData.code.toUpperCase(),
          rateToUSD: formData.rateToUSD,
          symbol: formData.symbol,
          name: formData.name,
          decimals: parseInt(formData.decimals),
          displayOrder: parseInt(formData.displayOrder),
        })
        alert('货币添加成功')
      }
      handleCloseModal()
      fetchCurrencies()
    } catch (error: any) {
      console.error('Failed to save currency:', error)
      alert(error.response?.data?.message || '保存失败')
    }
  }

  const handleToggleStatus = async (currency: CurrencyRate) => {
    if (currency.currency === 'USD') {
      alert('USD不能禁用')
      return
    }

    if (!confirm(`确定要${currency.isActive ? '禁用' : '启用'} ${currency.name}?`)) {
      return
    }

    try {
      await currencyApi.toggleStatus(currency.currency)
      alert('状态更新成功')
      fetchCurrencies()
    } catch (error: any) {
      console.error('Failed to toggle status:', error)
      alert(error.response?.data?.message || '状态更新失败')
    }
  }

  const handleDelete = async (currency: CurrencyRate) => {
    if (currency.currency === 'USD') {
      alert('USD不能删除')
      return
    }

    if (!confirm(`确定要删除 ${currency.name}? 此操作不可恢复。`)) {
      return
    }

    try {
      await currencyApi.delete(currency.currency)
      alert('删除成功')
      fetchCurrencies()
    } catch (error: any) {
      console.error('Failed to delete currency:', error)
      alert(error.response?.data?.message || '删除失败')
    }
  }

  const columns = [
    {
      key: 'currency',
      label: '货币代码',
      render: (value: string) => (
        <span className="font-mono font-semibold text-gray-900">{value}</span>
      )
    },
    {
      key: 'symbol',
      label: '符号',
      render: (value: string) => (
        <span className="text-lg">{value}</span>
      )
    },
    { key: 'name', label: '名称' },
    {
      key: 'rateToUSD',
      label: '汇率 (对USD)',
      render: (value: string) => (
        <span className="font-mono text-gray-700">1 USD = {value}</span>
      )
    },
    {
      key: 'decimals',
      label: '小数位',
      render: (value: number) => <span className="text-gray-600">{value}</span>
    },
    {
      key: 'isActive',
      label: '状态',
      render: (value: boolean) => (
        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
          value ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-600'
        }`}>
          {value ? '已启用' : '已禁用'}
        </span>
      )
    },
    {
      key: 'displayOrder',
      label: '显示顺序',
      render: (value: number) => <span className="text-gray-500">{value}</span>
    },
    {
      key: 'lastUpdatedAt',
      label: '最后更新',
      render: (value: string) => (
        <span className="text-sm text-gray-500">
          {new Date(value).toLocaleString('zh-CN')}
        </span>
      )
    },
  ]

  const actions = (currency: CurrencyRate) => (
    <div className="flex items-center gap-2">
      <button
        onClick={() => handleOpenModal(currency)}
        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
        title="编辑"
      >
        <Edit className="w-4 h-4" />
      </button>
      <button
        onClick={() => handleToggleStatus(currency)}
        className={`p-1.5 rounded transition-colors ${
          currency.isActive
            ? 'text-amber-600 hover:bg-amber-50'
            : 'text-emerald-600 hover:bg-emerald-50'
        }`}
        title={currency.isActive ? '禁用' : '启用'}
        disabled={currency.currency === 'USD'}
      >
        {currency.isActive ? <PowerOff className="w-4 h-4" /> : <Power className="w-4 h-4" />}
      </button>
      <button
        onClick={() => handleDelete(currency)}
        className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        title="删除"
        disabled={currency.currency === 'USD'}
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  )

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* 头部 */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <DollarSign className="w-8 h-8 text-emerald-600" />
            <h1 className="text-2xl font-bold text-gray-900">货币汇率管理</h1>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={fetchCurrencies}
              disabled={loading}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              刷新
            </button>
            <button
              onClick={() => handleOpenModal()}
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              添加货币
            </button>
          </div>
        </div>
        <p className="text-gray-600 text-sm">
          管理系统支持的货币和汇率。所有金额以USD存储，根据用户偏好转换显示。
        </p>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="text-sm text-gray-600 mb-1">总货币数</div>
          <div className="text-2xl font-bold text-gray-900">{currencies.length}</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="text-sm text-gray-600 mb-1">已启用</div>
          <div className="text-2xl font-bold text-emerald-600">
            {currencies.filter(c => c.isActive).length}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="text-sm text-gray-600 mb-1">已禁用</div>
          <div className="text-2xl font-bold text-gray-600">
            {currencies.filter(c => !c.isActive).length}
          </div>
        </div>
      </div>

      {/* 货币列表 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <DataTable
          columns={columns}
          data={currencies}
          loading={loading}
          actions={actions}
        />
      </div>

      {/* 添加/编辑模态框 */}
      <Modal
        isOpen={showModal}
        onClose={handleCloseModal}
        title={editingCurrency ? '编辑货币' : '添加货币'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              货币代码 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
              disabled={!!editingCurrency}
              placeholder="如: CNY, EUR"
              maxLength={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 disabled:bg-gray-100 disabled:cursor-not-allowed uppercase font-mono"
              required
            />
            {editingCurrency && (
              <p className="text-xs text-gray-500 mt-1">货币代码不可修改</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              汇率 (对USD) <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2 text-gray-500">1 USD =</span>
              <input
                type="number"
                step="0.00000001"
                value={formData.rateToUSD}
                onChange={(e) => setFormData({ ...formData, rateToUSD: e.target.value })}
                placeholder="3.67"
                className="w-full pl-20 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 font-mono"
                required
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">示例: 1 USD = 3.67 AED</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              货币符号 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.symbol}
              onChange={(e) => setFormData({ ...formData, symbol: e.target.value })}
              placeholder="如: $, €, ¥"
              maxLength={10}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              货币名称 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="如: Chinese Yuan"
              maxLength={100}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                小数位数
              </label>
              <input
                type="number"
                min="0"
                max="8"
                value={formData.decimals}
                onChange={(e) => setFormData({ ...formData, decimals: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                显示顺序
              </label>
              <input
                type="number"
                min="0"
                value={formData.displayOrder}
                onChange={(e) => setFormData({ ...formData, displayOrder: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={handleCloseModal}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              取消
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
            >
              {editingCurrency ? '保存' : '添加'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
