import { useState, useEffect } from 'react'
import { Calendar, Users, DollarSign, ArrowRight, Activity, TrendingUp } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'

export default function CoordinatorDashboard() {
    const { user, profile } = useAuth()
    const [stats, setStats] = useState({
        activeEvents: 0,
        totalParticipants: 0,
        totalRevenue: 0
    })
    const [loading, setLoading] = useState(true)
    const [upcomingEvents, setUpcomingEvents] = useState([])

    useEffect(() => {
        if (user) fetchDashboardData()
    }, [user])

    const fetchDashboardData = async () => {
        try {
            setLoading(true)

            // 1. Fetch Assigned Events
            const { data: assignments, error: assignError } = await supabase
                .from('event_assignments')
                .select('event:events(*)')
                .eq('coordinator_id', user.id)

            if (assignError) throw assignError

            const myEvents = assignments?.map(a => a.event) || []
            const activeEventsCount = myEvents.length

            // 2. Fetch Participants & Revenue
            // Need to query registrations for all assigned events
            const eventIds = myEvents.map(e => e.id)
            let totalParticipants = 0
            let totalRevenue = 0

            if (eventIds.length > 0) {
                // Fetch registrations with event details and team info (with Pagination)
                let allRegistrations = []
                let from = 0
                let hasMore = true

                while (hasMore) {
                    const { data, error } = await supabase
                        .from('registrations')
                        .select(`
                            *,
                            event:events(id, fee, name),
                            profile_id
                        `)
                        .in('event_id', eventIds)
                        .eq('status', 'confirmed')
                        .range(from, from + 999)

                    if (error) {
                        console.error('Error fetching registrations batch:', error)
                        // If one batch fails, we might miss data, but we continue with what we have or break
                        break
                    }

                    if (data && data.length > 0) {
                        allRegistrations = [...allRegistrations, ...data]
                        from += 1000
                    } else {
                        hasMore = false
                    }
                }

                totalParticipants = allRegistrations.length

                // Calculate revenue with team-aware logic (same as AdminAnalytics)
                allRegistrations.forEach(reg => {
                    const isLeader = reg.team_members && reg.team_members.length > 0;

                    // Check if this registration is a team member (only within same event)
                    let isTeamMember = false;
                    if (!isLeader && reg.profile_id && reg.event?.id) {
                        // Optimizing lookup by checking only within fetched data
                        isTeamMember = allRegistrations.some(otherReg =>
                            otherReg.event?.id === reg.event.id &&
                            otherReg.team_members &&
                            otherReg.team_members.length > 0 &&
                            otherReg.team_members.some(member => member.id === reg.profile_id)
                        );
                    }

                    // Skip team members - leader pays for all
                    if (!isTeamMember) {
                        totalRevenue += (reg.event?.fee || 0);
                    }
                });
            }

            setStats({
                activeEvents: activeEventsCount || 0,
                totalParticipants: totalParticipants || 0,
                totalRevenue: totalRevenue || 0
            })

            // 3. Upcoming Events (Just showing assigned events for now)
            setUpcomingEvents(myEvents.slice(0, 3))

        } catch (error) {
            console.error('Error fetching dashboard stats:', error)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="max-w-7xl mx-auto space-y-8">
            {/* Enhanced Welcome Section with Shortcuts */}
            <div className="relative overflow-hidden bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 rounded-3xl shadow-2xl">
                <div className="absolute inset-0 bg-grid-white/10"></div>
                <div className="relative px-8 py-12">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                        {/* Greeting Section */}
                        <div className="flex-1">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="h-12 w-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                                    <span className="text-2xl">👋</span>
                                </div>
                                <div>
                                    <h1 className="text-3xl font-bold text-white">
                                        Welcome back, {profile?.full_name?.split(' ')[0] || 'Coordinator'}!
                                    </h1>
                                    <p className="text-purple-100 text-sm mt-1">
                                        {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                                    </p>
                                </div>
                            </div>
                            <p className="text-white/90 text-lg max-w-2xl">
                                Manage your events, track participants, and monitor analytics all in one place. Your dashboard is ready! 🚀
                            </p>
                        </div>

                        {/* Quick Actions */}
                        <div className="flex flex-col sm:flex-row gap-4">
                            <Link
                                to="/coordinator/events"
                                className="group px-6 py-3 bg-white text-indigo-600 rounded-xl font-semibold hover:bg-indigo-50 transition-all duration-200 shadow-lg hover:shadow-xl hover:-translate-y-0.5 flex items-center gap-2"
                            >
                                <Calendar className="h-5 w-5" />
                                Manage Events
                                <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                            </Link>
                            <Link
                                to="/coordinator/analytics"
                                className="px-6 py-3 bg-white/10 backdrop-blur-sm text-white border-2 border-white/30 rounded-xl font-semibold hover:bg-white/20 transition-all duration-200 flex items-center gap-2"
                            >
                                <TrendingUp className="h-5 w-5" />
                                View Analytics
                            </Link>
                        </div>
                    </div>
                </div>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-2xl border border-indigo-100 shadow-sm hover:shadow-md transition-shadow group">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                            <Activity className="h-6 w-6" />
                        </div>
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Assigned Events</span>
                    </div>
                    <h3 className="text-3xl font-bold text-gray-900">{stats.activeEvents}</h3>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-indigo-100 shadow-sm hover:shadow-md transition-shadow group">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                            <Users className="h-6 w-6" />
                        </div>
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Total Participants</span>
                    </div>
                    <h3 className="text-3xl font-bold text-gray-900">{stats.totalParticipants}</h3>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-indigo-100 shadow-sm hover:shadow-md transition-shadow group">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                            <TrendingUp className="h-6 w-6" />
                        </div>
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Total Revenue</span>
                    </div>
                    <h3 className="text-3xl font-bold text-gray-900">₹{stats.totalRevenue.toLocaleString()}</h3>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Upcoming Events List */}
                <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
                    <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                        <h3 className="font-bold text-gray-900 text-lg">Upcoming Events</h3>
                        <Link to="/coordinator/events" className="text-sm text-indigo-600 font-semibold hover:text-indigo-700">View All</Link>
                    </div>
                    <div className="flex-1 p-6 space-y-4">
                        {upcomingEvents.length > 0 ? upcomingEvents.map(event => (
                            <div key={event.id} className="flex items-center p-4 rounded-xl hover:bg-gray-50 border border-transparent hover:border-gray-100 transition-all group">
                                <div className="h-12 w-12 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold mr-4">
                                    {event.day && event.day.includes(' ') ? event.day.split(' ')[1] : '1'}
                                </div>
                                <div className="flex-1">
                                    <h4 className="font-bold text-gray-900 group-hover:text-indigo-600 transition-colors">{event.name}</h4>
                                    <div className="flex items-center gap-4 text-xs text-gray-500 mt-1">
                                        <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {event.day}</span>
                                        <span className="flex items-center gap-1"><DollarSign className="h-3 w-3" /> {event.registration_fee > 0 ? `₹${event.registration_fee}` : 'Free'}</span>
                                    </div>
                                </div>
                                <Link to={`/coordinator/events/${event.id}`} className="px-4 py-2 bg-white border border-gray-200 text-gray-600 text-sm font-semibold rounded-lg hover:bg-gray-50 hover:text-indigo-600 transition-colors">
                                    Manage
                                </Link>
                            </div>
                        )) : (
                            <div className="text-center py-10 text-gray-400">No events found.</div>
                        )}
                    </div>
                </div>

                {/* Guidelines / Quick Actions */}
                <div className="bg-indigo-900 rounded-2xl p-6 text-white shadow-lg flex flex-col justify-between">
                    <div>
                        <h3 className="font-bold text-xl mb-4">Coordinator Guidelines</h3>
                        <ul className="space-y-3 text-indigo-200 text-sm">
                            <li className="flex gap-2"><div className="h-1.5 w-1.5 bg-indigo-400 rounded-full mt-1.5" /> Ensure rounds are updated immediately after completion.</li>
                            <li className="flex gap-2"><div className="h-1.5 w-1.5 bg-indigo-400 rounded-full mt-1.5" /> Verify participant IDs before entry.</li>
                            <li className="flex gap-2"><div className="h-1.5 w-1.5 bg-indigo-400 rounded-full mt-1.5" /> Contact Admins for refund requests.</li>
                        </ul>
                    </div>
                    <button className="mt-8 w-full bg-white/10 hover:bg-white/20 text-white py-3 rounded-xl font-semibold backdrop-blur-sm transition-colors border border-white/10">
                        Download Handbook
                    </button>
                </div>
            </div>
        </div>
    )
}
