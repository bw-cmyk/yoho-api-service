import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Wallet, TrendingUp, Clock, ExternalLink } from 'lucide-react'
import { userApi, assetApi, type User, type UserAsset, type UserTransaction, type UserChainAsset } from '../services/api'

const ROLE_MAP: Record<number, string> = {
  1000: '内部用户',
  100: 'LP',
  10: '普通用户',
  5: '只读',
  1: '初始用户',
}

const TX_TYPE_MAP: Record<string, { label: string; color: string }> = {
  DEPOSIT: { label: '充值', color: 'text-emerald-600' },
  WITHDRAW: { label: '提现', color: 'text-red-600' },
  BONUS_GRANT: { label: '奖励', color: 'text-blue-600' },
  LUCKY_DRAW: { label: '抽奖', color: 'text-orange-600' },
  GAME_BET: { label: '下注', color: 'text-purple-600' },
  GAME_WIN: { label: '中奖', color: 'text-emerald-600' },
  GAME_REFUND: { label: '退款', color: 'text-gray-600' },
  ORDER_PAYMENT: { label: '订单支付', color: 'text-red-600' },
  ORDER_REFUND: { label: '订单退款', color: 'text-emerald-600' },
  TRANSFER: { label: '转账', color: 'text-gray-600' },
  ADJUSTMENT: { label: '调整', color: 'text-gray-600' },
}

