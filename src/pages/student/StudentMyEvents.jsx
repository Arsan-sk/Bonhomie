import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { useLocation } from 'react-router-dom'
import { Calendar, Trophy, Activity, Award } from 'lucide-react'
import { getUnsplashImageUrl, getCategoryImage } from '../../utils/unsplashHelper'

export default function StudentMyEvents() {
    const { user } = useAuth()
    const location = useLocation()
    const [myRegistrations, setMyRegistrations] = useState([])
    const [loading, setLoading] = useState(true)

    // Detect if we're in coordinator context
    const isCoordinator = location.pathname.startsWith('/coordinator')
    const eventsBasePath = isCoordinator ? '/coordinator/browse-events' : '/student/events'

    useEffect(() => {
        if (user) {
            fetchMyEvents()
        }
    }, [user])

    const fetchMyEvents = async () => {
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
            setMyRegistrations(data || [])
        } catch (error) {
            console.error('Error fetching my events:', error)
        } finally {
            setLoading(false)
        }
    }

    const getStatusColor = (status) => {
        switch (status) {
            case 'confirmed':
                return 'bg-green-100 text-green-800'
            case 'rejected':
                return 'bg-red-100 text-red-800'
            default:
                return 'bg-yellow-100 text-yellow-800'
        }
    }

    const getPaymentModeLabel = (mode) => {
        switch (mode) {
            case 'cash':
                return 'Cash Payment'
            case 'hybrid':
                return 'Online Payment'
            case 'online':
                return 'UPI Auto-Pay'
            default:
                return 'Hybrid'
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
            </div>
        )
    }

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900">My Events</h1>
                <p className="mt-2 text-gray-600">View all events you've registered for</p>
            </div>

            {myRegistrations.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-lg shadow-sm">
                    <Trophy className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-4 text-lg font-medium text-gray-900">No registrations yet</h3>
                    <p className="mt-2 text-gray-500">Start exploring events and register to participate!</p>
                    <a
                        href={eventsBasePath}
                        className="mt-4 inline-flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                    >
                        Browse Events
                    </a>
                </div>
            ) : (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {myRegistrations.map((registration) => (
                        <div
                            key={registration.id}
                            className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition-shadow"
                        >
                            {/* Event Image */}
                            <div className="h-48 overflow-hidden">
                                <img
                                    src={registration.event.image_path || getUnsplashImageUrl(registration.event.name, 400, 200)}
                                    alt={registration.event.name}
                                    className="w-full h-full object-cover"
                                    onError={(e) => { e.target.src = getCategoryImage(registration.event.category) }}
                                />
                            </div>

                            {/* Event Details */}
                            <div className="p-6">
                                <div className="flex items-start justify-between mb-3">
                                    <h3 className="text-lg font-bold text-gray-900">
                                        {registration.event.name}
                                    </h3>
                                    <span
                                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                                            registration.status
                                        )}`}
                                    >
                                        {registration.status.charAt(0).toUpperCase() + registration.status.slice(1)}
                                    </span>
                                </div>

                                <div className="space-y-2 text-sm text-gray-600">
                                    <div className="flex items-center">
                                        <Calendar className="h-4 w-4 mr-2 text-gray-400" />
                                        <span>{registration.event.day}</span>
                                    </div>
                                    <div className="flex items-center">
                                        <Activity className="h-4 w-4 mr-2 text-gray-400" />
                                        <span>{registration.event.category}</span>
                                    </div>
                                    <div className="flex items-center">
                                        <Award className="h-4 w-4 mr-2 text-gray-400" />
                                        <span>Payment: {getPaymentModeLabel(registration.payment_mode || 'hybrid')}</span>
                                    </div>
                                </div>

                                {/* Team Members */}
                                {registration.team_members && registration.team_members.length > 0 && (
                                    <div className="mt-4 pt-4 border-t border-gray-100">
                                        <p className="text-xs font-medium text-gray-500 mb-2">
                                            Team ({registration.team_members.length + 1} members)
                                        </p>
                                        <div className="flex -space-x-2">
                                            <div className="h-8 w-8 rounded-full bg-purple-500 flex items-center justify-center text-white text-xs font-bold border-2 border-white">
                                                You
                                            </div>
                                            {registration.team_members.slice(0, 3).map((member, idx) => (
                                                <div
                                                    key={idx}
                                                    className="h-8 w-8 rounded-full bg-gray-300 flex items-center justify-center text-gray-600 text-xs font-bold border-2 border-white"
                                                    title={member.name}
                                                >
                                                    {member.name?.charAt(0) || 'M'}
                                                </div>
                                            ))}
                                            {registration.team_members.length > 3 && (
                                                <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 text-xs font-bold border-2 border-white">
                                                    +{registration.team_members.length - 3}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Action Button */}
                                <div className="mt-4">
                                    <a
                                        href={isCoordinator ? `/coordinator/browse-events/${registration.event.id}` : `/student/events/${registration.event.id}`}
                                        className="block w-full text-center px-4 py-2 bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 font-medium text-sm transition-colors"
                                    >
                                        View Event Details
                                    </a>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
