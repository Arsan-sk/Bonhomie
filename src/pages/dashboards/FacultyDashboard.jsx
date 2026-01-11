import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { Loader2, Edit, Users } from 'lucide-react'
import { Link } from 'react-router-dom'
import EventEditor from '../../components/dashboard/EventEditor'

export default function FacultyDashboard() {
    const { user, profile } = useAuth()
    const [assignedEvents, setAssignedEvents] = useState([])
    const [loading, setLoading] = useState(true)
    const [editingEvent, setEditingEvent] = useState(null)

    useEffect(() => {
        if (user) {
            fetchAssignedEvents()
        }
    }, [user])

    const fetchAssignedEvents = async () => {
        try {
            // In a real app, we'd filter by checking if user.id is in faculty_coordinators JSONB array.
            // Since Supabase filtering on JSONB arrays of objects is tricky with simple query builder,
            // we might fetch all events and filter client side, or use an RPC function.
            // For this prototype, we'll fetch all events and filter in JS.

            const { data, error } = await supabase
                .from('events')
                .select('*')

            if (error) throw error

            // Filter where current user is a coordinator
            const myEvents = data.filter(event => {
                const coordinators = event.faculty_coordinators || []
                // Assuming we store ID in the coordinator object, or just match by name/email if that's what we have.
                // The prompt suggested: auth.uid() = ANY (SELECT jsonb_array_elements_text(f->'id')...)
                // Let's assume the coordinator object has an 'id' field matching the profile id.
                return coordinators.some(c => c.id === user.id)
            })

            setAssignedEvents(myEvents)
        } catch (error) {
            console.error('Error fetching assigned events:', error)
        } finally {
            setLoading(false)
        }
    }

    if (loading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div>

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900">Faculty Dashboard</h1>
                <p className="mt-2 text-gray-600">Manage your assigned events.</p>
            </div>

            <div className="bg-white shadow overflow-hidden sm:rounded-lg">
                <div className="px-4 py-5 sm:px-6">
                    <h3 className="text-lg leading-6 font-medium text-gray-900">Assigned Events</h3>
                </div>
                <div className="border-t border-gray-200">
                    {assignedEvents.length > 0 ? (
                        <ul className="divide-y divide-gray-200">
                            {assignedEvents.map((event) => (
                                <li key={event.id} className="px-4 py-4 sm:px-6">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h4 className="text-lg font-medium text-gray-900">{event.name}</h4>
                                            <p className="text-sm text-gray-500">{event.day} • {event.category}</p>
                                        </div>
                                        <div className="flex space-x-3">
                                            <Link
                                                to={`/events/${event.id}`}
                                                className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                                            >
                                                View
                                            </Link>
                                            {/* Edit functionality would go here - simplified for prototype */}
                                            {/* Edit functionality */}
                                            <button
                                                onClick={() => setEditingEvent(event)}
                                                className="inline-flex items-center px-3 py-1.5 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary hover:bg-blue-700"
                                            >
                                                <Edit className="h-4 w-4 mr-2" /> Edit
                                            </button>
                                        </div>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <div className="text-center py-12">
                            <p className="text-gray-500">No events assigned to you.</p>
                        </div>
                    )}
                </div>
            </div>
            {editingEvent && (
                <EventEditor
                    event={editingEvent}
                    onClose={() => setEditingEvent(null)}
                    onUpdate={fetchAssignedEvents}
                />
            )}
        </div>
    )
}
