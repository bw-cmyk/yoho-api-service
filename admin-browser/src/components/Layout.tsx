import { useState, useEffect } from 'react'
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  Users,
  Package,
  Settings,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
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
import type { LucideIcon } from 'lucide-react'

type MenuItem =
  | { type: 'link'; path: string; icon: LucideIcon; label: string }
  | { type: 'group'; key: string; icon: LucideIcon; label: string; children: { path: string; icon: LucideIcon; label: string }[] }

const menuItems: MenuItem[] = [
  { type: 'link', path: '/dashboard', icon: LayoutDashboard, label: '仪表盘' },
  { type: 'link', path: '/users', icon: Users, label: '用户管理' },
  { type: 'link', path: '/products', icon: Package, label: '商品管理' },
  { type: 'link', path: '/prize-orders', icon: Gift, label: '奖品发货' },
  { type: 'link', path: '/showcases', icon: Image, label: '晒单管理' },
  { type: 'link', path: '/banners', icon: MonitorPlay, label: 'Banner管理' },
  { type: 'link', path: '/currencies', icon: DollarSign, label: '货币管理' },
  { type: 'link', path: '/notifications', icon: Bell, label: '通知管理' },
  {
    type: 'group',
    key: 'bot',
    icon: Bot,
    label: 'Bot管理',
    children: [
      { path: '/bot/users', icon: Users, label: 'Bot用户' },
      { path: '/bot/lucky-draw', icon: BotMessageSquare, label: '一元购Bot' },
      { path: '/bot/logs', icon: ScrollText, label: 'Bot日志' },
    ],
  },
  { type: 'link', path: '/settings', icon: Settings, label: '系统设置' },
]

interface UserInfo {
  nickname?: string
  username?: string
  email?: string
}

export default function Layout() {
  const [collapsed, setCollapsed] = useState(false)
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null)
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())
  const navigate = useNavigate()
  const location = useLocation()

  // Auto-expand group if current path matches a child
  useEffect(() => {
    for (const item of menuItems) {
      if (item.type === 'group' && item.children.some((c) => location.pathname.startsWith(c.path))) {
        setExpandedGroups((prev) => new Set(prev).add(item.key))
      }
    }
  }, [location.pathname])

  const toggleGroup = (key: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev)
      if (next.has(key)) {
        next.delete(key)
      } else {
        next.add(key)
      }
      return next
    })
  }

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
        <nav className="flex-1 py-4 px-3 overflow-y-auto">
          {menuItems.map((item) => {
            if (item.type === 'link') {
              return (
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
              )
            }

            // Group with children
            const isExpanded = expandedGroups.has(item.key)
            const isChildActive = item.children.some((c) => location.pathname.startsWith(c.path))

            if (collapsed) {
              // When collapsed, show children as direct links
              return item.children.map((child) => (
                <NavLink
                  key={child.path}
                  to={child.path}
                  className={({ isActive }) =>
                    `flex items-center px-3 py-2.5 mb-1 rounded-lg transition-all duration-200 ${
                      isActive
                        ? 'bg-blue-50 text-blue-600'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }`
                  }
                >
                  <child.icon size={20} className="mx-auto" />
                </NavLink>
              ))
            }

            return (
              <div key={item.key} className="mb-1">
                {/* Group header */}
                <button
                  onClick={() => toggleGroup(item.key)}
                  className={`w-full flex items-center px-3 py-2.5 rounded-lg transition-all duration-200 ${
                    isChildActive
                      ? 'text-blue-600'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <item.icon size={20} className="mr-3" />
                  <span className="text-sm font-medium flex-1 text-left">{item.label}</span>
                  <ChevronDown
                    size={16}
                    className={`transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                  />
                </button>

                {/* Children */}
                <div
                  className={`overflow-hidden transition-all duration-200 ${
                    isExpanded ? 'max-h-40 opacity-100' : 'max-h-0 opacity-0'
                  }`}
                >
                  {item.children.map((child) => (
                    <NavLink
                      key={child.path}
                      to={child.path}
                      className={({ isActive }) =>
                        `flex items-center pl-10 pr-3 py-2 rounded-lg transition-all duration-200 ${
                          isActive
                            ? 'bg-blue-50 text-blue-600'
                            : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                        }`
                      }
                    >
                      <child.icon size={16} className="mr-3" />
                      <span className="text-sm">{child.label}</span>
                    </NavLink>
                  ))}
                </div>
              </div>
            )
          })}
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
