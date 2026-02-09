import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import AuthGuard from './components/AuthGuard'
import Login from './pages/Login'
import LoginCallback from './pages/LoginCallback'
import Dashboard from './pages/Dashboard'
import Users from './pages/Users'
import UserDetail from './pages/UserDetail'
import Orders from './pages/Orders'
import Products from './pages/Products'
import Showcases from './pages/Showcases'
import Banners from './pages/Banners'
import CurrencyRates from './pages/CurrencyRates'
import Settings from './pages/Settings'
import PrizeOrders from './pages/PrizeOrders'
import Notifications from './pages/Notifications'
import BotUserManagement from './pages/bot/BotUserManagement'
import LuckyDrawBotConfig from './pages/bot/LuckyDrawBotConfig'
import BotTaskLogs from './pages/bot/BotTaskLogs'

function App() {
  return (
    <Routes>
      {/* 公开路由 */}
      <Route path="/login" element={<Login />} />
      <Route path="/login/callback" element={<LoginCallback />} />

      {/* 受保护的路由 */}
      <Route
        path="/"
        element={
          <AuthGuard>
            <Layout />
          </AuthGuard>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="users" element={<Users />} />
        <Route path="users/:id" element={<UserDetail />} />
        <Route path="orders" element={<Orders />} />
        <Route path="products" element={<Products />} />
        <Route path="showcases" element={<Showcases />} />
        <Route path="banners" element={<Banners />} />
        <Route path="currencies" element={<CurrencyRates />} />
        <Route path="prize-orders" element={<PrizeOrders />} />
        <Route path="notifications" element={<Notifications />} />
        <Route path="bot/users" element={<BotUserManagement />} />
        <Route path="bot/lucky-draw" element={<LuckyDrawBotConfig />} />
        <Route path="bot/logs" element={<BotTaskLogs />} />
        <Route path="settings" element={<Settings />} />
      </Route>
    </Routes>
  )
}

export default App
