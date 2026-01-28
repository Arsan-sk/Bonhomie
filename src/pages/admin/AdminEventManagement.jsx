import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { Search, Calendar, MapPin, DollarSign, Users, Loader2 } from 'lucide-react'
import { Link } from 'react-router-dom'

export default function AdminEventManagement() {
    const [events, setEvents] = useState([])
    const [loading, setLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState('')

    useEffect(() => {
        fetchEvents()
    }, [])

    const fetchEvents = async () => {
        setLoading(true)
        try {
            const { data, error } = await supabase
                .from('events')
                .select('*')
                .order('event_date', { ascending: true })

            if (error) throw error
            setEvents(data || [])
        } catch (error) {
            console.error('Error fetching events:', error)
            alert('Failed to load events')
        } finally {
            setLoading(false)
        }
    }

    const filteredEvents = events.filter(event =>
        event.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        event.category?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        event.subcategory?.toLowerCase().includes(searchQuery.toLowerCase())
    )

    // Get category-based gradient colors
    const getCategoryGradient = (category) => {
        switch (category?.toLowerCase()) {
            case 'cultural':
                return 'from-purple-500 to-pink-600'
            case 'technical':
                return 'from-blue-500 to-indigo-600'
            case 'sports':
                return 'from-green-500 to-emerald-600'
            default:
                return 'from-indigo-500 to-purple-600'
        }
    }

    return (
        <div className="space-y-6">
            {/* Search */}
            <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    <Search className="h-5 w-5 text-gray-400" />
                </div>
                <input
                    type="text"
                    placeholder="Search events by name, category, or subcategory..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="block w-full rounded-lg border border-gray-300 pl-10 pr-3 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
            </div>

            {/* Events Grid */}
            {loading ? (
                <div className="flex justify-center items-center py-20">
                    <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
                </div>
            ) : filteredEvents.length === 0 ? (
                <div className="text-center py-20 text-gray-500">
                    <p>No events found</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredEvents.map((event) => (
                        <Link
                            key={event.id}
                            to={`/admin/advanced-management/event/${event.id}`}
                            className="bg-white rounded-xl border border-gray-200 hover:border-indigo-300 hover:shadow-lg transition-all overflow-hidden group"
                        >
                            <div className={`h-32 bg-gradient-to-br ${getCategoryGradient(event.category)} relative overflow-hidden`}>
                                <div className="absolute inset-0 opacity-20 bg-pattern"></div>
                                <div className="absolute bottom-0 left-0 right-0 p-4">
                                    <h3 className="text-white font-bold text-lg line-clamp-2 group-hover:scale-105 transition-transform">
                                        {event.name}
                                    </h3>
                                </div>
                            </div>
                            <div className="p-4 space-y-3">
                                <div className="flex items-center gap-2">
                                    <span className="px-2 py-1 bg-indigo-100 text-indigo-700 text-xs font-semibold rounded">
                                        {event.category}
                                    </span>
                                    <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs font-semibold rounded">
                                        {event.subcategory}
                                    </span>
                                </div>
                                <div className="space-y-2 text-sm text-gray-600">
                                    <div className="flex items-center gap-2">
                                        <Calendar className="h-4 w-4 text-gray-400" />
                                        <span>{event.event_date || 'Date TBD'}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <MapPin className="h-4 w-4 text-gray-400" />
                                        <span>{event.venue || 'Venue TBD'}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <DollarSign className="h-4 w-4 text-gray-400" />
                                        <span className="font-semibold text-green-600">₹{event.fee || 0}</span>
                                    </div>
                                    {event.subcategory === 'Group' && (
                                        <div className="flex items-center gap-2">
                                            <Users className="h-4 w-4 text-gray-400" />
                                            <span>{event.min_team_size} - {event.max_team_size} members</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            )}

            <p className="text-xs text-gray-500 text-center">
                Showing {filteredEvents.length} of {events.length} events
            </p>
        </div>
    )
}
