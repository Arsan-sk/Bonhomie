/**
 * AdminZaikaDashboard - Admin dashboard for managing Zaika food festival
 * Tabs: Leaderboard, Top-up Approvals, Transactions, Settings
 */

import { useState, useEffect } from 'react'
import { Trophy, CreditCard, Receipt, Settings, RefreshCw, CheckCircle, XCircle, Clock, Store, TrendingUp, Users, DollarSign, History, Wallet, Power, AlertTriangle } from 'lucide-react'
import { useZaikaLeaderboard, useZaikaAdmin } from '../../hooks/useZaika'
import { formatCurrency, STATUS_COLORS } from '../../utils/zaikaConfig'
import { supabase } from '../../lib/supabase'

export default function AdminZaikaDashboard() {
  const [activeTab, setActiveTab] = useState('leaderboard')
  const [stallActionLoading, setStallActionLoading] = useState(false)
  
  const { leaderboard, loading: leaderboardLoading, refresh: refreshLeaderboard } = useZaikaLeaderboard()
  const { pendingTopups, topupHistory, loading: adminLoading, approveTopup, rejectTopup, closeAllStalls, openAllStalls, refresh: refreshAdmin } = useZaikaAdmin()

  // Debug log to see what data we're getting
  console.log('AdminZaikaDashboard - pendingTopups:', pendingTopups, 'loading:', adminLoading)

  const [stats, setStats] = useState({
    totalStalls: 0,
    totalSales: 0,
    totalApproved: 0,
    totalWallets: 0,
    pendingTopups: 0
  })

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    try {
      // Get total stalls
      const { count: stallCount } = await supabase
        .from('zaika_stalls')
        .select('*', { count: 'exact', head: true })

      // Get total sales from completed transactions
      const { data: salesData } = await supabase
        .from('zaika_transactions')
        .select('total_amount')
        .eq('status', 'completed')
      
      const totalSales = salesData?.reduce((acc, t) => acc + (t.total_amount || 0), 0) || 0

      // Get total approved amount
      const { data: approvedData } = await supabase
        .from('zaika_topup_requests')
        .select('amount')
        .eq('status', 'approved')
      
      const totalApproved = approvedData?.reduce((acc, t) => acc + (t.amount || 0), 0) || 0

      // Get wallet count
      const { count: walletCount } = await supabase
        .from('zaika_wallets')
        .select('*', { count: 'exact', head: true })

      // Get pending topups
      const { count: pendingCount } = await supabase
        .from('zaika_topup_requests')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending')

      setStats({
        totalStalls: stallCount || 0,
        totalSales: totalSales,
        totalApproved: totalApproved,
        totalWallets: walletCount || 0,
        pendingTopups: pendingCount || 0
      })
    } catch (err) {
      console.error('Error fetching stats:', err)
    }
  }

  const handleApproveTopup = async (requestId) => {
    if (window.confirm('Approve this top-up request? Amount will be added to user wallet.')) {
      await approveTopup(requestId)
      fetchStats()
    }
  }

  const handleRejectTopup = async (requestId) => {
    if (window.confirm('Reject this top-up request?')) {
      await rejectTopup(requestId)
      fetchStats()
    }
  }

  const handleCloseAllStalls = async () => {
    if (window.confirm('⚠️ CLOSE ALL STALLS?\n\nThis will immediately close ALL stalls. Students will not be able to place orders until stalls are reopened.\n\nAre you sure you want to continue?')) {
      setStallActionLoading(true)
      try {
        await closeAllStalls()
        alert('✅ All stalls have been closed')
        refreshLeaderboard()
        fetchStats()
      } catch (err) {
        console.error('Error closing stalls:', err)
        alert('❌ Failed to close stalls: ' + err.message)
      } finally {
        setStallActionLoading(false)
      }
    }
  }

  const handleOpenAllStalls = async () => {
    if (window.confirm('Open all stalls?\n\nThis will reopen ALL stalls, allowing students to place orders.\n\nAre you sure?')) {
      setStallActionLoading(true)
      try {
        await openAllStalls()
        alert('✅ All stalls have been opened')
        refreshLeaderboard()
        fetchStats()
      } catch (err) {
        console.error('Error opening stalls:', err)
        alert('❌ Failed to open stalls: ' + err.message)
      } finally {
        setStallActionLoading(false)
      }
    }
  }

  const tabs = [
    { id: 'leaderboard', name: 'Leaderboard', icon: Trophy, count: leaderboard.length },
    { id: 'topups', name: 'Top-up Approvals', icon: CreditCard, count: pendingTopups.length },
    { id: 'overview', name: 'Overview', icon: TrendingUp, count: null },
  ]

  const statCards = [
    { name: 'Total Stalls', value: stats.totalStalls, icon: Store, color: 'bg-orange-100 text-orange-600' },
    { name: 'Pending Top-ups', value: stats.pendingTopups, icon: Clock, color: stats.pendingTopups > 0 ? 'bg-amber-100 text-amber-600' : 'bg-gray-100 text-gray-600', subtitle: 'Awaiting approval' },
    { name: 'Total Approved', value: formatCurrency(stats.totalApproved), icon: Wallet, color: 'bg-blue-100 text-blue-600', subtitle: 'Cash collected' },
    { name: 'Total Sales', value: formatCurrency(stats.totalSales), icon: DollarSign, color: 'bg-green-100 text-green-600', subtitle: 'Revenue generated' },
  ]

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Zaika Management</h1>
        <p className="text-gray-600">Manage the food festival wallet system</p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        {statCards.map((stat) => {
          const Icon = stat.icon
          return (
            <div key={stat.name} className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${stat.color}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">{stat.name}</p>
                  <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                  {stat.subtitle && (
                    <p className="text-xs text-gray-400">{stat.subtitle}</p>
                  )}
                </div>
              </div>
            </div>
          )
        })}
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
        {/* Leaderboard Tab */}
        {activeTab === 'leaderboard' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Trophy className="h-5 w-5 text-amber-500" />
                Sales Leaderboard
              </h3>
              <button
                onClick={refreshLeaderboard}
                className="flex items-center gap-1 text-gray-500 hover:text-gray-700 transition-colors"
              >
                <RefreshCw className="h-4 w-4" />
                Refresh
              </button>
            </div>

            {leaderboardLoading ? (
              <p className="text-center text-gray-500 py-8">Loading...</p>
            ) : leaderboard.length === 0 ? (
              <div className="text-center py-8">
                <Trophy className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">No sales yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {leaderboard.map((stall, index) => (
                  <div
                    key={stall.stall_id}
                    className={`flex items-center gap-4 p-4 rounded-lg ${
                      index === 0 
                        ? 'bg-gradient-to-r from-amber-50 to-yellow-50 border-2 border-amber-200' 
                        : index === 1 
                          ? 'bg-gray-50 border border-gray-200'
                          : index === 2
                            ? 'bg-orange-50/50 border border-orange-100'
                            : 'bg-white border border-gray-100'
                    }`}
                  >
                    <span className={`w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold ${
                      index === 0 
                        ? 'bg-amber-400 text-white' 
                        : index === 1 
                          ? 'bg-gray-400 text-white'
                          : index === 2
                            ? 'bg-orange-400 text-white'
                            : 'bg-gray-100 text-gray-600'
                    }`}>
                      {index + 1}
                    </span>
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900">{stall.stall_name}</p>
                      <p className="text-sm text-gray-500">{stall.team_name}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold text-green-600">{formatCurrency(stall.total_sales)}</p>
                      <p className="text-xs text-gray-500">
                        {stall.is_active 
                          ? <span className="text-green-600">● Open</span> 
                          : <span className="text-gray-400">○ Closed</span>
                        }
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Top-up Approvals Tab */}
        {activeTab === 'topups' && (
          <div className="space-y-6">
            {/* Pending Requests */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <Clock className="h-5 w-5 text-amber-500" />
                  Pending Top-up Requests ({pendingTopups.length})
                </h3>
                <button
                  onClick={refreshAdmin}
                  className="flex items-center gap-1 text-gray-500 hover:text-gray-700 transition-colors"
                >
                  <RefreshCw className="h-4 w-4" />
                  Refresh
                </button>
              </div>

              {adminLoading ? (
                <p className="text-center text-gray-500 py-8">Loading...</p>
              ) : pendingTopups.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle className="h-12 w-12 text-green-300 mx-auto mb-3" />
                  <p className="text-gray-500">All caught up!</p>
                  <p className="text-sm text-gray-400">No pending top-up requests</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {pendingTopups.map((request) => (
                    <div
                      key={request.id}
                      className="flex items-center justify-between p-4 bg-amber-50 border border-amber-200 rounded-lg"
                    >
                      <div className="flex items-center gap-4">
                        <div className="p-2 bg-amber-100 rounded-lg">
                          <Clock className="h-5 w-5 text-amber-600" />
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">{request.profile?.full_name || 'Unknown User'}</p>
                          <div className="flex items-center gap-2 text-sm text-gray-500">
                            {request.profile?.roll_number && (
                              <span className="font-medium text-gray-700">{request.profile.roll_number}</span>
                            )}
                            {request.profile?.roll_number && request.profile?.college_email && (
                              <span>•</span>
                            )}
                            <span>{request.profile?.college_email || 'No email'}</span>
                          </div>
                          <p className="text-xs text-gray-400 mt-1">
                            Requested: {new Date(request.created_at).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-2xl font-bold text-gray-900">
                          {formatCurrency(request.amount)}
                        </span>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleApproveTopup(request.id)}
                            className="p-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors"
                            title="Approve"
                          >
                            <CheckCircle className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => handleRejectTopup(request.id)}
                            className="p-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
                            title="Reject"
                          >
                            <XCircle className="h-5 w-5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Top-up History */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2 mb-4">
                <History className="h-5 w-5 text-gray-500" />
                Top-up History
              </h3>

              {!topupHistory || topupHistory.length === 0 ? (
                <div className="text-center py-8">
                  <History className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">No top-up history yet</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-3 px-2 text-sm font-medium text-gray-500">User</th>
                        <th className="text-left py-3 px-2 text-sm font-medium text-gray-500">Roll No.</th>
                        <th className="text-right py-3 px-2 text-sm font-medium text-gray-500">Amount</th>
                        <th className="text-center py-3 px-2 text-sm font-medium text-gray-500">Status</th>
                        <th className="text-right py-3 px-2 text-sm font-medium text-gray-500">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {topupHistory.map((request) => (
                        <tr key={request.id} className="hover:bg-gray-50">
                          <td className="py-3 px-2">
                            <p className="font-medium text-gray-900">{request.profile?.full_name || 'Unknown'}</p>
                          </td>
                          <td className="py-3 px-2">
                            <span className="text-sm text-gray-600 font-mono">{request.profile?.roll_number || '-'}</span>
                          </td>
                          <td className="py-3 px-2 text-right">
                            <span className="font-semibold text-gray-900">{formatCurrency(request.amount)}</span>
                          </td>
                          <td className="py-3 px-2 text-center">
                            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                              request.status === 'approved'
                                ? 'bg-green-100 text-green-700'
                                : 'bg-red-100 text-red-700'
                            }`}>
                              {request.status === 'approved' ? (
                                <CheckCircle className="h-3 w-3" />
                              ) : (
                                <XCircle className="h-3 w-3" />
                              )}
                              {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                            </span>
                          </td>
                          <td className="py-3 px-2 text-right text-sm text-gray-500">
                            {new Date(request.updated_at || request.created_at).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Stall Control Section */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2 mb-4">
                <Power className="h-5 w-5 text-orange-500" />
                Stall Control
              </h3>
              
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg mb-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-amber-900">Master Controls</p>
                    <p className="text-sm text-amber-700 mt-1">
                      Use these controls to close or open all stalls at once. When stalls are closed, students can still see the menu but cannot place orders.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={handleCloseAllStalls}
                  disabled={stallActionLoading}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-red-500 hover:bg-red-600 disabled:bg-red-300 text-white font-medium rounded-lg transition-colors"
                >
                  <Power className="h-5 w-5" />
                  {stallActionLoading ? 'Processing...' : 'Close All Stalls'}
                </button>
                <button
                  onClick={handleOpenAllStalls}
                  disabled={stallActionLoading}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-green-500 hover:bg-green-600 disabled:bg-green-300 text-white font-medium rounded-lg transition-colors"
                >
                  <Power className="h-5 w-5" />
                  {stallActionLoading ? 'Processing...' : 'Open All Stalls'}
                </button>
              </div>
            </div>

            {/* Overview Info */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">Zaika Overview</h3>
              
              <div className="space-y-6">
                <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
                  <h4 className="font-medium text-orange-900 mb-2">How it works</h4>
                  <ul className="text-sm text-orange-800 space-y-1.5">
                    <li>• Students add money to their digital wallet via cash at the counter</li>
                    <li>• Admin/Coordinators approve the top-up requests after receiving cash</li>
                    <li>• Students browse stalls and place orders using their wallet balance</li>
                    <li>• Stall owners receive and fulfill orders, marking them as complete</li>
                    <li>• The stall with highest total sales wins the competition</li>
                  </ul>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                    <h4 className="font-medium text-green-900 mb-2">Transaction Flow</h4>
                    <ol className="text-sm text-green-800 space-y-1 list-decimal list-inside">
                      <li>Buyer creates purchase order</li>
                      <li>Amount deducted from buyer wallet</li>
                      <li>Stall owner sees pending order</li>
                      <li>Stall owner completes or rejects</li>
                      <li>On reject: amount refunded to buyer</li>
                    </ol>
                  </div>

                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <h4 className="font-medium text-blue-900 mb-2">Top-up Flow</h4>
                    <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
                      <li>Student requests top-up amount</li>
                      <li>Student pays cash at counter</li>
                      <li>Admin approves the request</li>
                      <li>Amount credited to wallet</li>
                    </ol>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
