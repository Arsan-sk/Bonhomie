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
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (user && profile) {
            fetchRegistrations()
            fetchCertificates()
            fetchNotifications()
        }
    }, [user, profile])

    const fetchRegistrations = async () => {
        try {
            // Use profile.id (not user.id) for admin-created profiles
            const profileId = profile?.id || user.id
            const { data, error } = await supabase
                .from('registrations')
                .select(`
          *,
          event:events(*)
        `)
                .eq('profile_id', profileId)
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
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900">My Dashboard</h1>
                <p className="mt-2 text-gray-600">Welcome back, {profile?.full_name}</p>
            </div>

            {/* Stat Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <StatCard
                    title="Registered Events"
                    value={registrations.length}
                    icon={Calendar}
                    color="purple"
                />
                <StatCard
                    title="Upcoming Events"
                    value={upcomingEvents.length}
                    icon={Clock}
                    color="blue"
                />
                <StatCard
                    title="Ongoing Events"
                    value={ongoingEvents.length}
                    icon={Activity}
                    color="green"
                />
                <StatCard
                    title="Certificates"
                    value={certificates.length}
                    icon={Award}
                    color="yellow"
                />
            </div>

            {/* Notifications Section */}
            {notifications.length > 0 && (
                <div className="mb-8 bg-white shadow overflow-hidden sm:rounded-lg">
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
            <div className="mb-8 bg-white shadow overflow-hidden sm:rounded-lg">
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

            <div className="bg-white shadow overflow-hidden sm:rounded-lg">
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
