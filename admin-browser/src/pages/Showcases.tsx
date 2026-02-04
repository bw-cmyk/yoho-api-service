import { useState, useEffect, useRef } from 'react'
import {
  Search,
  RefreshCw,
  Plus,
  Check,
  X,
  EyeOff,
  Pin,
  Trash2,
  Upload,
  Image,
  Video,
  Heart,
  Eye,
} from 'lucide-react'
import DataTable from '../components/DataTable'
import Modal from '../components/Modal'
import {
  showcaseApi,
  uploadApi,
  type Showcase,
  type ShowcaseStatus,
  type ShowcaseMedia,
} from '../services/api'

const STATUS_OPTIONS: { value: ShowcaseStatus | ''; label: string; color: string }[] = [
  { value: '', label: '全部', color: '' },
  { value: 'PENDING', label: '待审核', color: 'bg-amber-100 text-amber-600' },
  { value: 'APPROVED', label: '已通过', color: 'bg-emerald-100 text-emerald-600' },
  { value: 'REJECTED', label: '已拒绝', color: 'bg-red-100 text-red-600' },
  { value: 'HIDDEN', label: '已隐藏', color: 'bg-gray-100 text-gray-600' },
]

interface Stats {
  pending: number
  approved: number
  rejected: number
  total: number
}

