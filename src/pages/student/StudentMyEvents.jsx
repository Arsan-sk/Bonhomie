import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { useLocation, useNavigate } from 'react-router-dom'
import { Calendar, Trophy, Activity, Award, ArrowRight } from 'lucide-react'
import { getUnsplashImageUrl, getCategoryImage } from '../../utils/unsplashHelper'
import StaticCardFallback from '../../components/ui/StaticCardFallback'

export default function StudentMyEvents() {
    const { user, profile } = useAuth()
    const location = useLocation()
    const navigate = useNavigate()
    const [myRegistrations, setMyRegistrations] = useState([])
    const [loading, setLoading] = useState(true)
    const [imageErrors, setImageErrors] = useState({})

    // Detect if we're in coordinator context
    const isCoordinator = location.pathname.startsWith('/coordinator')
    const eventsBasePath = isCoordinator ? '/coordinator/browse-events' : '/student/events'

    useEffect(() => {
        if (user && profile) {
            fetchMyEvents()
        }
    }, [user, profile])

    const fetchMyEvents = async () => {
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
                return 'bg-green-500/90 text-white'
            case 'rejected':
                return 'bg-red-500/90 text-white'
            default:
                return 'bg-yellow-500/90 text-white'
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

    const handleViewDetails = (eventId) => {
        const targetPath = isCoordinator ? `/coordinator/browse-events/${eventId}` : `/student/events/${eventId}`
        navigate(targetPath)
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
                    <button
                        onClick={() => navigate(eventsBasePath)}
                        className="mt-4 inline-flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                    >
                        Browse Events
                    </button>
                </div>
            ) : (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {myRegistrations.map((registration) => (
                        <div
                            key={registration.id}
                            className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-xl transition-all duration-300 border border-gray-100 hover:border-indigo-200 flex flex-col h-full"
                        >
                            {/* Event Image - Fixed Height */}
                            <div className="h-48 overflow-hidden relative flex-shrink-0">{/* Event Image */}
                                {!imageErrors[registration.id] ? (
                                    <img
                                        src={registration.event.image_path || getUnsplashImageUrl(registration.event.name, 400, 200)}
                                        alt={registration.event.name}
                                        className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                                        onError={(e) => {
                                            const categoryImg = getCategoryImage(registration.event.category)
                                            if (e.target.src !== categoryImg) {
                                                e.target.src = categoryImg
                                            } else {
                                                setImageErrors(prev => ({ ...prev, [registration.id]: true }))
                                            }
                                        }}
                                    />
                                ) : (
                                    <StaticCardFallback 
                                        eventName={registration.event.name}
                                        category={registration.event.category}
                                        height="h-48"
                                    />
                                )}
                                
                                {/* Status Badge on Image */}
                                <div className="absolute top-3 right-3">
                                    <span
                                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold shadow-lg backdrop-blur-sm ${getStatusColor(
                                            registration.status
                                        )}`}
                                    >
                                        {registration.status.charAt(0).toUpperCase() + registration.status.slice(1)}
                                    </span>
                                </div>
                            </div>

                            {/* Event Details - Flex Grow */}
                            <div className="p-5 flex flex-col flex-grow">
                                {/* Event Name and Category */}
                                <div className="mb-3">
                                    <h3 className="text-lg font-bold text-gray-900 line-clamp-2 mb-2 min-h-[56px]">
                                        {registration.event.name}
                                    </h3>
                                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                                        registration.event.category === 'Cultural' 
                                            ? 'bg-purple-100 text-purple-700' 
                                            : registration.event.category === 'Technical'
                                            ? 'bg-blue-100 text-blue-700'
                                            : 'bg-green-100 text-green-700'
                                    }`}>
                                        {registration.event.category}
                                    </span>
                                </div>

                                {/* Event Info */}
                                <div className="space-y-2.5 text-sm text-gray-600 mb-4">
                                    <div className="flex items-center">
                                        <Calendar className="h-4 w-4 mr-2 text-gray-400 flex-shrink-0" />
                                        <span className="line-clamp-1">{registration.event.day}</span>
                                    </div>
                                    <div className="flex items-center">
                                        <Activity className="h-4 w-4 mr-2 text-gray-400 flex-shrink-0" />
                                        <span className="line-clamp-1">{registration.event.subcategory || 'General'}</span>
                                    </div>
                                    <div className="flex items-center">
                                        <Award className="h-4 w-4 mr-2 text-gray-400 flex-shrink-0" />
                                        <span className="line-clamp-1">{getPaymentModeLabel(registration.payment_mode || 'hybrid')}</span>
                                    </div>
                                </div>

                                {/* Team Members */}
                                {registration.team_members && registration.team_members.length > 0 && (
                                    <div className="mt-auto pt-3 border-t border-gray-100">
                                        <p className="text-xs font-medium text-gray-500 mb-2">
                                            Team ({registration.team_members.length + 1} members)
                                        </p>
                                        <div className="flex -space-x-2 mb-4">
                                            <div className="h-8 w-8 rounded-full bg-purple-500 flex items-center justify-center text-white text-xs font-bold border-2 border-white shadow-sm" title="You (Team Lead)">
                                                You
                                            </div>
                                            {registration.team_members.slice(0, 3).map((member, idx) => (
                                                <div
                                                    key={idx}
                                                    className="h-8 w-8 rounded-full bg-gray-300 flex items-center justify-center text-gray-600 text-xs font-bold border-2 border-white shadow-sm"
                                                    title={member.name}
                                                >
                                                    {member.name?.charAt(0)?.toUpperCase() || 'M'}
                                                </div>
                                            ))}
                                            {registration.team_members.length > 3 && (
                                                <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 text-xs font-bold border-2 border-white shadow-sm" title={`${registration.team_members.length - 3} more members`}>
                                                    +{registration.team_members.length - 3}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Action Button - Always at bottom */}
                                <div className={registration.team_members && registration.team_members.length > 0 ? '' : 'mt-auto pt-3'}>
                                    <button
                                        onClick={() => handleViewDetails(registration.event.id)}
                                        className="flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:from-purple-700 hover:to-indigo-700 font-medium text-sm transition-all shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
                                    >
                                        View Event Details
                                        <ArrowRight className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
