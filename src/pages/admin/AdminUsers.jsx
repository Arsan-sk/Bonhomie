import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import SmartTable from '../../components/admin/ui/SmartTable'
import { Shield, Users as UsersIcon, GraduationCap, UserPlus, Plus, X } from 'lucide-react'

export default function AdminUsers() {
    const [users, setUsers] = useState([])
    const [loading, setLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState('')
    const [roleFilter, setRoleFilter] = useState('all') // 'all', 'admin', 'coordinator', 'student'
    const [showCreateModal, setShowCreateModal] = useState(false)
    const [creating, setCreating] = useState(false)
    const [newProfile, setNewProfile] = useState({
        roll_number: '',
        full_name: '',
        phone_number: '',
        college_email: ''
    })

    useEffect(() => {
        fetchUsers()
    }, [])

    const fetchUsers = async () => {
        setLoading(true)
        // Fetch ALL profiles including offline users (is_admin_created = TRUE)
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .order('full_name', { ascending: true })

        if (error) {
            console.error('Error fetching users:', error)
            setUsers([])
        } else {
            console.log('Fetched users:', data?.length, 'total')
            console.log('Offline users:', data?.filter(u => u.is_admin_created)?.length)
            setUsers(data || [])
        }
        setLoading(false)
    }

    const createOfflineProfile = async () => {
        // Validate fields
        if (!newProfile.roll_number || !newProfile.full_name) {
            alert('Roll Number and Full Name are required')
            return
        }

        // Basic roll number validation (flexible format)
        const rollNumberRegex = /^[\dA-Z]{4,10}$/i
        if (!rollNumberRegex.test(newProfile.roll_number)) {
            alert('Invalid roll number format')
            return
        }

        // Auto-generate email if not provided
        const email = newProfile.college_email || `${newProfile.roll_number.toLowerCase()}@aiktc.ac.in`

        setCreating(true)

        try {
            // Call the SIMPLE function that creates profile ONLY (no auth user)
            const { data, error } = await supabase.rpc('create_simple_offline_profile', {
                p_roll_number: newProfile.roll_number,
                p_full_name: newProfile.full_name,
                p_college_email: email,
                p_phone: newProfile.phone_number || null,
                p_department: 'General',
                p_year_of_study: null
            })

            if (error) {
                console.error('Error creating profile:', error)
                alert(`Failed to create profile: ${error.message}`)
                setCreating(false)
                return
            }

            // Check if function returned success
            if (!data || !data.success) {
                const errorMsg = data?.error || 'Unknown error occurred'
                console.error('Function returned error:', errorMsg)
                alert(`Failed to create profile: ${errorMsg}`)
                setCreating(false)
                return
            }

            console.log('✅ Profile created successfully:', data)

            // Show success message (no login credentials - offline mode)
            alert(
                `✅ Profile created successfully!\n\n` +
                `Roll Number: ${data.roll_number}\n` +
                `Name: ${data.full_name}\n` +
                `Email: ${data.email}\n\n` +
                `ℹ️ This is an offline profile.\n` +
                `The student can be added to events.\n` +
                `Login functionality will be added later.`
            )

            // Reset form and close modal
            setNewProfile({
                roll_number: '',
                full_name: '',
                phone_number: '',
                college_email: ''
            })
            setShowCreateModal(false)

            // Refresh user list
            fetchUsers()
        } catch (err) {
            console.error('Unexpected error:', err)
            alert('An unexpected error occurred. Check console for details.')
        } finally {
            setCreating(false)
        }
    }

    const getRoleBadge = (role) => {
        const badges = {
            admin: { bg: 'bg-red-50', text: 'text-red-700', ring: 'ring-red-600/20', icon: Shield, label: 'Admin' },
            coordinator: { bg: 'bg-indigo-50', text: 'text-indigo-700', ring: 'ring-indigo-600/20', icon: UsersIcon, label: 'Coordinator' },
            student: { bg: 'bg-green-50', text: 'text-green-700', ring: 'ring-green-600/20', icon: GraduationCap, label: 'Student' }
        }
        const badge = badges[role] || badges.student
        const Icon = badge.icon

        return (
            <span className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${badge.bg} ${badge.text} ${badge.ring}`}>
                <Icon className="h-3 w-3" />
                {badge.label}
            </span>
        )
    }

    const columns = [
        {
            key: 'full_name', title: 'Name', sortable: true, render: (row) => (
                <div>
                    <div className="font-medium text-gray-900">{row.full_name || 'N/A'}</div>
                    {row.is_admin_created && (
                        <span className="inline-flex items-center mt-1 px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-800">
                            Offline Registration
                        </span>
                    )}
                </div>
            )
        },
        { key: 'email', title: 'Email', sortable: true, render: (row) => row.college_email || 'N/A' },
        {
            key: 'roll_number', title: 'Roll Number', sortable: true, render: (row) => (
                <span className="font-mono text-sm">{row.roll_number || '-'}</span>
            )
        },
        {
            key: 'role', title: 'Role', sortable: true, render: (row) => getRoleBadge(row.role)
        },
        { key: 'phone_number', title: 'Phone', render: (row) => row.phone || 'N/A' },
        {
            key: 'department', title: 'Department', sortable: true, render: (row) => (
                <span className="text-sm text-gray-600">{row.department || 'General'}</span>
            )
        },
        { key: 'year', title: 'Year', sortable: true, render: (row) => row.year_of_study || '-' }
    ]

    const filteredUsers = users.filter(user => {
        const matchesSearch =
            (user.full_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
            (user.email || '').toLowerCase().includes(searchQuery.toLowerCase())

        const matchesRole = roleFilter === 'all' || user.role === roleFilter

        return matchesSearch && matchesRole
    })

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight text-gray-900">User Management</h2>
                    <p className="mt-1 text-sm text-gray-500">View and manage all users across the platform.</p>
                </div>

                {/* Action Buttons and Filters */}
                <div className="flex items-center gap-3">
                    {/* Add New Profile Button */}
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
                    >
                        <UserPlus className="h-5 w-5" />
                        Add New Profile
                    </button>

                    {/* Role Filter */}
                    <div className="flex items-center gap-2">
                        <label className="text-sm font-medium text-gray-700">Filter:</label>
                        <select
                            value={roleFilter}
                            onChange={(e) => setRoleFilter(e.target.value)}
                        className="rounded-md border-gray-300 text-sm focus:border-indigo-500 focus:ring-indigo-500"
                    >
                        <option value="all">All Roles</option>
                        <option value="admin">Admin</option>
                        <option value="coordinator">Coordinator</option>
                        <option value="student">Student</option>
                    </select>
                    </div>
                </div>
            </div>

            {/* Stats Summary */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                    <p className="text-sm text-gray-600">Total Users</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">{users.length}</p>
                </div>
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                    <p className="text-sm text-gray-600">Admins</p>
                    <p className="text-2xl font-bold text-red-600 mt-1">
                        {users.filter(u => u.role === 'admin').length}
                    </p>
                </div>
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                    <p className="text-sm text-gray-600">Coordinators</p>
                    <p className="text-2xl font-bold text-indigo-600 mt-1">
                        {users.filter(u => u.role === 'coordinator').length}
                    </p>
                </div>
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                    <p className="text-sm text-gray-600">Students</p>
                    <p className="text-2xl font-bold text-green-600 mt-1">
                        {users.filter(u => u.role === 'student').length}
                    </p>
                </div>
                <div className="bg-orange-50 rounded-lg shadow-sm border border-orange-300 p-4">
                    <p className="text-sm text-orange-700 font-medium">Offline Registered</p>
                    <p className="text-2xl font-bold text-orange-600 mt-1">
                        {users.filter(u => u.is_admin_created === true).length}
                    </p>
                </div>
            </div>

            <SmartTable
                columns={columns}
                data={filteredUsers}
                loading={loading}
                searchable={true}
                onSearchChange={setSearchQuery}
            />

            {/* Create Profile Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 z-50 overflow-y-auto">
                    <div className="flex min-h-screen items-center justify-center p-4">
                        {/* Backdrop */}
                        <div 
                            className="fixed inset-0 bg-black bg-opacity-30 transition-opacity"
                            onClick={() => !creating && setShowCreateModal(false)}
                        />

                        {/* Modal */}
                        <div className="relative bg-white rounded-xl shadow-2xl max-w-md w-full p-6 space-y-4">
                            {/* Header */}
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-indigo-100 rounded-lg">
                                        <UserPlus className="h-6 w-6 text-indigo-600" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-semibold text-gray-900">Add New Profile</h3>
                                        <p className="text-sm text-gray-500">Create an offline registration profile</p>
                                    </div>
                                </div>
                                {!creating && (
                                    <button
                                        onClick={() => setShowCreateModal(false)}
                                        className="text-gray-400 hover:text-gray-600 transition-colors"
                                    >
                                        <X className="h-5 w-5" />
                                    </button>
                                )}
                            </div>

                            {/* Form */}
                            <div className="space-y-4">
                                {/* Roll Number */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Roll Number <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={newProfile.roll_number}
                                        onChange={(e) => setNewProfile({ ...newProfile, roll_number: e.target.value.toUpperCase() })}
                                        placeholder="22CS01"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                        disabled={creating}
                                    />
                                    <p className="mt-1 text-xs text-gray-500">Format: 22CS01</p>
                                </div>

                                {/* Full Name */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Full Name <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={newProfile.full_name}
                                        onChange={(e) => setNewProfile({ ...newProfile, full_name: e.target.value })}
                                        placeholder="John Doe"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                        disabled={creating}
                                    />
                                </div>

                                {/* Phone Number (Optional) */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Phone Number <span className="text-gray-400">(Optional)</span>
                                    </label>
                                    <input
                                        type="tel"
                                        value={newProfile.phone_number}
                                        onChange={(e) => setNewProfile({ ...newProfile, phone_number: e.target.value })}
                                        placeholder="9876543210"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                        disabled={creating}
                                    />
                                </div>

                                {/* Email (Optional - auto-generated) */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Email <span className="text-gray-400">(Auto-generated)</span>
                                    </label>
                                    <input
                                        type="email"
                                        value={newProfile.college_email || `${newProfile.roll_number.toLowerCase()}@aiktc.ac.in`}
                                        onChange={(e) => setNewProfile({ ...newProfile, college_email: e.target.value })}
                                        placeholder="rollnumber@aiktc.ac.in"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-gray-50"
                                        disabled={creating}
                                    />
                                    <p className="mt-1 text-xs text-gray-500">Default: rollnumber@aiktc.ac.in</p>
                                </div>

                                {/* Important Note */}
                                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                                    <p className="text-sm text-blue-800">
                                        <strong>ℹ️ Offline Profile:</strong> This profile will be created for offline registration purposes.
                                        The student can be added to events immediately. Login functionality will be added later.
                                    </p>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex gap-3 pt-4 border-t">
                                <button
                                    onClick={() => setShowCreateModal(false)}
                                    disabled={creating}
                                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={createOfflineProfile}
                                    disabled={creating || !newProfile.roll_number || !newProfile.full_name}
                                    className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    {creating ? (
                                        <>
                                            <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                                            Creating...
                                        </>
                                    ) : (
                                        <>
                                            <Plus className="h-4 w-4" />
                                            Create Profile
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
