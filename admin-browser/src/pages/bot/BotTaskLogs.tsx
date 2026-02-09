import { useState, useEffect } from 'react'
import { ScrollText, RefreshCw, CheckCircle, XCircle, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react'
import { botApi, type BotTaskLog } from '../../services/api'

export default function BotTaskLogs() {
  const [logs, setLogs] = useState<BotTaskLog[]>([])
  const [loading, setLoading] = useState(false)
  const [pagination, setPagination] = useState({ page: 1, limit: 50, total: 0 })
  const [filters, setFilters] = useState({
    taskType: '',
    status: '',
  })
  const [expandedLog, setExpandedLog] = useState<number | null>(null)

  const fetchLogs = async (page = 1, limit = 50) => {
    setLoading(true)
    try {
      const res = await botApi.getLogs({
        page,
        limit,
        taskType: filters.taskType || undefined,
        status: filters.status || undefined,
      })
      setLogs(res.items)
      setPagination({ page: res.page, limit: res.limit, total: res.total })
    } catch (error) {
      console.error('Failed to fetch logs:', error)
      alert('获取日志失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLogs()
  }, [filters])

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'SUCCESS':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-600">
            <CheckCircle className="w-3 h-3" />
            成功
          </span>
        )
      case 'FAILED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-600">
            <XCircle className="w-3 h-3" />
            失败
          </span>
        )
      case 'SKIPPED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-600">
            <AlertCircle className="w-3 h-3" />
            跳过
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-50 text-gray-600">
            {status}
          </span>
        )
    }
  }

  const getTaskTypeLabel = (taskType: string) => {
    switch (taskType) {
      case 'LUCKY_DRAW':
        return '一元购'
      default:
        return taskType
    }
  }

  const toggleExpand = (logId: number) => {
    setExpandedLog(expandedLog === logId ? null : logId)
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <ScrollText className="w-8 h-8 text-indigo-600" />
            <h1 className="text-2xl font-bold text-gray-900">Bot 执行日志</h1>
          </div>
          <button
            onClick={() => fetchLogs(pagination.page, pagination.limit)}
            disabled={loading}
            className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            刷新
          </button>
        </div>
        <p className="text-gray-600 text-sm">
          查看机器人任务的执行记录和详细信息
        </p>
      </div>

      {/* Filters */}
      <div className="mb-4 flex items-center gap-4 flex-wrap">
        <span className="text-sm text-gray-600">筛选:</span>

        {/* Task Type Filter */}
        <select
          value={filters.taskType}
          onChange={(e) => setFilters({ ...filters, taskType: e.target.value })}
          className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">全部类型</option>
          <option value="LUCKY_DRAW">一元购</option>
        </select>

        {/* Status Filter */}
        <select
          value={filters.status}
          onChange={(e) => setFilters({ ...filters, status: e.target.value })}
          className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">全部状态</option>
          <option value="SUCCESS">成功</option>
          <option value="FAILED">失败</option>
          <option value="SKIPPED">跳过</option>
        </select>

        {/* Stats */}
        <div className="ml-auto text-sm text-gray-500">
          共 {pagination.total} 条记录
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="w-10 h-10 border-4 border-gray-200 border-t-indigo-500 rounded-full animate-spin"></div>
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            暂无日志记录
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="px-5 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    时间
                  </th>
                  <th className="px-5 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    类型
                  </th>
                  <th className="px-5 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    任务ID
                  </th>
                  <th className="px-5 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    机器人
                  </th>
                  <th className="px-5 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    状态
                  </th>
                  <th className="px-5 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    耗时
                  </th>
                  <th className="px-5 py-4 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    详情
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {logs.map((log) => (
                  <>
                    <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-4 whitespace-nowrap text-sm text-gray-700">
                        {new Date(log.createdAt).toLocaleString('zh-CN')}
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap text-sm">
                        {getTaskTypeLabel(log.taskType)}
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap text-sm font-mono text-gray-600">
                        #{log.taskId}
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap text-sm font-mono text-gray-600">
                        {log.botUserId.slice(0, 8)}...
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap">
                        {getStatusBadge(log.status)}
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap text-sm text-gray-600">
                        {log.executionTimeMs ? `${log.executionTimeMs}ms` : '-'}
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap text-center">
                        <button
                          onClick={() => toggleExpand(log.id)}
                          className="text-indigo-600 hover:text-indigo-800"
                        >
                          {expandedLog === log.id ? (
                            <ChevronUp className="w-5 h-5 mx-auto" />
                          ) : (
                            <ChevronDown className="w-5 h-5 mx-auto" />
                          )}
                        </button>
                      </td>
                    </tr>
                    {expandedLog === log.id && (
                      <tr className="bg-gray-50">
                        <td colSpan={7} className="px-5 py-4">
                          <div className="space-y-3">
                            {/* Details */}
                            {log.details && Object.keys(log.details).length > 0 && (
                              <div>
                                <h4 className="text-sm font-medium text-gray-700 mb-2">执行详情</h4>
                                <pre className="bg-white p-3 rounded border border-gray-200 text-xs overflow-x-auto">
                                  {JSON.stringify(log.details, null, 2)}
                                </pre>
                              </div>
                            )}

                            {/* Error Message */}
                            {log.errorMessage && (
                              <div>
                                <h4 className="text-sm font-medium text-red-700 mb-2">错误信息</h4>
                                <div className="bg-red-50 p-3 rounded border border-red-200 text-sm text-red-800">
                                  {log.errorMessage}
                                </div>
                              </div>
                            )}

                            {/* Raw Data */}
                            <div>
                              <h4 className="text-sm font-medium text-gray-700 mb-2">原始数据</h4>
                              <div className="grid grid-cols-2 gap-2 text-xs">
                                <div className="bg-white p-2 rounded border">
                                  <span className="text-gray-500">Log ID:</span> {log.id}
                                </div>
                                <div className="bg-white p-2 rounded border">
                                  <span className="text-gray-500">Task ID:</span> {log.taskId}
                                </div>
                                <div className="bg-white p-2 rounded border">
                                  <span className="text-gray-500">Bot User:</span> {log.botUserId}
                                </div>
                                <div className="bg-white p-2 rounded border">
                                  <span className="text-gray-500">Task Type:</span> {log.taskType}
                                </div>
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {pagination.total > 0 && (
        <div className="mt-4 flex justify-between items-center">
          <span className="text-gray-500">共 {pagination.total} 条记录</span>
          <div className="flex space-x-2">
            <button
              onClick={() => fetchLogs(pagination.page - 1, pagination.limit)}
              disabled={pagination.page <= 1}
              className="px-3 py-1 border rounded disabled:opacity-50"
            >
              上一页
            </button>
            <span className="px-3 py-1">
              {pagination.page} / {Math.ceil(pagination.total / pagination.limit)}
            </span>
            <button
              onClick={() => fetchLogs(pagination.page + 1, pagination.limit)}
              disabled={pagination.page >= Math.ceil(pagination.total / pagination.limit)}
              className="px-3 py-1 border rounded disabled:opacity-50"
            >
              下一页
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
