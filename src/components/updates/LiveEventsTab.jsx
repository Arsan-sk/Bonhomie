import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { Activity, Clock, MapPin, ArrowRight } from 'lucide-react'
import { format } from 'date-fns'
import { useNavigate } from 'react-router-dom'
import { getUnsplashImageUrl, getCategoryImage } from '../../utils/unsplashHelper'
import SimpleCardFallback from '../ui/SimpleCardFallback'
import { useAuth } from '../../context/AuthContext'

export default function LiveEventsTab() {
    const navigate = useNavigate()
    const { profile } = useAuth()
    const [liveEvents, setLiveEvents] = useState([])
    const [loading, setLoading] = useState(true)
    const [imageErrors, setImageErrors] = useState({})

    useEffect(() => {
        fetchLiveEvents()
        // Poll every 30 seconds for updates
        const interval = setInterval(fetchLiveEvents, 30000)
        return () => clearInterval(interval)
    }, [])

    const fetchLiveEvents = async () => {
        try {
            const { data, error } = await supabase
                .from('events')
                .select('*')
                .eq('is_live', true)
                .order('live_started_at', { ascending: false })

            if (error) throw error
            setLiveEvents(data || [])
        } catch (error) {
            console.error('Error fetching live events:', error)
        } finally {
            setLoading(false)
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
            </div>
        )
    }

    return (
        <div>
            <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-2 flex items-center">
                    <Activity className="h-6 w-6 mr-2 text-purple-600" />
                    Happening Now
                </h2>
                <p className="text-gray-600">Watch events unfold in real-time</p>
            </div>

            {liveEvents.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-xl shadow-sm border border-gray-200">
                    <Clock className="mx-auto h-16 w-16 text-gray-400 mb-4" />
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">No live events right now</h3>
                    <p className="text-gray-500">Check back soon for live updates!</p>
                </div>
            ) : (
                <div className="relative">
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
                                    {/* Image Section */}
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

                                        {/* Live Badge */}
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

                                    {/* Content Section */}
                                    <div className="flex-1 min-w-0 flex flex-col">
                                        <h3 className="text-base font-bold text-gray-900 mb-2 line-clamp-1">
                                            {event.name}
                                        </h3>

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
    )
}
