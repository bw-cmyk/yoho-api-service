import { Users, ShoppingCart, DollarSign, TrendingUp, Clock, Zap } from 'lucide-react'

const mockStats = {
  totalUsers: 1250,
  totalOrders: 3420,
  totalRevenue: 125000,
  activeUsers: 890,
  todayOrders: 45,
  todayRevenue: 4500,
}

const recentOrders = [
  { id: 'ORD001', amount: 299.0, status: 'completed', createdAt: '2024-01-25 14:30' },
  { id: 'ORD002', amount: 599.0, status: 'pending', createdAt: '2024-01-26 09:15' },
  { id: 'ORD003', amount: 199.0, status: 'cancelled', createdAt: '2024-01-27 16:45' },
]

interface StatCardProps {
  icon: React.ReactNode
  iconBg: string
  label: string
  value: string
  subValue?: string
  subLabel?: string
}

function StatCard({ icon, iconBg, label, value, subValue, subLabel }: StatCardProps) {
  return (
    <div className="bg-white rounded-xl p-5 border border-gray-100">
      <div className="flex items-start space-x-4">
        <div className={`w-12 h-12 rounded-xl ${iconBg} flex items-center justify-center flex-shrink-0`}>
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-gray-500 mb-1">{label}</p>
          <p className="text-2xl font-semibold text-gray-900">{value}</p>
          {subValue && (
            <p className="text-xs text-gray-400 mt-1">
              {subLabel}: <span className="text-gray-600">{subValue}</span>
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

export default function Dashboard() {
  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div>
        <h2 className="text-xl font-semibold text-gray-800">仪表盘</h2>
        <p className="text-sm text-gray-500 mt-1">欢迎回来，这是您的数据概览</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard
          icon={<DollarSign size={24} className="text-white" />}
          iconBg="bg-gradient-to-br from-emerald-400 to-emerald-500"
          label="总收入"
          value={`$${mockStats.totalRevenue.toLocaleString()}`}
          subLabel="今日"
          subValue={`$${mockStats.todayRevenue.toLocaleString()}`}
        />
        <StatCard
          icon={<Users size={24} className="text-white" />}
          iconBg="bg-gradient-to-br from-blue-400 to-blue-500"
          label="总用户"
          value={mockStats.totalUsers.toLocaleString()}
          subLabel="活跃"
          subValue={mockStats.activeUsers.toLocaleString()}
        />
        <StatCard
          icon={<ShoppingCart size={24} className="text-white" />}
          iconBg="bg-gradient-to-br from-amber-400 to-amber-500"
          label="总订单"
          value={mockStats.totalOrders.toLocaleString()}
          subLabel="今日"
          subValue={mockStats.todayOrders.toString()}
        />
        <StatCard
          icon={<TrendingUp size={24} className="text-white" />}
          iconBg="bg-gradient-to-br from-violet-400 to-violet-500"
          label="转化率"
          value="6.97%"
          subLabel="较上周"
          subValue="+0.5%"
        />
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Today Overview */}
        <div className="bg-white rounded-xl border border-gray-100 p-6">
          <h3 className="text-base font-semibold text-gray-800 mb-4">今日概览</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                  <ShoppingCart size={20} className="text-blue-500" />
                </div>
                <span className="text-gray-600">今日订单</span>
              </div>
              <span className="text-lg font-semibold text-gray-900">{mockStats.todayOrders}</span>
            </div>
            <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center">
                  <DollarSign size={20} className="text-emerald-500" />
                </div>
                <span className="text-gray-600">今日收入</span>
              </div>
              <span className="text-lg font-semibold text-emerald-600">
                ${mockStats.todayRevenue.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-lg bg-violet-50 flex items-center justify-center">
                  <Users size={20} className="text-violet-500" />
                </div>
                <span className="text-gray-600">新注册用户</span>
              </div>
              <span className="text-lg font-semibold text-gray-900">23</span>
            </div>
          </div>
        </div>

        {/* Recent Orders */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-100 p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-base font-semibold text-gray-800">最近订单</h3>
            <span className="text-sm text-gray-400">近7天</span>
          </div>
          <div className="space-y-3">
            {recentOrders.map((order) => (
              <div
                key={order.id}
                className="flex justify-between items-center p-4 hover:bg-gray-50 rounded-lg transition-colors"
              >
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                    <Clock size={18} className="text-gray-400" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-800">{order.id}</p>
                    <p className="text-sm text-gray-400">{order.createdAt}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-gray-900">${order.amount}</p>
                  <span
                    className={`text-xs px-2 py-1 rounded-full ${
                      order.status === 'completed'
                        ? 'bg-emerald-50 text-emerald-600'
                        : order.status === 'pending'
                        ? 'bg-amber-50 text-amber-600'
                        : 'bg-red-50 text-red-600'
                    }`}
                  >
                    {order.status === 'completed'
                      ? '已完成'
                      : order.status === 'pending'
                      ? '待处理'
                      : '已取消'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl border border-gray-100 p-6">
        <h3 className="text-base font-semibold text-gray-800 mb-4">快捷操作</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <button className="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
            <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
              <Users size={20} className="text-blue-500" />
            </div>
            <div className="text-left">
              <p className="font-medium text-gray-800">用户管理</p>
              <p className="text-xs text-gray-400">查看所有用户</p>
            </div>
          </button>
          <button className="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
            <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center">
              <ShoppingCart size={20} className="text-emerald-500" />
            </div>
            <div className="text-left">
              <p className="font-medium text-gray-800">订单管理</p>
              <p className="text-xs text-gray-400">处理订单</p>
            </div>
          </button>
          <button className="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
            <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center">
              <Zap size={20} className="text-amber-500" />
            </div>
            <div className="text-left">
              <p className="font-medium text-gray-800">商品管理</p>
              <p className="text-xs text-gray-400">上架商品</p>
            </div>
          </button>
          <button className="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
            <div className="w-10 h-10 rounded-lg bg-violet-50 flex items-center justify-center">
              <TrendingUp size={20} className="text-violet-500" />
            </div>
            <div className="text-left">
              <p className="font-medium text-gray-800">数据分析</p>
              <p className="text-xs text-gray-400">查看报表</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  )
}
