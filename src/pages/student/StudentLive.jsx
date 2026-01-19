import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { Activity, Trophy, Clock, Calendar, Users, Award, MapPin, ArrowRight } from 'lucide-react'
import { format } from 'date-fns'
import { useNavigate } from 'react-router-dom'
import { getUnsplashImageUrl, getCategoryImage } from '../../utils/unsplashHelper'
import SimpleCardFallback from '../../components/ui/SimpleCardFallback'
import { useAuth } from '../../context/AuthContext'

export default function StudentLive() {
    const navigate = useNavigate()
    const { profile } = useAuth()
    const [liveEvents, setLiveEvents] = useState([])
    const [recentWinners, setRecentWinners] = useState([])
    const [loading, setLoading] = useState(true)
    const [imageErrors, setImageErrors] = useState({})

    useEffect(() => {
        fetchLiveData()
        // Poll every 30 seconds for updates
        const interval = setInterval(fetchLiveData, 30000)
        return () => clearInterval(interval)
    }, [])

    const fetchLiveData = async () => {
        try {
            // Fetch live events
            const { data: eventsData, error: eventsError } = await supabase
                .from('events')
                .select('*')
                .eq('is_live', true)
                .order('live_started_at', { ascending: false })

            if (eventsError) throw eventsError
            setLiveEvents(eventsData || [])

            // Fetch recent winners
            const { data: winnersData, error: winnersError } = await supabase
                .from('events')
                .select(`
                    id,
                    name,
                    category,
                    image_path,
                    winner:profiles!winner_profile_id(full_name),
                    runnerup:profiles!runnerup_profile_id(full_name),
                    updated_at
                `)
                .not('winner_profile_id', 'is', null)
                .order('updated_at', { ascending: false })
                .limit(5)

            if (winnersError) throw winnersError
            setRecentWinners(winnersData || [])
        } catch (error) {
            console.error('Error fetching live data:', error)
        } finally {
            setLoading(false)
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
            {/* Header */}
            <div className="mb-8">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Live Events</h1>
                        <p className="mt-2 text-gray-600">Real-time updates from ongoing events</p>
                    </div>
                    <div className="flex items-center space-x-2 text-sm">
                        <div className="flex items-center">
                            <span className="relative flex h-3 w-3 mr-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                            </span>
                            <span className="text-gray-600 font-medium">Live</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Ongoing Events Section - SCROLLABLE */}
            <div className="mb-12">
                <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
                    <Activity className="h-6 w-6 mr-2 text-purple-600" />
                    Happening Now
                </h2>

                {liveEvents.length === 0 ? (
                    <div className="text-center py-12 bg-white rounded-lg shadow-sm">
                        <Clock className="mx-auto h-12 w-12 text-gray-400" />
                        <h3 className="mt-4 text-lg font-medium text-gray-900">No live events right now</h3>
                        <p className="mt-2 text-gray-500">Check back soon for live updates!</p>
                    </div>
                ) : (
                    <div className="relative">
                        {/* FIXED HEIGHT SCROLLABLE CONTAINER */}
                        <div
                            className="overflow-y-auto space-y-4 pr-2 custom-scrollbar"
                            style={{ maxHeight: '600px' }}
                        >
                            {liveEvents.map((event) => (
                                <div
                                    key={event.id}
                                    className="bg-white rounded-lg shadow-md border border-red-300 overflow-hidden transition-all duration-300 hover:shadow-xl hover:border-red-500 hover:-translate-y-0.5"
                                >
                                    <div className="flex gap-3 p-3">
                                        {/* Image Section - Compact */}
                                        <div className="relative flex-shrink-0 w-32 h-32 rounded-lg overflow-hidden">
                                            {!imageErrors[`live-${event.id}`] ? (
                                                <div className="relative w-full h-full group">
                                                    <img
                                                        src={event.image_path || getUnsplashImageUrl(event.name, 200, 200)}
                                                        alt={event.name}
                                                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                                                        onError={(e) => {
                                                            const categoryImg = getCategoryImage(event.category)
                                                            if (e.target.src !== categoryImg) {
                                                                e.target.src = categoryImg
                                                            } else {
                                                                setImageErrors(prev => ({ ...prev, [`live-${event.id}`]: true }))
                                                            }
                                                        }}
                                                    />
                                                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                                                </div>
                                            ) : (
                                                <SimpleCardFallback
                                                    category={event.category}
                                                    height="h-full"
                                                />
                                            )}

                                            {/* Live Badge - Compact */}
                                            <div className="absolute top-2 left-2">
                                                <span className="inline-flex items-center px-2 py-1 rounded-full text-[10px] font-bold bg-red-500 text-white shadow-md">
                                                    <span className="relative flex h-1.5 w-1.5 mr-1">
                                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                                                        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-white"></span>
                                                    </span>
                                                    LIVE
                                                </span>
                                            </div>
                                        </div>

                                        {/* Content Section - Compact */}
                                        <div className="flex-1 min-w-0 flex flex-col">
                                            {/* Event Title */}
                                            <h3 className="text-base font-bold text-gray-900 mb-2 line-clamp-1">
                                                {event.name}
                                            </h3>

                                            {/* Event Details - Compact */}
                                            <div className="space-y-1.5 mb-3 flex-grow">
                                                {event.subcategory && (
                                                    <div className="flex items-center text-xs text-gray-600">
                                                        <Activity className="h-3.5 w-3.5 mr-1.5 text-purple-500 flex-shrink-0" />
                                                        <span className="line-clamp-1">{event.subcategory}</span>
                                                    </div>
                                                )}
                                                <div className="flex items-center text-xs text-gray-600">
                                                    <MapPin className="h-3.5 w-3.5 mr-1.5 text-purple-500 flex-shrink-0" />
                                                    <span className="line-clamp-1">{event.venue || 'TBA'}</span>
                                                </div>
                                                {event.live_started_at && (
                                                    <div className="flex items-center text-xs">
                                                        <Clock className="h-3.5 w-3.5 mr-1.5 text-red-500 flex-shrink-0" />
                                                        <span className="text-red-600 font-semibold">
                                                            {format(new Date(event.live_started_at), 'h:mm a')}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Action Button - Compact */}
                                            <button
                                                onClick={() => {
                                                    const basePath = profile?.role === 'coordinator' ? '/coordinator/browse-events' : '/student/events'
                                                    navigate(`${basePath}/${event.id}`)
                                                }}
                                                className="flex items-center justify-center gap-1.5 px-4 py-2 bg-gradient-to-r from-red-500 to-pink-500 text-white rounded-md text-sm font-semibold hover:from-red-600 hover:to-pink-600 transition-all shadow-md hover:shadow-lg"
                                            >
                                                View Details
                                                <ArrowRight className="h-3.5 w-3.5" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Scroll indicator */}
                        {liveEvents.length > 3 && (
                            <div className="text-center mt-4 py-2 bg-gradient-to-r from-red-50 to-pink-50 rounded-lg">
                                <p className="text-sm font-medium text-red-600">
                                    Scroll to see more • {liveEvents.length} events live now
                                </p>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Recent Winners Section */}
            <div>
                <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                    <Trophy className="h-6 w-6 mr-2 text-yellow-500" />
                    Recent Winners
                </h2>

                {recentWinners.length === 0 ? (
                    <div className="text-center py-12 bg-white rounded-lg shadow-sm">
                        <Award className="mx-auto h-12 w-12 text-gray-400" />
                        <p className="mt-4 text-gray-500">No winners announced yet</p>
                    </div>
                ) : (
                    <div className="bg-white rounded-xl shadow-md overflow-hidden">
                        <div className="divide-y divide-gray-100">
                            {recentWinners.map((event) => (
                                <div
                                    key={event.id}
                                    className="p-6 hover:bg-gray-50 transition-colors"
                                >
                                    <div className="flex items-start space-x-4">
                                        {/* Event Image */}
                                        <div className="w-20 h-20 rounded-lg overflow-hidden flex-shrink-0">
                                            {!imageErrors[`winner-${event.id}`] ? (
                                                <img
                                                    src={event.image_path || getUnsplashImageUrl(event.name, 200, 200)}
                                                    alt={event.name}
                                                    className="w-full h-full object-cover"
                                                    onError={(e) => {
                                                        const categoryImg = getCategoryImage(event.category)
                                                        if (e.target.src !== categoryImg) {
                                                            e.target.src = categoryImg
                                                        } else {
                                                            setImageErrors(prev => ({ ...prev, [`winner-${event.id}`]: true }))
                                                        }
                                                    }}
                                                />
                                            ) : (
                                                <StaticCardFallback
                                                    eventName={event.name}
                                                    category={event.category}
                                                    height="h-full"
                                                />
                                            )}
                                        </div>

                                        {/* Event Info */}
                                        <div className="flex-1">
                                            <h3 className="text-lg font-bold text-gray-900">{event.name}</h3>
                                            <p className="text-sm text-gray-500 mb-2">{event.category}</p>

                                            {/* Winners */}
                                            <div className="space-y-1 text-sm">
                                                {event.winner && (
                                                    <div className="flex items-center">
                                                        <Trophy className="h-4 w-4 mr-2 text-yellow-500" />
                                                        <span className="font-semibold text-gray-900">
                                                            {event.winner.full_name}
                                                        </span>
                                                        <span className="ml-2 text-xs text-gray-500">Winner</span>
                                                    </div>
                                                )}
                                                {event.runnerup && (
                                                    <div className="flex items-center">
                                                        <Award className="h-4 w-4 mr-2 text-gray-400" />
                                                        <span className="font-semibold text-gray-900">
                                                            {event.runnerup.full_name}
                                                        </span>
                                                        <span className="ml-2 text-xs text-gray-500">Runner-up</span>
                                                    </div>
                                                )}
                                            </div>

                                            <p className="text-xs text-gray-400 mt-2">
                                                Announced {format(new Date(event.updated_at), 'MMM d, h:mm a')}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
