import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { Loader2, Check, X, Download, ExternalLink, Search, Filter, ChevronDown, ChevronUp, RotateCcw } from 'lucide-react'
import { format } from 'date-fns'

export default function AdminDashboard() {
    const { user } = useAuth()
    const [registrations, setRegistrations] = useState([])
    const [loading, setLoading] = useState(true)
    const [showFilters, setShowFilters] = useState(true)

    // Filter options
    const [schools, setSchools] = useState([])
    const [departments, setDepartments] = useState([])
    const [eventNames, setEventNames] = useState([])

    // Filter inputs (not yet applied)
    const [filters, setFilters] = useState({
        // Event filters
        category: '',
        subcategory: '',
        eventName: '',

        // Student filters
        studentName: '',
        email: '',
        rollNumber: '',
        school: '',
        department: '',
        gender: '',
        yearOfStudy: '',

        // Registration filters
        transactionId: '',
        status: 'all'
    })

    // Applied filters (used for actual filtering)
    const [appliedFilters, setAppliedFilters] = useState({ ...filters })

    useEffect(() => {
        if (user) {
            fetchRegistrations()
            fetchFilterOptions()
        }
    }, [user])

    const fetchRegistrations = async () => {
        try {
            const { data, error } = await supabase
                .from('registrations')
                .select(`
                    *,
                    event:events(name, fee, category, subcategory),
                    profile:profiles(full_name, college_email, roll_number, phone, school, department, gender, year_of_study, program)
                `)
                .order('registered_at', { ascending: false })

            if (error) throw error
            setRegistrations(data || [])
        } catch (error) {
            console.error('Error fetching registrations:', error)
        } finally {
            setLoading(false)
        }
    }

    const fetchFilterOptions = async () => {
        try {
            // Fetch all profiles and extract unique values
            const { data: profileData, error: profileError } = await supabase
                .from('profiles')
                .select('school, department')

            if (profileError) {
                console.error('Error fetching profiles:', profileError)
            } else {
                // Extract unique schools
                const uniqueSchools = [...new Set(profileData?.map(p => p.school).filter(Boolean))]
                setSchools(uniqueSchools.sort())

                // Extract unique departments
                const uniqueDepts = [...new Set(profileData?.map(p => p.department).filter(Boolean))]
                setDepartments(uniqueDepts.sort())
            }

            // Fetch all events for dropdown
            const { data: eventsData, error: eventsError } = await supabase
                .from('events')
                .select('name')
                .order('name')

            if (eventsError) {
                console.error('Error fetching events:', eventsError)
            } else {
                const uniqueEvents = [...new Set(eventsData?.map(e => e.name).filter(Boolean))]
                setEventNames(uniqueEvents)
            }
        } catch (error) {
            console.error('Error fetching filter options:', error)
        }
    }

    const updateStatus = async (id, newStatus) => {
        try {
            const { error } = await supabase
                .from('registrations')
                .update({ status: newStatus })
                .eq('id', id)

            if (error) throw error
            setRegistrations(prev => prev.map(r => r.id === id ? { ...r, status: newStatus } : r))
        } catch (error) {
            console.error('Error updating status:', error)
            alert('Failed to update status')
        }
    }

    const getSignedUrl = async (path) => {
        if (!path) return null
        const { data, error } = await supabase.storage
            .from('payment_proofs')
            .createSignedUrl(path, 60)

        if (error) {
            console.error('Error getting signed URL:', error)
            return null
        }
        return data.signedUrl
    }

    const handleViewScreenshot = async (path) => {
        const url = await getSignedUrl(path)
        if (url) {
            window.open(url, '_blank')
        } else {
            alert('Could not load screenshot')
        }
    }

    const handleSearch = () => {
        setAppliedFilters({ ...filters })
    }

    const handleClearFilters = () => {
        const defaultFilters = {
            category: '',
            subcategory: '',
            eventName: '',
            studentName: '',
            email: '',
            rollNumber: '',
            school: '',
            department: '',
            gender: '',
            yearOfStudy: '',
            transactionId: '',
            status: 'all'
        }
        setFilters(defaultFilters)
        setAppliedFilters(defaultFilters)
    }

    const exportToCSV = () => {
        // Define CSV headers
        const headers = [
            'Student Name',
            'Email',
            'Roll Number',
            'Phone',
            'School',
            'Department',
            'Gender',
            'Year of Study',
            'Program',
            'Event Name',
            'Event Category',
            'Event Subcategory',
            'Event Fee',
            'Transaction ID',
            'Registration Status',
            'Registration Date',
            'Registration Time'
        ]

        // Convert filtered registrations to CSV rows
        const rows = filteredRegistrations.map(reg => [
            reg.profile?.full_name || '',
            reg.profile?.college_email || '',
            reg.profile?.roll_number || '',
            reg.profile?.phone || '',
            reg.profile?.school || '',
            reg.profile?.department || '',
            reg.profile?.gender || '',
            reg.profile?.year_of_study || '',
            reg.profile?.program || '',
            reg.event?.name || '',
            reg.event?.category || '',
            reg.event?.subcategory || '',
            reg.event?.fee || '',
            reg.transaction_id || '',
            reg.status || '',
            reg.registered_at ? format(new Date(reg.registered_at), 'MMM d, yyyy') : '',
            reg.registered_at ? format(new Date(reg.registered_at), 'h:mm a') : ''
        ])

        // Combine headers and rows
        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
        ].join('\n')

        // Create blob and download
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
        const link = document.createElement('a')
        const url = URL.createObjectURL(blob)

        link.setAttribute('href', url)
        link.setAttribute('download', `registrations_${format(new Date(), 'yyyy-MM-dd_HH-mm')}.csv`)
        link.style.visibility = 'hidden'

        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
    }


    const filteredRegistrations = registrations.filter(r => {
        // Status filter
        if (appliedFilters.status !== 'all' && r.status !== appliedFilters.status) return false

        // Event filters
        if (appliedFilters.category && r.event?.category !== appliedFilters.category) return false
        if (appliedFilters.subcategory && r.event?.subcategory !== appliedFilters.subcategory) return false
        if (appliedFilters.eventName && r.event?.name !== appliedFilters.eventName) return false

        // Student filters
        if (appliedFilters.studentName && !r.profile?.full_name?.toLowerCase().includes(appliedFilters.studentName.toLowerCase())) return false
        if (appliedFilters.email && !r.profile?.college_email?.toLowerCase().includes(appliedFilters.email.toLowerCase())) return false
        if (appliedFilters.rollNumber && !r.profile?.roll_number?.toLowerCase().includes(appliedFilters.rollNumber.toLowerCase())) return false
        if (appliedFilters.school && r.profile?.school !== appliedFilters.school) return false
        if (appliedFilters.department && r.profile?.department !== appliedFilters.department) return false
        if (appliedFilters.gender && r.profile?.gender !== appliedFilters.gender) return false
        if (appliedFilters.yearOfStudy && r.profile?.year_of_study !== appliedFilters.yearOfStudy) return false

        // Transaction filter
        if (appliedFilters.transactionId && !r.transaction_id?.toLowerCase().includes(appliedFilters.transactionId.toLowerCase())) return false

        return true
    })

    if (loading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div>

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            {/* Header */}
            <div className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
                    <p className="mt-2 text-gray-600">Manage registrations and payments.</p>
                    Click here to view <strong> <a href="/admin/stats">Advance Stats</a> </strong>
                </div>
                <button
                    onClick={exportToCSV}
                    className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                >
                    <Download className="h-4 w-4 mr-2" /> Export CSV
                </button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-3 mb-8">
                <div className="bg-white overflow-hidden shadow rounded-lg">
                    <div className="px-4 py-5 sm:p-6">
                        <dt className="text-sm font-medium text-gray-500 truncate">Total Registrations</dt>
                        <dd className="mt-1 text-3xl font-semibold text-gray-900">{registrations.length}</dd>
                    </div>
                </div>
                <div className="bg-white overflow-hidden shadow rounded-lg">
                    <div className="px-4 py-5 sm:p-6">
                        <dt className="text-sm font-medium text-gray-500 truncate">Pending Approvals</dt>
                        <dd className="mt-1 text-3xl font-semibold text-yellow-600">
                            {registrations.filter(r => r.status === 'pending').length}
                        </dd>
                    </div>
                </div>
                <div className="bg-white overflow-hidden shadow rounded-lg">
                    <div className="px-4 py-5 sm:p-6">
                        <dt className="text-sm font-medium text-gray-500 truncate">Confirmed Revenue</dt>
                        <dd className="mt-1 text-3xl font-semibold text-green-600">
                            ₹{registrations.filter(r => r.status === 'confirmed').reduce((acc, curr) => acc + (curr.event?.fee || 0), 0)}
                        </dd>
                    </div>
                </div>
            </div>

            {/* Advanced Filters */}
            <div className="mb-6 bg-white shadow rounded-lg overflow-hidden">
                <button
                    onClick={() => setShowFilters(!showFilters)}
                    className="w-full px-6 py-4 flex items-center justify-between bg-gray-50 hover:bg-gray-100 transition-colors"
                >
                    <div className="flex items-center">
                        <Filter className="h-5 w-5 text-gray-600 mr-2" />
                        <span className="font-medium text-gray-900">Advanced Filters</span>
                    </div>
                    {showFilters ? <ChevronUp className="h-5 w-5 text-gray-600" /> : <ChevronDown className="h-5 w-5 text-gray-600" />}
                </button>

                {showFilters && (
                    <div className="px-6 py-6 space-y-6">
                        {/* Event Filters */}
                        <div>
                            <h3 className="text-sm font-semibold text-gray-700 mb-3">Event Filters</h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Category</label>
                                    <select
                                        value={filters.category}
                                        onChange={(e) => setFilters({ ...filters, category: e.target.value })}
                                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary text-sm"
                                    >
                                        <option value="">All Categories</option>
                                        <option value="Cultural">Cultural</option>
                                        <option value="Technical">Technical</option>
                                        <option value="Sports">Sports</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Subcategory</label>
                                    <select
                                        value={filters.subcategory}
                                        onChange={(e) => setFilters({ ...filters, subcategory: e.target.value })}
                                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary text-sm"
                                    >
                                        <option value="">All Types</option>
                                        <option value="Individual">Individual</option>
                                        <option value="Group">Group</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Event Name</label>
                                    <select
                                        value={filters.eventName}
                                        onChange={(e) => setFilters({ ...filters, eventName: e.target.value })}
                                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary text-sm"
                                    >
                                        <option value="">All Events</option>
                                        {eventNames.map(event => (
                                            <option key={event} value={event}>{event}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* Student Filters */}
                        <div>
                            <h3 className="text-sm font-semibold text-gray-700 mb-3">Student Filters</h3>
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">School</label>
                                    <select
                                        value={filters.school}
                                        onChange={(e) => setFilters({ ...filters, school: e.target.value })}
                                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary text-sm"
                                    >
                                        <option value="">All Schools</option>
                                        {schools.map(school => (
                                            <option key={school} value={school}>{school}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Department</label>
                                    <select
                                        value={filters.department}
                                        onChange={(e) => setFilters({ ...filters, department: e.target.value })}
                                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary text-sm"
                                    >
                                        <option value="">All Departments</option>
                                        {departments.map(dept => (
                                            <option key={dept} value={dept}>{dept}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Gender</label>
                                    <select
                                        value={filters.gender}
                                        onChange={(e) => setFilters({ ...filters, gender: e.target.value })}
                                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary text-sm"
                                    >
                                        <option value="">All Genders</option>
                                        <option value="Male">Male</option>
                                        <option value="Female">Female</option>
                                        <option value="Other">Other</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Year of Study</label>
                                    <select
                                        value={filters.yearOfStudy}
                                        onChange={(e) => setFilters({ ...filters, yearOfStudy: e.target.value })}
                                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary text-sm"
                                    >
                                        <option value="">All Years</option>
                                        <option value="1st Year">1st Year</option>
                                        <option value="2nd Year">2nd Year</option>
                                        <option value="3rd Year">3rd Year</option>
                                        <option value="4th Year">4th Year</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* Search Fields */}
                        <div>
                            <h3 className="text-sm font-semibold text-gray-700 mb-3">Search Fields</h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Student Name</label>
                                    <input
                                        type="text"
                                        value={filters.studentName}
                                        onChange={(e) => setFilters({ ...filters, studentName: e.target.value })}
                                        placeholder="Search by name..."
                                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Email</label>
                                    <input
                                        type="text"
                                        value={filters.email}
                                        onChange={(e) => setFilters({ ...filters, email: e.target.value })}
                                        placeholder="Search by email..."
                                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Roll Number</label>
                                    <input
                                        type="text"
                                        value={filters.rollNumber}
                                        onChange={(e) => setFilters({ ...filters, rollNumber: e.target.value })}
                                        placeholder="Search by roll no..."
                                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Transaction ID</label>
                                    <input
                                        type="text"
                                        value={filters.transactionId}
                                        onChange={(e) => setFilters({ ...filters, transactionId: e.target.value })}
                                        placeholder="Search by transaction ID..."
                                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary text-sm"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Status Filter */}
                        <div>
                            <h3 className="text-sm font-semibold text-gray-700 mb-3">Status</h3>
                            <div className="flex gap-2">
                                {['all', 'pending', 'confirmed', 'rejected'].map((status) => (
                                    <button
                                        key={status}
                                        onClick={() => setFilters({ ...filters, status })}
                                        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${filters.status === status
                                            ? 'bg-primary text-white'
                                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                            }`}
                                    >
                                        {status.charAt(0).toUpperCase() + status.slice(1)}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-3 pt-4 border-t">
                            <button
                                onClick={handleClearFilters}
                                className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                            >
                                <RotateCcw className="h-4 w-4 mr-2" />
                                Clear Filters
                            </button>
                            <button
                                onClick={handleSearch}
                                className="inline-flex items-center px-6 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary hover:bg-blue-700"
                            >
                                <Search className="h-4 w-4 mr-2" />
                                Search
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Results Count */}
            <div className="mb-4 text-sm text-gray-600">
                Showing {filteredRegistrations.length} of {registrations.length} registrations
            </div>

            {/* Table */}
            <div className="flex flex-col">
                <div className="-my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
                    <div className="py-2 align-middle inline-block min-w-full sm:px-6 lg:px-8">
                        <div className="shadow overflow-hidden border-b border-gray-200 sm:rounded-lg">
                            {filteredRegistrations.length > 0 ? (
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Student
                                            </th>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Event
                                            </th>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Payment
                                            </th>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Date
                                            </th>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Status
                                            </th>
                                            <th scope="col" className="relative px-6 py-3">
                                                <span className="sr-only">Actions</span>
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {filteredRegistrations.map((reg) => (
                                            <tr key={reg.id} className="hover:bg-gray-50 transition-colors">
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div>
                                                        <div className="text-sm font-medium text-gray-900">{reg.profile?.full_name}</div>
                                                        <div className="text-sm text-gray-500">{reg.profile?.college_email}</div>
                                                        <div className="text-xs text-gray-400">{reg.profile?.roll_number}</div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="text-sm text-gray-900">{reg.event?.name}</div>
                                                    <div className="text-xs text-gray-500">{reg.event?.category} • {reg.event?.subcategory}</div>
                                                    <div className="text-sm font-medium text-gray-700">₹{reg.event?.fee}</div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="text-sm text-gray-900 font-mono">ID: {reg.transaction_id}</div>
                                                    {reg.payment_screenshot_path && (
                                                        <button
                                                            onClick={() => handleViewScreenshot(reg.payment_screenshot_path)}
                                                            className="text-xs text-primary hover:text-blue-800 flex items-center mt-1"
                                                        >
                                                            <ExternalLink className="h-3 w-3 mr-1" /> View Proof
                                                        </button>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                    {format(new Date(reg.registered_at), 'MMM d, yyyy')}
                                                    <div className="text-xs text-gray-400">
                                                        {format(new Date(reg.registered_at), 'h:mm a')}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${reg.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                                                        reg.status === 'rejected' ? 'bg-red-100 text-red-800' :
                                                            'bg-yellow-100 text-yellow-800'
                                                        }`}>
                                                        {reg.status}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                    {reg.status === 'pending' && (
                                                        <div className="flex justify-end space-x-2">
                                                            <button
                                                                onClick={() => updateStatus(reg.id, 'confirmed')}
                                                                className="text-green-600 hover:text-green-900 bg-green-50 hover:bg-green-100 p-2 rounded transition-colors"
                                                                title="Approve"
                                                            >
                                                                <Check className="h-5 w-5" />
                                                            </button>
                                                            <button
                                                                onClick={() => updateStatus(reg.id, 'rejected')}
                                                                className="text-red-600 hover:text-red-900 bg-red-50 hover:bg-red-100 p-2 rounded transition-colors"
                                                                title="Reject"
                                                            >
                                                                <X className="h-5 w-5" />
                                                            </button>
                                                        </div>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            ) : (
                                <div className="text-center py-12 bg-white">
                                    <p className="text-gray-500 text-lg">No registrations found</p>
                                    <p className="text-gray-400 text-sm mt-2">Try adjusting your filters</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
