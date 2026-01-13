import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { TrendingUp, Users, Award, DollarSign, Calendar, Activity } from 'lucide-react'

export default function AdminAnalytics({ coordinatorFilter = null, eventIdFilter = null }) {
    const [activeTab, setActiveTab] = useState('participation') // 'participation' or 'payment'
    const [loading, setLoading] = useState(true)
    const [selectedEvent, setSelectedEvent] = useState(eventIdFilter || null) // null = global, event_id = scoped
    const [events, setEvents] = useState([])

    // Participation Stats
    const [stats, setStats] = useState({
        totalRegistrations: 0,
        genderBreakdown: { male: 0, female: 0, other: 0 },
        departmentBreakdown: {},
        eventPopularity: []
    })

    // Payment Stats
    const [paymentStats, setPaymentStats] = useState({
        totalRevenue: 0,
        eventRevenue: [],
        paymentModeBreakdown: { cash: 0, hybrid: 0, online: 0 }
    })

    useEffect(() => {
        fetchEvents()
        fetchParticipationStats()
        fetchPaymentStats()
    }, [selectedEvent])

    const fetchEvents = async () => {
        let query = supabase.from('events').select('id, name').order('name')

        // Filter for coordinator's assigned events
        if (coordinatorFilter && coordinatorFilter.length > 0) {
            query = query.in('id', coordinatorFilter)
        }

        const { data } = await query
        setEvents(data || [])
    }

    const fetchParticipationStats = async () => {
        try {
            setLoading(true)

            // Build query
            let query = supabase
                .from('registrations')
                .select(`
                    id,
                    status,
                    profile:profiles(gender, department),
                    event:events(id, name)
                `)

            if (selectedEvent) {
                query = query.eq('event_id', selectedEvent)
            }

            const { data, error } = await query

            if (error) throw error

            // Calculate stats with status breakdown
            const genderBreakdown = { male: 0, female: 0, other: 0 }
            const departmentBreakdown = {}
            const eventCounts = {}
            const statusBreakdown = { confirmed: 0, pending: 0, rejected: 0 }

            data?.forEach(reg => {
                // Status count
                const status = reg.status || 'pending'
                statusBreakdown[status] = (statusBreakdown[status] || 0) + 1

                // Gender
                const gender = reg.profile?.gender?.toLowerCase() || 'other'
                genderBreakdown[gender] = (genderBreakdown[gender] || 0) + 1

                // Department
                const dept = reg.profile?.department || 'Unknown'
                departmentBreakdown[dept] = (departmentBreakdown[dept] || 0) + 1

                // Event popularity
                if (!selectedEvent && reg.event) {
                    eventCounts[reg.event.name] = (eventCounts[reg.event.name] || 0) + 1
                }
            })

            setStats({
                totalRegistrations: data?.length || 0,
                statusBreakdown,
                genderBreakdown,
                departmentBreakdown,
                eventPopularity: Object.entries(eventCounts)
                    .map(([name, count]) => ({ name, count }))
                    .sort((a, b) => b.count - a.count)
                    .slice(0, 10)
            })
        } catch (error) {
            console.error('Error fetching participation stats:', error)
        } finally {
            setLoading(false)
        }
    }

    const fetchPaymentStats = async () => {
        try {
            let query = supabase
                .from('registrations')
                .select(`
                    id,
                    profile_id,
                    payment_mode,
                    team_members,
                    transaction_id,
                    payment_screenshot_path,
                    event:events(id, name, fee)
                `)
                .eq('status', 'confirmed') // Only count confirmed payments

            if (selectedEvent) {
                query = query.eq('event_id', selectedEvent)
            }

            const { data, error } = await query

            if (error) throw error

            let totalRevenue = 0
            const paymentModeBreakdown = { cash: 0, hybrid: 0, online: 0 }
            const eventRevenue = {}

            data?.forEach(reg => {
                // 🔥 CRITICAL FIX: Check team membership ONLY within the same event!
                // Previous bug: searched ALL events, so solo participant in Event B
                // was skipped if they happened to be in a team in Event A

                const isLeader = reg.team_members && reg.team_members.length > 0;

                // Check if this registration is a team member by searching ONLY within same event
                let isTeamMember = false;
                if (!isLeader && reg.profile_id && reg.event?.id) {
                    // Search ONLY registrations in the SAME event
                    isTeamMember = data.some(otherReg =>
                        otherReg.event?.id === reg.event.id && // SAME EVENT ONLY!
                        otherReg.team_members &&
                        otherReg.team_members.length > 0 &&
                        otherReg.team_members.some(member => member.id === reg.profile_id)
                    );
                }

                // Skip team members - they don't contribute to revenue (leader pays for all)
                if (isTeamMember) {
                    return;
                }

                const fee = reg.event?.fee || 0
                totalRevenue += fee

                // Payment mode
                const mode = reg.payment_mode || 'hybrid'
                paymentModeBreakdown[mode] = (paymentModeBreakdown[mode] || 0) + fee

                // Event revenue
                if (reg.event) {
                    const eventName = reg.event.name
                    eventRevenue[eventName] = (eventRevenue[eventName] || 0) + fee
                }
            })

            setPaymentStats({
                totalRevenue,
                paymentModeBreakdown,
                eventRevenue: Object.entries(eventRevenue)
                    .map(([name, revenue]) => ({ name, revenue }))
                    .sort((a, b) => b.revenue - a.revenue)
            })
        } catch (error) {
            console.error('Error fetching payment stats:', error)
        }
    }

    return (
        <div className="max-w-7xl mx-auto">
            {/* Header with Event Selector */}
            <div className="mb-6 flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h1>
                    <p className="text-sm text-gray-600 mt-1">
                        Comprehensive insights into registrations and revenue
                    </p>
                </div>
                <select
                    value={selectedEvent || ''}
                    onChange={(e) => setSelectedEvent(e.target.value || null)}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                >
                    <option value="">All Events (Global)</option>
                    {events.map(event => (
                        <option key={event.id} value={event.id}>{event.name}</option>
                    ))}
                </select>
            </div>

            {/* Tab Navigation */}
            <div className="border-b border-gray-200 mb-6">
                <nav className="-mb-px flex space-x-8">
                    <button
                        onClick={() => setActiveTab('participation')}
                        className={`pb-4 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === 'participation'
                            ? 'border-indigo-500 text-indigo-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }`}
                    >
                        <div className="flex items-center gap-2">
                            <Users className="h-5 w-5" />
                            Participation Analytics
                        </div>
                    </button>
                    <button
                        onClick={() => setActiveTab('payment')}
                        className={`pb-4 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === 'payment'
                            ? 'border-indigo-500 text-indigo-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }`}
                    >
                        <div className="flex items-center gap-2">
                            <DollarSign className="h-5 w-5" />
                            Payment Analytics
                        </div>
                    </button>
                </nav>
            </div>

            {/* Tab Content */}
            {activeTab === 'participation' && (
                <div className="space-y-6">
                    {/* Key Metrics */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Enhanced Total Registrations Card with Status Breakdown */}
                        <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg shadow-sm border border-gray-200 p-6 text-white relative overflow-hidden">
                            {/* Background decoration */}
                            <div className="absolute top-0 right-0 w-20 h-20 bg-white opacity-10 rounded-full -mr-10 -mt-10"></div>

                            <div className="relative">
                                <div className="flex items-center justify-between mb-3">
                                    <p className="text-sm opacity-90">Total Registrations</p>
                                    <Users className="h-8 w-8 opacity-75" />
                                </div>

                                <p className="text-4xl font-bold mb-4">{stats.totalRegistrations}</p>

                                {/* Status Breakdown */}
                                <div className="grid grid-cols-3 gap-2">
                                    {/* Confirmed */}
                                    <div className="bg-white/10 backdrop-blur-sm rounded px-2 py-1.5 hover:bg-green-500/30 hover:scale-105 transition-all duration-200">
                                        <div className="text-xs opacity-75">Confirmed</div>
                                        <div className="text-lg font-bold text-green-300">{stats.statusBreakdown?.confirmed || 0}</div>
                                    </div>

                                    {/* Pending */}
                                    <div className="bg-white/10 backdrop-blur-sm rounded px-2 py-1.5 hover:bg-blue-400/30 hover:scale-105 transition-all duration-200">
                                        <div className="text-xs opacity-75">Pending</div>
                                        <div className="text-lg font-bold text-blue-300">{stats.statusBreakdown?.pending || 0}</div>
                                    </div>

                                    {/* Rejected */}
                                    <div className="bg-white/10 backdrop-blur-sm rounded px-2 py-1.5 hover:bg-red-500/30 hover:scale-105 transition-all duration-200">
                                        <div className="text-xs opacity-75">Rejected</div>
                                        <div className="text-lg font-bold text-red-300">{stats.statusBreakdown?.rejected || 0}</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-gray-600">Most Popular Event</p>
                                    <p className="text-lg font-semibold text-gray-900 mt-2 truncate">
                                        {stats.eventPopularity[0]?.name || 'N/A'}
                                    </p>
                                </div>
                                <TrendingUp className="h-10 w-10 text-green-600" />
                            </div>
                        </div>

                        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-gray-600">Active Departments</p>
                                    <p className="text-3xl font-bold text-gray-900 mt-2">
                                        {Object.keys(stats.departmentBreakdown).length}
                                    </p>
                                </div>
                                <Activity className="h-10 w-10 text-purple-600" />
                            </div>
                        </div>
                    </div>

                    {/* Charts */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Gender Distribution */}
                        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                            <h3 className="text-lg font-semibold text-gray-900 mb-4">Gender Distribution</h3>
                            <div className="space-y-3">
                                {Object.entries(stats.genderBreakdown).map(([gender, count]) => (
                                    <div key={gender} className="flex items-center justify-between">
                                        <span className="text-sm font-medium text-gray-700 capitalize">{gender}</span>
                                        <div className="flex items-center gap-3">
                                            <div className="w-32 bg-gray-200 rounded-full h-2">
                                                <div
                                                    className="bg-indigo-600 h-2 rounded-full"
                                                    style={{ width: `${stats.totalRegistrations ? (count / stats.totalRegistrations) * 100 : 0}%` }}
                                                ></div>
                                            </div>
                                            <span className="text-sm font-semibold text-gray-900 w-12 text-right">{count}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Department Breakdown */}
                        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                            <h3 className="text-lg font-semibold text-gray-900 mb-4">Department Breakdown</h3>
                            <div className="space-y-3 max-h-64 overflow-y-auto">
                                {Object.entries(stats.departmentBreakdown)
                                    .sort((a, b) => b[1] - a[1])
                                    .map(([dept, count]) => (
                                        <div key={dept} className="flex items-center justify-between">
                                            <span className="text-sm font-medium text-gray-700">{dept}</span>
                                            <span className="px-2 py-1 bg-indigo-100 text-indigo-800 rounded text-sm font-semibold">
                                                {count}
                                            </span>
                                        </div>
                                    ))}
                            </div>
                        </div>
                    </div>

                    {/* Event Popularity */}
                    {!selectedEvent && stats.eventPopularity.length > 0 && (
                        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                            <h3 className="text-lg font-semibold text-gray-900 mb-4">Top 10 Popular Events</h3>
                            <div className="space-y-3">
                                {stats.eventPopularity.map((event, index) => (
                                    <div key={event.name} className="flex items-center gap-4">
                                        <span className="text-lg font-bold text-gray-400 w-6">{index + 1}</span>
                                        <div className="flex-1">
                                            <p className="text-sm font-medium text-gray-900">{event.name}</p>
                                            <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                                                <div
                                                    className="bg-indigo-600 h-2 rounded-full"
                                                    style={{ width: `${(event.count / stats.eventPopularity[0].count) * 100}%` }}
                                                ></div>
                                            </div>
                                        </div>
                                        <span className="text-sm font-semibold text-gray-900">{event.count}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {activeTab === 'payment' && (
                <div className="space-y-6">
                    {/* Revenue Summary */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg shadow-lg p-6 text-white">
                            <p className="text-sm opacity-90">Total Revenue</p>
                            <p className="text-4xl font-bold mt-2">₹{paymentStats.totalRevenue.toLocaleString()}</p>
                        </div>

                        {Object.entries(paymentStats.paymentModeBreakdown).map(([mode, amount]) => (
                            <div key={mode} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                                <p className="text-sm text-gray-600 capitalize">{mode} Payments</p>
                                <p className="text-2xl font-bold text-gray-900 mt-2">₹{amount.toLocaleString()}</p>
                            </div>
                        ))}
                    </div>

                    {/* Event Revenue Table */}
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-200">
                            <h3 className="text-lg font-semibold text-gray-900">Event Revenue Ranking</h3>
                        </div>
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rank</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Event Name</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Revenue</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {paymentStats.eventRevenue.map((event, index) => (
                                    <tr key={event.name} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-400">
                                            #{index + 1}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                            {event.name}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-green-600 text-right">
                                            ₹{event.revenue.toLocaleString()}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    )
}
