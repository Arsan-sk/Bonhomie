import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { Loader2, Calendar, MapPin, Clock, CheckCircle, AlertCircle, Award, Bell, Activity } from 'lucide-react'
import { Link } from 'react-router-dom'
import { format } from 'date-fns'
import StatCard from '../../components/student/ui/StatCard'
import { getUnsplashImageUrl, getCategoryImage } from '../../utils/unsplashHelper'

export default function StudentDashboard() {
    const { user, profile } = useAuth()
    const [registrations, setRegistrations] = useState([])
    const [certificates, setCertificates] = useState([])
    const [notifications, setNotifications] = useState([])
    const [totalEvents, setTotalEvents] = useState(0)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (user) {
            fetchRegistrations()
            fetchCertificates()
            fetchNotifications()
            fetchTotalEvents()
        }
    }, [user])

    const fetchRegistrations = async () => {
        try {
            const { data, error } = await supabase
                .from('registrations')
                .select(`
          *,
          event:events(*)
        `)
                .eq('profile_id', user.id)
                .order('registered_at', { ascending: false })

            if (error) throw error
            setRegistrations(data || [])
        } catch (error) {
            console.error('Error fetching registrations:', error)
        } finally {
            setLoading(false)
        }
    }

    const fetchCertificates = async () => {
        try {
            const { data, error } = await supabase
                .from('certificates')
                .select(`*, event:events(name)`)
                .eq('user_id', user.id)
                .order('issue_date', { ascending: false })
            if (error) throw error
            setCertificates(data || [])
        } catch (error) {
            console.error('Error fetching certificates:', error)
        }
    }

    const fetchNotifications = async () => {
        try {
            const { data, error } = await supabase
                .from('notifications')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false })
            if (error) throw error
            setNotifications(data || [])
        } catch (error) {
            console.error('Error fetching notifications:', error)
        }
    }

    const fetchTotalEvents = async () => {
        try {
            const { data, error } = await supabase
                .from('events')
                .select('id')

            if (error) throw error
            setTotalEvents(data?.length || 0)
        } catch (error) {
            console.error('Error fetching total events:', error)
        }
    }

    // Calculate stats
    const upcomingEvents = registrations.filter(reg => {
        return reg.event?.status === 'scheduled'
    })

    const ongoingEvents = registrations.filter(reg => {
        return reg.event?.status === 'live' || reg.event?.status === 'ongoing'
    })
    if (loading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div>

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            {/* Enhanced Welcome Section with Shortcuts */}
            <div className="relative overflow-hidden bg-gradient-to-br from-purple-600 via-indigo-600 to-blue-500 rounded-3xl shadow-2xl mb-8">
                <div className="absolute inset-0 bg-grid-white/10"></div>
                <div className="relative px-8 py-12">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                        {/* Greeting Section */}
                        <div className="flex-1">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="h-12 w-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                                    <span className="text-2xl">🎉</span>
                                </div>
                                <div>
                                    <h1 className="text-3xl font-bold text-white">
                                        Welcome back, {profile?.full_name?.split(' ')[0] || 'Student'}!
                                    </h1>
                                    <p className="text-purple-100 text-sm mt-1">
                                        {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                                    </p>
                                </div>
                            </div>
                            <p className="text-white/90 text-lg max-w-2xl">
                                You're registered for <span className="font-bold text-white">{registrations.length} events</span>! Keep exploring, participating, and winning. Your festival journey awaits! 🏆
                            </p>
                        </div>

                        {/* Quick Actions */}
                        <div className="flex flex-col sm:flex-row gap-4">
                            <Link
                                to="/student/events"
                                className="group px-6 py-3 bg-white text-purple-600 rounded-xl font-semibold hover:bg-purple-50 transition-all duration-200 shadow-lg hover:shadow-xl hover:-translate-y-0.5 flex items-center gap-2"
                            >
                                <Calendar className="h-5 w-5" />
                                Browse Events
                            </Link>
                            <Link
                                to="/student/my-events"
                                className="px-6 py-3 bg-white/10 backdrop-blur-sm text-white border-2 border-white/30 rounded-xl font-semibold hover:bg-white/20 transition-all duration-200 flex items-center gap-2"
                            >
                                <Activity className="h-5 w-5" />
                                My Events
                            </Link>
                        </div>
                    </div>
                </div>
            </div>

            {/* Stat Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div className="bg-white p-6 rounded-2xl border border-blue-100 shadow-sm hover:shadow-lg transition-all duration-200 group">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-blue-50 text-blue-600 rounded-xl group-hover:bg-blue-600 group-hover:text-white transition-colors">
                            <Clock className="h-6 w-6" />
                        </div>
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Available</span>
                    </div>
                    <h3 className="text-3xl font-bold text-gray-900">{totalEvents}</h3>
                    <p className="text-sm text-gray-500 mt-1">Total Events</p>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-purple-100 shadow-sm hover:shadow-lg transition-all duration-200 group">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-purple-50 text-purple-600 rounded-xl group-hover:bg-purple-600 group-hover:text-white transition-colors">
                            <Calendar className="h-6 w-6" />
                        </div>
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">My Events</span>
                    </div>
                    <h3 className="text-3xl font-bold text-gray-900">{registrations.length}</h3>
                    <p className="text-sm text-gray-500 mt-1">Registered Events</p>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-green-100 shadow-sm hover:shadow-lg transition-all duration-200 group">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-green-50 text-green-600 rounded-xl group-hover:bg-green-600 group-hover:text-white transition-colors">
                            <Activity className="h-6 w-6" />
                        </div>
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Live</span>
                    </div>
                    <h3 className="text-3xl font-bold text-gray-900">{ongoingEvents.length}</h3>
                    <p className="text-sm text-gray-500 mt-1">Ongoing Events</p>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-yellow-100 shadow-sm hover:shadow-lg transition-all duration-200 group">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-yellow-50 text-yellow-600 rounded-xl group-hover:bg-yellow-600 group-hover:text-white transition-colors">
                            <Award className="h-6 w-6" />
                        </div>
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Earned</span>
                    </div>
                    <h3 className="text-3xl font-bold text-gray-900">{certificates.length}</h3>
                    <p className="text-sm text-gray-500 mt-1">Certificates</p>
                </div>
            </div>

            {/* Notifications Section */}
            {notifications.length > 0 && (
                <div className="mb-8 bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 shadow-sm overflow-hidden rounded-2xl">
                    <div className="px-4 py-5 sm:px-6 flex items-center">
                        <Bell className="h-5 w-5 text-gray-400 mr-2" />
                        <h3 className="text-lg leading-6 font-medium text-gray-900">Notifications</h3>
                    </div>
                    <ul className="divide-y divide-gray-200">
                        {notifications.map((notif) => (
                            <li key={notif.id} className="px-4 py-4 sm:px-6 bg-yellow-50">
                                <p className="text-sm font-medium text-gray-900">{notif.message}</p>
                                <p className="text-xs text-gray-500 mt-1">{format(new Date(notif.created_at), 'MMM d, h:mm a')}</p>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {/* Certificates Section */}
            <div className="mb-8 bg-white shadow-sm overflow-hidden rounded-2xl border border-gray-100">
                <div className="px-4 py-5 sm:px-6 flex items-center">
                    <Award className="h-5 w-5 text-primary mr-2" />
                    <h3 className="text-lg leading-6 font-medium text-gray-900">My Certificates</h3>
                </div>
                <div className="border-t border-gray-200 px-4 py-5 sm:p-6">
                    {certificates.length > 0 ? (
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                            {certificates.map((cert) => (
                                <div key={cert.id} className="relative flex items-center space-x-3 rounded-lg border border-gray-300 bg-white px-6 py-5 shadow-sm focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2 hover:border-gray-400">
                                    <div className="flex-shrink-0">
                                        <Award className="h-10 w-10 text-yellow-500" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <a href="#" className="focus:outline-none">
                                            <span className="absolute inset-0" aria-hidden="true" />
                                            <p className="text-sm font-medium text-gray-900">{cert.event?.name}</p>
                                            <p className="truncate text-sm text-gray-500">Issued: {format(new Date(cert.issue_date), 'MMM d, yyyy')}</p>
                                        </a>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-sm text-gray-500">No certificates issued yet. Participate and win events to earn them!</p>
                    )}
                </div>
            </div>

            <div className="bg-white shadow-sm overflow-hidden rounded-2xl border border-gray-100">
                <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
                    <h3 className="text-lg leading-6 font-medium text-gray-900">My Registrations</h3>
                    <Link to="/events" className="text-sm text-primary hover:text-blue-700 font-medium">
                        Browse Events &rarr;
                    </Link>
                </div>
                <div className="border-t border-gray-200">
                    {registrations.length > 0 ? (
                        <ul className="divide-y divide-gray-200">
                            {registrations.map((reg) => (
                                <li key={reg.id} className="px-4 py-4 sm:px-6 hover:bg-gray-50 transition-colors">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center">
                                            <div className="flex-shrink-0 h-16 w-16 rounded-md overflow-hidden">
                                                <img
                                                    className="h-full w-full object-cover"
                                                    src={reg.event.image_path || getUnsplashImageUrl(reg.event.name, 150, 150)}
                                                    alt={reg.event.name}
                                                    onError={(e) => { e.target.src = getCategoryImage(reg.event.category) }}
                                                />
                                            </div>
                                            <div className="ml-4">
                                                <Link to={`/events/${reg.event.id}`} className="text-lg font-medium text-primary hover:underline">
                                                    {reg.event.name}
                                                </Link>
                                                <div className="flex items-center text-sm text-gray-500 mt-1 space-x-4">
                                                    <span className="flex items-center">
                                                        <Calendar className="flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400" />
                                                        {reg.event.day}
                                                    </span>
                                                    <span className="flex items-center">
                                                        <Clock className="flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400" />
                                                        {reg.event.start_time?.slice(0, 5)}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex flex-col items-end">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${reg.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                                                reg.status === 'rejected' ? 'bg-red-100 text-red-800' :
                                                    'bg-yellow-100 text-yellow-800'
                                                }`}>
                                                {reg.status.charAt(0).toUpperCase() + reg.status.slice(1)}
                                            </span>
                                            <span className="text-xs text-gray-400 mt-2">
                                                Registered on {format(new Date(reg.registered_at), 'MMM d, yyyy')}
                                            </span>
                                        </div>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <div className="text-center py-12">
                            <p className="text-gray-500">You haven't registered for any events yet.</p>
                            <Link to="/events" className="mt-4 inline-block text-primary font-medium hover:underline">
                                Explore Events
                            </Link>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
