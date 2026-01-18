import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import SmartTable from '../../components/admin/ui/SmartTable'
import { Shield, Users as UsersIcon, GraduationCap } from 'lucide-react'

export default function AdminUsers() {
    const [users, setUsers] = useState([])
    const [loading, setLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState('')
    const [roleFilter, setRoleFilter] = useState('all') // 'all', 'admin', 'coordinator', 'student'

    useEffect(() => {
        fetchUsers()
    }, [])

    const fetchUsers = async () => {
        setLoading(true)
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .order('full_name', { ascending: true })

        if (error) console.error('Error fetching users:', error)
        else setUsers(data || [])
        setLoading(false)
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
                <div className="font-medium text-gray-900">{row.full_name || 'N/A'}</div>
            )
        },
        { key: 'email', title: 'Email', sortable: true, render: (row) => row.college_email || 'N/A' },
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

                {/* Role Filter */}
                <div className="flex items-center gap-2">
                    <label className="text-sm font-medium text-gray-700">Filter by Role:</label>
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

            {/* Stats Summary */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
            </div>

            <SmartTable
                columns={columns}
                data={filteredUsers}
                loading={loading}
                searchable={true}
                onSearchChange={setSearchQuery}
            />
        </div>
    )
}
