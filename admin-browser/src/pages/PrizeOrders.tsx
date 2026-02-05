import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Package,
  Truck,
  CheckCircle,
  Clock,
  Eye,
  Send,
  Search,
  RefreshCw,
} from 'lucide-react'
import StatCard from '../components/StatCard'
import DataTable from '../components/DataTable'
import Modal from '../components/Modal'
import { prizeOrderApi, type PrizeOrder, type PrizeOrderDetail, type PrizeShippingStatus } from '../services/api'

const STATUS_CONFIG: Record<PrizeShippingStatus, { label: string; color: string; bgColor: string }> = {
  PENDING_ADDRESS: { label: '待填写地址', color: 'text-gray-600', bgColor: 'bg-gray-100' },
  PENDING_SHIPMENT: { label: '待发货', color: 'text-orange-600', bgColor: 'bg-orange-100' },
  SHIPPED: { label: '已发货', color: 'text-blue-600', bgColor: 'bg-blue-100' },
  DELIVERED: { label: '已签收', color: 'text-green-600', bgColor: 'bg-green-100' },
}

export default function PrizeOrders() {
  const queryClient = useQueryClient()
  const [filter, setFilter] = useState<PrizeShippingStatus | 'all'>('all')
  const [keyword, setKeyword] = useState('')
  const [page, setPage] = useState(1)
  const [selectedOrder, setSelectedOrder] = useState<PrizeOrder | null>(null)
  const [detailModalOpen, setDetailModalOpen] = useState(false)
  const [shipModalOpen, setShipModalOpen] = useState(false)
  const [shipForm, setShipForm] = useState({ logisticsCompany: '', trackingNumber: '' })

  // 获取统计数据
  const { data: stats } = useQuery({
    queryKey: ['prizeOrderStats'],
    queryFn: () => prizeOrderApi.getStats(),
  })

  // 获取订单列表
  const { data: ordersData, isLoading, refetch } = useQuery({
    queryKey: ['prizeOrders', filter, keyword, page],
    queryFn: () =>
      prizeOrderApi.getList({
        status: filter === 'all' ? undefined : filter,
        keyword: keyword || undefined,
        page,
        limit: 20,
      }),
  })

  // 获取订单详情
  const { data: orderDetail, isLoading: detailLoading } = useQuery({
    queryKey: ['prizeOrderDetail', selectedOrder?.drawResultId],
    queryFn: () => prizeOrderApi.getDetail(selectedOrder!.drawResultId),
    enabled: !!selectedOrder && detailModalOpen,
  })

  // 发货 mutation
  const shipMutation = useMutation({
    mutationFn: (data: { drawResultId: number; logisticsCompany: string; trackingNumber: string }) =>
      prizeOrderApi.ship(data.drawResultId, {
        logisticsCompany: data.logisticsCompany,
        trackingNumber: data.trackingNumber,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prizeOrders'] })
      queryClient.invalidateQueries({ queryKey: ['prizeOrderStats'] })
      setShipModalOpen(false)
      setSelectedOrder(null)
      setShipForm({ logisticsCompany: '', trackingNumber: '' })
    },
  })

  // 确认签收 mutation
  const confirmDeliveryMutation = useMutation({
    mutationFn: (drawResultId: number) => prizeOrderApi.confirmDelivery(drawResultId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prizeOrders'] })
      queryClient.invalidateQueries({ queryKey: ['prizeOrderStats'] })
      setDetailModalOpen(false)
      setSelectedOrder(null)
    },
  })

  const handleShip = () => {
    if (!selectedOrder || !shipForm.logisticsCompany || !shipForm.trackingNumber) return
    shipMutation.mutate({
      drawResultId: selectedOrder.drawResultId,
      ...shipForm,
    })
  }

  const handleConfirmDelivery = (drawResultId: number) => {
    if (window.confirm('确认该订单已签收？')) {
      confirmDeliveryMutation.mutate(drawResultId)
    }
  }

  const openShipModal = (order: PrizeOrder) => {
    setSelectedOrder(order)
    setShipModalOpen(true)
  }

  const openDetailModal = (order: PrizeOrder) => {
    setSelectedOrder(order)
    setDetailModalOpen(true)
  }

  const columns = [
    {
      key: 'shippingOrderNumber' as const,
      label: '订单号',
      render: (v: unknown) => (
        <span className="font-mono text-sm">{(v as string) || '-'}</span>
      ),
    },
    {
      key: 'product' as const,
      label: '商品',
      render: (_: unknown, row: PrizeOrder) =>
        row.product ? (
          <div className="flex items-center space-x-2">
            <img
              src={row.product.thumbnail}
              alt={row.product.name}
              className="w-10 h-10 rounded object-cover"
            />
            <span className="text-sm truncate max-w-[150px]">{row.product.name}</span>
          </div>
        ) : (
          <span className="text-gray-400">-</span>
        ),
    },
    {
      key: 'winner' as const,
      label: '中奖用户',
      render: (_: unknown, row: PrizeOrder) => (
        <div className="flex items-center space-x-2">
          {row.winner.avatar ? (
            <img
              src={row.winner.avatar}
              alt=""
              className="w-8 h-8 rounded-full object-cover"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 text-xs">
              {row.winner.userName?.charAt(0) || '?'}
            </div>
          )}
          <span className="text-sm">{row.winner.userName || row.winner.userId}</span>
        </div>
      ),
    },
    {
      key: 'prizeShippingStatus' as const,
      label: '状态',
      render: (v: unknown) => {
        const status = v as PrizeShippingStatus
        const config = STATUS_CONFIG[status]
        return (
          <span className={`px-2 py-1 rounded text-xs ${config.bgColor} ${config.color}`}>
            {config.label}
          </span>
        )
      },
    },
    {
      key: 'shippingAddress' as const,
      label: '收货地址',
      render: (_: unknown, row: PrizeOrder) =>
        row.shippingAddress ? (
          <div className="text-sm max-w-[200px]">
            <div className="font-medium">{row.shippingAddress.recipientName}</div>
            <div className="text-gray-500 truncate">{row.shippingAddress.fullAddress}</div>
          </div>
        ) : (
          <span className="text-gray-400 text-sm">待填写</span>
        ),
    },
    {
      key: 'logistics' as const,
      label: '物流信息',
      render: (_: unknown, row: PrizeOrder) =>
        row.logistics.trackingNumber ? (
          <div className="text-sm">
            <div>{row.logistics.company}</div>
            <div className="text-gray-500 font-mono">{row.logistics.trackingNumber}</div>
          </div>
        ) : (
          <span className="text-gray-400 text-sm">-</span>
        ),
    },
    {
      key: 'createdAt' as const,
      label: '中奖时间',
      render: (v: unknown) => (
        <span className="text-sm text-gray-500">
          {new Date(v as string).toLocaleString('zh-CN')}
        </span>
      ),
    },
  ]

  const filterButtons: Array<{ value: PrizeShippingStatus | 'all'; label: string; count?: number }> = [
    { value: 'all', label: '全部', count: stats?.total },
    { value: 'PENDING_ADDRESS', label: '待填写地址', count: stats?.pendingAddress },
    { value: 'PENDING_SHIPMENT', label: '待发货', count: stats?.pendingShipment },
    { value: 'SHIPPED', label: '已发货', count: stats?.shipped },
    { value: 'DELIVERED', label: '已签收', count: stats?.delivered },
  ]

  return (
    <div>
      {/* 统计卡片 */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <StatCard
          icon={<Clock className="text-gray-500" size={24} />}
          label="待填写地址"
          value={stats?.pendingAddress || 0}
          color="bg-gray-100"
        />
        <StatCard
          icon={<Package className="text-orange-500" size={24} />}
          label="待发货"
          value={stats?.pendingShipment || 0}
          color="bg-orange-100"
        />
        <StatCard
          icon={<Truck className="text-blue-500" size={24} />}
          label="已发货"
          value={stats?.shipped || 0}
          color="bg-blue-100"
        />
        <StatCard
          icon={<CheckCircle className="text-green-500" size={24} />}
          label="已签收"
          value={stats?.delivered || 0}
          color="bg-green-100"
        />
      </div>

      {/* 筛选和搜索 */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex space-x-2">
          {filterButtons.map((btn) => (
            <button
              key={btn.value}
              onClick={() => {
                setFilter(btn.value)
                setPage(1)
              }}
              className={`px-4 py-2 rounded-lg text-sm ${
                filter === btn.value
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
              }`}
            >
              {btn.label}
              {btn.count !== undefined && (
                <span className="ml-1 text-xs opacity-75">({btn.count})</span>
              )}
            </button>
          ))}
        </div>
        <div className="flex items-center space-x-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="搜索订单号、用户名、物流单号"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm w-72 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            onClick={() => refetch()}
            className="p-2 bg-gray-100 rounded-lg hover:bg-gray-200"
            title="刷新"
          >
            <RefreshCw size={18} />
          </button>
        </div>
      </div>

      {/* 订单列表 */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <RefreshCw className="animate-spin text-gray-400" size={32} />
        </div>
      ) : (
        <>
          <DataTable
            columns={columns}
            data={ordersData?.data || []}
            actions={(row) => (
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => openDetailModal(row)}
                  className="text-blue-500 hover:text-blue-700"
                  title="查看详情"
                >
                  <Eye size={18} />
                </button>
                {row.prizeShippingStatus === 'PENDING_SHIPMENT' && (
                  <button
                    onClick={() => openShipModal(row)}
                    className="text-orange-500 hover:text-orange-700"
                    title="发货"
                  >
                    <Send size={18} />
                  </button>
                )}
                {row.prizeShippingStatus === 'SHIPPED' && (
                  <button
                    onClick={() => handleConfirmDelivery(row.drawResultId)}
                    className="text-green-500 hover:text-green-700"
                    title="确认签收"
                  >
                    <CheckCircle size={18} />
                  </button>
                )}
              </div>
            )}
          />

          {/* 分页 */}
          {ordersData && ordersData.total > 20 && (
            <div className="flex justify-center items-center space-x-4 mt-6">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-4 py-2 bg-gray-100 rounded-lg disabled:opacity-50"
              >
                上一页
              </button>
              <span className="text-sm text-gray-600">
                第 {page} 页 / 共 {Math.ceil(ordersData.total / 20)} 页
              </span>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={page >= Math.ceil(ordersData.total / 20)}
                className="px-4 py-2 bg-gray-100 rounded-lg disabled:opacity-50"
              >
                下一页
              </button>
            </div>
          )}
        </>
      )}

      {/* 发货弹窗 */}
      <Modal
        isOpen={shipModalOpen}
        onClose={() => {
          setShipModalOpen(false)
          setSelectedOrder(null)
          setShipForm({ logisticsCompany: '', trackingNumber: '' })
        }}
        title="发货"
        size="md"
      >
        {selectedOrder && (
          <div className="space-y-4">
            {/* 订单信息 */}
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center space-x-3 mb-3">
                {selectedOrder.product?.thumbnail && (
                  <img
                    src={selectedOrder.product.thumbnail}
                    alt=""
                    className="w-16 h-16 rounded object-cover"
                  />
                )}
                <div>
                  <div className="font-medium">{selectedOrder.product?.name || '商品'}</div>
                  <div className="text-sm text-gray-500">
                    订单号: {selectedOrder.shippingOrderNumber || '-'}
                  </div>
                </div>
              </div>
              {selectedOrder.shippingAddress && (
                <div className="text-sm border-t border-gray-200 pt-3">
                  <div className="font-medium">
                    {selectedOrder.shippingAddress.recipientName}{' '}
                    {selectedOrder.shippingAddress.phoneNumber}
                  </div>
                  <div className="text-gray-500">{selectedOrder.shippingAddress.fullAddress}</div>
                </div>
              )}
            </div>

            {/* 物流表单 */}
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  物流公司 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={shipForm.logisticsCompany}
                  onChange={(e) => setShipForm({ ...shipForm, logisticsCompany: e.target.value })}
                  placeholder="如：顺丰速运、圆通快递"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  物流单号 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={shipForm.trackingNumber}
                  onChange={(e) => setShipForm({ ...shipForm, trackingNumber: e.target.value })}
                  placeholder="请输入物流单号"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* 操作按钮 */}
            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-100">
              <button
                onClick={() => {
                  setShipModalOpen(false)
                  setSelectedOrder(null)
                  setShipForm({ logisticsCompany: '', trackingNumber: '' })
                }}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
              >
                取消
              </button>
              <button
                onClick={handleShip}
                disabled={!shipForm.logisticsCompany || !shipForm.trackingNumber || shipMutation.isPending}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {shipMutation.isPending ? '提交中...' : '确认发货'}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* 详情弹窗 */}
      <Modal
        isOpen={detailModalOpen}
        onClose={() => {
          setDetailModalOpen(false)
          setSelectedOrder(null)
        }}
        title="订单详情"
        size="lg"
      >
        {detailLoading ? (
          <div className="flex justify-center py-8">
            <RefreshCw className="animate-spin text-gray-400" size={32} />
          </div>
        ) : orderDetail ? (
          <div className="space-y-6">
            {/* 基本信息 */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-gray-500">订单号</label>
                <div className="font-mono">{orderDetail.shippingOrderNumber || '-'}</div>
              </div>
              <div>
                <label className="text-sm text-gray-500">状态</label>
                <div>
                  <span
                    className={`px-2 py-1 rounded text-xs ${
                      STATUS_CONFIG[orderDetail.prizeShippingStatus].bgColor
                    } ${STATUS_CONFIG[orderDetail.prizeShippingStatus].color}`}
                  >
                    {STATUS_CONFIG[orderDetail.prizeShippingStatus].label}
                  </span>
                </div>
              </div>
              <div>
                <label className="text-sm text-gray-500">期次</label>
                <div>第 {orderDetail.roundNumber} 期</div>
              </div>
              <div>
                <label className="text-sm text-gray-500">中奖号码</label>
                <div className="font-mono text-blue-600">{orderDetail.winningNumber}</div>
              </div>
              <div>
                <label className="text-sm text-gray-500">奖品价值</label>
                <div>${orderDetail.prizeValue}</div>
              </div>
              <div>
                <label className="text-sm text-gray-500">中奖时间</label>
                <div>{new Date(orderDetail.createdAt).toLocaleString('zh-CN')}</div>
              </div>
            </div>

            {/* 商品信息 */}
            {orderDetail.product && (
              <div className="border-t border-gray-100 pt-4">
                <label className="text-sm text-gray-500 block mb-2">商品信息</label>
                <div className="flex items-center space-x-3">
                  <img
                    src={orderDetail.product.thumbnail}
                    alt=""
                    className="w-16 h-16 rounded object-cover"
                  />
                  <div className="font-medium">{orderDetail.product.name}</div>
                </div>
              </div>
            )}

            {/* 收货地址 */}
            {orderDetail.shippingAddress && (
              <div className="border-t border-gray-100 pt-4">
                <label className="text-sm text-gray-500 block mb-2">收货地址</label>
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="font-medium">
                    {orderDetail.shippingAddress.recipientName}{' '}
                    {orderDetail.shippingAddress.phoneNumber}
                  </div>
                  <div className="text-sm text-gray-600 mt-1">
                    {orderDetail.shippingAddress.fullAddress}
                  </div>
                </div>
              </div>
            )}

            {/* 物流信息 */}
            {orderDetail.logistics.trackingNumber && (
              <div className="border-t border-gray-100 pt-4">
                <label className="text-sm text-gray-500 block mb-2">物流信息</label>
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="font-medium">{orderDetail.logistics.company}</div>
                  <div className="text-sm text-gray-600 font-mono">
                    {orderDetail.logistics.trackingNumber}
                  </div>
                  {orderDetail.logistics.shippedAt && (
                    <div className="text-sm text-gray-500 mt-1">
                      发货时间: {new Date(orderDetail.logistics.shippedAt).toLocaleString('zh-CN')}
                    </div>
                  )}
                  {orderDetail.logistics.deliveredAt && (
                    <div className="text-sm text-gray-500">
                      签收时间: {new Date(orderDetail.logistics.deliveredAt).toLocaleString('zh-CN')}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 时间线 */}
            <div className="border-t border-gray-100 pt-4">
              <label className="text-sm text-gray-500 block mb-2">订单时间线</label>
              <div className="space-y-3">
                {orderDetail.timeline.map((event, index) => (
                  <div key={index} className="flex items-start space-x-3">
                    <div className="w-2 h-2 rounded-full bg-blue-500 mt-2" />
                    <div>
                      <div className="font-medium text-sm">{event.title}</div>
                      {event.description && (
                        <div className="text-sm text-gray-500">{event.description}</div>
                      )}
                      <div className="text-xs text-gray-400">
                        {new Date(event.time).toLocaleString('zh-CN')}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 操作按钮 */}
            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-100">
              {orderDetail.prizeShippingStatus === 'PENDING_SHIPMENT' && (
                <button
                  onClick={() => {
                    setDetailModalOpen(false)
                    openShipModal(orderDetail)
                  }}
                  className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600"
                >
                  发货
                </button>
              )}
              {orderDetail.prizeShippingStatus === 'SHIPPED' && (
                <button
                  onClick={() => handleConfirmDelivery(orderDetail.drawResultId)}
                  disabled={confirmDeliveryMutation.isPending}
                  className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50"
                >
                  {confirmDeliveryMutation.isPending ? '处理中...' : '确认签收'}
                </button>
              )}
              <button
                onClick={() => {
                  setDetailModalOpen(false)
                  setSelectedOrder(null)
                }}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
              >
                关闭
              </button>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  )
}
