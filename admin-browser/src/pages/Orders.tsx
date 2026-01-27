import { useState } from 'react'
import { Check, X, Eye, Download } from 'lucide-react'
import DataTable from '../components/DataTable'

interface Order {
  id: string
  userId: number
  amount: number
  status: string
  createdAt: string
}

const initialOrders: Order[] = [
  { id: 'ORD001', userId: 1, amount: 299.0, status: 'completed', createdAt: '2024-01-25' },
  { id: 'ORD002', userId: 2, amount: 599.0, status: 'pending', createdAt: '2024-01-26' },
  { id: 'ORD003', userId: 3, amount: 199.0, status: 'cancelled', createdAt: '2024-01-27' },
  { id: 'ORD004', userId: 1, amount: 899.0, status: 'pending', createdAt: '2024-01-28' },
  { id: 'ORD005', userId: 2, amount: 450.0, status: 'completed', createdAt: '2024-01-29' },
]

export default function Orders() {
  const [orders, setOrders] = useState<Order[]>(initialOrders)
  const [filter, setFilter] = useState('all')

  const filteredOrders = filter === 'all' ? orders : orders.filter((o) => o.status === filter)

  const columns = [
    { key: 'id' as const, label: '订单号' },
    { key: 'userId' as const, label: '用户ID' },
    {
      key: 'amount' as const,
      label: '金额',
      render: (v: unknown) => `$${(v as number).toFixed(2)}`,
    },
    {
      key: 'status' as const,
      label: '状态',
      render: (v: unknown) => (
        <span
          className={`px-2 py-1 rounded text-xs ${
            v === 'completed'
              ? 'bg-green-100 text-green-600'
              : v === 'pending'
              ? 'bg-yellow-100 text-yellow-600'
              : 'bg-red-100 text-red-600'
          }`}
        >
          {v === 'completed' ? '已完成' : v === 'pending' ? '待处理' : '已取消'}
        </span>
      ),
    },
    { key: 'createdAt' as const, label: '创建时间' },
  ]

  const updateStatus = (order: Order, status: string) => {
    setOrders(orders.map((o) => (o.id === order.id ? { ...o, status } : o)))
  }

  const filterButtons = [
    { value: 'all', label: '全部' },
    { value: 'pending', label: '待处理' },
    { value: 'completed', label: '已完成' },
    { value: 'cancelled', label: '已取消' },
  ]

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div className="flex space-x-2">
          {filterButtons.map((btn) => (
            <button
              key={btn.value}
              onClick={() => setFilter(btn.value)}
              className={`px-4 py-2 rounded-lg ${
                filter === btn.value ? 'bg-blue-500 text-white' : 'bg-gray-100 hover:bg-gray-200'
              }`}
            >
              {btn.label}
            </button>
          ))}
        </div>
        <button className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 flex items-center">
          <Download size={20} className="mr-2" />
          导出
        </button>
      </div>

      <DataTable
        columns={columns}
        data={filteredOrders}
        actions={(row) => (
          <>
            {row.status === 'pending' && (
              <>
                <button
                  onClick={() => updateStatus(row, 'completed')}
                  className="text-green-500 hover:text-green-700"
                  title="完成"
                >
                  <Check size={18} />
                </button>
                <button
                  onClick={() => updateStatus(row, 'cancelled')}
                  className="text-red-500 hover:text-red-700 ml-2"
                  title="取消"
                >
                  <X size={18} />
                </button>
              </>
            )}
            <button className="text-blue-500 hover:text-blue-700 ml-2" title="查看详情">
              <Eye size={18} />
            </button>
          </>
        )}
      />
    </div>
  )
}
