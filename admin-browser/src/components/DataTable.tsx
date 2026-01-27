import type { ReactNode } from 'react'

interface Column<T> {
  key: keyof T | string
  label: string
  render?: (value: unknown, row: T) => ReactNode
}

interface DataTableProps<T> {
  columns: Column<T>[]
  data: T[]
  actions?: (row: T) => ReactNode
}

export default function DataTable<T extends { id: string | number }>({
  columns,
  data,
  actions,
}: DataTableProps<T>) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-100">
            {columns.map((col) => (
              <th
                key={String(col.key)}
                className="px-5 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                {col.label}
              </th>
            ))}
            {actions && <th className="px-5 py-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {data.length === 0 ? (
            <tr>
              <td colSpan={columns.length + (actions ? 1 : 0)} className="px-5 py-12 text-center text-gray-400">
                暂无数据
              </td>
            </tr>
          ) : (
            data.map((row) => (
              <tr key={row.id} className="hover:bg-gray-50 transition-colors">
                {columns.map((col) => (
                  <td key={String(col.key)} className="px-5 py-4 whitespace-nowrap text-sm text-gray-700">
                    {col.render
                      ? col.render((row as Record<string, unknown>)[col.key as string], row)
                      : String((row as Record<string, unknown>)[col.key as string] ?? '')}
                  </td>
                ))}
                {actions && (
                  <td className="px-5 py-4 whitespace-nowrap text-right space-x-1">
                    {actions(row)}
                  </td>
                )}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}
