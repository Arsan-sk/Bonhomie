/**
 * BuyerDashboard - Dashboard for food buyers
 * Tabs: Wallet, Stalls, My Orders (Pending + History)
 */

import { useState, useMemo } from 'react'
import { Wallet, Store, Clock, Plus, RefreshCw, CheckCircle, XCircle, History, Search, X } from 'lucide-react'
import { useZaikaWallet, useZaikaStalls, useZaikaPurchase } from '../../hooks/useZaika'
import { formatCurrency, STATUS_COLORS } from '../../utils/zaikaConfig'
import AddMoneyModal from '../../components/zaika/AddMoneyModal'
import StallCard from '../../components/zaika/StallCard'
import PendingRequestCard from '../../components/zaika/PendingRequestCard'

export default function BuyerDashboard({ walletData: initialWallet }) {
  const [activeTab, setActiveTab] = useState('wallet')
  const [showAddMoneyModal, setShowAddMoneyModal] = useState(false)
  const [stallSearchQuery, setStallSearchQuery] = useState('')
  
  const { wallet, topupRequests, loading: walletLoading, createTopupRequest, refresh: refreshWallet } = useZaikaWallet()
  const { stalls, loading: stallsLoading, refresh: refreshStalls } = useZaikaStalls()
  const { pendingTransactions, orderHistory, cancelTransaction, refresh: refreshPending } = useZaikaPurchase()

  const currentWallet = wallet || initialWallet
  
  // Ensure arrays exist for safe access
  const stallsList = stalls || []
  const pendingList = pendingTransactions || []
  const historyList = orderHistory || []
  const topupsList = topupRequests || []

  // Filter stalls based on search query
  const filteredStalls = useMemo(() => {
    if (!stallSearchQuery.trim()) return stallsList
    
    const query = stallSearchQuery.toLowerCase().trim()
    return stallsList.filter(stall => {
      // Search by stall name
      if (stall.stall_name?.toLowerCase().includes(query)) return true
      // Search by team name (team leader)
      if (stall.team_name?.toLowerCase().includes(query)) return true
      // Search by stall number
      if (stall.stall_number?.toString().includes(query)) return true
      // Search by team leader roll number
      if (stall.team_leader_roll?.toLowerCase().includes(query)) return true
      // Search by any team member roll number
      if (stall.team_member_rolls?.some(roll => roll?.toLowerCase().includes(query))) return true
      // Search by food/menu item name
      if (stall.menu_items?.some(item => item.name?.toLowerCase().includes(query))) return true
      return false
    })
  }, [stallsList, stallSearchQuery])

  const tabs = [
    { id: 'wallet', name: 'My Wallet', icon: Wallet, count: null },
    { id: 'stalls', name: 'Food Stalls', icon: Store, count: stallsList.length },
    { id: 'pending', name: 'My Orders', icon: Clock, count: pendingList.length },
  ]

  const handleAddMoney = async (amount) => {
    await createTopupRequest(amount)
    setShowAddMoneyModal(false)
  }

  const handleCancelOrder = async (transactionId) => {
    if (window.confirm('Are you sure you want to cancel this order? The amount will be refunded to your wallet.')) {
      await cancelTransaction(transactionId)
    }
  }

  return (
    <div>
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
                {/* Mobile: icon in container, Desktop: just icon */}
                <div className={`p-1.5 md:p-0 rounded-md md:rounded-none ${
                  isActive ? 'bg-white/20 md:bg-transparent' : 'bg-gray-100 md:bg-transparent'
                }`}>
                  <Icon className={`h-4 w-4 ${isActive ? 'text-white' : 'md:text-gray-500'}`} />
                </div>
                <span className="text-[10px] md:text-sm font-medium">{tab.name}</span>
                {tab.count !== null && tab.count > 0 && (
                  <span className={`absolute -top-1 -right-1 md:static md:ml-1 min-w-[18px] md:min-w-0 h-[18px] md:h-auto px-1.5 md:px-2 md:py-0.5 flex items-center justify-center text-[10px] md:text-xs font-bold rounded-full ${
                    isActive ? 'bg-white text-orange-600 md:bg-white/20 md:text-white' : 'bg-orange-500 text-white md:bg-gray-200 md:text-gray-600'
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
        {/* Wallet Tab */}
        {activeTab === 'wallet' && (
          <div className="space-y-6">
            {/* Wallet Card */}
            <div className="bg-gradient-to-br from-orange-500 to-amber-500 rounded-2xl p-6 text-white shadow-lg">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <p className="text-orange-100 text-sm font-medium">Available Balance</p>
                  <h2 className="text-4xl font-bold mt-1">
                    {formatCurrency(currentWallet?.balance || 0)}
                  </h2>
                </div>
                <button
                  onClick={() => setShowAddMoneyModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  Add Money
                </button>
              </div>
              <div className="flex justify-between text-sm">
                <div>
                  <p className="text-orange-100">Total Spent</p>
                  <p className="font-semibold">{formatCurrency(currentWallet?.total_spent || 0)}</p>
                </div>
                <button
                  onClick={refreshWallet}
                  className="flex items-center gap-1 text-orange-100 hover:text-white transition-colors"
                >
                  <RefreshCw className="h-4 w-4" />
                  Refresh
                </button>
              </div>
            </div>

            {/* Top-up Requests */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Top-up History</h3>
              {walletLoading ? (
                <p className="text-gray-500 text-center py-4">Loading...</p>
              ) : topupsList.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No top-up requests yet</p>
              ) : (
                <div className="space-y-3">
                  {topupsList.map((request) => (
                    <div
                      key={request.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div>
                        <p className="font-medium text-gray-900">{formatCurrency(request.amount)}</p>
                        <p className="text-sm text-gray-500">
                          {new Date(request.created_at).toLocaleString()}
                        </p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[request.status]}`}>
                        {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Stalls Tab */}
        {activeTab === 'stalls' && (
          <div>
            {/* Header with Search */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Available Stalls</h3>
              <div className="flex items-center gap-3">
                {/* Search Bar */}
                <div className="relative flex-1 sm:w-72">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search stall, team, food or roll no..."
                    value={stallSearchQuery}
                    onChange={(e) => setStallSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-8 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                  {stallSearchQuery && (
                    <button
                      onClick={() => setStallSearchQuery('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 rounded-full"
                    >
                      <X className="h-3.5 w-3.5 text-gray-400" />
                    </button>
                  )}
                </div>
                <button
                  onClick={refreshStalls}
                  className="flex items-center gap-1 px-3 py-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <RefreshCw className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Search Results Info */}
            {stallSearchQuery && (
              <p className="text-sm text-gray-500 mb-3">
                {filteredStalls.length} stall{filteredStalls.length !== 1 ? 's' : ''} found for "{stallSearchQuery}"
              </p>
            )}

            {stallsLoading ? (
              <p className="text-gray-500 text-center py-8">Loading stalls...</p>
            ) : stallsList.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
                <Store className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No stalls available yet</p>
                <p className="text-sm text-gray-400">Check back later!</p>
              </div>
            ) : filteredStalls.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
                <Search className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No stalls match your search</p>
                <p className="text-sm text-gray-400">Try a different search term</p>
                <button
                  onClick={() => setStallSearchQuery('')}
                  className="mt-3 text-sm text-orange-500 hover:text-orange-600 font-medium"
                >
                  Clear search
                </button>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {filteredStalls.map((stall) => (
                  <StallCard key={stall.stall_id} stall={stall} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* My Orders Tab - Pending + History */}
        {activeTab === 'pending' && (
          <div className="space-y-6">
            {/* Pending Orders Section */}
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <Clock className="h-5 w-5 text-amber-500" />
                  Pending Orders
                  {pendingList.length > 0 && (
                    <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-sm rounded-full">
                      {pendingList.length}
                    </span>
                  )}
                </h3>
                <button
                  onClick={refreshPending}
                  className="flex items-center gap-1 text-gray-500 hover:text-gray-700 transition-colors"
                >
                  <RefreshCw className="h-4 w-4" />
                  Refresh
                </button>
              </div>
              {pendingList.length === 0 ? (
                <div className="text-center py-8 bg-white rounded-xl border border-gray-200">
                  <Clock className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">No pending orders</p>
                  <p className="text-sm text-gray-400">Your active orders will appear here</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {pendingList.map((transaction) => (
                    <PendingRequestCard
                      key={transaction.id}
                      transaction={transaction}
                      onCancel={() => handleCancelOrder(transaction.id)}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Order History Section */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2 mb-4">
                <History className="h-5 w-5 text-gray-500" />
                Order History
              </h3>
              {historyList.length === 0 ? (
                <div className="text-center py-8 bg-white rounded-xl border border-gray-200">
                  <History className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">No order history yet</p>
                  <p className="text-sm text-gray-400">Your completed orders will appear here</p>
                </div>
              ) : (
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <div className="divide-y divide-gray-100">
                    {historyList.map((order) => (
                      <div key={order.id} className="p-4 hover:bg-gray-50 transition-colors">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium text-gray-900">
                                {order.item_name || 'Unknown Item'}
                              </span>
                              {order.quantity > 1 && (
                                <span className="text-xs bg-gray-100 px-1.5 py-0.5 rounded">
                                  x{order.quantity}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-sm text-gray-500">
                              <span>{order.stall?.stall_name || 'Stall'}</span>
                              {order.stall?.stall_number && (
                                <>
                                  <span>•</span>
                                  <span className="text-xs bg-orange-50 text-orange-600 px-1.5 py-0.5 rounded">
                                    #{order.stall.stall_number}
                                  </span>
                                </>
                              )}
                            </div>
                            <p className="text-xs text-gray-400 mt-1">
                              {new Date(order.completed_at || order.created_at).toLocaleString()}
                            </p>
                          </div>
                          <div className="text-right shrink-0 ml-4">
                            <p className="font-bold text-gray-900">{formatCurrency(order.total_amount || 0)}</p>
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium mt-1 ${
                              order.status === 'completed'
                                ? 'bg-green-100 text-green-700'
                                : order.status === 'cancelled'
                                  ? 'bg-gray-100 text-gray-600'
                                  : 'bg-red-100 text-red-700'
                            }`}>
                              {order.status === 'completed' && <CheckCircle className="h-3 w-3" />}
                              {order.status === 'rejected' && <XCircle className="h-3 w-3" />}
                              {order.status === 'cancelled' && <XCircle className="h-3 w-3" />}
                              {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Add Money Modal */}
      <AddMoneyModal
        isOpen={showAddMoneyModal}
        onClose={() => setShowAddMoneyModal(false)}
        onSubmit={handleAddMoney}
      />
    </div>
  )
}
