/**
 * SalesStats - Component showing sales statistics for stall owners
 */

import { TrendingUp, DollarSign, ShoppingCart, UtensilsCrossed, Award, Clock } from 'lucide-react'
import { formatCurrency } from '../../utils/zaikaConfig'

export default function SalesStats({ stall, transactions = [], menuItemsCount = 0 }) {
  // Calculate stats
  const completedTransactions = transactions.filter(t => t.status === 'completed')
  const totalSales = stall?.total_sales || 0
  const totalOrders = completedTransactions.length
  const averageOrder = totalOrders > 0 ? totalSales / totalOrders : 0

  // Group by menu item for popularity - use item_name stored in transaction
  const itemCounts = {}
  completedTransactions.forEach(t => {
    const itemName = t.item_name || 'Other'
    itemCounts[itemName] = (itemCounts[itemName] || 0) + (t.quantity || 1)
  })
  const popularItems = Object.entries(itemCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)

  // Recent sales timeline
  const recentSales = completedTransactions.slice(0, 10)

  const stats = [
    {
      name: 'Total Sales',
      value: formatCurrency(totalSales),
      icon: DollarSign,
      color: 'bg-green-100 text-green-600'
    },
    {
      name: 'Orders Completed',
      value: totalOrders,
      icon: ShoppingCart,
      color: 'bg-blue-100 text-blue-600'
    },
    {
      name: 'Average Order',
      value: formatCurrency(averageOrder),
      icon: TrendingUp,
      color: 'bg-purple-100 text-purple-600'
    },
    {
      name: 'Menu Items',
      value: menuItemsCount,
      icon: UtensilsCrossed,
      color: 'bg-orange-100 text-orange-600'
    }
  ]

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <div
              key={stat.name}
              className="bg-white rounded-xl shadow-sm border border-gray-200 p-5"
            >
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${stat.color}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">{stat.name}</p>
                  <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Popular Items */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Award className="h-5 w-5 text-amber-500" />
            Popular Items
          </h3>
          {popularItems.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No sales data yet</p>
          ) : (
            <div className="space-y-3">
              {popularItems.map(([name, count], index) => (
                <div key={name} className="flex items-center gap-3">
                  <span className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold ${
                    index === 0 
                      ? 'bg-amber-100 text-amber-700' 
                      : index === 1 
                        ? 'bg-gray-200 text-gray-700'
                        : index === 2
                          ? 'bg-orange-100 text-orange-700'
                          : 'bg-gray-50 text-gray-600'
                  }`}>
                    {index + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">{name}</p>
                  </div>
                  <span className="text-gray-500 text-sm shrink-0">
                    {count} sold
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Sales */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Clock className="h-5 w-5 text-blue-500" />
            Recent Sales
          </h3>
          {recentSales.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No recent sales</p>
          ) : (
            <div className="space-y-3">
              {recentSales.map((sale) => (
                <div key={sale.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-gray-900 truncate">
                      {sale.item_name || 'Unknown Item'}
                      {sale.quantity > 1 && (
                        <span className="text-gray-500 text-sm ml-1">x{sale.quantity}</span>
                      )}
                    </p>
                    <p className="text-xs text-gray-500">
                      {sale.buyer?.full_name && `${sale.buyer.full_name} • `}
                      {new Date(sale.completed_at || sale.created_at).toLocaleTimeString()}
                    </p>
                  </div>
                  <span className="font-bold text-green-600 shrink-0 ml-3">
                    {formatCurrency(sale.total_amount || 0)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
