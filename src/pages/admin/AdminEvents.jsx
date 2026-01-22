import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { Plus, X, Users, Loader2, Trash2 } from 'lucide-react'
import SmartTable from '../../components/admin/ui/SmartTable'
import EventForm from '../../components/events/EventForm'
import { showToast } from '../../components/ui/Toast'

export default function AdminEvents() {
    const [events, setEvents] = useState([])
    const [loading, setLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState('')
    const [categoryFilter, setCategoryFilter] = useState('all') // NEW: Category filter

    // Modal State
    const [isEventFormOpen, setIsEventFormOpen] = useState(false)
    const [isCoordinatorModalOpen, setIsCoordinatorModalOpen] = useState(false)
    const [editingEvent, setEditingEvent] = useState(null)

    // Coordinator State
    const [assignments, setAssignments] = useState([])
    const [availableCoordinators, setAvailableCoordinators] = useState([])
    const [selectedCoordinatorId, setSelectedCoordinatorId] = useState('')
    const [assigning, setAssigning] = useState(false)

    useEffect(() => {
        fetchEvents()
        fetchAvailableCoordinators()
    }, [])

    const fetchEvents = async () => {
        setLoading(true)
        try {
            console.log('AdminEvents: Fetching all events...')

            const { data, error } = await supabase
                .from('events')
                .select('*')
                .order('day_order', { ascending: true })

            console.log('AdminEvents: Fetch result:', {
                dataCount: data?.length,
                error: error?.message,
                firstEvent: data?.[0]
            })

            if (error) {
                console.error('AdminEvents: Supabase error:', error)
                throw error
            }

            if (!data || data.length === 0) {
                console.warn('AdminEvents: No events found in database')
            }

            setEvents(data || [])
            console.log('AdminEvents: Events state updated with', data?.length || 0, 'events')
        } catch (error) {
            console.error('AdminEvents: Error fetching events:', error)
            setEvents([]) // Explicitly set empty array on error
        } finally {
            setLoading(false)
        }
    }

    const fetchAvailableCoordinators = async () => {
        try {
            console.log('Fetching available coordinators...')
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('role', 'coordinator')

            console.log('Available coordinators COUNT:', data?.length)
            console.log('Available coordinators DATA:', JSON.stringify(data, null, 2))
            console.log('Available coordinators ERROR:', error)

            if (error) {
                console.error('Error fetching coordinators:', error)
            }

            if (!data || data.length === 0) {
                console.warn('NO COORDINATORS FOUND - check if any profiles have role="faculty"')
            }

            setAvailableCoordinators(data || [])
        } catch (error) {
            console.error('Error fetching coordinators:', error)
        }
    }

    const fetchAssignments = async (eventId) => {
        try {
            console.log('Fetching assignments for event:', eventId)
            const { data, error } = await supabase
                .from('event_assignments')
                .select('*, coordinator:profiles(*)')
                .eq('event_id', eventId)

            console.log('Assignments COUNT:', data?.length)
            console.log('Assignments DATA:', JSON.stringify(data, null, 2))
            console.log('Assignments ERROR:', error)

            if (error) {
                console.error('Error fetching assignments:', error)
            }

            if (data && data.length > 0) {
                console.log('Assignment coordinator check:', data.map(a => ({
                    id: a.id,
                    coordinator_id: a.coordinator_id,
                    coordinator_name: a.coordinator?.full_name,
                    coordinator_email: a.coordinator?.college_email
                })))
            }

            setAssignments(data || [])
        } catch (error) {
            console.error('Error fetching assignments:', error)
        }
    }

    const handleOpenEventForm = (event = null) => {
        setEditingEvent(event)
        setIsEventFormOpen(true)
    }

    const handleOpenCoordinatorModal = async (event) => {
        setEditingEvent(event)
        await fetchAssignments(event.id)
        setIsCoordinatorModalOpen(true)
    }

    const handleSaveEvent = async (eventData) => {
        try {
            if (editingEvent) {
                // Update existing event
                const { error } = await supabase
                    .from('events')
                    .update(eventData)
                    .eq('id', editingEvent.id)

                if (error) throw error
                showToast('Event updated successfully!', 'success')
            } else {
                // Create new event
                const { data, error } = await supabase
                    .from('events')
                    .insert([eventData])
                    .select()
                    .single()

                if (error) throw error
                showToast('Event created successfully!', 'success')
            }

            await fetchEvents()
            setIsEventFormOpen(false)
            setEditingEvent(null)
        } catch (error) {
            console.error('Error saving event:', error)
            throw error
        }
    }

    const handleDeleteEvent = async (event) => {
        if (!event) return
        if (!window.confirm(`Are you sure you want to delete "${event.name}"? This will also delete all registrations and assignments for this event. This action cannot be undone.`)) {
            return
        }

        try {
            // Step 1: Delete all registrations for this event
            const { error: regError } = await supabase
                .from('registrations')
                .delete()
                .eq('event_id', event.id)

            if (regError) {
                console.error('Error deleting registrations:', regError)
                // Continue anyway - might not have any registrations
            }

            // Step 2: Delete all event assignments
            const { error: assignError } = await supabase
                .from('event_assignments')
                .delete()
                .eq('event_id', event.id)

            if (assignError) {
                console.error('Error deleting assignments:', assignError)
                // Continue anyway
            }

            // Step 3: Now delete the event itself
            const { error } = await supabase
                .from('events')
                .delete()
                .eq('id', event.id)

            if (error) throw error

            alert('Event deleted successfully!')

            // Refresh the events list
            fetchEvents()
        } catch (error) {
            console.error('Error deleting event:', error)
            alert(`Failed to delete event: ${error.message}`)
        }
    }

    const handleAssignCoordinator = async () => {
        if (!selectedCoordinatorId || !editingEvent) return
        setAssigning(true)
        try {
            if (assignments.some(a => a.coordinator.id === selectedCoordinatorId)) {
                alert('Already assigned.')
                return
            }
            await supabase.from('event_assignments').insert([{
                event_id: editingEvent.id,
                coordinator_id: selectedCoordinatorId
            }])
            fetchAssignments(editingEvent.id)
            setSelectedCoordinatorId('')
        } catch (error) {
            console.error(error)
        } finally {
            setAssigning(false)
        }
    }

    const handleRemoveAssignment = async (id) => {
        if (!confirm('Remove assignment?')) return
        await supabase.from('event_assignments').delete().eq('id', id)
        setAssignments(assignments.filter(a => a.id !== id))
    }

    const columns = [
        {
            key: 'name', title: 'Event Name', sortable: true, render: (row) => (
                <div className="flex items-center">
                    <div className="h-10 w-10 flex-shrink-0">
                        <img className="h-10 w-10 rounded-full object-cover" src={row.image_path || row.image_url || 'https://via.placeholder.com/150'} alt="" />
                    </div>
                    <div className="ml-4">
                        <div className="font-medium text-gray-900">{row.name}</div>
                        <div className="text-gray-500">{row.category}</div>
                    </div>
                </div>
            )
        },
        { key: 'venue', title: 'Venue', sortable: true },
        { key: 'day', title: 'Day', sortable: true },
        {
            key: 'actions', title: 'Actions', render: (row) => (
                <div className="flex items-center gap-2">
                    <button
                        onClick={(e) => { e.stopPropagation(); handleDeleteEvent(row) }}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-red-600 bg-white hover:bg-red-50 border border-red-200 text-xs font-semibold transition-all shadow-sm"
                        title="Delete Event"
                    >
                        <Trash2 className="h-3.5 w-3.5" />
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); handleOpenCoordinatorModal(row) }}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-gray-600 bg-white hover:bg-indigo-50 hover:text-indigo-600 border border-gray-200 text-xs font-semibold transition-all shadow-sm"
                    >
                        <Users className="h-3.5 w-3.5" /> Assign
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); handleOpenEventForm(row) }}
                        className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 text-xs font-semibold transition-all shadow-sm"
                    >
                        Edit
                    </button>
                </div>
            )
        }
    ]

    // Filter events by search query AND category
    const filteredEvents = events.filter(ev => {
        const matchesSearch = ev.name?.toLowerCase().includes(searchQuery.toLowerCase())
        const matchesCategory = categoryFilter === 'all' || ev.category === categoryFilter
        return matchesSearch && matchesCategory
    })

    return (
        <div className="space-y-8 pb-10">
            <div className="flex justify-between items-center px-1">
                <div>
                    <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">Events Management</h2>
                    <p className="mt-1 text-sm text-gray-500">Curate and manage your event portfolio.</p>
                </div>
                <button
                    onClick={() => handleOpenEventForm()}
                    className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-xl hover:bg-indigo-700 font-semibold shadow-lg shadow-indigo-200 transition-all hover:scale-105 active:scale-95"
                >
                    <Plus className="h-5 w-5" /> Create Event
                </button>
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                <SmartTable
                    columns={columns}
                    data={filteredEvents}
                    loading={loading}
                    searchable={true}
                    onSearchChange={setSearchQuery}

                    customFilters={
                        <div className="flex items-center gap-2">
                            <label className="text-sm font-medium text-gray-700">Category:</label>
                            <select
                                value={categoryFilter}
                                onChange={(e) => setCategoryFilter(e.target.value)}
                                className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            >
                                <option value="all">All Categories</option>
                                <option value="Cultural">Cultural</option>
                                <option value="Technical">Technical</option>
                                <option value="Sports">Sports</option>
                            </select>
                        </div>
                    }
                />
            </div>

            {/* Event Form Modal */}
            <EventForm
                isOpen={isEventFormOpen}
                onClose={() => {
                    setIsEventFormOpen(false)
                    setEditingEvent(null)
                }}
                onSubmit={handleSaveEvent}
                initialData={editingEvent}
                role="admin"
            />

            {/* Coordinator Assignment Modal */}
            {isCoordinatorModalOpen && editingEvent && (
                <div className="fixed inset-0 z-50 overflow-hidden" role="dialog">
                    <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm" onClick={() => setIsCoordinatorModalOpen(false)} />

                    <div className="absolute inset-y-0 right-0 w-full max-w-2xl bg-white shadow-2xl flex flex-col">
                        {/* Header */}
                        <div className="px-8 py-6 border-b border-gray-100 flex justify-between items-center">
                            <div>
                                <h3 className="text-xl font-bold text-gray-900">Manage Coordinators</h3>
                                <p className="text-sm text-gray-500 mt-1">{editingEvent.name}</p>
                            </div>
                            <button onClick={() => setIsCoordinatorModalOpen(false)} className="p-2 rounded-full hover:bg-gray-100 transition-colors">
                                <X className="h-6 w-6 text-gray-400" />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto p-8">
                            <div className="space-y-8">
                                <div className="bg-gray-50 rounded-2xl border border-gray-100 p-6 shadow-sm">
                                    <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">Add Coordinator</h4>
                                    <div className="flex gap-4">
                                        <select
                                            value={selectedCoordinatorId}
                                            onChange={e => setSelectedCoordinatorId(e.target.value)}
                                            className="flex-1 px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                        >
                                            <option value="">Select Coordinator...</option>
                                            {availableCoordinators.map(c => (
                                                <option key={c.id} value={c.id}>{c.full_name}</option>
                                            ))}
                                        </select>
                                        <button
                                            onClick={handleAssignCoordinator}
                                            disabled={!selectedCoordinatorId || assigning}
                                            className="px-6 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 font-semibold disabled:opacity-50 whitespace-nowrap shadow-md transition-all"
                                        >
                                            {assigning ? <Loader2 className="animate-spin h-5 w-5" /> : 'Assign'}
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Assigned Coordinators</h4>
                                    {assignments.length === 0 ? (
                                        <div className="text-center py-12 bg-white rounded-xl border border-dashed border-gray-200">
                                            <Users className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                                            <p className="text-gray-500 font-medium">No coordinators assigned yet.</p>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-1 gap-3">
                                            {assignments.map(a => (
                                                <div key={a.id} className="flex justify-between items-center p-4 bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow group">
                                                    <div className="flex items-center gap-4">
                                                        <div className="h-10 w-10 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center text-indigo-700 font-bold text-sm">
                                                            {a.coordinator?.full_name?.[0]}
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-bold text-gray-900 group-hover:text-indigo-600 transition-colors">{a.coordinator?.full_name}</p>
                                                            <p className="text-xs text-gray-500">{a.coordinator?.college_email}</p>
                                                        </div>
                                                    </div>
                                                    <button
                                                        onClick={() => handleRemoveAssignment(a.id)}
                                                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                                    >
                                                        <Trash2 className="h-5 w-5" />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="px-8 py-6 border-t border-gray-100 bg-white flex justify-between items-center">
                            <div />
                            <button
                                type="button"
                                onClick={() => setIsCoordinatorModalOpen(false)}
                                className="px-6 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 font-semibold shadow-lg transition-all"
                            >
                                Done
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
