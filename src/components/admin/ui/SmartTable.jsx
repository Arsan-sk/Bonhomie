import { ChevronDown, ChevronsUpDown, Loader2, Search } from 'lucide-react'
import { useState } from 'react'

export default function SmartTable({
    columns,
    data,
    loading,
    onRowClick,
    searchable = false,
    onSearchChange,
    actions,
    selectable = false,
    selectedIds = [],
    onSelectionChange
}) {
    const [sortConfig, setSortConfig] = useState(null)

    // Basic Sorting
    const sortedData = [...(data || [])].sort((a, b) => {
        if (!sortConfig) return 0
        const { key, direction } = sortConfig
        if (a[key] < b[key]) return direction === 'asc' ? -1 : 1
        if (a[key] > b[key]) return direction === 'asc' ? 1 : -1
        return 0
    })

    const requestSort = (key) => {
        let direction = 'asc'
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc'
        }
        setSortConfig({ key, direction })
    }

    const toggleAll = () => {
        if (!onSelectionChange) return
        if (selectedIds.length === sortedData.length) {
            onSelectionChange([])
        } else {
            onSelectionChange(sortedData.map(r => r.id))
        }
    }

    const toggleRow = (id) => {
        if (!onSelectionChange) return
        if (selectedIds.includes(id)) {
            onSelectionChange(selectedIds.filter(sid => sid !== id))
        } else {
            onSelectionChange([...selectedIds, id])
        }
    }

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            {/* Header / Actions */}
            {(searchable || actions) && (
                <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between gap-4">
                    {searchable && (
                        <div className="relative max-w-sm flex-1">
                            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                <Search className="h-4 w-4 text-gray-400" />
                            </div>
                            <input
                                type="text"
                                className="block w-full rounded-md border-0 py-1.5 pl-10 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                                placeholder="Search records..."
                                onChange={(e) => onSearchChange && onSearchChange(e.target.value)}
                            />
                        </div>
                    )}
                    {actions && <div className="flex gap-2">{actions}</div>}
                </div>
            )}

            {/* Table */}
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            {selectable && (
                                <th scope="col" className="px-6 py-3 w-4">
                                    <input
                                        type="checkbox"
                                        className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-600"
                                        checked={sortedData.length > 0 && selectedIds.length === sortedData.length}
                                        onChange={toggleAll}
                                    />
                                </th>
                            )}
                            {columns.map((col, idx) => (
                                <th
                                    key={idx}
                                    scope="col"
                                    className={`px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider ${col.sortable ? 'cursor-pointer hover:bg-gray-100' : ''}`}
                                    onClick={() => col.sortable && requestSort(col.key)}
                                >
                                    <div className="flex items-center gap-1">
                                        {col.title}
                                        {col.sortable && <ChevronsUpDown className="h-3 w-3 text-gray-400" />}
                                    </div>
                                </th>
                            ))}
                            {onRowClick && <th scope="col" className="relative px-6 py-3"><span className="sr-only">Actions</span></th>}
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {loading ? (
                            <tr>
                                <td colSpan={columns.length + (onRowClick ? 1 : 0) + (selectable ? 1 : 0)} className="px-6 py-12 text-center">
                                    <Loader2 className="h-8 w-8 text-indigo-600 animate-spin mx-auto" />
                                    <p className="mt-2 text-sm text-gray-500">Loading data...</p>
                                </td>
                            </tr>
                        ) : sortedData.length === 0 ? (
                            <tr>
                                <td colSpan={columns.length + (onRowClick ? 1 : 0) + (selectable ? 1 : 0)} className="px-6 py-12 text-center">
                                    <div className="mx-auto h-12 w-12 text-gray-400">
                                        <Search className="h-full w-full opacity-20" />
                                    </div>
                                    <h3 className="mt-2 text-sm font-semibold text-gray-900">No data found</h3>
                                    <p className="mt-1 text-sm text-gray-500">Get started by creating a new record.</p>
                                </td>
                            </tr>
                        ) : (
                            sortedData.map((row, rowIdx) => (
                                <tr
                                    key={row.id || rowIdx}
                                    onClick={(e) => {
                                        if (e.target.type !== 'checkbox' && onRowClick) onRowClick(row)
                                    }}
                                    className={`transition-colors ${onRowClick ? 'cursor-pointer hover:bg-gray-50' : ''}`}
                                >
                                    {selectable && (
                                        <td className="px-6 py-4 whitespace-nowrap w-4">
                                            <input
                                                type="checkbox"
                                                className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-600"
                                                checked={selectedIds.includes(row.id)}
                                                onChange={() => toggleRow(row.id)}
                                                onClick={(e) => e.stopPropagation()}
                                            />
                                        </td>
                                    )}
                                    {columns.map((col, colIdx) => (
                                        <td key={colIdx} className="px-6 py-4 text-sm text-gray-900">
                                            {col.render ? col.render(row) : row[col.key]}
                                        </td>
                                    ))}
                                    {onRowClick && (
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <span className="text-indigo-600 hover:text-indigo-900">Edit</span>
                                        </td>
                                    )}
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
