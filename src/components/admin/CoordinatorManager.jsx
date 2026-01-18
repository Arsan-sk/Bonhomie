import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { Search, UserPlus, X, Loader2, Users } from 'lucide-react'
import SmartTable from './ui/SmartTable'

export default function CoordinatorManager() {
    const [events, setEvents] = useState([])
    const [loading, setLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState('')
    const [searchResult, setSearchResult] = useState(null)
    const [searching, setSearching] = useState(false)
    const [selectedEventIds, setSelectedEventIds] = useState([])
    const [tableSearch, setTableSearch] = useState('')

    useEffect(() => {
        fetchEvents()
    }, [])

    const fetchEvents = async () => {
        try {
            const { data, error } = await supabase.from('events').select('id, name, faculty_coordinators').order('name')
            if (error) throw error
            setEvents(data || [])
        } catch (error) { console.error(error) } finally { setLoading(false) }
    }

    const searchUser = async () => {
        if (!searchQuery) return
        setSearching(true)
        setSearchResult(null)
        try {
            // First try exact email match
            const { data: emailData, error: emailError } = await supabase
                .from('profiles')
                .select('id, full_name, college_email, role')
                .eq('college_email', searchQuery)
                .single()
            
            if (emailData) {
                setSearchResult(emailData)
            } else {
                // Then try name search
                const { data: nameData, error: nameError } = await supabase
                    .from('profiles')
                    .select('id, full_name, college_email, role')
                    .ilike('full_name', `%${searchQuery}%`)
                    .limit(5)
                
                if (nameData && nameData.length > 0) {
                    setSearchResult(nameData[0]) // Use first match
                }
            }
        } catch (error) {
            console.error('Search error:', error)
        } finally {
            setSearching(false)
        }
    }

    const assignCoordinator = async (user) => {
        if (selectedEventIds.length === 0) return alert('Select events first.')

        try {
            const newCoordinator = { id: user.id, name: user.full_name, email: user.college_email }

            for (const eventId of selectedEventIds) {
                const event = events.find(e => e.id === eventId)
                const current = event.faculty_coordinators || []
                if (current.some(c => c.id === user.id)) continue

                const { error } = await supabase.from('events').update({ faculty_coordinators: [...current, newCoordinator] }).eq('id', eventId)
                if (error) throw error
            }
            alert(`Assigned to ${selectedEventIds.length} events.`)
            fetchEvents()
            setSearchResult(null)
            setSearchQuery('')
            setSelectedEventIds([])
        } catch (error) { alert('Failed to assign.') }
    }

    const removeCoordinator = async (eventId, coordinatorId) => {
        if (!confirm('Remove this coordinator?')) return
        try {
            const event = events.find(e => e.id === eventId)
            const updated = (event.faculty_coordinators || []).filter(c => c.id !== coordinatorId)
            const { error } = await supabase.from('events').update({ faculty_coordinators: updated }).eq('id', eventId)
            if (error) throw error
            fetchEvents()
        } catch (error) { console.error(error) }
    }

    const columns = [
        { key: 'name', title: 'Event Name', sortable: true, render: (row) => <span className="font-medium text-gray-900">{row.name}</span> },
        {
            key: 'faculty_coordinators', title: 'Assigned Coordinators', render: (row) => (
                <div className="flex flex-wrap gap-2">
                    {(row.faculty_coordinators || []).length > 0 ? (
                        row.faculty_coordinators.map((c, idx) => (
                            <span key={idx} className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-100">
                                {c.name}
                                <button onClick={(e) => { e.stopPropagation(); removeCoordinator(row.id, c.id) }} className="hover:text-indigo-900 focus:outline-none">
                                    <X className="h-3 w-3" />
                                </button>
                            </span>
                        ))
                    ) : <span className="text-xs text-gray-400 italic">None</span>}
                </div>
            )
        }
    ]

    const filteredEvents = events.filter(e => e.name.toLowerCase().includes(tableSearch.toLowerCase()))

    return (
        <div className="space-y-6">
            {/* Search Panel */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <UserPlus className="h-5 w-5 text-indigo-600" /> Assign Coordinator
                </h3>
                <div className="flex flex-col sm:flex-row gap-4 items-end">
                    <div className="flex-1 w-full">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Search User (Email or Name)</label>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && searchUser()}
                                className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                                placeholder="e.g. professor@college.edu"
                            />
                            <button
                                onClick={searchUser}
                                className="px-4 py-2 bg-gray-50 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors"
                            >
                                {searching ? <Loader2 className="animate-spin h-5 w-5" /> : <Search className="h-5 w-5" />}
                            </button>
                        </div>
                    </div>
                </div>

                {searchResult && (
                    <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg flex flex-col sm:flex-row justify-between items-center gap-4 animate-in fade-in slide-in-from-top-2">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center text-green-700 font-bold">
                                {searchResult.full_name[0]}
                            </div>
                            <div>
                                <p className="font-medium text-green-900">{searchResult.full_name}</p>
                                <p className="text-sm text-green-700">{searchResult.college_email}</p>
                            </div>
                        </div>
                        <button
                            onClick={() => assignCoordinator(searchResult)}
                            disabled={selectedEventIds.length === 0}
                            className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
                        >
                            Assign to {selectedEventIds.length} Selected Events
                        </button>
                    </div>
                )}
            </div>

            {/* Events Table */}
            <SmartTable
                columns={columns}
                data={filteredEvents}
                loading={loading}
                searchable={true}
                onSearchChange={setTableSearch}
                selectable={true}
                selectedIds={selectedEventIds}
                onSelectionChange={setSelectedEventIds}
                emptyMessage="No events found."
            />
        </div>
    )
}
