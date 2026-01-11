import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { Users, Calendar, Trophy, DollarSign, Activity } from 'lucide-react'
import StatCard from '../../components/admin/ui/StatCard'

export default function AdminDashboard() {
    const [stats, setStats] = useState({
        totalEvents: 0,
        activeRegistrations: 0,
        totalRevenue: 0,
        todaysEvents: 0,
        pendingRefunds: 0
    })
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetchStats()
    }, [])

    const fetchStats = async () => {
        try {
            const [eventsRes, regsRes, paymentsRes] = await Promise.all([
                supabase.from('events').select('*', { count: 'exact' }),
                supabase.from('registrations').select('*', { count: 'exact' }).eq('status', 'confirmed'),
                supabase.from('payments').select('amount').eq('status', 'confirmed')
            ])

            const revenue = paymentsRes.data?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;

            setStats({
                totalEvents: eventsRes.count || 0,
                activeRegistrations: regsRes.count || 0,
                totalRevenue: revenue,
                todaysEvents: 0,
                pendingRefunds: 0
            })
        } catch (error) {
            console.error('Error fetching admin stats:', error)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="space-y-8">
            {/* Header Section */}
            <div>
                <h2 className="text-2xl font-bold tracking-tight text-gray-900">Dashboard Overview</h2>
                <p className="mt-1 text-sm text-gray-500">Real-time insights into your fest operations.</p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard
                    title="Total Revenue"
                    value={`₹${stats.totalRevenue.toLocaleString()}`}
                    icon={DollarSign}
                    color="indigo"
                    trend="up"
                    trendValue="12.5% vs last week"
                />
                <StatCard
                    title="Active Registrations"
                    value={stats.activeRegistrations}
                    icon={Users}
                    color="emerald"
                    trend="up"
                    trendValue="43 today"
                />
                <StatCard
                    title="Total Events"
                    value={stats.totalEvents}
                    icon={Calendar}
                    color="amber"
                />
                <StatCard
                    title="Refund Requests"
                    value={stats.pendingRefunds}
                    icon={Trophy}
                    color="rose"
                    trend="neutral"
                    trendValue="No new requests"
                />
            </div>

            {/* Main Content Areas */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left: Charts Placeholder / Recent Activity */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-gray-900">Revenue Trend</h3>
                            <select className="text-sm border-gray-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500">
                                <option>Last 7 days</option>
                                <option>Last 30 days</option>
                            </select>
                        </div>
                        <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg border border-dashed border-gray-300">
                            <Activity className="h-8 w-8 text-gray-400" />
                            <span className="ml-2 text-sm text-gray-500">Chart Visualization Area</span>
                        </div>
                    </div>
                </div>

                {/* Right: Live Feed / Quick Actions */}
                <div className="space-y-6">
                    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">System Health</h3>
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-600">Database Status</span>
                                <span className="inline-flex items-center rounded-full bg-green-50 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">Operational</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-600">Payment Gateway</span>
                                <span className="inline-flex items-center rounded-full bg-green-50 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">Active</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-600">Email Service</span>
                                <span className="inline-flex items-center rounded-full bg-yellow-50 px-2 py-1 text-xs font-medium text-yellow-800 ring-1 ring-inset ring-yellow-600/20">Degraded</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
