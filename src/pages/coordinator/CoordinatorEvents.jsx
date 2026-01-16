import { useState, useEffect } from 'react'
import { Plus, Search, Calendar, MapPin, Users, ArrowRight } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { Link } from 'react-router-dom'
import EventForm from '../../components/events/EventForm'
import { showToast } from '../../components/ui/Toast'
import EventCard from '../../components/events/EventCard'

export default function CoordinatorEvents() {
    const { user } = useAuth()
    const [events, setEvents] = useState([])
    const [loading, setLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState('')
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [festSettings, setFestSettings] = useState(null)

    useEffect(() => {
        fetchFestSettings()
        if (user) fetchMyEvents()
    }, [user])

    const fetchFestSettings = async () => {
        try {
            const { data } = await supabase
                .from('global_settings')
                .select('*')
                .single()
            setFestSettings(data)
        } catch (error) {
            console.error('Error fetching fest settings:', error)
        }
    }

    const fetchMyEvents = async () => {
        setLoading(true)
        try {
            // Fetch events where user is assigned
            const { data: assignments } = await supabase
                .from('event_assignments')
                .select('event:events(*)')
                .eq('coordinator_id', user.id)

            const myEvents = assignments?.map(a => a.event) || []
            setEvents(myEvents)
        } catch (error) {
            console.error('Error fetching events:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleCreateEvent = async (eventData) => {
        try {
            // 1. Create event in events table (same table for all events)
            const { data: newEvent, error: eventError } = await supabase
                .from('events')
                .insert([eventData])
                .select()
                .single()

            if (eventError) throw eventError

            // 2. Auto-assign to coordinator
            const { error: assignError } = await supabase
                .from('event_assignments')
                .insert([{
                    event_id: newEvent.id,
                    coordinator_id: user.id
                }])

            if (assignError) throw assignError

            // 3. Refresh event list
            await fetchMyEvents()
            showToast('Event created successfully!', 'success')
        } catch (error) {
            console.error('Error creating event:', error)
            showToast('Failed to create event: ' + error.message, 'error')
            throw error
        }
    }

    const filteredEvents = events.filter(ev =>
        ev?.name?.toLowerCase().includes(searchQuery.toLowerCase())
    )

    return (
        <div className="max-w-7xl mx-auto space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">My Events</h1>
                    <p className="text-gray-500">Manage the events you are assigned to.</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search events..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 shadow-sm transition-all"
                        />
                    </div>
                    {/* Create Event Button */}
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-xl hover:bg-indigo-700 font-semibold shadow-md shadow-indigo-100 transition-all hover:scale-105 active:scale-95"
                    >
                        <Plus className="h-5 w-5" /> New Event
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center py-20">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                </div>
            ) : filteredEvents.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-gray-200">
                    <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900">No events found</h3>
                    <p className="text-gray-500">You haven't been assigned to any events yet.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredEvents.map(event => (
                        <EventCard key={event.id} event={event} baseUrl="/coordinator/events" festSettings={festSettings} />
                    ))}
                </div>
            )}

            {/* Event Form Modal */}
            <EventForm
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSubmit={handleCreateEvent}
                role="coordinator"
            />
        </div>
    )
}
