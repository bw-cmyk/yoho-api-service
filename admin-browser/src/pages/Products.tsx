import { useState, useEffect, useRef } from 'react'
import { Edit, Play, Pause, Archive, Plus, Search, Trash2, RefreshCw, Upload, X, Settings } from 'lucide-react'
import DataTable from '../components/DataTable'
import Modal from '../components/Modal'
import { productApi, uploadApi, specificationApi, type Product, type ProductType, type ProductStatus, type Specification } from '../services/api'

const TABS: { value: ProductType; label: string }[] = [
  { value: 'LUCKY_DRAW', label: '一元购' },
  { value: 'INSTANT_BUY', label: 'Instance Buy' },
]

const STATUS_OPTIONS: { value: ProductStatus; label: string; color: string }[] = [
  { value: 'DRAFT', label: '草稿', color: 'bg-gray-100 text-gray-600' },
  { value: 'SCHEDULED', label: '预约中', color: 'bg-blue-100 text-blue-600' },
  { value: 'ACTIVE', label: '已上架', color: 'bg-emerald-50 text-emerald-600' },
  { value: 'PAUSED', label: '已暂停', color: 'bg-amber-50 text-amber-600' },
  { value: 'SOLD_OUT', label: '已售罄', color: 'bg-red-50 text-red-600' },
  { value: 'ARCHIVED', label: '已归档', color: 'bg-gray-200 text-gray-700' },
]

interface SpecItem {
  key: string
  value: string
  isDefault: boolean
}