export default function UserDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [user, setUser] = useState<User | null>(null)
  const [assets, setAssets] = useState<UserAsset[]>([])
  const [chainAssets, setChainAssets] = useState<UserChainAsset[]>([])
  const [transactions, setTransactions] = useState<UserTransaction[]>([])
  const [chainAssetsTotalUsd, setChainAssetsTotalUsd] = useState('0')
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'assets' | 'transactions' | 'chain'>('assets')
  const [txPagination, setTxPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 })

  useEffect(() => {
    if (id) {
      fetchUserData()
    }
  }, [id])

  const fetchUserData = async () => {
    if (!id) return
    setLoading(true)
    try {
      const [userRes, assetsRes] = await Promise.all([
        userApi.getOne(id),
        assetApi.getUserAssets(id),
      ])
      setUser(userRes)
      setAssets(assetsRes.assets)
      setChainAssetsTotalUsd(assetsRes.chainAssetsTotalUsd)
    } catch (error) {
      console.error('Failed to fetch user data:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchTransactions = async (page = 1) => {
    if (!id) return
    try {
      const res = await assetApi.getUserTransactions(id, page, 20)
      setTransactions(res.data)
      setTxPagination({ page: res.page, limit: res.limit, total: res.total, totalPages: res.totalPages })
    } catch (error) {
      console.error('Failed to fetch transactions:', error)
    }
  }

  const fetchChainAssets = async () => {
    if (!id) return
    try {
      const res = await assetApi.getUserChainAssets(id)
      setChainAssets(res.data)
    } catch (error) {
      console.error('Failed to fetch chain assets:', error)
    }
  }

  useEffect(() => {
    if (activeTab === 'transactions' && transactions.length === 0) {
      fetchTransactions()
    } else if (activeTab === 'chain' && chainAssets.length === 0) {
      fetchChainAssets()
    }
  }, [activeTab])

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="w-10 h-10 border-4 border-gray-200 border-t-blue-500 rounded-full animate-spin"></div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="text-center py-20 text-gray-500">
        用户不存在
      </div>
    )
  }

  // 计算总资产
  const totalOffchainUsd = assets.reduce((sum, a) => sum + parseFloat(a.totalBalance || '0'), 0)
  const totalUsd = totalOffchainUsd + parseFloat(chainAssetsTotalUsd || '0')

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <button
          onClick={() => navigate('/users')}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft size={20} className="text-gray-600" />
        </button>
        <div>
          <h2 className="text-xl font-semibold text-gray-800">用户详情</h2>
          <p className="text-sm text-gray-500">查看用户信息和资产</p>
        </div>
      </div>

      {/* User Info Card */}
      <div className="bg-white rounded-xl border border-gray-100 p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-2xl font-medium">
              {(user.nickname || user.username || 'U').charAt(0).toUpperCase()}
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-800">{user.nickname || user.username}</h3>
              <p className="text-sm text-gray-500">{user.email}</p>
              <div className="flex items-center space-x-3 mt-2">
                <span className={`px-2 py-1 rounded text-xs ${user.banned ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                  {user.banned ? '已封禁' : '正常'}
                </span>
                <span className="px-2 py-1 rounded text-xs bg-purple-100 text-purple-600">
                  {ROLE_MAP[user.role] || '未知'}
                </span>
              </div>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-500">注册时间</p>
            <p className="text-sm font-medium text-gray-700">
              {new Date(user.createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">总资产</p>
              <p className="text-2xl font-semibold text-gray-800 mt-1">${totalUsd.toFixed(2)}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-500 flex items-center justify-center">
              <Wallet size={24} className="text-white" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">账户余额</p>
              <p className="text-2xl font-semibold text-gray-800 mt-1">${totalOffchainUsd.toFixed(2)}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-400 to-blue-500 flex items-center justify-center">
              <TrendingUp size={24} className="text-white" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">链上资产</p>
              <p className="text-2xl font-semibold text-gray-800 mt-1">${chainAssetsTotalUsd}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-400 to-purple-500 flex items-center justify-center">
              <ExternalLink size={24} className="text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl border border-gray-100">
        <div className="border-b border-gray-100 px-4">
          <div className="flex space-x-6">
            {[
              { key: 'assets', label: '账户余额' },
              { key: 'transactions', label: '交易记录' },
              { key: 'chain', label: '链上资产' },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as typeof activeTab)}
                className={`py-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.key
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="p-6">
          {/* Assets Tab */}
          {activeTab === 'assets' && (
            <div className="space-y-4">
              {assets.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <Wallet size={40} className="mx-auto mb-3 opacity-50" />
                  <p>暂无资产记录</p>
                </div>
              ) : (
                assets.map((asset) => (
                  <div key={asset.currency} className="p-4 bg-gray-50 rounded-xl">
                    <div className="flex justify-between items-center mb-3">
                      <span className="font-semibold text-gray-800">{asset.currency}</span>
                      <span className="text-lg font-semibold text-emerald-600">${asset.totalBalance}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-gray-400">真实余额</p>
                        <p className="font-medium text-gray-700">${asset.balanceReal}</p>
                      </div>
                      <div>
                        <p className="text-gray-400">奖励余额</p>
                        <p className="font-medium text-gray-700">${asset.balanceBonus}</p>
                      </div>
                      <div>
                        <p className="text-gray-400">锁定余额</p>
                        <p className="font-medium text-gray-700">${asset.balanceLocked}</p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Transactions Tab */}
          {activeTab === 'transactions' && (
            <div className="space-y-4">
              {transactions.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <Clock size={40} className="mx-auto mb-3 opacity-50" />
                  <p>暂无交易记录</p>
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    {transactions.map((tx) => {
                      const txType = TX_TYPE_MAP[tx.type] || { label: tx.type, color: 'text-gray-600' }
                      const isIncome = ['DEPOSIT', 'BONUS_GRANT', 'GAME_WIN', 'ORDER_REFUND', 'GAME_REFUND'].includes(tx.type)
                      return (
                        <div key={tx.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                          <div className="flex items-center space-x-4">
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isIncome ? 'bg-emerald-100' : 'bg-red-100'}`}>
                              <span className={`text-lg font-bold ${isIncome ? 'text-emerald-600' : 'text-red-600'}`}>
                                {isIncome ? '+' : '-'}
                              </span>
                            </div>
                            <div>
                              <p className={`font-medium ${txType.color}`}>{txType.label}</p>
                              <p className="text-xs text-gray-400">{tx.description || tx.referenceId || '-'}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className={`font-semibold ${isIncome ? 'text-emerald-600' : 'text-red-600'}`}>
                              {isIncome ? '+' : '-'}${Math.abs(parseFloat(tx.amount)).toFixed(2)}
                            </p>
                            <p className="text-xs text-gray-400">
                              {new Date(tx.createdAt).toLocaleString()}
                            </p>
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  {/* Pagination */}
                  <div className="flex justify-between items-center pt-4 border-t border-gray-100">
                    <span className="text-sm text-gray-500">共 {txPagination.total} 条记录</span>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => fetchTransactions(txPagination.page - 1)}
                        disabled={txPagination.page <= 1}
                        className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg disabled:opacity-50 hover:bg-gray-50"
                      >
                        上一页
                      </button>
                      <span className="text-sm text-gray-600">
                        {txPagination.page} / {txPagination.totalPages || 1}
                      </span>
                      <button
                        onClick={() => fetchTransactions(txPagination.page + 1)}
                        disabled={txPagination.page >= txPagination.totalPages}
                        className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg disabled:opacity-50 hover:bg-gray-50"
                      >
                        下一页
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Chain Assets Tab */}
          {activeTab === 'chain' && (
            <div className="space-y-4">
              {chainAssets.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <ExternalLink size={40} className="mx-auto mb-3 opacity-50" />
                  <p>暂无链上资产</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {chainAssets.map((asset) => (
                    <div key={asset.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                      <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-orange-500 flex items-center justify-center text-white font-bold text-sm">
                          {asset.tokenSymbol.substring(0, 2)}
                        </div>
                        <div>
                          <p className="font-medium text-gray-800">{asset.tokenSymbol}</p>
                          <p className="text-xs text-gray-400">{asset.tokenName}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-gray-800">{parseFloat(asset.balance).toFixed(6)}</p>
                        <p className="text-sm text-emerald-600">${asset.usdValue}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
