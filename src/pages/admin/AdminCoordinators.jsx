import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { Search, UserPlus, UserMinus, ShieldCheck, Loader2, Plus } from 'lucide-react'
import SmartTable from '../../components/admin/ui/SmartTable'
import CoordinatorCreateModal from '../../components/admin/CoordinatorCreateModal'

export default function AdminCoordinators() {
    const [coordinators, setCoordinators] = useState([])
    const [loading, setLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState('')
    const [searchResult, setSearchResult] = useState(null)
    const [searching, setSearching] = useState(false)
    const [tableSearch, setTableSearch] = useState('')
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)

    useEffect(() => {
        fetchCoordinators()
    }, [])

    const fetchCoordinators = async () => {
        setLoading(true)
        try {
            // Fetch users with role 'coordinator'
            const { data, error } = await supabase
                .from('profiles')
                .select('id, full_name, college_email, role')
                .eq('role', 'coordinator')
                .order('full_name')

            if (error) throw error
            setCoordinators(data || [])
        } catch (error) {
            console.error('Error fetching coordinators:', error)
        } finally {
            setLoading(false)
        }
    }

    const searchUser = async () => {
        if (!searchQuery) return
        setSearching(true)
        setSearchResult(null)
        try {
            // Find user to promote (must be role 'user' or 'student')
            const { data, error } = await supabase
                .from('profiles')
                .select('id, full_name, college_email, role')
                .eq('college_email', searchQuery)
                .single()

            if (error || !data) {
                // Try searching by name if email fails
                const { data: nameData } = await supabase
                    .from('profiles')
                    .select('id, full_name, college_email, role')
                    .ilike('full_name', `%${searchQuery}%`)
                    .limit(1)
                    .single()

                if (nameData) setSearchResult(nameData)
                else alert('User not found.')
            } else {
                setSearchResult(data)
            }
        } catch (error) {
            console.error(error)
        } finally {
            setSearching(false)
        }
    }

    const promoteUser = async (user) => {
        if (user.role === 'coordinator' || user.role === 'faculty') {
            alert('User is already a coordinator.')
            return
        }
        if (!confirm(`Promote ${user.full_name} to Coordinator?`)) return

        try {
            console.log('Promoting user:', { userId: user.id, currentRole: user.role, newRole: 'coordinator' })
            
            const { data, error } = await supabase
                .from('profiles')
                .update({ role: 'coordinator' })
                .eq('id', user.id)
                .select()

            if (error) {
                console.error('Supabase error:', error)
                throw error
            }

            console.log('Update successful, returned data:', data)
            alert(`Success! ${user.full_name} is now a Coordinator.`)
            setSearchResult(null)
            setSearchQuery('')
            fetchCoordinators()
        } catch (error) {
            console.error('Error promoting user:', error)
            alert(`Failed to promote user: ${error.message}`)
        }
    }

    const demoteUser = async (user) => {
        if (!confirm(`Revoke Coordinator role from ${user.full_name}? They will become a regular Student.`)) return

        try {
            const { error } = await supabase
                .from('profiles')
                .update({ role: 'student' })
                .eq('id', user.id)

            if (error) throw error

            alert(`Success! ${user.full_name} is now a Student.`)
            fetchCoordinators()
        } catch (error) {
            console.error('Error demoting user:', error)
            alert(`Failed to demote user: ${error.message}`)
        }
    }

    const columns = [
        {
            key: 'full_name',
            title: 'Name',
            sortable: true,
            render: (row) => (
                <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold uppercase text-xs">
                        {row.full_name?.[0] || 'U'}
                    </div>
                    <span className="font-medium text-gray-900">{row.full_name}</span>
                </div>
            )
        },
        { key: 'college_email', title: 'Email', sortable: true },
        {
            key: 'role',
            title: 'Role',
            sortable: true,
            render: (row) => (
                <span className="inline-flex items-center gap-1 rounded-md bg-purple-50 px-2 py-1 text-xs font-medium text-purple-700 ring-1 ring-inset ring-purple-700/10 capitalize">
                    <ShieldCheck className="h-3 w-3" />
                    {row.role}
                </span>
            )
        },
        {
            key: 'actions',
            title: 'Actions',
            render: (row) => (
                <button
                    onClick={(e) => { e.stopPropagation(); demoteUser(row) }}
                    className="text-red-600 hover:text-red-900 text-sm font-medium flex items-center gap-1 transition-colors"
                >
                    <UserMinus className="h-3 w-3" /> Revoke
                </button>
            )
        }
    ]

    const filteredCoordinators = coordinators.filter(c =>
        c.full_name?.toLowerCase().includes(tableSearch.toLowerCase()) ||
        c.college_email?.toLowerCase().includes(tableSearch.toLowerCase())
    )

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight text-gray-900">Coordinator Management</h2>
                    <p className="mt-1 text-sm text-gray-500">Create new coordinators or promote existing users.</p>
                </div>
                <button
                    onClick={() => setIsCreateModalOpen(true)}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
                >
                    <Plus className="h-5 w-5" />
                    Create Coordinator
                </button>
            </div>

            {/* Promotion Panel */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <UserPlus className="h-5 w-5 text-indigo-600" /> Promote User to Coordinator
                </h3>

                <div className="flex flex-col sm:flex-row gap-4 items-end">
                    <div className="flex-1 w-full max-w-md">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Search User by Email</label>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && searchUser()}
                                className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                                placeholder="student@bonhomie.edu"
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
                    <div className="mt-4 p-4 bg-gray-50 border border-gray-200 rounded-lg flex flex-col sm:flex-row justify-between items-center gap-4 animate-in fade-in slide-in-from-top-2">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-bold">
                                {searchResult.full_name?.[0] || '?'}
                            </div>
                            <div>
                                <p className="font-medium text-gray-900">{searchResult.full_name}</p>
                                <p className="text-sm text-gray-500">{searchResult.college_email}</p>
                                <span className="text-xs text-gray-400 capitalize">Current Role: {searchResult.role}</span>
                            </div>
                        </div>
                        {searchResult.role !== 'coordinator' && searchResult.role !== 'faculty' ? (
                            <button
                                onClick={() => promoteUser(searchResult)}
                                className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 shadow-sm transition-colors flex items-center gap-2"
                            >
                                <ShieldCheck className="h-4 w-4" />
                                Promote to Coordinator
                            </button>
                        ) : (
                            <span className="text-sm text-green-600 font-medium px-3 py-1 bg-green-50 rounded-full border border-green-100">
                                Already a Coordinator
                            </span>
                        )}
                    </div>
                )}
            </div>

            {/* Coordinators List */}
            <SmartTable
                columns={columns}
                data={filteredCoordinators}
                loading={loading}
                searchable={true}
                onSearchChange={setTableSearch}
                emptyMessage="No coordinators found. Promote a user or create a new coordinator to get started."
            />

            {/* Create Coordinator Modal */}
            <CoordinatorCreateModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                onSuccess={fetchCoordinators}
            />
        </div>
    )
}
