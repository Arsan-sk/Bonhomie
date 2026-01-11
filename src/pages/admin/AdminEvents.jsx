import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { Plus, X, Upload, Users, Loader2, Trash2, Calendar, Clock, MapPin, DollarSign, Shield, FileText } from 'lucide-react'
import SmartTable from '../../components/admin/ui/SmartTable'
import UnsplashPicker from '../../components/dashboard/UnsplashPicker'
import { AdminInput, AdminSelect, AdminTextarea } from '../../components/admin/ui/AdminForm'

export default function AdminEvents() {
    const [events, setEvents] = useState([])
    const [loading, setLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState('')

    // Event Modal State
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [activeTab, setActiveTab] = useState('details') // 'details', 'coordinators'
    const [editingEvent, setEditingEvent] = useState(null)

    // Form Data
    const [formData, setFormData] = useState({
        name: '', description: '', date: '', time: '', venue: '',
        category: 'Technical', team_size: 1, max_team_size: 1, registration_fee: 0,
        image_url: '', day: 'Day 1', mode: 'offline',
        upi_id: '', rules: ''
    })

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
        const { data, error } = await supabase.from('events').select('*').order('day_order', { ascending: true })
        if (error) console.error(error)
        else setEvents(data || [])
        setLoading(false)
    }

    const fetchAvailableCoordinators = async () => {
        const { data } = await supabase
            .from('profiles')
            .select('id, full_name')
            .eq('role', 'coordinator')
            .order('full_name')
        setAvailableCoordinators(data || [])
    }

    const fetchAssignments = async (eventId) => {
        const { data } = await supabase
            .from('event_assignments')
            .select(`id, coordinator:profiles (id, full_name, college_email)`)
            .eq('event_id', eventId)
        setAssignments(data || [])
    }

    // --- Handlers ---
    const handleOpenModal = (event = null, tab = 'details') => {
        setIsModalOpen(true)
        setActiveTab(tab)
        if (event) {
            setEditingEvent(event)
            setFormData({
                ...event,
                day: event.day || 'Day 1',
                rules: event.rules || '',
                min_team_size: event.min_team_size || 1,
                max_team_size: event.max_team_size || 1
            })
            fetchAssignments(event.id)
        } else {
            setEditingEvent(null)
            setFormData({
                name: '', description: '', date: '', time: '', venue: '',
                category: 'Technical', team_size: 1, max_team_size: 1, registration_fee: 0,
                image_url: '', day: 'Day 1', mode: 'offline', upi_id: '', rules: ''
            })
            setAssignments([])
        }
    }

    const handleSaveEvent = async (e) => {
        e.preventDefault()
        const dayOrderMap = { 'Day 1': 1, 'Day 2': 2, 'Day 3': 3 }
        const payload = {
            ...formData,
            day_order: dayOrderMap[formData.day] || 1,
            min_team_size: Number(formData.min_team_size),
            max_team_size: Number(formData.max_team_size),
            registration_fee: Number(formData.registration_fee)
        }

        let eventId = editingEvent?.id

        if (editingEvent) {
            await supabase.from('events').update(payload).eq('id', eventId)
        } else {
            const { data } = await supabase.from('events').insert([payload]).select().single()
            if (data) {
                eventId = data.id
                setEditingEvent(data)
            }
        }

        if (document.activeElement.innerText === 'Save & Close') setIsModalOpen(false)
        else alert('Event Saved!')
        fetchEvents()
    }

    const handleDeleteEvent = async () => {
        if (!editingEvent || !confirm('Delete this event?')) return
        await supabase.from('events').delete().eq('id', editingEvent.id)
        setIsModalOpen(false)
        fetchEvents()
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
        } catch (error) { console.error(error) } finally { setAssigning(false) }
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
                        <img className="h-10 w-10 rounded-full object-cover" src={row.image_url || 'https://via.placeholder.com/150'} alt="" />
                    </div>
                    <div className="ml-4">
                        <div className="font-medium text-gray-900">{row.name}</div>
                        <div className="text-gray-500">{row.category}</div>
                    </div>
                </div>
            )
        },
        { key: 'venue', title: 'Venue', sortable: true },
        {
            key: 'actions', title: 'Actions', render: (row) => (
                <div className="flex items-center gap-2">
                    <button
                        onClick={(e) => { e.stopPropagation(); handleOpenModal(row, 'coordinators') }}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-gray-600 bg-white hover:bg-indigo-50 hover:text-indigo-600 border border-gray-200 text-xs font-semibold transition-all shadow-sm"
                    >
                        <Users className="h-3.5 w-3.5" /> Assign
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); handleOpenModal(row, 'details') }}
                        className="text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                    >
                        Edit
                    </button>
                </div>
            )
        }
    ]

    const filteredEvents = events.filter(ev => ev.name.toLowerCase().includes(searchQuery.toLowerCase()))

    return (
        <div className="space-y-8 pb-10">
            <div className="flex justify-between items-center px-1">
                <div>
                    <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">Events Management</h2>
                    <p className="mt-1 text-sm text-gray-500">Curate and manage your event portfolio.</p>
                </div>
                <button
                    onClick={() => handleOpenModal()}
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

            {/* Unified Event Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 overflow-hidden" role="dialog" aria-modal="true">
                    <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm transition-opacity" onClick={() => setIsModalOpen(false)} />

                    <div className="absolute inset-y-0 right-0 w-full max-w-2xl bg-white shadow-2xl transform transition-transform duration-300 ease-in-out flex flex-col">

                        {/* Header */}
                        <div className="px-8 py-6 border-b border-gray-100 flex justify-between items-center bg-white/80 backdrop-blur-md sticky top-0 z-10">
                            <div>
                                <h3 className="text-xl font-bold text-gray-900">{editingEvent ? 'Edit Event' : 'New Event'}</h3>
                                <p className="text-sm text-gray-500 mt-1">{editingEvent ? editingEvent.name : 'Create a new experience'}</p>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="p-2 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"><X className="h-6 w-6" /></button>
                        </div>

                        {/* Tabs */}
                        <div className="flex border-b border-gray-100 px-8">
                            <button
                                onClick={() => setActiveTab('details')}
                                className={`mr-8 py-4 text-sm font-semibold border-b-2 transition-colors ${activeTab === 'details' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
                            >
                                Event Details
                            </button>
                            <button
                                onClick={() => setActiveTab('coordinators')}
                                disabled={!editingEvent}
                                className={`py-4 text-sm font-semibold border-b-2 transition-colors ${activeTab === 'coordinators' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed'}`}
                            >
                                Coordinators
                            </button>
                        </div>

                        {/* Content Area */}
                        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                            {activeTab === 'details' ? (
                                <form id="event-form" onSubmit={handleSaveEvent} className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-6">
                                        <div className="col-span-2">
                                            <AdminInput label="Event Name" placeholder="e.g. Hackathon 2026" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} required />
                                        </div>

                                        <div>
                                            <AdminSelect label="Category" value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })}>
                                                <option>Technical</option><option>Cultural</option><option>Sports</option><option>Gaming</option><option>Vlog</option>
                                            </AdminSelect>
                                        </div>

                                        <div>
                                            <AdminSelect label="Day" value={formData.day} onChange={e => setFormData({ ...formData, day: e.target.value })}>
                                                <option>Day 1</option><option>Day 2</option><option>Day 3</option>
                                            </AdminSelect>
                                        </div>

                                        <div className="col-span-1">
                                            <AdminInput label="Date" icon={Calendar} placeholder="YYYY-MM-DD" value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} />
                                        </div>

                                        <div className="col-span-1">
                                            <AdminInput label="Time" icon={Clock} placeholder="10:00 AM" value={formData.time} onChange={e => setFormData({ ...formData, time: e.target.value })} />
                                        </div>

                                        <div className="col-span-2">
                                            <AdminInput label="Venue" icon={MapPin} placeholder="Auditorium, Lab 1..." value={formData.venue} onChange={e => setFormData({ ...formData, venue: e.target.value })} />
                                        </div>

                                        <div>
                                            <AdminInput label="Min Team Size" type="number" min="1" value={formData.min_team_size} onChange={e => setFormData({ ...formData, min_team_size: e.target.value })} />
                                        </div>
                                        <div>
                                            <AdminInput label="Max Team Size" type="number" min="1" value={formData.max_team_size} onChange={e => setFormData({ ...formData, max_team_size: e.target.value })} />
                                        </div>

                                        <div>
                                            <AdminInput label="Fee (₹)" icon={DollarSign} type="number" value={formData.registration_fee} onChange={e => setFormData({ ...formData, registration_fee: e.target.value })} />
                                        </div>

                                        <div>
                                            <AdminSelect label="Mode" value={formData.mode} onChange={e => setFormData({ ...formData, mode: e.target.value })}>
                                                <option value="offline">Offline</option>
                                                <option value="online">Online</option>
                                                <option value="hybrid">Hybrid</option>
                                            </AdminSelect>
                                        </div>

                                        <div className="col-span-2">
                                            <AdminInput label="UPI ID" icon={Shield} placeholder="example@oksbi" value={formData.upi_id} onChange={e => setFormData({ ...formData, upi_id: e.target.value })} />
                                        </div>

                                        <div className="col-span-2">
                                            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 ml-1">Cover Image</label>
                                            <UnsplashPicker onSelect={(url) => setFormData({ ...formData, image_url: url })} />
                                        </div>

                                        <div className="col-span-2">
                                            <AdminTextarea label="Description" rows="3" value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} />
                                        </div>

                                        <div className="col-span-2">
                                            <AdminTextarea label="Rules (Markdown)" rows="6" value={formData.rules} onChange={e => setFormData({ ...formData, rules: e.target.value })} placeholder="# Rules\n1. No cheating..." />
                                        </div>
                                    </div>
                                </form>
                            ) : (
                                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                    <div className="bg-gray-50 rounded-2xl border border-gray-100 p-6 shadow-sm">
                                        <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">Add Coordinator</h4>
                                        <div className="flex gap-4">
                                            <div className="flex-1">
                                                <AdminSelect
                                                    value={selectedCoordinatorId}
                                                    onChange={e => setSelectedCoordinatorId(e.target.value)}
                                                >
                                                    <option value="">Select Coordinator...</option>
                                                    {availableCoordinators.map(c => (
                                                        <option key={c.id} value={c.id}>{c.full_name}</option>
                                                    ))}
                                                </AdminSelect>
                                            </div>
                                            <button
                                                onClick={handleAssignCoordinator}
                                                disabled={!selectedCoordinatorId || assigning}
                                                className="px-6 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 font-semibold disabled:opacity-50 whitespace-nowrap shadow-md shadow-indigo-100 transition-all hover:-translate-y-0.5"
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
                            )}
                        </div>

                        {/* Footer */}
                        <div className="px-8 py-6 border-t border-gray-100 bg-white z-10 flex justify-between items-center">
                            {editingEvent && activeTab === 'details' ? (
                                <button type="button" onClick={handleDeleteEvent} className="text-red-500 hover:text-red-700 font-semibold text-sm transition-colors">Delete Event</button>
                            ) : <div />}

                            <div className="flex gap-4">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-2.5 border border-gray-200 rounded-xl text-gray-700 hover:bg-gray-50 font-semibold transition-all">Close</button>
                                {activeTab === 'details' && (
                                    <button
                                        onClick={handleSaveEvent}
                                        className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 font-semibold shadow-lg shadow-indigo-100 transition-all hover:scale-105 active:scale-95"
                                    >
                                        Save & Close
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
