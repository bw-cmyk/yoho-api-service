import { useState, useEffect } from 'react'
import { Bell, Send, Eye, Trash2, Filter, RefreshCw, Plus } from 'lucide-react'
import { notificationApi, type Notification, type NotificationStats } from '../services/api'

type NotificationType = 'SYSTEM' | 'PRIZE_WON' | 'SHIPPING_UPDATE' | 'ORDER_UPDATE' | 'ACCOUNT' | 'PROMOTION'
type NotificationTargetType = 'ALL' | 'SINGLE_USER'

const TYPE_LABELS: Record<NotificationType, string> = {
  SYSTEM: '系统公告',
  PRIZE_WON: '中奖通知',
  SHIPPING_UPDATE: '发货更新',
  ORDER_UPDATE: '订单更新',
  ACCOUNT: '账户通知',
  PROMOTION: '促销通知',
}

const TARGET_TYPE_LABELS: Record<NotificationTargetType, string> = {
  ALL: '全体用户',
  SINGLE_USER: '指定用户',
}

export default function Notifications() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [stats, setStats] = useState<NotificationStats | null>(null)
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [filters, setFilters] = useState<{
    type?: NotificationType
    targetType?: NotificationTargetType
    keyword?: string
  }>({})

  // 创建通知对话框
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [createMode, setCreateMode] = useState<'system' | 'user'>('system')
  const [createForm, setCreateForm] = useState({
    userId: '',
    title: '',
    content: '',
    type: 'SYSTEM' as NotificationType,
    imageUrl: '',
    actionType: '',
    actionValue: '',
  })

  const limit = 20

  useEffect(() => {
    loadNotifications()
    loadStats()
  }, [page, filters])

  const loadNotifications = async () => {
    try {
      setLoading(true)
      const response = await notificationApi.getList({
        page,
        limit,
        ...filters,
      })
      setNotifications(response.data)
      setTotal(response.total)
    } catch (error) {
      console.error('Failed to load notifications:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadStats = async () => {
    try {
      const statsData = await notificationApi.getStats()
      setStats(statsData)
    } catch (error) {
      console.error('Failed to load stats:', error)
    }
  }

  const handleCreateNotification = async () => {
    try {
      if (!createForm.title || !createForm.content) {
        alert('请填写标题和内容')
        return
      }

      if (createMode === 'system') {
        await notificationApi.createSystem({
          title: createForm.title,
          content: createForm.content,
          type: createForm.type,
          imageUrl: createForm.imageUrl || undefined,
          actionType: createForm.actionType || undefined,
          actionValue: createForm.actionValue || undefined,
        })
      } else {
        if (!createForm.userId) {
          alert('请填写用户ID')
          return
        }
        await notificationApi.sendToUser({
          userId: createForm.userId,
          title: createForm.title,
          content: createForm.content,
          type: createForm.type,
          imageUrl: createForm.imageUrl || undefined,
          actionType: createForm.actionType || undefined,
          actionValue: createForm.actionValue || undefined,
        })
      }

      alert('通知发送成功')
      setShowCreateModal(false)
      setCreateForm({
        userId: '',
        title: '',
        content: '',
        type: 'SYSTEM',
        imageUrl: '',
        actionType: '',
        actionValue: '',
      })
      loadNotifications()
      loadStats()
    } catch (error: any) {
      alert('发送失败: ' + (error.response?.data?.message || error.message))
    }
  }

  const handleDeleteNotification = async (id: number) => {
    if (!confirm('确定要删除这条通知吗？')) return

    try {
      await notificationApi.delete(id)
      alert('删除成功')
      loadNotifications()
      loadStats()
    } catch (error: any) {
      alert('删除失败: ' + (error.response?.data?.message || error.message))
    }
  }

  const totalPages = Math.ceil(total / limit)

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">通知管理</h1>
          <p className="text-sm text-gray-500 mt-1">管理系统通知和用户消息</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center space-x-2"
        >
          <Plus size={18} />
          <span>发送通知</span>
        </button>
      </div>

      {/* 统计卡片 */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">总发送数</p>
                <p className="text-2xl font-bold text-gray-800 mt-1">{stats.totalSent}</p>
              </div>
              <Bell className="text-blue-500" size={32} />
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">系统广播</p>
                <p className="text-2xl font-bold text-gray-800 mt-1">{stats.systemBroadcasts}</p>
              </div>
              <Send className="text-green-500" size={32} />
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">用户通知</p>
                <p className="text-2xl font-bold text-gray-800 mt-1">{stats.userNotifications}</p>
              </div>
              <Eye className="text-purple-500" size={32} />
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">今日发送</p>
                <p className="text-2xl font-bold text-gray-800 mt-1">{stats.todaySent}</p>
              </div>
              <RefreshCw className="text-orange-500" size={32} />
            </div>
          </div>
        </div>
      )}

      {/* 筛选器 */}
      <div className="bg-white p-4 rounded-lg border border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">通知类型</label>
            <select
              value={filters.type || ''}
              onChange={(e) => {
                setFilters({ ...filters, type: e.target.value as NotificationType || undefined })
                setPage(1)
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            >
              <option value="">全部</option>
              {Object.entries(TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">目标类型</label>
            <select
              value={filters.targetType || ''}
              onChange={(e) => {
                setFilters({ ...filters, targetType: e.target.value as NotificationTargetType || undefined })
                setPage(1)
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            >
              <option value="">全部</option>
              {Object.entries(TARGET_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">关键词</label>
            <input
              type="text"
              value={filters.keyword || ''}
              onChange={(e) => setFilters({ ...filters, keyword: e.target.value })}
              placeholder="搜索标题或内容"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={() => {
                setFilters({})
                setPage(1)
              }}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center justify-center space-x-2"
            >
              <Filter size={18} />
              <span>重置筛选</span>
            </button>
          </div>
        </div>
      </div>

      {/* 通知列表 */}
      <div className="bg-white rounded-lg border border-gray-200">
        {loading ? (
          <div className="p-12 text-center text-gray-500">加载中...</div>
        ) : notifications.length === 0 ? (
          <div className="p-12 text-center text-gray-500">暂无通知</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">类型</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">目标</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">标题</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">内容</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">用户ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">创建时间</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">操作</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {notifications.map((notification) => (
                  <tr key={notification.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{notification.id}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">
                        {TYPE_LABELS[notification.type]}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        notification.targetType === 'ALL' ? 'bg-green-100 text-green-800' : 'bg-purple-100 text-purple-800'
                      }`}>
                        {TARGET_TYPE_LABELS[notification.targetType]}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">{notification.title}</td>
                    <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">{notification.content}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {notification.userId || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(notification.createdAt).toLocaleString('zh-CN')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                      <button
                        onClick={() => handleDeleteNotification(notification.id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* 分页 */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-200 flex justify-between items-center">
            <div className="text-sm text-gray-500">
              共 {total} 条，第 {page} / {totalPages} 页
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                上一页
              </button>
              <button
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page === totalPages}
                className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                下一页
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 创建通知模态框 */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-gray-800 mb-4">发送通知</h2>

            {/* 选择发送模式 */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">发送类型</label>
              <div className="flex space-x-4">
                <button
                  onClick={() => setCreateMode('system')}
                  className={`px-4 py-2 rounded-lg ${
                    createMode === 'system' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  系统广播
                </button>
                <button
                  onClick={() => setCreateMode('user')}
                  className={`px-4 py-2 rounded-lg ${
                    createMode === 'user' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  指定用户
                </button>
              </div>
            </div>

            {/* 用户ID (仅在指定用户模式下显示) */}
            {createMode === 'user' && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">用户ID *</label>
                <input
                  type="text"
                  value={createForm.userId}
                  onChange={(e) => setCreateForm({ ...createForm, userId: e.target.value })}
                  placeholder="输入用户ID"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
            )}

            {/* 通知类型 */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">通知类型</label>
              <select
                value={createForm.type}
                onChange={(e) => setCreateForm({ ...createForm, type: e.target.value as NotificationType })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                {Object.entries(TYPE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>

            {/* 标题 */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">标题 *</label>
              <input
                type="text"
                value={createForm.title}
                onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })}
                placeholder="输入通知标题"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                maxLength={255}
              />
            </div>

            {/* 内容 */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">内容 *</label>
              <textarea
                value={createForm.content}
                onChange={(e) => setCreateForm({ ...createForm, content: e.target.value })}
                placeholder="输入通知内容"
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>

            {/* 图片URL (可选) */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">图片URL (可选)</label>
              <input
                type="text"
                value={createForm.imageUrl}
                onChange={(e) => setCreateForm({ ...createForm, imageUrl: e.target.value })}
                placeholder="输入图片URL"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>

            {/* 操作类型和值 (可选) */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">操作类型 (可选)</label>
                <input
                  type="text"
                  value={createForm.actionType}
                  onChange={(e) => setCreateForm({ ...createForm, actionType: e.target.value })}
                  placeholder="如: ROUTER"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">操作值 (可选)</label>
                <input
                  type="text"
                  value={createForm.actionValue}
                  onChange={(e) => setCreateForm({ ...createForm, actionValue: e.target.value })}
                  placeholder="如: /products/123"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
            </div>

            {/* 按钮 */}
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                取消
              </button>
              <button
                onClick={handleCreateNotification}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                发送通知
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
