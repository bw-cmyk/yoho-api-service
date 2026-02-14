import { useState, useEffect } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  Users,
  Package,
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Image,
  DollarSign,
  MonitorPlay,
  Gift,
  Bell,
  Bot,
  BotMessageSquare,
  ScrollText,
} from 'lucide-react'
import { authApi } from '../services/api'

const menuItems = [
  { path: '/dashboard', icon: LayoutDashboard, label: '仪表盘' },
  { path: '/users', icon: Users, label: '用户管理' },
  // { path: '/orders', icon: ShoppingCart, label: '订单管理' },
  { path: '/products', icon: Package, label: '商品管理' },
  { path: '/prize-orders', icon: Gift, label: '奖品发货' },
  { path: '/showcases', icon: Image, label: '晒单管理' },
  { path: '/banners', icon: MonitorPlay, label: 'Banner管理' },
  { path: '/currencies', icon: DollarSign, label: '货币管理' },
  { path: '/notifications', icon: Bell, label: '通知管理' },
  { path: '/bot/users', icon: Bot, label: 'Bot用户' },
  { path: '/bot/lucky-draw', icon: BotMessageSquare, label: '一元购Bot' },
  { path: '/bot/logs', icon: ScrollText, label: 'Bot日志' },
  { path: '/settings', icon: Settings, label: '系统设置' },
]

interface UserInfo {
  nickname?: string
  username?: string
  email?: string
}

export default function Layout() {
  const [collapsed, setCollapsed] = useState(false)
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null)
  const navigate = useNavigate()

  const handleLogout = () => {
    navigate('/login')
  }

  useEffect(() => {
    authApi.me().then(setUserInfo).catch(() => {
      localStorage.removeItem('admin_token')
      handleLogout()
    })
  }, [])

  const displayName = userInfo?.nickname || userInfo?.username || userInfo?.email || 'Admin'

  return (
    <div className="min-h-screen bg-[#f5f7fa]">
      {/* Sidebar */}
      <aside className={`h-screen fixed left-0 top-0 bg-white border-r border-gray-200 ${collapsed ? 'w-16' : 'w-56'} flex flex-col z-20 transition-all duration-300`}>
        {/* Logo */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-gray-100">
          {!collapsed && (
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">Y</span>
              </div>
              <span className="text-lg font-semibold text-gray-800">Yoho</span>
            </div>
          )}
          {collapsed && (
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center mx-auto">
              <span className="text-white font-bold text-sm">Y</span>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 px-3">
          {menuItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center px-3 py-2.5 mb-1 rounded-lg transition-all duration-200 ${
                  isActive
                    ? 'bg-blue-50 text-blue-600'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`
              }
            >
              <item.icon size={20} className={collapsed ? 'mx-auto' : 'mr-3'} />
              {!collapsed && <span className="text-sm font-medium">{item.label}</span>}
            </NavLink>
          ))}
        </nav>

        {/* Collapse Button & Logout */}
        <div className="p-3 border-t border-gray-100">
          <button
            onClick={handleLogout}
            className={`w-full flex items-center px-3 py-2.5 rounded-lg text-gray-600 hover:bg-red-50 hover:text-red-600 transition-all duration-200 ${collapsed ? 'justify-center' : ''}`}
          >
            <LogOut size={20} className={collapsed ? '' : 'mr-3'} />
            {!collapsed && <span className="text-sm font-medium">退出登录</span>}
          </button>
          <button
            onClick={() => setCollapsed(!collapsed)}
            className={`w-full flex items-center px-3 py-2.5 mt-1 rounded-lg text-gray-400 hover:bg-gray-50 hover:text-gray-600 transition-all duration-200 ${collapsed ? 'justify-center' : ''}`}
          >
            {collapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} className="mr-3" />}
            {!collapsed && <span className="text-sm">收起</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className={`${collapsed ? 'ml-16' : 'ml-56'} transition-all duration-300`}>
        {/* Header */}
        <header className="h-16 bg-white border-b border-gray-200 px-6 flex justify-between items-center sticky top-0 z-10">
          <h1 className="text-lg font-medium text-gray-800">管理后台</h1>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-sm font-medium">
                {displayName.charAt(0).toUpperCase()}
              </div>
              <div className="text-sm">
                <p className="font-medium text-gray-800">{displayName}</p>
                <p className="text-gray-400 text-xs">管理员</p>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
