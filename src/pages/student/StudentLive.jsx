import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { Activity, Trophy, Clock, Calendar, Users, Award } from 'lucide-react'
import { format } from 'date-fns'

export default function StudentLive() {
    const [liveEvents, setLiveEvents] = useState([])
    const [recentWinners, setRecentWinners] = useState([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetchLiveData()
        // Poll every 30 seconds for updates
        const interval = setInterval(fetchLiveData, 30000)
        return () => clearInterval(interval)
    }, [])

    const fetchLiveData = async () => {
        try {
            // Fetch ongoing/live events
            const { data: eventsData, error: eventsError } = await supabase
                .from('events')
                .select('*')
                .in('status', ['live', 'ongoing'])
                .order('day_order', { ascending: true })

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

            {/* Ongoing Events Section */}
            <div className="mb-12">
                <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
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
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {liveEvents.map((event) => (
                            <div
                                key={event.id}
                                className="bg-white rounded-xl shadow-md overflow-hidden border-2 border-red-500 relative"
                            >
                                {/* Live Badge */}
                                <div className="absolute top-4 right-4 z-10">
                                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-red-500 text-white shadow-lg">
                                        <span className="relative flex h-2 w-2 mr-2">
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                                            <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
                                        </span>
                                        LIVE
                                    </span>
                                </div>

                                {/* Event Image */}
                                <div className="h-40 overflow-hidden">
                                    <img
                                        src={event.image_path || 'https://via.placeholder.com/400x200'}
                                        alt={event.name}
                                        className="w-full h-full object-cover"
                                    />
                                </div>

                                {/* Event Details */}
                                <div className="p-6">
                                    <h3 className="text-lg font-bold text-gray-900 mb-2">{event.name}</h3>
                                    <div className="space-y-2 text-sm text-gray-600">
                                        <div className="flex items-center">
                                            <Calendar className="h-4 w-4 mr-2 text-gray-400" />
                                            <span>{event.venue}</span>
                                        </div>
                                        <div className="flex items-center">
                                            <Users className="h-4 w-4 mr-2 text-gray-400" />
                                            <span>{event.category}</span>
                                        </div>
                                    </div>
                                    <a
                                        href={`/events/${event.id}`}
                                        className="mt-4 block w-full text-center px-4 py-2 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 font-medium text-sm transition-colors"
                                    >
                                        Watch Live
                                    </a>
                                </div>
                            </div>
                        ))}
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
                                        <img
                                            src={event.image_path || 'https://via.placeholder.com/100'}
                                            alt={event.name}
                                            className="w-20 h-20 rounded-lg object-cover"
                                        />

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
