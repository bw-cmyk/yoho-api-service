import { useState, useEffect, useRef } from 'react'
import { Plus, Edit, Trash2, Eye, EyeOff, Upload, X, Search, RefreshCw, MoveUp, MoveDown } from 'lucide-react'
import DataTable from '../components/DataTable'
import Modal from '../components/Modal'
import { bannerApi, uploadApi, type Banner, type BannerActionType } from '../services/api'

const ACTION_TYPE_OPTIONS: { value: BannerActionType; label: string }[] = [
  { value: 'NONE', label: '无动作' },
  { value: 'ROUTER', label: '路由跳转' },
  { value: 'EXTERNAL_LINK', label: '外部链接' },
  { value: 'PRODUCT', label: '商品详情' },
  { value: 'DRAW', label: '抽奖页面' },
]

export default function Banners() {
  const [banners, setBanners] = useState<Banner[]>([])
  const [loading, setLoading] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [editingBanner, setEditingBanner] = useState<Banner | null>(null)
  const [formData, setFormData] = useState({
    title: '',
    subtitle: '',
    description: '',
    imageUrl: '',
    mobileImageUrl: '',
    actionType: 'NONE' as BannerActionType,
    actionValue: '',
    buttonText: '',
    backgroundColor: '',
    sortOrder: '0',
    startDate: '',
    endDate: '',
  })
  const [activeFilter, setActiveFilter] = useState<string>('all')
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 0 })
  const [uploading, setUploading] = useState(false)
  const [uploadingMobile, setUploadingMobile] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const mobileFileInputRef = useRef<HTMLInputElement>(null)

  const fetchBanners = async (page = 1, limit = 10) => {
    setLoading(true)
    try {
      const params: { page: number; limit: number; isActive?: boolean } = { page, limit }
      if (activeFilter === 'active') params.isActive = true
      if (activeFilter === 'inactive') params.isActive = false

      const res = await bannerApi.getList(params)
      setBanners(res.items)
      setPagination({ page: res.page, limit: res.limit, total: res.total, totalPages: res.totalPages })
    } catch (error) {
      console.error('Failed to fetch banners:', error)
      alert('获取 Banner 列表失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchBanners()
  }, [activeFilter])

  const handleCreate = () => {
    setEditingBanner(null)
    setFormData({
      title: '',
      subtitle: '',
      description: '',
      imageUrl: '',
      mobileImageUrl: '',
      actionType: 'NONE',
      actionValue: '',
      buttonText: '',
      backgroundColor: '',
      sortOrder: '0',
      startDate: '',
      endDate: '',
    })
    setShowModal(true)
  }

  const handleEdit = (banner: Banner) => {
    setEditingBanner(banner)
    setFormData({
      title: banner.title,
      subtitle: banner.subtitle || '',
      description: banner.description || '',
      imageUrl: banner.imageUrl,
      mobileImageUrl: banner.mobileImageUrl || '',
      actionType: banner.actionType,
      actionValue: banner.actionValue || '',
      buttonText: banner.buttonText || '',
      backgroundColor: banner.backgroundColor || '',
      sortOrder: String(banner.sortOrder),
      startDate: banner.startDate ? banner.startDate.slice(0, 16) : '',
      endDate: banner.endDate ? banner.endDate.slice(0, 16) : '',
    })
    setShowModal(true)
  }

  const handleSave = async () => {
    if (!formData.title.trim()) {
      alert('请输入标题')
      return
    }
    if (!formData.imageUrl.trim()) {
      alert('请上传图片')
      return
    }

    try {
      const data = {
        ...formData,
        sortOrder: parseInt(formData.sortOrder) || 0,
        startDate: formData.startDate || undefined,
        endDate: formData.endDate || undefined,
      }

      if (editingBanner) {
        await bannerApi.update(editingBanner.id, data)
      } else {
        await bannerApi.create(data)
      }

      setShowModal(false)
      fetchBanners(pagination.page, pagination.limit)
    } catch (error) {
      console.error('Failed to save banner:', error)
      alert('保存失败')
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('确定要删除这个 Banner 吗？')) return

    try {
      await bannerApi.delete(id)
      fetchBanners(pagination.page, pagination.limit)
    } catch (error) {
      console.error('Failed to delete banner:', error)
      alert('删除失败')
    }
  }

  const handleToggleActive = async (id: number) => {
    try {
      await bannerApi.toggleActive(id)
      fetchBanners(pagination.page, pagination.limit)
    } catch (error) {
      console.error('Failed to toggle banner status:', error)
      alert('操作失败')
    }
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, isMobile = false) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (isMobile) {
      setUploadingMobile(true)
    } else {
      setUploading(true)
    }

    try {
      const result = await uploadApi.uploadImage(file)
      if (isMobile) {
        setFormData({ ...formData, mobileImageUrl: result.url })
      } else {
        setFormData({ ...formData, imageUrl: result.url })
      }
    } catch (error) {
      console.error('Failed to upload image:', error)
      alert('图片上传失败')
    } finally {
      if (isMobile) {
        setUploadingMobile(false)
        if (mobileFileInputRef.current) {
          mobileFileInputRef.current.value = ''
        }
      } else {
        setUploading(false)
        if (fileInputRef.current) {
          fileInputRef.current.value = ''
        }
      }
    }
  }

  const columns = [
    { key: 'id' as const, label: 'ID', width: '60px' },
    {
      key: 'imageUrl' as const,
      label: '图片预览',
      width: '150px',
      render: (v: unknown) => v ? (
        <img src={String(v)} alt="" className="w-24 h-16 object-cover rounded-lg border border-gray-200" />
      ) : (
        <div className="w-24 h-16 bg-gray-100 rounded-lg flex items-center justify-center text-gray-400 text-xs">
          无图片
        </div>
      ),
    },
    {
      key: 'title' as const,
      label: '标题',
      render: (v: unknown, row: Banner) => (
        <div>
          <div className="font-medium text-gray-900">{String(v)}</div>
          {row.subtitle && <div className="text-sm text-gray-500 mt-1">{row.subtitle}</div>}
        </div>
      ),
    },
    {
      key: 'actionType' as const,
      label: '动作类型',
      width: '120px',
      render: (v: unknown, row: Banner) => (
        <div>
          <div className="text-sm font-medium text-gray-900">
            {ACTION_TYPE_OPTIONS.find(opt => opt.value === v)?.label || String(v)}
          </div>
          {row.actionValue && (
            <div className="text-xs text-gray-500 mt-1 truncate max-w-[100px]" title={row.actionValue}>
              {row.actionValue}
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'sortOrder' as const,
      label: '排序',
      width: '80px',
      render: (v: unknown) => <span className="font-mono text-sm">{String(v)}</span>,
    },
    {
      key: 'isActive' as const,
      label: '状态',
      width: '100px',
      render: (v: unknown) => (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
          v ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-600'
        }`}>
          {v ? '已激活' : '已停用'}
        </span>
      ),
    },
    {
      key: 'viewCount' as const,
      label: '统计',
      width: '120px',
      render: (v: unknown, row: Banner) => (
        <div className="text-sm">
          <div className="text-gray-600">
            <Eye size={14} className="inline mr-1" />
            {v || 0} 浏览
          </div>
          <div className="text-gray-600 mt-1">
            <span className="inline-block w-3.5 h-3.5 rounded-full bg-blue-500 mr-1" />
            {row.clickCount || 0} 点击
          </div>
        </div>
      ),
    },
    {
      key: 'actions' as const,
      label: '操作',
      width: '200px',
      render: (_: unknown, row: Banner) => (
        <div className="flex items-center space-x-2">
          <button
            onClick={() => handleEdit(row)}
            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
            title="编辑"
          >
            <Edit size={16} />
          </button>
          <button
            onClick={() => handleToggleActive(row.id)}
            className={`${row.isActive ? 'text-amber-600 hover:text-amber-800' : 'text-emerald-600 hover:text-emerald-800'} text-sm font-medium`}
            title={row.isActive ? '停用' : '激活'}
          >
            {row.isActive ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
          <button
            onClick={() => handleDelete(row.id)}
            className="text-red-600 hover:text-red-800 text-sm font-medium"
            title="删除"
          >
            <Trash2 size={16} />
          </button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Banner 管理</h1>
          <p className="text-sm text-gray-500 mt-1">管理前端轮播 Banner</p>
        </div>
        <button
          onClick={handleCreate}
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus size={18} className="mr-2" />
          创建 Banner
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-gray-700">状态筛选:</label>
            <select
              value={activeFilter}
              onChange={(e) => setActiveFilter(e.target.value)}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">全部</option>
              <option value="active">已激活</option>
              <option value="inactive">已停用</option>
            </select>
          </div>

          <button
            onClick={() => fetchBanners(pagination.page, pagination.limit)}
            className="ml-auto inline-flex items-center px-3 py-1.5 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <RefreshCw size={16} className="mr-1.5" />
            刷新
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <DataTable
          columns={columns}
          data={banners}
          loading={loading}
          pagination={pagination}
          onPageChange={(page) => fetchBanners(page, pagination.limit)}
        />
      </div>

      {/* Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingBanner ? '编辑 Banner' : '创建 Banner'}
        size="lg"
      >
        <div className="space-y-4">
          {/* 标题 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              标题 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="LUCKY DRAW"
            />
          </div>

          {/* 副标题 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">副标题</label>
            <input
              type="text"
              value={formData.subtitle}
              onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Daily rewards waiting for you"
            />
          </div>

          {/* 描述 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">描述</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={3}
              placeholder="详细描述"
            />
          </div>

          {/* 桌面端图片 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              桌面端图片 <span className="text-red-500">*</span>
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={(e) => handleImageUpload(e, false)}
              className="hidden"
            />
            <div className="flex items-center space-x-4">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                <Upload size={16} className="mr-2" />
                {uploading ? '上传中...' : '上传图片'}
              </button>
              {formData.imageUrl && (
                <div className="relative">
                  <img src={formData.imageUrl} alt="" className="h-16 rounded-lg border border-gray-200" />
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, imageUrl: '' })}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                  >
                    <X size={14} />
                  </button>
                </div>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-1">推荐尺寸: 1920x1080 (16:9)</p>
          </div>

          {/* 移动端图片 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">移动端图片（可选）</label>
            <input
              ref={mobileFileInputRef}
              type="file"
              accept="image/*"
              onChange={(e) => handleImageUpload(e, true)}
              className="hidden"
            />
            <div className="flex items-center space-x-4">
              <button
                type="button"
                onClick={() => mobileFileInputRef.current?.click()}
                disabled={uploadingMobile}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                <Upload size={16} className="mr-2" />
                {uploadingMobile ? '上传中...' : '上传图片'}
              </button>
              {formData.mobileImageUrl && (
                <div className="relative">
                  <img src={formData.mobileImageUrl} alt="" className="h-16 rounded-lg border border-gray-200" />
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, mobileImageUrl: '' })}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                  >
                    <X size={14} />
                  </button>
                </div>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-1">推荐尺寸: 750x1000 (3:4)</p>
          </div>

          {/* 动作类型 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">动作类型</label>
              <select
                value={formData.actionType}
                onChange={(e) => setFormData({ ...formData, actionType: e.target.value as BannerActionType })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {ACTION_TYPE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">动作值</label>
              <input
                type="text"
                value={formData.actionValue}
                onChange={(e) => setFormData({ ...formData, actionValue: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="/draws 或 https://..."
              />
            </div>
          </div>

          {/* 按钮文字 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">按钮文字</label>
            <input
              type="text"
              value={formData.buttonText}
              onChange={(e) => setFormData({ ...formData, buttonText: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Try Now"
            />
          </div>

          {/* 背景颜色 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">背景颜色</label>
            <input
              type="text"
              value={formData.backgroundColor}
              onChange={(e) => setFormData({ ...formData, backgroundColor: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
            />
            <p className="text-xs text-gray-500 mt-1">支持十六进制颜色或CSS渐变</p>
          </div>

          {/* 排序 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">排序（数字越大越靠前）</label>
            <input
              type="number"
              value={formData.sortOrder}
              onChange={(e) => setFormData({ ...formData, sortOrder: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* 时间范围 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">开始时间</label>
              <input
                type="datetime-local"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">结束时间</label>
              <input
                type="datetime-local"
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <button
              onClick={() => setShowModal(false)}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              取消
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
            >
              保存
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