export default function Products() {
  const [activeTab, setActiveTab] = useState<ProductType>('LUCKY_DRAW')
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [showSpecModal, setShowSpecModal] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [specProduct, setSpecProduct] = useState<Product | null>(null)
  const [specifications, setSpecifications] = useState<SpecItem[]>([])
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    originalPrice: '',
    salePrice: '',
    stock: '',
    thumbnail: '',
    badge: '',
    priority: '0',
  })
  const [keyword, setKeyword] = useState('')
  const [statusFilter, setStatusFilter] = useState<ProductStatus | ''>('')
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 0 })
  const [uploading, setUploading] = useState(false)
  const [savingSpecs, setSavingSpecs] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const fetchProducts = async (page = 1, limit = 10, type: ProductType = activeTab) => {
    setLoading(true)
    try {
      const res = await productApi.getList({
        page,
        limit,
        keyword: keyword || undefined,
        type,
        status: statusFilter || undefined,
      })
      setProducts(res.data)
      setPagination({ page: res.page, limit: res.limit, total: res.total, totalPages: res.totalPages })
    } catch (error) {
      console.error('Failed to fetch products:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchProducts(1, 10, activeTab)
  }, [activeTab])

  const handleTabChange = (tab: ProductType) => {
    setActiveTab(tab)
    setKeyword('')
    setStatusFilter('')
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    try {
      const result = await uploadApi.uploadImage(file)
      setFormData({ ...formData, thumbnail: result.url })
    } catch (error) {
      console.error('Failed to upload image:', error)
      alert('图片上传失败')
    } finally {
      setUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const columns = [
    { key: 'id' as const, label: 'ID' },
    {
      key: 'thumbnail' as const,
      label: '图片',
      render: (v: unknown) => v ? (
        <img src={String(v)} alt="" className="w-10 h-10 object-cover rounded-lg" />
      ) : (
        <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center text-gray-400 text-xs">无</div>
      ),
    },
    { key: 'name' as const, label: '商品名称' },
    {
      key: 'salePrice' as const,
      label: '售价',
      render: (v: unknown, row: Product) => (
        <div>
          <span className="font-medium text-emerald-600">${v}</span>
          {row.originalPrice !== row.salePrice && (
            <span className="text-gray-400 line-through ml-2 text-xs">${row.originalPrice}</span>
          )}
        </div>
      ),
    },
    { key: 'stock' as const, label: '库存' },
    {
      key: 'status' as const,
      label: '状态',
      render: (v: unknown) => {
        const opt = STATUS_OPTIONS.find((o) => o.value === v)
        return (
          <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${opt?.color || 'bg-gray-100 text-gray-600'}`}>
            {opt?.label || v}
          </span>
        )
      },
    },
    {
      key: 'createdAt' as const,
      label: '创建时间',
      render: (v: unknown) => new Date(v as string).toLocaleDateString(),
    },
  ]

  const handleEdit = (product: Product) => {
    setEditingProduct(product)
    setFormData({
      name: product.name,
      description: product.description || '',
      originalPrice: product.originalPrice,
      salePrice: product.salePrice,
      stock: String(product.stock),
      thumbnail: product.thumbnail || '',
      badge: product.badge || '',
      priority: String(product.priority || 0),
    })
    setShowModal(true)
  }

  const handleManageSpecs = async (product: Product) => {
    setSpecProduct(product)
    try {
      const specs = await specificationApi.getList(product.id)
      setSpecifications(specs.map(s => ({ key: s.key, value: s.value, isDefault: s.isDefault })))
    } catch (error) {
      console.error('Failed to fetch specifications:', error)
      setSpecifications([])
    }
    setShowSpecModal(true)
  }

  const handleAddSpec = () => {
    setSpecifications([...specifications, { key: '', value: '', isDefault: false }])
  }

  const handleRemoveSpec = (index: number) => {
    setSpecifications(specifications.filter((_, i) => i !== index))
  }

  const handleSpecChange = (index: number, field: keyof SpecItem, value: string | boolean) => {
    const newSpecs = [...specifications]
    newSpecs[index] = { ...newSpecs[index], [field]: value }
    setSpecifications(newSpecs)
  }

  const handleSaveSpecs = async () => {
    if (!specProduct) return
    setSavingSpecs(true)
    try {
      const validSpecs = specifications.filter(s => s.key && s.value)
      await specificationApi.replaceAll(specProduct.id, validSpecs)
      setShowSpecModal(false)
      setSpecProduct(null)
    } catch (error) {
      console.error('Failed to save specifications:', error)
      alert('保存规格失败')
    } finally {
      setSavingSpecs(false)
    }
  }

  const handleDelete = async (product: Product) => {
    if (confirm(`确定要删除商品 ${product.name} 吗?`)) {
      try {
        await productApi.delete(product.id)
        fetchProducts(pagination.page, pagination.limit, activeTab)
      } catch (error) {
        console.error('Failed to delete product:', error)
      }
    }
  }

  const handleSetActive = async (product: Product) => {
    try {
      await productApi.setActive(product.id)
      fetchProducts(pagination.page, pagination.limit, activeTab)
    } catch (error) {
      console.error('Failed to set product active:', error)
    }
  }

  const handleSetPaused = async (product: Product) => {
    try {
      await productApi.setPaused(product.id)
      fetchProducts(pagination.page, pagination.limit, activeTab)
    } catch (error) {
      console.error('Failed to pause product:', error)
    }
  }

  const handleSetArchived = async (product: Product) => {
    if (confirm(`确定要归档商品 ${product.name} 吗?`)) {
      try {
        await productApi.setArchived(product.id)
        fetchProducts(pagination.page, pagination.limit, activeTab)
      } catch (error) {
        console.error('Failed to archive product:', error)
      }
    }
  }

  const handleSave = async () => {
    try {
      const data = {
        type: activeTab,
        name: formData.name,
        description: formData.description || undefined,
        originalPrice: formData.originalPrice,
        salePrice: formData.salePrice,
        stock: parseInt(formData.stock) || 0,
        thumbnail: formData.thumbnail || undefined,
        badge: formData.badge || undefined,
        priority: parseInt(formData.priority) || 0,
      }

      if (editingProduct) {
        await productApi.update(editingProduct.id, data)
      } else {
        await productApi.create(data)
      }
      setShowModal(false)
      setEditingProduct(null)
      fetchProducts(pagination.page, pagination.limit, activeTab)
    } catch (error) {
      console.error('Failed to save product:', error)
    }
  }

  const openAddModal = () => {
    setEditingProduct(null)
    setFormData({
      name: '',
      description: '',
      originalPrice: '',
      salePrice: '',
      stock: '',
      thumbnail: '',
      badge: '',
      priority: '0',
    })
    setShowModal(true)
  }

  const handleSearch = () => {
    fetchProducts(1, pagination.limit, activeTab)
  }

  const currentTabLabel = TABS.find(t => t.value === activeTab)?.label || ''

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div>
        <h2 className="text-xl font-semibold text-gray-800">商品管理</h2>
        <p className="text-sm text-gray-500 mt-1">管理一元购和 Instance Buy 商品</p>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl border border-gray-100 p-1 inline-flex">
        {TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => handleTabChange(tab.value)}
            className={`px-6 py-2.5 rounded-lg font-medium text-sm transition-all duration-200 ${
              activeTab === tab.value
                ? 'bg-blue-500 text-white shadow-sm'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex justify-between items-center">
        <div className="flex space-x-3">
          <input
            type="text"
            placeholder="搜索商品..."
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="px-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm w-64"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as ProductStatus | '')}
            className="px-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          >
            <option value="">全部状态</option>
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <button onClick={handleSearch} className="px-4 py-2.5 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
            <Search size={18} className="text-gray-500" />
          </button>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={() => fetchProducts(pagination.page, pagination.limit, activeTab)}
            className="px-4 py-2.5 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
            disabled={loading}
          >
            <RefreshCw size={18} className={`text-gray-500 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={openAddModal}
            className="px-5 py-2.5 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-colors flex items-center text-sm font-medium"
          >
            <Plus size={18} className="mr-2" />
            新增{currentTabLabel}商品
          </button>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center items-center py-20">
          <div className="w-10 h-10 border-4 border-gray-200 border-t-blue-500 rounded-full animate-spin"></div>
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={products}
          actions={(row) => (
          <div className="flex items-center space-x-1">
            <button
              onClick={() => handleEdit(row)}
              className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              title="编辑"
            >
              <Edit size={16} />
            </button>
            {activeTab === 'INSTANT_BUY' && (
              <button
                onClick={() => handleManageSpecs(row)}
                className="p-2 text-gray-500 hover:text-violet-600 hover:bg-violet-50 rounded-lg transition-colors"
                title="管理规格"
              >
                <Settings size={16} />
              </button>
            )}
            {row.status !== 'ACTIVE' && (
              <button
                onClick={() => handleSetActive(row)}
                className="p-2 text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                title="上架"
              >
                <Play size={16} />
              </button>
            )}
            {row.status === 'ACTIVE' && (
              <button
                onClick={() => handleSetPaused(row)}
                className="p-2 text-gray-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                title="暂停"
              >
                <Pause size={16} />
              </button>
            )}
            {row.status !== 'ARCHIVED' && (
              <button
                onClick={() => handleSetArchived(row)}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                title="归档"
              >
                <Archive size={16} />
              </button>
            )}
            <button
              onClick={() => handleDelete(row)}
              className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              title="删除"
            >
              <Trash2 size={16} />
            </button>
          </div>
        )}
        />
      )}

      {/* Pagination */}
      <div className="flex justify-between items-center">
        <span className="text-sm text-gray-500">共 {pagination.total} 条记录</span>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => fetchProducts(pagination.page - 1, pagination.limit, activeTab)}
            disabled={pagination.page <= 1}
            className="px-4 py-2 text-sm border border-gray-200 rounded-lg disabled:opacity-50 hover:bg-gray-50 transition-colors"
          >
            上一页
          </button>
          <span className="px-4 py-2 text-sm text-gray-600">
            {pagination.page} / {pagination.totalPages || 1}
          </span>
          <button
            onClick={() => fetchProducts(pagination.page + 1, pagination.limit, activeTab)}
            disabled={pagination.page >= pagination.totalPages}
            className="px-4 py-2 text-sm border border-gray-200 rounded-lg disabled:opacity-50 hover:bg-gray-50 transition-colors"
          >
            下一页
          </button>
        </div>
      </div>

      {/* Product Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editingProduct ? `编辑${currentTabLabel}商品` : `新增${currentTabLabel}商品`}>
        <div className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">商品名称</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              placeholder="请输入商品名称"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">商品描述</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              rows={3}
              placeholder="请输入商品描述"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">原价</label>
              <input
                type="text"
                value={formData.originalPrice}
                onChange={(e) => setFormData({ ...formData, originalPrice: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">售价</label>
              <input
                type="text"
                value={formData.salePrice}
                onChange={(e) => setFormData({ ...formData, salePrice: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                placeholder="0.00"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">库存</label>
              <input
                type="number"
                value={formData.stock}
                onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                placeholder="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">优先级</label>
              <input
                type="number"
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                placeholder="0"
              />
            </div>
          </div>

          {/* Image Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">商品图片</label>
            <div className="flex items-start space-x-4">
              {formData.thumbnail ? (
                <div className="relative">
                  <img
                    src={formData.thumbnail}
                    alt="商品图片"
                    className="w-24 h-24 object-cover rounded-xl border border-gray-200"
                  />
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, thumbnail: '' })}
                    className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors"
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <div className="w-24 h-24 border-2 border-dashed border-gray-200 rounded-xl flex items-center justify-center text-gray-400 text-xs">
                  暂无图片
                </div>
              )}
              <div className="flex-1">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                  id="image-upload"
                />
                <label
                  htmlFor="image-upload"
                  className={`inline-flex items-center px-4 py-2.5 border border-gray-200 rounded-xl cursor-pointer hover:bg-gray-50 transition-colors text-sm ${
                    uploading ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  <Upload size={16} className="mr-2 text-gray-500" />
                  {uploading ? '上传中...' : '上传图片'}
                </label>
                <p className="text-xs text-gray-400 mt-2">支持 JPG、PNG、GIF、WebP，最大 10MB</p>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">运营角标</label>
            <input
              type="text"
              value={formData.badge}
              onChange={(e) => setFormData({ ...formData, badge: e.target.value })}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              placeholder="如: 热卖, 新品"
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              onClick={() => setShowModal(false)}
              className="px-5 py-2.5 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors text-sm font-medium"
            >
              取消
            </button>
            <button
              onClick={handleSave}
              className="px-5 py-2.5 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-colors text-sm font-medium"
              disabled={uploading}
            >
              保存
            </button>
          </div>
        </div>
      </Modal>

      {/* Specification Modal */}
      <Modal
        isOpen={showSpecModal}
        onClose={() => setShowSpecModal(false)}
        title={`管理规格 - ${specProduct?.name || ''}`}
        size="lg"
      >
        <div className="space-y-5">
          <p className="text-sm text-gray-500">为商品添加规格选项，如颜色、尺寸等</p>

          {specifications.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <Settings size={32} className="mx-auto mb-3 opacity-50" />
              <p>暂无规格，点击下方按钮添加</p>
            </div>
          ) : (
            <div className="space-y-3">
              {specifications.map((spec, index) => (
                <div key={index} className="flex items-center space-x-3 p-4 bg-gray-50 rounded-xl">
                  <input
                    type="text"
                    value={spec.key}
                    onChange={(e) => handleSpecChange(index, 'key', e.target.value)}
                    className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    placeholder="规格名称 (如: 颜色)"
                  />
                  <input
                    type="text"
                    value={spec.value}
                    onChange={(e) => handleSpecChange(index, 'value', e.target.value)}
                    className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    placeholder="规格值 (如: 红色)"
                  />
                  <label className="flex items-center space-x-2 text-sm text-gray-600 whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={spec.isDefault}
                      onChange={(e) => handleSpecChange(index, 'isDefault', e.target.checked)}
                      className="w-4 h-4 rounded border-gray-300 text-blue-500 focus:ring-blue-500"
                    />
                    <span>默认</span>
                  </label>
                  <button
                    onClick={() => handleRemoveSpec(index)}
                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}

          <button
            onClick={handleAddSpec}
            className="w-full py-3 border-2 border-dashed border-gray-200 rounded-xl text-gray-500 hover:border-blue-500 hover:text-blue-500 transition-colors flex items-center justify-center text-sm"
          >
            <Plus size={18} className="mr-2" />
            添加规格
          </button>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              onClick={() => setShowSpecModal(false)}
              className="px-5 py-2.5 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors text-sm font-medium"
            >
              取消
            </button>
            <button
              onClick={handleSaveSpecs}
              className="px-5 py-2.5 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-colors text-sm font-medium"
              disabled={savingSpecs}
            >
              {savingSpecs ? '保存中...' : '保存规格'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
