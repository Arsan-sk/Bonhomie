import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import { BarChart3, TrendingUp, Users, DollarSign, Calendar, Activity, Trophy } from 'lucide-react'

export default function CoordinatorAnalytics() {
    const { user } = useAuth()
    const [loading, setLoading] = useState(true)
    const [stats, setStats] = useState({
        totalEvents: 0,
        totalRegistrations: 0,
        totalRevenue: 0,
        registrationsByDate: [], // For trend chart
        eventsByPopularity: []   // For bar chart
    })

    useEffect(() => {
        if (user) fetchAnalytics()
    }, [user])

    const fetchAnalytics = async () => {
        try {
            setLoading(true)
            // 1. Get Assigned Event IDs
            const { data: assignments, error: assignError } = await supabase
                .from('event_assignments')
                .select('event_id')
                .eq('coordinator_id', user.id)

            if (assignError) throw assignError

            if (!assignments || assignments.length === 0) {
                setLoading(false); return
            }

            const eventIds = assignments.map(a => a.event_id)

            // 2. Get Event Details
            const { data: myEvents, error: eventError } = await supabase
                .from('events')
                .select('id, name')
                .in('id', eventIds)

            if (eventError) throw eventError

            // 3. Get All Registrations for these events
            const { data: registrations, error: regError } = await supabase
                .from('registrations')
                .select('*') // avoiding specific columns in case of schema diff
                .in('event_id', eventIds)

            if (regError) throw regError

            // 4. Process Data
            const totalRegistrations = registrations ? registrations.length : 0
            const confirmedRegs = registrations ? registrations.filter(r => r.status === 'confirmed') : []

            // Revenue (approx based on confirmed * fee)
            let totalRevenue = 0
            /*
            (confirmedRegs || []).forEach(reg => {
                const event = (myEvents || []).find(e => e.id === reg.event_id)
                if (event) totalRevenue += (event.registration_fee || 0)
            })
            */

            // Chart 1: Last 7 Days Trend
            const safeRegistrations = registrations || []
            const last7Days = [...Array(7)].map((_, i) => {
                const d = new Date()
                d.setDate(d.getDate() - (6 - i))
                return d.toISOString().split('T')[0]
            })
            const trendData = last7Days.map(date => ({
                date,
                count: safeRegistrations.filter(r => (r.created_at || '').startsWith(date)).length,
                label: new Date(date).toLocaleDateString('en-US', { weekday: 'short' })
            }))

            // Chart 2: Event Popularity
            const safeEvents = myEvents || []
            const popularityData = safeEvents.map(event => ({
                name: event.name || 'Unknown',
                count: safeRegistrations.filter(r => r.event_id === event.id).length
            })).sort((a, b) => b.count - a.count).slice(0, 5)

            setStats({
                totalEvents: safeEvents.length,
                totalRegistrations,
                totalRevenue,
                registrationsByDate: trendData,
                eventsByPopularity: popularityData
            })

        } catch (error) {
            console.error('Analytics Error:', error)
        } finally {
            setLoading(false)
        }
    }

    if (loading) return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div></div>

    return (
        <div className="max-w-7xl mx-auto space-y-8">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Analytics Overview</h1>
                <p className="text-gray-500">Insights across all your assigned events.</p>
            </div>

            {/* Top Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-sm text-gray-500 font-medium">Total Revenue</p>
                        <h3 className="text-3xl font-bold text-gray-900 mt-1">₹{stats.totalRevenue.toLocaleString()}</h3>
                    </div>
                    <div className="p-3 bg-green-50 text-green-600 rounded-xl"><DollarSign className="h-6 w-6" /></div>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-sm text-gray-500 font-medium">Total Registrations</p>
                        <h3 className="text-3xl font-bold text-gray-900 mt-1">{stats.totalRegistrations}</h3>
                    </div>
                    <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl"><Users className="h-6 w-6" /></div>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-sm text-gray-500 font-medium">Active Events</p>
                        <h3 className="text-3xl font-bold text-gray-900 mt-1">{stats.totalEvents}</h3>
                    </div>
                    <div className="p-3 bg-purple-50 text-purple-600 rounded-xl"><Activity className="h-6 w-6" /></div>
                </div>
            </div>

            {/* Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Trend Chart */}
                <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                    <h3 className="font-bold text-gray-900 mb-6 flex items-center gap-2"><TrendingUp className="h-4 w-4 text-gray-500" /> Registration Trend (Last 7 Days)</h3>
                    {stats.registrationsByDate.length > 0 ? (
                        <div className="h-64 flex items-end gap-4 px-2">
                            {stats.registrationsByDate.map((item, i) => {
                                const max = Math.max(...stats.registrationsByDate.map(d => d.count), 5)
                                const height = (item.count / max) * 100
                                return (
                                    <div key={i} className="flex-1 flex flex-col justify-end group">
                                        <div className="relative w-full bg-indigo-100 rounded-t-lg transition-all duration-500 hover:bg-indigo-500" style={{ height: `${Math.max(height, 5)}%` }}>
                                            <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                                                {item.count} Regs
                                            </div>
                                        </div>
                                        <div className="text-xs text-gray-400 text-center mt-3">{item.label}</div>
                                    </div>
                                )
                            })}
                        </div>
                    ) : (
                        <div className="h-64 flex items-center justify-center text-gray-400">No data</div>
                    )}
                </div>

                {/* Popularity Chart */}
                <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                    <h3 className="font-bold text-gray-900 mb-6 flex items-center gap-2"><Trophy className="h-4 w-4 text-gray-500" /> Top Events</h3>
                    <div className="space-y-4">
                        {stats.eventsByPopularity.map((event, i) => (
                            <div key={i}>
                                <div className="flex justify-between text-sm mb-1">
                                    <span className="font-medium text-gray-700 truncate max-w-[200px]">{event.name}</span>
                                    <span className="text-gray-500 font-medium">{event.count}</span>
                                </div>
                                <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                                    <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${stats.totalRegistrations > 0 ? (event.count / stats.totalRegistrations) * 100 : 0}%` }} />
                                </div>
                            </div>
                        ))}
                        {stats.eventsByPopularity.length === 0 && <div className="text-center text-gray-400 py-10">No events found.</div>}
                    </div>
                </div>
            </div>
        </div>
    )
}