export default function Showcases() {
  const [showcases, setShowcases] = useState<Showcase[]>([])
  const [loading, setLoading] = useState(false)
  const [stats, setStats] = useState<Stats>({ pending: 0, approved: 0, rejected: 0, total: 0 })
  const [statusFilter, setStatusFilter] = useState<ShowcaseStatus | ''>('')
  const [keyword, setKeyword] = useState('')
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 0 })

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [selectedShowcase, setSelectedShowcase] = useState<Showcase | null>(null)
  const [rejectReason, setRejectReason] = useState('')

  // Add form states
  const [formData, setFormData] = useState({
    userId: '',
    userName: '',
    userAvatar: '',
    content: '',
    prizeInfo: '',
  })
  const [mediaList, setMediaList] = useState<ShowcaseMedia[]>([])
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const fetchShowcases = async (page = 1) => {
    setLoading(true)
    try {
      const params: any = { page, limit: pagination.limit }
      if (statusFilter) params.status = statusFilter
      if (keyword) params.userId = keyword

      const res = await showcaseApi.getList(params)
      setShowcases(res.data)
      setPagination({ page: res.page, limit: res.limit, total: res.total, totalPages: res.totalPages })
    } catch (error) {
      console.error('Failed to fetch showcases:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchStats = async () => {
    try {
      const res = await showcaseApi.getStats()
      setStats(res)
    } catch (error) {
      console.error('Failed to fetch stats:', error)
    }
  }

  useEffect(() => {
    fetchShowcases(1)
    fetchStats()
  }, [statusFilter])

  const handleSearch = () => {
    fetchShowcases(1)
  }

  const handleApprove = async (showcase: Showcase) => {
    try {
      await showcaseApi.approve(showcase.id)
      fetchShowcases(pagination.page)
      fetchStats()
    } catch (error) {
      console.error('Failed to approve:', error)
    }
  }

  const handleReject = async () => {
    if (!selectedShowcase) return
    try {
      await showcaseApi.reject(selectedShowcase.id, rejectReason)
      setShowRejectModal(false)
      setSelectedShowcase(null)
      setRejectReason('')
      fetchShowcases(pagination.page)
      fetchStats()
    } catch (error) {
      console.error('Failed to reject:', error)
    }
  }

  const handleHide = async (showcase: Showcase) => {
    try {
      await showcaseApi.hide(showcase.id)
      fetchShowcases(pagination.page)
      fetchStats()
    } catch (error) {
      console.error('Failed to hide:', error)
    }
  }

  const handleTogglePin = async (showcase: Showcase) => {
    try {
      await showcaseApi.togglePin(showcase.id)
      fetchShowcases(pagination.page)
    } catch (error) {
      console.error('Failed to toggle pin:', error)
    }
  }

  const handleDelete = async (showcase: Showcase) => {
    if (!confirm('确定要删除这条晒单吗?')) return
    try {
      await showcaseApi.delete(showcase.id)
      fetchShowcases(pagination.page)
      fetchStats()
    } catch (error) {
      console.error('Failed to delete:', error)
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    setUploading(true)
    try {
      for (const file of Array.from(files)) {
        // 使用通用上传 API（自动识别图片或视频）
        const result = await uploadApi.uploadMedia(file)
        setMediaList((prev) => [
          ...prev,
          {
            type: result.type,
            url: result.url,
            thumbnailUrl: result.thumbnailUrl,
            cloudflareId: result.id,
          },
        ])
      }
    } catch (error) {
      console.error('Failed to upload:', error)
      alert('上传失败: ' + (error as any)?.response?.data?.message || '未知错误')
    } finally {
      setUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleRemoveMedia = (index: number) => {
    setMediaList((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSaveShowcase = async () => {
    if (!formData.userId) {
      alert('请输入用户ID')
      return
    }
    if (mediaList.length === 0) {
      alert('请至少上传一个图片或视频')
      return
    }

    try {
      await showcaseApi.create({
        userId: formData.userId,
        userName: formData.userName || undefined,
        userAvatar: formData.userAvatar || undefined,
        content: formData.content || undefined,
        media: mediaList,
        prizeInfo: formData.prizeInfo || undefined,
      })
      setShowAddModal(false)
      resetForm()
      fetchShowcases(1)
      fetchStats()
    } catch (error) {
      console.error('Failed to create showcase:', error)
      alert('创建失败')
    }
  }

  const resetForm = () => {
    setFormData({
      userId: '',
      userName: '',
      userAvatar: '',
      content: '',
      prizeInfo: '',
    })
    setMediaList([])
  }

  const openAddModal = () => {
    resetForm()
    setShowAddModal(true)
  }

  const openRejectModal = (showcase: Showcase) => {
    setSelectedShowcase(showcase)
    setRejectReason('')
    setShowRejectModal(true)
  }

  const openDetailModal = (showcase: Showcase) => {
    setSelectedShowcase(showcase)
    setShowDetailModal(true)
  }

  const columns = [
    { key: 'id' as const, label: 'ID' },
    {
      key: 'media' as const,
      label: '媒体',
      render: (v: unknown) => {
        const media = v as ShowcaseMedia[]
        if (!media || media.length === 0) return <span className="text-gray-400">-</span>
        const first = media[0]
        return (
          <div className="relative w-12 h-12">
            <img
              src={first.type === 'VIDEO' ? first.thumbnailUrl || first.url : first.url}
              alt=""
              className="w-12 h-12 object-cover rounded-lg"
            />
            {first.type === 'VIDEO' && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/30 rounded-lg">
                <Video size={16} className="text-white" />
              </div>
            )}
            {media.length > 1 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-blue-500 text-white text-xs rounded-full flex items-center justify-center">
                {media.length}
              </span>
            )}
          </div>
        )
      },
    },
    {
      key: 'userName' as const,
      label: '用户',
      render: (v: unknown, row: Showcase) => (
        <div className="flex items-center space-x-2">
          {row.userAvatar ? (
            <img src={row.userAvatar} alt="" className="w-8 h-8 rounded-full object-cover" />
          ) : (
            <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 text-xs">
              {String(v).charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <p className="text-sm font-medium text-gray-800">{String(v) || '匿名'}</p>
            <p className="text-xs text-gray-400">{row.userId}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'location' as const,
      label: '位置',
      render: (v: unknown, row: Showcase) => (
        <div className="text-sm">
          {v ? (
            <div>
              <p className="text-gray-800">{String(v)}</p>
              {row.ipAddress && <p className="text-xs text-gray-400">{row.ipAddress}</p>}
            </div>
          ) : (
            <span className="text-gray-400">-</span>
          )}
        </div>
      ),
    },
    {
      key: 'content' as const,
      label: '内容',
      render: (v: unknown) => (
        <span className="text-sm text-gray-600 truncate max-w-xs block">
          {String(v) || '-'}
        </span>
      ),
    },
    {
      key: 'likeCount' as const,
      label: '互动',
      render: (v: unknown, row: Showcase) => (
        <div className="flex items-center space-x-3 text-sm text-gray-500">
          <span className="flex items-center">
            <Heart size={14} className="mr-1 text-red-400" />
            {String(v)}
          </span>
          <span className="flex items-center">
            <Eye size={14} className="mr-1 text-gray-400" />
            {row.viewCount}
          </span>
        </div>
      ),
    },
    {
      key: 'status' as const,
      label: '状态',
      render: (v: unknown, row: Showcase) => {
        const opt = STATUS_OPTIONS.find((o) => o.value === v)
        return (
          <div className="flex items-center space-x-2">
            <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${opt?.color || 'bg-gray-100 text-gray-600'}`}>
              {opt?.label || String(v)}
            </span>
            {row.isPinned && (
              <span className="text-orange-500" title="已置顶">
                <Pin size={14} />
              </span>
            )}
          </div>
        )
      },
    },
    {
      key: 'createdAt' as const,
      label: '创建时间',
      render: (v: unknown) => new Date(v as string).toLocaleString(),
    },
  ]

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div>
        <h2 className="text-xl font-semibold text-gray-800">晒单管理</h2>
        <p className="text-sm text-gray-500 mt-1">管理用户晒单内容，审核、置顶、手动添加</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <p className="text-sm text-gray-500">总晒单</p>
          <p className="text-2xl font-semibold text-gray-800 mt-1">{stats.total}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <p className="text-sm text-gray-500">待审核</p>
          <p className="text-2xl font-semibold text-amber-600 mt-1">{stats.pending}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <p className="text-sm text-gray-500">已通过</p>
          <p className="text-2xl font-semibold text-emerald-600 mt-1">{stats.approved}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <p className="text-sm text-gray-500">已拒绝</p>
          <p className="text-2xl font-semibold text-red-600 mt-1">{stats.rejected}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex justify-between items-center">
        <div className="flex space-x-3">
          <input
            type="text"
            placeholder="搜索用户ID..."
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="px-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm w-64"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as ShowcaseStatus | '')}
            className="px-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <button
            onClick={handleSearch}
            className="px-4 py-2.5 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
          >
            <Search size={18} className="text-gray-500" />
          </button>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={() => { fetchShowcases(pagination.page); fetchStats(); }}
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
            手动添加晒单
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
          data={showcases}
          actions={(row) => (
            <div className="flex items-center space-x-1">
              <button
                onClick={() => openDetailModal(row)}
                className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                title="查看详情"
              >
                <Eye size={16} />
              </button>
              {row.status === 'PENDING' && (
                <>
                  <button
                    onClick={() => handleApprove(row)}
                    className="p-2 text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                    title="通过"
                  >
                    <Check size={16} />
                  </button>
                  <button
                    onClick={() => openRejectModal(row)}
                    className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="拒绝"
                  >
                    <X size={16} />
                  </button>
                </>
              )}
              {row.status === 'APPROVED' && (
                <>
                  <button
                    onClick={() => handleTogglePin(row)}
                    className={`p-2 rounded-lg transition-colors ${
                      row.isPinned
                        ? 'text-orange-500 bg-orange-50 hover:bg-orange-100'
                        : 'text-gray-500 hover:text-orange-500 hover:bg-orange-50'
                    }`}
                    title={row.isPinned ? '取消置顶' : '置顶'}
                  >
                    <Pin size={16} />
                  </button>
                  <button
                    onClick={() => handleHide(row)}
                    className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                    title="隐藏"
                  >
                    <EyeOff size={16} />
                  </button>
                </>
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
            onClick={() => fetchShowcases(pagination.page - 1)}
            disabled={pagination.page <= 1}
            className="px-4 py-2 text-sm border border-gray-200 rounded-lg disabled:opacity-50 hover:bg-gray-50 transition-colors"
          >
            上一页
          </button>
          <span className="px-4 py-2 text-sm text-gray-600">
            {pagination.page} / {pagination.totalPages || 1}
          </span>
          <button
            onClick={() => fetchShowcases(pagination.page + 1)}
            disabled={pagination.page >= pagination.totalPages}
            className="px-4 py-2 text-sm border border-gray-200 rounded-lg disabled:opacity-50 hover:bg-gray-50 transition-colors"
          >
            下一页
          </button>
        </div>
      </div>

      {/* Add Showcase Modal */}
      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="手动添加晒单" size="lg">
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">用户ID *</label>
              <input
                type="text"
                value={formData.userId}
                onChange={(e) => setFormData({ ...formData, userId: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                placeholder="输入用户ID"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">用户昵称</label>
              <input
                type="text"
                value={formData.userName}
                onChange={(e) => setFormData({ ...formData, userName: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                placeholder="可选，留空则显示匿名"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">用户头像URL</label>
            <input
              type="text"
              value={formData.userAvatar}
              onChange={(e) => setFormData({ ...formData, userAvatar: e.target.value })}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              placeholder="可选"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">晒单文案</label>
            <textarea
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              rows={3}
              placeholder="输入晒单文案内容"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">奖品信息</label>
            <input
              type="text"
              value={formData.prizeInfo}
              onChange={(e) => setFormData({ ...formData, prizeInfo: e.target.value })}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              placeholder="如：iPhone 15 Pro Max"
            />
          </div>

          {/* Media Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">图片/视频 *</label>
            <div className="grid grid-cols-4 gap-3 mb-3">
              {mediaList.map((media, index) => (
                <div key={index} className="relative aspect-square">
                  <img
                    src={media.type === 'VIDEO' ? media.thumbnailUrl || media.url : media.url}
                    alt=""
                    className="w-full h-full object-cover rounded-xl border border-gray-200"
                  />
                  {media.type === 'VIDEO' && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/30 rounded-xl">
                      <Video size={24} className="text-white" />
                    </div>
                  )}
                  <button
                    onClick={() => handleRemoveMedia(index)}
                    className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
              {mediaList.length < 9 && (
                <label className="aspect-square border-2 border-dashed border-gray-200 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-colors">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,video/*"
                    multiple
                    onChange={handleFileUpload}
                    className="hidden"
                    disabled={uploading}
                  />
                  {uploading ? (
                    <div className="w-6 h-6 border-2 border-gray-200 border-t-blue-500 rounded-full animate-spin" />
                  ) : (
                    <>
                      <Upload size={24} className="text-gray-400 mb-1" />
                      <span className="text-xs text-gray-400">上传</span>
                    </>
                  )}
                </label>
              )}
            </div>
            <p className="text-xs text-gray-400">支持图片和视频，最多9个文件</p>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              onClick={() => setShowAddModal(false)}
              className="px-5 py-2.5 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors text-sm font-medium"
            >
              取消
            </button>
            <button
              onClick={handleSaveShowcase}
              className="px-5 py-2.5 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-colors text-sm font-medium"
              disabled={uploading}
            >
              创建晒单
            </button>
          </div>
        </div>
      </Modal>

      {/* Detail Modal */}
      <Modal
        isOpen={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        title="晒单详情"
        size="lg"
      >
        {selectedShowcase && (
          <div className="space-y-5">
            {/* User Info */}
            <div className="flex items-center space-x-4 p-4 bg-gray-50 rounded-xl">
              {selectedShowcase.userAvatar ? (
                <img
                  src={selectedShowcase.userAvatar}
                  alt=""
                  className="w-12 h-12 rounded-full object-cover"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-gray-300 flex items-center justify-center text-gray-500 text-lg font-medium">
                  {(selectedShowcase.userName || '匿').charAt(0).toUpperCase()}
                </div>
              )}
              <div>
                <p className="font-medium text-gray-800">{selectedShowcase.userName || '匿名用户'}</p>
                <p className="text-sm text-gray-500">ID: {selectedShowcase.userId}</p>
              </div>
            </div>

            {/* Content */}
            {selectedShowcase.content && (
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-2">文案内容</label>
                <p className="text-gray-800">{selectedShowcase.content}</p>
              </div>
            )}

            {/* Prize Info */}
            {selectedShowcase.prizeInfo && (
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-2">奖品信息</label>
                <p className="text-gray-800">{selectedShowcase.prizeInfo}</p>
              </div>
            )}

            {/* Media */}
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-2">媒体内容</label>
              <div className="grid grid-cols-3 gap-3">
                {selectedShowcase.media.map((media, index) => (
                  <div key={index} className="relative aspect-square">
                    {media.type === 'VIDEO' ? (
                      <video
                        src={media.url}
                        controls
                        className="w-full h-full object-cover rounded-xl"
                      />
                    ) : (
                      <img
                        src={media.url}
                        alt=""
                        className="w-full h-full object-cover rounded-xl"
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Stats */}
            <div className="flex items-center space-x-6 text-sm text-gray-500">
              <span className="flex items-center">
                <Heart size={16} className="mr-2 text-red-400" />
                {selectedShowcase.likeCount} 点赞
              </span>
              <span className="flex items-center">
                <Eye size={16} className="mr-2 text-gray-400" />
                {selectedShowcase.viewCount} 浏览
              </span>
              <span>创建于 {new Date(selectedShowcase.createdAt).toLocaleString()}</span>
            </div>

            {/* Status */}
            <div className="flex items-center space-x-3">
              <span className="text-sm text-gray-500">状态:</span>
              <span
                className={`px-3 py-1 rounded-full text-sm font-medium ${
                  STATUS_OPTIONS.find((o) => o.value === selectedShowcase.status)?.color
                }`}
              >
                {STATUS_OPTIONS.find((o) => o.value === selectedShowcase.status)?.label}
              </span>
              {selectedShowcase.isPinned && (
                <span className="flex items-center text-orange-500 text-sm">
                  <Pin size={14} className="mr-1" />
                  已置顶
                </span>
              )}
            </div>

            {selectedShowcase.rejectReason && (
              <div className="p-4 bg-red-50 rounded-xl">
                <p className="text-sm text-red-600">
                  <strong>拒绝原因:</strong> {selectedShowcase.rejectReason}
                </p>
              </div>
            )}

            <div className="flex justify-end pt-4">
              <button
                onClick={() => setShowDetailModal(false)}
                className="px-5 py-2.5 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors text-sm font-medium"
              >
                关闭
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Reject Modal */}
      <Modal
        isOpen={showRejectModal}
        onClose={() => setShowRejectModal(false)}
        title="拒绝晒单"
      >
        <div className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">拒绝原因</label>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              rows={3}
              placeholder="请输入拒绝原因（可选）"
            />
          </div>
          <div className="flex justify-end space-x-3">
            <button
              onClick={() => setShowRejectModal(false)}
              className="px-5 py-2.5 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors text-sm font-medium"
            >
              取消
            </button>
            <button
              onClick={handleReject}
              className="px-5 py-2.5 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-colors text-sm font-medium"
            >
              确认拒绝
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
