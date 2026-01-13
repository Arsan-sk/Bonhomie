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
            const { data, error } = await supabase
                .from('events')
                .select('*')
                .order('day_order', { ascending: true })

            if (error) throw error
            setEvents(data || [])
        } catch (error) {
            console.error('Error fetching events:', error)
        } finally {
            setLoading(false)
        }
    }

    const fetchAvailableCoordinators = async () => {
        try {
            const { data } = await supabase
                .from('profiles')
                .select('*')
                .eq('role', 'faculty')

            setAvailableCoordinators(data || [])
        } catch (error) {
            console.error('Error fetching coordinators:', error)
        }
    }

    const fetchAssignments = async (eventId) => {
        try {
            const { data } = await supabase
                .from('event_assignments')
                .select('*, coordinator:profiles(*)')
                .eq('event_id', eventId)

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

    const handleDeleteEvent = async () => {
        if (!editingEvent) return
        if (!confirm(`Delete "${editingEvent.name}"? This cannot be undone.`)) return

        try {
            const { error } = await supabase
                .from('events')
                .delete()
                .eq('id', editingEvent.id)

            if (error) throw error

            showToast('Event deleted successfully!', 'success')
            setIsEventFormOpen(false)
            setEditingEvent(null)
            fetchEvents()
        } catch (error) {
            console.error('Error deleting event:', error)
            showToast('Failed to delete event', 'error')
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

    const filteredEvents = events.filter(ev => ev.name?.toLowerCase().includes(searchQuery.toLowerCase()))

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
                    emptyMessage="No events found."
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
