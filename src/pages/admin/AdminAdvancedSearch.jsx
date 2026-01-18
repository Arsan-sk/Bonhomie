import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../../lib/supabase'
import {
    Search,
    Download,
    Filter,
    CheckCircle,
    XCircle,
    Loader2,
    ArrowUpDown,
    FileSpreadsheet,
    AlertCircle
} from 'lucide-react'
import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

// Helper to download CSV
const downloadCSV = (data, filename) => {
    if (!data.length) return

    // Flatten data for CSV
    const csvRows = []

    // Headers
    const headers = [
        'Registration ID',
        'Status',
        'Payment Mode',
        'Transaction ID',
        'Registered At',
        'Event Name',
        'Event Category',
        'Event Subcategory',
        'Event Fee',
        'Student Name',
        'Roll Number',
        'Email',
        'Phone',
        'Gender',
        'School',
        'Department',
        'Program',
        'Year of Study'
    ]
    csvRows.push(headers.join(','))

    // Rows
    data.forEach(row => {
        const values = [
            row.id,
            row.status,
            row.payment_mode || '',
            row.transaction_id || '',
            new Date(row.registered_at).toLocaleString(),
            row.events?.name || '',
            row.events?.category || '',
            row.events?.subcategory || '',
            row.events?.fee || 0,
            row.profiles?.full_name || '',
            row.profiles?.roll_number || '',
            row.profiles?.college_email || '',
            row.profiles?.phone || '',
            row.profiles?.gender || '',
            row.profiles?.school || '',
            row.profiles?.department || '',
            row.profiles?.program || '',
            row.profiles?.year_of_study || ''
        ]

        // Escape quotes and wrap in quotes
        const escapedValues = values.map(v => {
            const str = String(v)
            if (str.includes(',') || str.includes('"') || str.includes('\n')) {
                return `"${str.replace(/"/g, '""')}"`
            }
            return str
        })

        csvRows.push(escapedValues.join(','))
    })

    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.setAttribute('hidden', '')
    a.setAttribute('href', url)
    a.setAttribute('download', filename)
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
}

