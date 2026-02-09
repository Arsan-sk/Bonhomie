/**
 * StallDashboard - Dashboard for stall owners
 * Tabs: Payments, Menu, Sales, Settings
 */

import { useState } from 'react'
import { CreditCard, UtensilsCrossed, TrendingUp, Settings, RefreshCw, CheckCircle, XCircle, Clock } from 'lucide-react'
import { useZaikaStall } from '../../hooks/useZaika'
import { formatCurrency, STATUS_COLORS } from '../../utils/zaikaConfig'
import MenuManagement from '../../components/zaika/MenuManagement'
import SalesStats from '../../components/zaika/SalesStats'
import StallSettings from '../../components/zaika/StallSettings'

export default function StallDashboard({ stallData: initialStall }) {
  const [activeTab, setActiveTab] = useState('payments')
  
  // Pass the stall ID from initialStall to useZaikaStall
  const stallId = initialStall?.stall_id || initialStall?.id
  const { 
    stall, 
    menuItems: menu, 
    pendingRequests,
    transactions: stallTransactions,
    loading: stallLoading, 
    refresh: refreshStall, 
    updateStallName,
    updateStallStatus,
    acceptTransaction: completeTransaction, 
    rejectTransaction
  } = useZaikaStall(stallId)

  const currentStall = stall || initialStall

  // Calculate pending count - ensure array exists
  const pendingCount = (pendingRequests || []).filter(t => t.status === 'pending').length

  const tabs = [
    { id: 'payments', name: 'Payments', icon: CreditCard, count: pendingCount },
    { id: 'menu', name: 'Menu', icon: UtensilsCrossed, count: (menu || []).length },
    { id: 'sales', name: 'Sales', icon: TrendingUp, count: null },
    { id: 'settings', name: 'Settings', icon: Settings, count: null },
  ]

  const handleCompletePayment = async (transactionId) => {
    if (window.confirm('Confirm that you have served this order?')) {
      await completeTransaction(transactionId)
    }
  }

  const handleRejectPayment = async (transactionId) => {
    if (window.confirm('Reject this order? The amount will be refunded to the buyer.')) {
      await rejectTransaction(transactionId)
    }
  }

  // Group transactions by status - ensure arrays exist
  const allTransactions = stallTransactions || []
  const pendingTransactions = allTransactions.filter(t => t.status === 'pending')
  const completedTransactions = allTransactions.filter(t => t.status === 'completed')
  const rejectedTransactions = allTransactions.filter(t => t.status === 'rejected')

  if (!currentStall) {
    return (
      <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
        <UtensilsCrossed className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-500">Your stall is being set up...</p>
        <p className="text-sm text-gray-400">Please refresh the page in a moment</p>
      </div>
    )
  }

  return (
    <div>
      {/* Stall Info Header */}
      <div className="bg-gradient-to-br from-orange-500 to-amber-500 rounded-2xl p-6 text-white shadow-lg mb-6">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-2xl font-bold">{currentStall.stall_name}</h2>
            <p className="text-orange-100 mt-1">
              Status: <span className="font-semibold">{currentStall.is_active ? 'Open' : 'Closed'}</span>
            </p>
          </div>
          <div className="text-right">
            <p className="text-orange-100 text-sm">Total Sales</p>
            <p className="text-3xl font-bold">{formatCurrency(currentStall.total_sales || 0)}</p>
          </div>
        </div>
      </div>

      {/* Responsive Tab Navigation - Square on mobile, horizontal on desktop */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-1.5 mb-6">
        <div className="flex justify-center md:justify-start md:inline-flex gap-1">
          {tabs.map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`relative flex flex-col md:flex-row items-center justify-center gap-1 md:gap-2 min-w-[60px] md:min-w-0 px-2 md:px-5 py-2 md:py-2.5 rounded-lg font-medium transition-all ${
                  isActive
                    ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-md'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <div className={`p-1.5 md:p-0 rounded-md md:rounded-none ${
                  isActive ? 'bg-white/20 md:bg-transparent' : 'bg-gray-100 md:bg-transparent'
                }`}>
                  <Icon className={`h-4 w-4 ${isActive ? 'text-white' : 'md:text-gray-500'}`} />
                </div>
                <span className="text-[10px] md:text-sm font-medium">{tab.name}</span>
                {tab.count !== null && tab.count > 0 && (
                  <span className={`absolute -top-1 -right-1 md:static md:ml-1 min-w-[18px] md:min-w-0 h-[18px] md:h-auto px-1.5 md:px-2 md:py-0.5 flex items-center justify-center text-[10px] md:text-xs font-bold rounded-full ${
                    isActive ? 'bg-white text-orange-600 md:bg-white/20 md:text-white' : 'bg-orange-500 text-white md:bg-orange-100 md:text-orange-600'
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Tab Content */}
      <div className="animate-fadeIn">
        {/* Payments Tab */}
        {activeTab === 'payments' && (
          <div className="space-y-6">
            {/* Pending Payments */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <Clock className="h-5 w-5 text-amber-500" />
                  Pending Orders ({pendingCount})
                </h3>
                <button
                  onClick={refreshStall}
                  className="flex items-center gap-1 text-gray-500 hover:text-gray-700 transition-colors"
                >
                  <RefreshCw className="h-4 w-4" />
                  Refresh
                </button>
              </div>

              {stallLoading ? (
                <p className="text-gray-500 text-center py-4">Loading...</p>
              ) : pendingTransactions.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No pending orders</p>
              ) : (
                <div className="space-y-3">
                  {pendingTransactions.map((transaction) => (
                    <div
                      key={transaction.id}
                      className="flex items-center justify-between p-4 bg-amber-50 border border-amber-200 rounded-lg"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-bold text-lg text-orange-600">{formatCurrency(transaction.total_amount)}</p>
                          <span className="text-gray-400">•</span>
                          <p className="text-sm font-medium text-gray-700">
                            {transaction.item_name || 'Unknown Item'}
                          </p>
                          {transaction.quantity > 1 && (
                            <span className="text-xs bg-gray-200 px-2 py-0.5 rounded-full">
                              x{transaction.quantity}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-1.5 text-xs text-gray-500">
                          <span className="font-medium text-gray-700">{transaction.buyer?.full_name || 'Unknown'}</span>
                          {transaction.buyer?.roll_number && (
                            <>
                              <span>•</span>
                              <span className="font-mono bg-gray-100 px-1.5 py-0.5 rounded">{transaction.buyer.roll_number}</span>
                            </>
                          )}
                          <span>•</span>
                          <span>{new Date(transaction.created_at).toLocaleTimeString()}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleCompletePayment(transaction.id)}
                          className="p-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors"
                          title="Complete Order"
                        >
                          <CheckCircle className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => handleRejectPayment(transaction.id)}
                          className="p-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
                          title="Reject Order"
                        >
                          <XCircle className="h-5 w-5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recent Completed */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2 mb-4">
                <CheckCircle className="h-5 w-5 text-green-500" />
                Recent Completed ({completedTransactions.length})
              </h3>
              
              {completedTransactions.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No completed orders yet</p>
              ) : (
                <div className="space-y-2">
                  {completedTransactions.slice(0, 10).map((transaction) => (
                    <div
                      key={transaction.id}
                      className="flex items-center justify-between p-3 bg-green-50 border border-green-100 rounded-lg"
                    >
                      <div>
                        <p className="font-medium text-gray-900">
                          {formatCurrency(transaction.total_amount)}
                          <span className="text-sm text-gray-500 ml-2">
                            {transaction.item_name || 'Unknown Item'}
                            {transaction.quantity > 1 && ` x${transaction.quantity}`}
                          </span>
                        </p>
                        <p className="text-xs text-gray-500">
                          {transaction.buyer?.full_name || 'Unknown'} 
                          {transaction.buyer?.roll_number && ` (${transaction.buyer.roll_number})`}
                          {' • '}
                          {new Date(transaction.created_at).toLocaleString()}
                        </p>
                      </div>
                      <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">
                        Completed
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Menu Tab */}
        {activeTab === 'menu' && (
          <MenuManagement stall={currentStall} menu={menu || []} onUpdate={refreshStall} />
        )}

        {/* Sales Tab */}
        {activeTab === 'sales' && (
          <SalesStats stall={currentStall} transactions={allTransactions} menuItemsCount={(menu || []).length} />
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <StallSettings stall={currentStall} onUpdate={async (updates) => {
            if (updates.stall_name) {
              await updateStallName(updates.stall_name)
            }
            if (typeof updates.is_active === 'boolean') {
              await updateStallStatus(updates.is_active)
            }
            await refreshStall()
          }} />
        )}
      </div>
    </div>
  )
}
