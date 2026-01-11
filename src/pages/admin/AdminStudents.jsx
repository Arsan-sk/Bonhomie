import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import SmartTable from '../../components/admin/ui/SmartTable'

export default function AdminStudents() {
    const [students, setStudents] = useState([])
    const [loading, setLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState('')

    useEffect(() => {
        fetchStudents()
    }, [])

    const fetchStudents = async () => {
        setLoading(true)
        // Fetch profiles
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .order('full_name', { ascending: true })

        if (error) console.error('Error fetching students:', error)
        else setStudents(data || [])
        setLoading(false)
    }

    const columns = [
        {
            key: 'full_name', title: 'Student Name', sortable: true, render: (row) => (
                <div className="font-medium text-gray-900">{row.full_name || 'N/A'}</div>
            )
        },
        { key: 'email', title: 'Email Address', sortable: true },
        { key: 'phone_number', title: 'Phone', render: (row) => row.phone_number || 'N/A' },
        {
            key: 'department', title: 'Department', sortable: true, render: (row) => (
                <span className="inline-flex items-center rounded-md bg-gray-50 px-2 py-1 text-xs font-medium text-gray-600 ring-1 ring-inset ring-gray-500/10">
                    {row.department || 'General'}
                </span>
            )
        },
        { key: 'year', title: 'Year', sortable: true, render: (row) => row.year || '-' }
    ]

    const filteredStudents = students.filter(s =>
        (s.full_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (s.email || '').toLowerCase().includes(searchQuery.toLowerCase())
    )

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold tracking-tight text-gray-900">Student Database</h2>
                <p className="mt-1 text-sm text-gray-500">View and manage registered student profiles.</p>
            </div>

            <SmartTable
                columns={columns}
                data={filteredStudents}
                loading={loading}
                searchable={true}
                onSearchChange={setSearchQuery}
            />
        </div>
    )
}