export default function AdminAdvancedSearch() {
    const [registrations, setRegistrations] = useState([])
    const [eventsList, setEventsList] = useState([])
    const [loading, setLoading] = useState(true)
    const [actionLoading, setActionLoading] = useState(null)
    const [activeTab, setActiveTab] = useState('all') // all, pending, confirmed, rejected

    // Filters State
    const [filters, setFilters] = useState({
        search: '',
        eventCategory: '',
        eventSubcategory: '',
        eventId: '',
        gender: '',
        school: '',
        department: '',
        program: '',
        yearOfStudy: '',
    })

    // Fetch Data
    useEffect(() => {
        const fetchData = async () => {
            setLoading(true)
            try {
                // Fetch Events for dropdown
                const { data: eventsData, error: eventsError } = await supabase
                    .from('events')
                    .select('id, name, category, subcategory')

                if (eventsError) throw eventsError
                setEventsList(eventsData || [])

                // Fetch Registrations with joins
                const { data: regData, error: regError } = await supabase
                    .from('registrations')
                    .select(`
                        id,
                        status,
                        payment_mode,
                        transaction_id,
                        registered_at,
                        profile_id,
                        event_id,
                        events!inner (
                            id, name, category, subcategory, fee
                        ),
                        profiles!inner (
                            id, full_name, college_email, phone, roll_number,
                            gender, school, department, program, year_of_study
                        )
                    `)
                    .order('registered_at', { ascending: false })

                if (regError) throw regError
                setRegistrations(regData || [])

            } catch (error) {
                console.error('Error fetching data:', error)
                alert('Failed to load data')
            } finally {
                setLoading(false)
            }
        }
        fetchData()
    }, [])

    // Handle Status Change
    const handleStatusUpdate = async (regId, newStatus) => {
        if (!confirm(`Are you sure you want to mark this as ${newStatus}?`)) return

        setActionLoading(regId)
        try {
            const { error } = await supabase
                .from('registrations')
                .update({ status: newStatus })
                .eq('id', regId)

            if (error) throw error

            // Update local state
            setRegistrations(prev =>
                prev.map(r => r.id === regId ? { ...r, status: newStatus } : r)
            )

        } catch (error) {
            console.error('Update failed:', error)
            alert('Failed to update status')
        } finally {
            setActionLoading(null)
        }
    }

    // Derived Filtered Data
    const filteredData = useMemo(() => {
        return registrations.filter(reg => {
            // Tab Filter
            if (activeTab !== 'all' && reg.status !== activeTab) return false

            // Text Search
            const searchLower = filters.search.toLowerCase()
            const matchesSearch =
                !filters.search ||
                reg.profiles?.full_name?.toLowerCase().includes(searchLower) ||
                reg.profiles?.college_email?.toLowerCase().includes(searchLower) ||
                reg.profiles?.phone?.toLowerCase().includes(searchLower) ||
                reg.profiles?.roll_number?.toLowerCase().includes(searchLower) ||
                reg.transaction_id?.toLowerCase().includes(searchLower)

            if (!matchesSearch) return false

            // Event Filters
            if (filters.eventCategory && reg.events?.category !== filters.eventCategory) return false
            if (filters.eventSubcategory && reg.events?.subcategory !== filters.eventSubcategory) return false
            if (filters.eventId && reg.events?.id !== filters.eventId) return false

            // Student Filters
            if (filters.gender && reg.profiles?.gender?.toLowerCase() !== filters.gender.toLowerCase()) return false
            if (filters.school && reg.profiles?.school !== filters.school) return false
            if (filters.department && reg.profiles?.department !== filters.department) return false
            if (filters.program && reg.profiles?.program !== filters.program) return false
            if (filters.yearOfStudy && reg.profiles?.year_of_study !== filters.yearOfStudy) return false

            return true
        })
    }, [registrations, filters, activeTab])

    // Derived Options for Filter Dropdowns
    const uniqueDepartments = useMemo(() => {
        const depts = new Set(registrations.map(r => r.profiles?.department).filter(Boolean))
        // Add defaults from requirements if not present in data
        const defaults = ['CO', 'AIML', 'DS', 'ECS', 'CE', 'ME', 'ECE', 'Electrical', 'Diploma Pharmacy', 'Degree Pharmacy', 'Diploma Architecture', 'Degree Architecture']
        defaults.forEach(d => depts.add(d))
        return Array.from(depts).sort()
    }, [registrations])

    // Filter events dropdown based on selected category/subcategory
    const filteredEventOptions = useMemo(() => {
        return eventsList.filter(e => {
            if (filters.eventCategory && e.category !== filters.eventCategory) return false
            if (filters.eventSubcategory && e.subcategory !== filters.eventSubcategory) return false
            return true
        })
    }, [eventsList, filters.eventCategory, filters.eventSubcategory])

    const resetFilters = () => {
        setFilters({
            search: '',
            eventCategory: '',
            eventSubcategory: '',
            eventId: '',
            gender: '',
            school: '',
            department: '',
            program: '',
            yearOfStudy: '',
        })
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Advanced Search</h1>
                    <p className="text-sm text-gray-500">Filter, manage, and export registration data</p>
                </div>
                <button
                    onClick={() => downloadCSV(filteredData, `registrations_export_${new Date().toISOString().split('T')[0]}.csv`)}
                    className="inline-flex items-center gap-2 rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500"
                >
                    <Download className="h-4 w-4" />
                    Export CSV
                </button>
            </div>

            {/* Filters Section */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
                <div className="flex items-center gap-2 mb-4 text-gray-900 font-semibold border-b pb-2">
                    <Filter className="h-4 w-4" />
                    Filters
                    <button
                        onClick={resetFilters}
                        className="ml-auto text-xs font-normal text-indigo-600 hover:text-indigo-800"
                    >
                        Reset all
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Search - Spans 2 cols on LG */}
                    <div className="lg:col-span-4">
                        <div className="relative">
                            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                <Search className="h-4 w-4 text-gray-400" aria-hidden="true" />
                            </div>
                            <input
                                type="text"
                                placeholder="Search by name, email, phone, roll no, or transaction ID..."
                                className="block w-full rounded-md border-0 py-2 pl-10 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                                value={filters.search}
                                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                            />
                        </div>
                    </div>

                    {/* Event Type Filters */}
                    <select
                        className="block w-full rounded-md border-0 py-2 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm"
                        value={filters.eventCategory}
                        onChange={(e) => setFilters(prev => ({ ...prev, eventCategory: e.target.value, eventId: '' }))}
                    >
                        <option value="">All Categories</option>
                        <option value="Cultural">Cultural</option>
                        <option value="Sports">Sports</option>
                        <option value="Technical">Technical</option>
                    </select>

                    <select
                        className="block w-full rounded-md border-0 py-2 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm"
                        value={filters.eventSubcategory}
                        onChange={(e) => setFilters(prev => ({ ...prev, eventSubcategory: e.target.value, eventId: '' }))}
                    >
                        <option value="">All Subcategories</option>
                        <option value="Individual">Individual</option>
                        <option value="Group">Group</option>
                    </select>

                    <select
                        className="block w-full rounded-md border-0 py-2 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm lg:col-span-2"
                        value={filters.eventId}
                        onChange={(e) => setFilters(prev => ({ ...prev, eventId: e.target.value }))}
                    >
                        <option value="">All Events</option>
                        {filteredEventOptions.map(event => (
                            <option key={event.id} value={event.id}>{event.name}</option>
                        ))}
                    </select>

                    {/* Student Filters */}
                    <select
                        className="block w-full rounded-md border-0 py-2 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm"
                        value={filters.school}
                        onChange={(e) => setFilters(prev => ({ ...prev, school: e.target.value }))}
                    >
                        <option value="">All Schools</option>
                        <option value="SOET">SOET</option>
                        <option value="SOP">SOP</option>
                        <option value="SOA">SOA</option>
                    </select>

                    <select
                        className="block w-full rounded-md border-0 py-2 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm"
                        value={filters.department}
                        onChange={(e) => setFilters(prev => ({ ...prev, department: e.target.value }))}
                    >
                        <option value="">All Departments</option>
                        {uniqueDepartments.map(dept => (
                            <option key={dept} value={dept}>{dept}</option>
                        ))}
                    </select>

                    <select
                        className="block w-full rounded-md border-0 py-2 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm"
                        value={filters.program}
                        onChange={(e) => setFilters(prev => ({ ...prev, program: e.target.value }))}
                    >
                        <option value="">All Programs</option>
                        <option value="Diploma Engineering">Diploma Engineering</option>
                        <option value="Pharmacy">Pharmacy</option>
                        <option value="Architecture">Architecture</option>
                    </select>

                    <select
                        className="block w-full rounded-md border-0 py-2 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm"
                        value={filters.yearOfStudy}
                        onChange={(e) => setFilters(prev => ({ ...prev, yearOfStudy: e.target.value }))}
                    >
                        <option value="">All Years</option>
                        <option value="Year 1">Year 1</option>
                        <option value="Year 2">Year 2</option>
                        <option value="Year 3">Year 3</option>
                        <option value="Year 4">Year 4</option>
                        <option value="Year 5">Year 5</option>
                    </select>

                    <select
                        className="block w-full rounded-md border-0 py-2 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm"
                        value={filters.gender}
                        onChange={(e) => setFilters(prev => ({ ...prev, gender: e.target.value }))}
                    >
                        <option value="">All Genders</option>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                    </select>
                </div>
            </div>

            {/* Tabs */}
            <div className="border-b border-gray-200">
                <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                    {['all', 'pending', 'confirmed', 'rejected'].map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={clsx(
                                activeTab === tab
                                    ? 'border-indigo-500 text-indigo-600'
                                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700',
                                'whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium capitalize'
                            )}
                        >
                            {tab}
                            <span className={clsx(
                                "ml-2 py-0.5 px-2.5 rounded-full text-xs font-medium",
                                activeTab === tab ? "bg-indigo-100 text-indigo-600" : "bg-gray-100 text-gray-900"
                            )}>
                                {registrations.filter(r => tab === 'all' ? true : r.status === tab).length}
                            </span>
                        </button>
                    ))}
                </nav>
            </div>

            {/* Results Table */}
            <div className="bg-white shadow-sm ring-1 ring-gray-900/5 sm:rounded-lg overflow-hidden">
                {loading ? (
                    <div className="p-12 flex justify-center text-gray-500">
                        <Loader2 className="h-8 w-8 animate-spin" />
                    </div>
                ) : filteredData.length === 0 ? (
                    <div className="p-12 text-center text-gray-500">
                        <AlertCircle className="h-10 w-10 mx-auto mb-3 text-gray-400" />
                        No registrations found matching your criteria.
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-300">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-xs font-semibold text-gray-900 sm:pl-6">
                                        Student Details
                                    </th>
                                    <th scope="col" className="px-3 py-3.5 text-left text-xs font-semibold text-gray-900">
                                        Event & Fees
                                    </th>
                                    <th scope="col" className="px-3 py-3.5 text-left text-xs font-semibold text-gray-900">
                                        Transaction
                                    </th>
                                    <th scope="col" className="px-3 py-3.5 text-left text-xs font-semibold text-gray-900">
                                        Status
                                    </th>
                                    <th scope="col" className="px-3 py-3.5 text-right text-xs font-semibold text-gray-900">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 bg-white">
                                {filteredData.map((reg) => (
                                    <tr key={reg.id} className="hover:bg-gray-50">
                                        <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm sm:pl-6">
                                            <div className="flex flex-col">
                                                <span className="font-medium text-gray-900">{reg.profiles?.full_name || 'N/A'}</span>
                                                <span className="text-gray-500 text-xs">
                                                    {reg.profiles?.roll_number} • {reg.profiles?.school}
                                                </span>
                                                <span className="text-gray-400 text-xs">
                                                    {reg.profiles?.department} ({reg.profiles?.year_of_study})
                                                </span>
                                            </div>
                                        </td>
                                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                                            <div className="flex flex-col">
                                                <span className="text-gray-900 font-medium">{reg.events?.name}</span>
                                                <span className="text-xs">{reg.events?.category} - {reg.events?.subcategory}</span>
                                                <span className="text-xs font-medium text-emerald-600">₹{reg.events?.fee}</span>
                                            </div>
                                        </td>
                                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                                            <div className="flex flex-col">
                                                <span className="text-gray-900">{reg.transaction_id || 'N/A'}</span>
                                                <span className="text-xs uppercase">{reg.payment_mode}</span>
                                            </div>
                                        </td>
                                        <td className="whitespace-nowrap px-3 py-4 text-sm">
                                            <span className={clsx(
                                                "inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset",
                                                reg.status === 'confirmed' ? "bg-green-50 text-green-700 ring-green-600/20" :
                                                    reg.status === 'rejected' ? "bg-red-50 text-red-700 ring-red-600/20" :
                                                        "bg-yellow-50 text-yellow-800 ring-yellow-600/20"
                                            )}>
                                                {reg.status}
                                            </span>
                                        </td>
                                        <td className="whitespace-nowrap px-3 py-4 text-sm text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                {reg.status === 'pending' && (
                                                    <>
                                                        <button
                                                            onClick={() => handleStatusUpdate(reg.id, 'confirmed')}
                                                            disabled={actionLoading === reg.id}
                                                            className="text-green-600 hover:text-green-900 disabled:opacity-50"
                                                            title="Confirm"
                                                        >
                                                            <CheckCircle className="h-5 w-5" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleStatusUpdate(reg.id, 'rejected')}
                                                            disabled={actionLoading === reg.id}
                                                            className="text-red-600 hover:text-red-900 disabled:opacity-50"
                                                            title="Reject"
                                                        >
                                                            <XCircle className="h-5 w-5" />
                                                        </button>
                                                    </>
                                                )}
                                                {reg.status === 'confirmed' && (
                                                    <button
                                                        onClick={() => handleStatusUpdate(reg.id, 'rejected')}
                                                        disabled={actionLoading === reg.id}
                                                        className="text-red-600 hover:text-red-900 disabled:opacity-50"
                                                        title="Reject"
                                                    >
                                                        <XCircle className="h-5 w-5" />
                                                    </button>
                                                )}
                                                {(reg.status !== 'pending' && reg.status !== 'confirmed') && (
                                                    <span className="text-gray-300">-</span>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <div className="text-xs text-gray-400 text-center">
                Showing {filteredData.length} of {registrations.length} total records
            </div>
        </div>
    )
}
