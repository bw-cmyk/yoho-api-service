import { useState, useEffect } from 'react'
import { Edit, Ban, CheckCircle, Search, RefreshCw } from 'lucide-react'
import DataTable from '../components/DataTable'
import Modal from '../components/Modal'
import { userApi, type User } from '../services/api'

const ROLE_MAP: Record<number, string> = {
  1000: '内部用户',
  100: 'LP',
  10: '普通用户',
  5: '只读',
  1: '初始用户',
}

export default function Users() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [formData, setFormData] = useState({ nickname: '', email: '', role: 10 })
  const [keyword, setKeyword] = useState('')
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 0 })

  const fetchUsers = async (page = 1, limit = 10) => {
    setLoading(true)
    try {
      const res = await userApi.getList({ page, limit, keyword: keyword || undefined })
      setUsers(res.data)
      setPagination({ page: res.page, limit: res.limit, total: res.total, totalPages: res.totalPages })
    } catch (error) {
      console.error('Failed to fetch users:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers(1, 10)
  }, [])

  const columns = [
    { key: 'id' as const, label: 'ID' },
    { key: 'username' as const, label: '用户名' },
    { key: 'nickname' as const, label: '昵称' },
    { key: 'email' as const, label: '邮箱' },
    {
      key: 'role' as const,
      label: '角色',
      render: (v: unknown) => (
        <span className="px-2 py-1 rounded text-xs bg-purple-100 text-purple-600">
          {ROLE_MAP[v as number] || '未知'}
        </span>
      ),
    },
    {
      key: 'banned' as const,
      label: '状态',
      render: (v: unknown) => (
        <span className={`px-2 py-1 rounded text-xs ${!v ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
          {!v ? '正常' : '已封禁'}
        </span>
      ),
    },
    {
      key: 'createdAt' as const,
      label: '注册时间',
      render: (v: unknown) => new Date(v as string).toLocaleDateString(),
    },
  ]

  const handleEdit = (user: User) => {
    setEditingUser(user)
    setFormData({ nickname: user.nickname || '', email: user.email || '', role: user.role })
    setShowModal(true)
  }

  const handleBan = async (user: User) => {
    if (confirm(`确定要${user.banned ? '解封' : '封禁'}用户 ${user.nickname || user.username} 吗?`)) {
      try {
        if (user.banned) {
          await userApi.unban(user.id)
        } else {
          await userApi.ban(user.id)
        }
        fetchUsers(pagination.page, pagination.limit)
      } catch (error) {
        console.error('Failed to update user status:', error)
      }
    }
  }

  const handleSave = async () => {
    if (!editingUser) return
    try {
      await userApi.update(editingUser.id, formData)
      setShowModal(false)
      setEditingUser(null)
      fetchUsers(pagination.page)
    } catch (error) {
      console.error('Failed to update user:', error)
    }
  }

  const handleSearch = () => {
    fetchUsers(1, pagination.limit)
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div className="flex space-x-2">
          <input
            type="text"
            placeholder="搜索用户..."
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button onClick={handleSearch} className="px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200">
            <Search size={20} />
          </button>
        </div>
        <button
          onClick={() => fetchUsers(pagination.page)}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 flex items-center"
          disabled={loading}
        >
          <RefreshCw size={20} className={`mr-2 ${loading ? 'animate-spin' : ''}`} />
          刷新
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-20">
          <div className="w-10 h-10 border-4 border-gray-200 border-t-blue-500 rounded-full animate-spin"></div>
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={users}
          actions={(row) => (
          <>
            <button onClick={() => handleEdit(row)} className="text-blue-500 hover:text-blue-700" title="编辑">
              <Edit size={18} />
            </button>
            <button
              onClick={() => handleBan(row)}
              className={`ml-2 ${row.banned ? 'text-green-500 hover:text-green-700' : 'text-red-500 hover:text-red-700'}`}
              title={row.banned ? '解封' : '封禁'}
            >
              {row.banned ? <CheckCircle size={18} /> : <Ban size={18} />}
            </button>
          </>
        )}
        />
      )}

      {/* Pagination */}
      <div className="mt-4 flex justify-between items-center">
        <span className="text-gray-500">共 {pagination.total} 条记录</span>
        <div className="flex space-x-2">
          <button
            onClick={() => fetchUsers(pagination.page - 1, pagination.limit)}
            disabled={pagination.page <= 1}
            className="px-3 py-1 border rounded disabled:opacity-50"
          >
            上一页
          </button>
          <span className="px-3 py-1">
            {pagination.page} / {pagination.totalPages}
          </span>
          <button
            onClick={() => fetchUsers(pagination.page + 1, pagination.limit)}
            disabled={pagination.page >= pagination.totalPages}
            className="px-3 py-1 border rounded disabled:opacity-50"
          >
            下一页
          </button>
        </div>
      </div>

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="编辑用户">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">昵称</label>
            <input
              type="text"
              value={formData.nickname}
              onChange={(e) => setFormData({ ...formData, nickname: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">邮箱</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">角色</label>
            <select
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: Number(e.target.value) })}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value={1}>初始用户</option>
              <option value={5}>只读</option>
              <option value={10}>普通用户</option>
              <option value={100}>LP</option>
              <option value={1000}>内部用户</option>
            </select>
          </div>
          <div className="flex justify-end space-x-2 pt-4">
            <button onClick={() => setShowModal(false)} className="px-4 py-2 border rounded-lg hover:bg-gray-50">
              取消
            </button>
            <button onClick={handleSave} className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600">
              保存
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
