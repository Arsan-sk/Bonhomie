import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../../lib/supabase'
import {
    Search,
    Download,
    Filter,
    CheckCircle,
    XCircle,
    Loader2,
    Users,
    Clock,
    FileSpreadsheet,
    DollarSign,
    Eye
} from 'lucide-react'
import { clsx } from 'clsx'

// Helper to download CSV
const downloadCSV = (data, filename) => {
    if (!data.length) {
        alert('No data to export')
        return
    }

    const csvRows = []
    const headers = [
        'Registration ID', 'Status', 'Payment Mode', 'Transaction ID', 'Registered At',
        'Event Name', 'Event Category', 'Event Subcategory', 'Event Fee',
        'Student Name', 'Roll Number', 'Email', 'Phone', 'Gender',
        'School', 'Department', 'Program', 'Year of Study'
    ]
    csvRows.push(headers.join(','))

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

// Helper to get team name (use leader's name + " Team")
const getTeamName = (registration) => {
    if (!registration.profiles) return 'Team'
    return `${registration.profiles.full_name}'s Team`
}

// Helper to get payment proof URL
const getPaymentProofUrl = (registration) => {
    if (!registration.payment_screenshot_path) return null
    // Construct the public URL for the payment proof
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
    if (!supabaseUrl) return null
    return `${supabaseUrl}/storage/v1/object/public/payment_proofs/${registration.payment_screenshot_path}`
}

export default function AdminAdvancedSearchNew() {
    const [registrations, setRegistrations] = useState([])
    const [eventsList, setEventsList] = useState([])
    const [loading, setLoading] = useState(true)
    const [actionLoading, setActionLoading] = useState(null)
    
    // Main Tabs: Individual or Group Events
    const [mainTab, setMainTab] = useState('individual') // 'individual' or 'group'
    
    // Sub Tabs: Payments or Participants
    const [subTab, setSubTab] = useState('payments') // 'payments' or 'participants'
    
    // Filters State (removed subcategory as requested)
    const [filters, setFilters] = useState({
        search: '',
        eventCategory: '',
        eventId: '',
        gender: '',
        school: '',
        department: '',
        program: '',
        yearOfStudy: '',
    })

    // Screenshot Modal
    const [screenshotModal, setScreenshotModal] = useState({ isOpen: false, url: '' })
    
    // Profile Modal
    const [selectedProfile, setSelectedProfile] = useState(null)

    // Fetch Data
    useEffect(() => {
        const fetchData = async () => {
            setLoading(true)
            try {
                // Fetch Events
                const { data: eventsData, error: eventsError } = await supabase
                    .from('events')
                    .select('id, name, category, subcategory')

                if (eventsError) {
                    console.error('Events fetch error:', eventsError)
                    throw eventsError
                }
                setEventsList(eventsData || [])

                // Fetch Registrations with joins - using LEFT joins to be more permissive
                const { data: regData, error: regError } = await supabase
                    .from('registrations')
                    .select(`
                        id,
                        status,
                        payment_mode,
                        transaction_id,
                        payment_screenshot_path,
                        registered_at,
                        profile_id,
                        event_id,
                        team_members,
                        events (
                            id, name, category, subcategory, fee
                        ),
                        profiles (
                            id, full_name, college_email, phone, roll_number,
                            gender, school, department, program, year_of_study
                        )
                    `)
                    .order('registered_at', { ascending: false })

                if (regError) {
                    console.error('Registrations fetch error:', regError)
                    throw regError
                }
                
                console.log('Fetched registrations:', regData?.length || 0)
                setRegistrations(regData || [])

            } catch (error) {
                console.error('Error fetching data:', error)
                alert(`Failed to load data: ${error.message}`)
            } finally {
                setLoading(false)
            }
        }
        fetchData()
    }, [])

    // Handle Status Change
    const handleStatusUpdate = async (regId, newStatus, registration) => {
        if (!confirm(`Are you sure you want to mark this as ${newStatus}?`)) return

        setActionLoading(regId)
        try {
            // For group events, update all team members' registrations
            if (registration?.events?.subcategory === 'Group' && registration?.team_members?.length > 0) {
                // Get all team member profile IDs
                const memberProfileIds = registration.team_members.map(m => m.profile_id).filter(Boolean)
                
                // Update leader
                const { error: leaderError } = await supabase
                    .from('registrations')
                    .update({ status: newStatus })
                    .eq('id', regId)

                if (leaderError) throw leaderError

                // Update all team members if there are any
                if (memberProfileIds.length > 0) {
                    const { error: membersError } = await supabase
                        .from('registrations')
                        .update({ status: newStatus })
                        .eq('event_id', registration.event_id)
                        .in('profile_id', memberProfileIds)

                    if (membersError) {
                        console.warn('Failed to update some team members:', membersError)
                        // Continue even if member updates fail
                    }
                }

                // Update local state for leader
                setRegistrations(prev =>
                    prev.map(r => r.id === regId ? { ...r, status: newStatus } : r)
                )
            } else {
                // Individual event - update only this registration
                const { error } = await supabase
                    .from('registrations')
                    .update({ status: newStatus })
                    .eq('id', regId)

                if (error) throw error

                setRegistrations(prev =>
                    prev.map(r => r.id === regId ? { ...r, status: newStatus } : r)
                )
            }

        } catch (error) {
            console.error('Update failed:', error)
            alert('Failed to update status')
        } finally {
            setActionLoading(null)
        }
    }

    // Filtered data based on main tab (Individual/Group)
    const currentSubcategoryData = useMemo(() => {
        const subcategory = mainTab === 'individual' ? 'Individual' : 'Group'
        return registrations.filter(reg => reg.events?.subcategory === subcategory)
    }, [registrations, mainTab])

    // Apply filters
    const filteredData = useMemo(() => {
        return currentSubcategoryData.filter(reg => {
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
            if (filters.eventId && reg.events?.id !== filters.eventId) return false

            // Student Filters
            if (filters.gender && reg.profiles?.gender?.toLowerCase() !== filters.gender.toLowerCase()) return false
            if (filters.school && reg.profiles?.school !== filters.school) return false
            if (filters.department && reg.profiles?.department !== filters.department) return false
            if (filters.program && reg.profiles?.program !== filters.program) return false
            if (filters.yearOfStudy && reg.profiles?.year_of_study !== filters.yearOfStudy) return false

            return true
        })
    }, [currentSubcategoryData, filters])

    // Filter by sub-tab: Payments (pending) or Participants (confirmed)
    const displayData = useMemo(() => {
        if (subTab === 'payments') {
            return filteredData.filter(reg => reg.status === 'pending')
        } else {
            return filteredData.filter(reg => reg.status === 'confirmed')
        }
    }, [filteredData, subTab])

    // Calculate Stats
    const stats = useMemo(() => {
        const total = currentSubcategoryData.length
        const confirmed = currentSubcategoryData.filter(r => r.status === 'confirmed').length
        const pending = currentSubcategoryData.filter(r => r.status === 'pending').length
        const rejected = currentSubcategoryData.filter(r => r.status === 'rejected').length
        return { total, confirmed, pending, rejected }
    }, [currentSubcategoryData])

    // Derived Options for Filter Dropdowns
    const uniqueDepartments = useMemo(() => {
        const depts = new Set(registrations.map(r => r.profiles?.department).filter(Boolean))
        const defaults = ['CO', 'AIML', 'DS', 'ECS', 'CE', 'ME', 'ECE', 'Electrical', 'Diploma Pharmacy', 'Degree Pharmacy', 'Diploma Architecture', 'Degree Architecture']
        defaults.forEach(d => depts.add(d))
        return Array.from(depts).sort()
    }, [registrations])

    // Filter events dropdown based on selected category
    const filteredEventOptions = useMemo(() => {
        return eventsList.filter(e => {
            // Filter by mainTab (Individual/Group)
            const subcategory = mainTab === 'individual' ? 'Individual' : 'Group'
            if (e.subcategory !== subcategory) return false
            if (filters.eventCategory && e.category !== filters.eventCategory) return false
            return true
        })
    }, [eventsList, filters.eventCategory, mainTab])

    const resetFilters = () => {
        setFilters({
            search: '',
            eventCategory: '',
            eventId: '',
            gender: '',
            school: '',
            department: '',
            program: '',
            yearOfStudy: '',
        })
    }

    if (loading) {
        return (
            <div className="flex justify-center items-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
            </div>
        )
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
                    onClick={() => downloadCSV(displayData, `${mainTab}_${subTab}_export_${new Date().toISOString().split('T')[0]}.csv`)}
                    className="inline-flex items-center gap-2 rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500"
                >
                    <Download className="h-4 w-4" />
                    Export CSV
                </button>
            </div>

            {/* Status Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl border-2 border-blue-200 p-5">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-blue-600">Total</p>
                            <p className="text-3xl font-bold text-blue-700 mt-1">{stats.total}</p>
                        </div>
                        <Users className="h-10 w-10 text-blue-500 opacity-50" />
                    </div>
                </div>
                <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl border-2 border-green-200 p-5">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-green-600">Confirmed</p>
                            <p className="text-3xl font-bold text-green-700 mt-1">{stats.confirmed}</p>
                        </div>
                        <CheckCircle className="h-10 w-10 text-green-500 opacity-50" />
                    </div>
                </div>
                <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-xl border-2 border-yellow-200 p-5">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-yellow-600">Pending</p>
                            <p className="text-3xl font-bold text-yellow-700 mt-1">{stats.pending}</p>
                        </div>
                        <Clock className="h-10 w-10 text-yellow-500 opacity-50" />
                    </div>
                </div>
                <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-xl border-2 border-red-200 p-5">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-red-600">Rejected</p>
                            <p className="text-3xl font-bold text-red-700 mt-1">{stats.rejected}</p>
                        </div>
                        <XCircle className="h-10 w-10 text-red-500 opacity-50" />
                    </div>
                </div>
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
                    {/* Search - Spans 4 cols */}
                    <div className="lg:col-span-4">
                        <div className="relative">
                            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                <Search className="h-4 w-4 text-gray-400" />
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

                    {/* Event Category */}
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

                    {/* Event Name */}
                    <select
                        className="block w-full rounded-md border-0 py-2 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm lg:col-span-3"
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
                        className="block w-full rounded-md border-0 py-2 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm lg:col-span-3"
                        value={filters.gender}
                        onChange={(e) => setFilters(prev => ({ ...prev, gender: e.target.value }))}
                    >
                        <option value="">All Genders</option>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                    </select>
                </div>
            </div>

            {/* Main Tabs: Individual / Group Events */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="border-b border-gray-200">
                    <nav className="flex -mb-px">
                        <button
                            onClick={() => {
                                setMainTab('individual')
                                setSubTab('payments')
                            }}
                            className={clsx(
                                'flex-1 py-4 px-6 text-center text-sm font-semibold transition-colors',
                                mainTab === 'individual'
                                    ? 'border-b-2 border-indigo-600 text-indigo-600 bg-indigo-50'
                                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                            )}
                        >
                            Individual Events
                        </button>
                        <button
                            onClick={() => {
                                setMainTab('group')
                                setSubTab('payments')
                            }}
                            className={clsx(
                                'flex-1 py-4 px-6 text-center text-sm font-semibold transition-colors',
                                mainTab === 'group'
                                    ? 'border-b-2 border-indigo-600 text-indigo-600 bg-indigo-50'
                                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                            )}
                        >
                            Group Events
                        </button>
                    </nav>
                </div>

                {/* Sub Tabs: Payments / Participants */}
                <div className="bg-gray-50 border-b border-gray-200">
                    <nav className="flex -mb-px px-6">
                        <button
                            onClick={() => setSubTab('payments')}
                            className={clsx(
                                'py-3 px-4 text-sm font-medium transition-colors flex items-center gap-2',
                                subTab === 'payments'
                                    ? 'border-b-2 border-indigo-600 text-indigo-600'
                                    : 'text-gray-600 hover:text-gray-900'
                            )}
                        >
                            <DollarSign className="h-4 w-4" />
                            Payments ({stats.pending})
                        </button>
                        <button
                            onClick={() => setSubTab('participants')}
                            className={clsx(
                                'py-3 px-4 text-sm font-medium transition-colors flex items-center gap-2',
                                subTab === 'participants'
                                    ? 'border-b-2 border-indigo-600 text-indigo-600'
                                    : 'text-gray-600 hover:text-gray-900'
                            )}
                        >
                            <Users className="h-4 w-4" />
                            Participants ({stats.confirmed})
                        </button>
                    </nav>
                </div>

                {/* Content Area */}
                <div className="p-6">
                    {displayData.length === 0 ? (
                        <div className="text-center py-12 text-gray-500">
                            <FileSpreadsheet className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                            <p>No {subTab === 'payments' ? 'pending payments' : 'confirmed participants'} found for {mainTab} events</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto -mx-6">
                            <div className="inline-block min-w-full align-middle px-6">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Event</th>
                                            <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{mainTab === 'group' ? 'Team Leader' : 'Student'}</th>
                                            <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Roll No</th>
                                            {subTab === 'payments' && (
                                                <>
                                                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payment</th>
                                                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Trans. ID</th>
                                                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Proof</th>
                                                </>
                                            )}
                                            <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Registered</th>
                                            {subTab === 'payments' && (
                                                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                            )}
                                            {subTab === 'participants' && mainTab === 'group' && (
                                                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Team</th>
                                            )}
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {displayData.map((reg) => (
                                            <tr key={reg.id} className="hover:bg-gray-50">
                                                <td className="px-3 py-3 text-sm">
                                                    <div className="font-medium text-gray-900">{reg.events?.name}</div>
                                                    <div className="text-xs text-gray-500">{reg.events?.category}</div>
                                                </td>
                                                <td className="px-3 py-3 text-sm">
                                                    <div className="font-medium text-gray-900">{reg.profiles?.full_name}</div>
                                                    <div className="text-xs text-gray-500">{reg.profiles?.college_email}</div>
                                                </td>
                                                <td className="px-3 py-3 text-sm text-gray-900">{reg.profiles?.roll_number}</td>
                                                {subTab === 'payments' && (
                                                    <>
                                                        <td className="px-3 py-3 text-sm">
                                                            <span className={clsx(
                                                                'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium',
                                                                reg.payment_mode === 'cash' 
                                                                    ? 'bg-green-100 text-green-800'
                                                                    : 'bg-blue-100 text-blue-800'
                                                            )}>
                                                                {reg.payment_mode || 'N/A'}
                                                            </span>
                                                        </td>
                                                        <td className="px-3 py-3 text-sm text-gray-900 truncate max-w-[120px]" title={reg.transaction_id}>{reg.transaction_id || 'N/A'}</td>
                                                        <td className="px-3 py-3 text-sm">
                                                        {getPaymentProofUrl(reg) && (reg.payment_mode === 'online' || reg.payment_mode === 'hybrid') ? (
                                                            <button
                                                                onClick={() => setScreenshotModal({ isOpen: true, url: getPaymentProofUrl(reg) })}
                                                                className="text-gray-700 hover:text-gray-900 flex items-center gap-1 font-medium"
                                                            >
                                                                <Eye className="h-4 w-4" />
                                                                View
                                                            </button>
                                                        ) : (
                                                            <span className="text-gray-400">-</span>
                                                        )}
                                                        </td>
                                                    </>
                                                )}
                                                <td className="px-3 py-3 text-sm text-gray-500">
                                                    {new Date(reg.registered_at).toLocaleDateString()}
                                                </td>
                                                {subTab === 'payments' && (
                                                    <td className="px-3 py-3 text-sm">
                                                    <div className="flex gap-2">
                                                        <button
                                                            onClick={() => handleStatusUpdate(reg.id, 'confirmed', reg)}
                                                            disabled={actionLoading === reg.id}
                                                            className="text-green-600 hover:text-green-800 disabled:opacity-50"
                                                            title={mainTab === 'group' ? 'Confirm Team' : 'Confirm'}
                                                        >
                                                            {actionLoading === reg.id ? (
                                                                <Loader2 className="h-4 w-4 animate-spin" />
                                                            ) : (
                                                                <CheckCircle className="h-4 w-4" />
                                                            )}
                                                        </button>
                                                        <button
                                                            onClick={() => handleStatusUpdate(reg.id, 'rejected', reg)}
                                                            disabled={actionLoading === reg.id}
                                                            className="text-red-600 hover:text-red-800 disabled:opacity-50"
                                                            title={mainTab === 'group' ? 'Reject Team' : 'Reject'}
                                                        >
                                                            <XCircle className="h-4 w-4" />
                                                        </button>
                                                    </div>
                                                </td>
                                                )}
                                                {subTab === 'participants' && mainTab === 'group' && (
                                                    <td className="px-3 py-3 text-sm">
                                                        <button
                                                            onClick={() => setSelectedProfile({ 
                                                                ...reg, 
                                                                showTeamMembers: true 
                                                            })}
                                                            className="text-gray-700 hover:text-gray-900 flex items-center gap-1 font-medium"
                                                        >
                                                            <Users className="h-4 w-4" />
                                                            {reg.team_members?.length || 0} Members
                                                        </button>
                                                    </td>
                                                )}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    <p className="text-xs text-gray-500 text-center mt-4">
                        Showing {displayData.length} {subTab === 'payments' ? 'pending payments' : 'confirmed participants'}
                    </p>
                </div>
            </div>

            {/* Screenshot Modal */}
            {screenshotModal.isOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={() => setScreenshotModal({ isOpen: false, url: '' })}>
                    <div className="bg-white rounded-lg max-w-3xl w-full p-6" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-semibold">Payment Proof</h3>
                            <button
                                onClick={() => setScreenshotModal({ isOpen: false, url: '' })}
                                className="text-gray-500 hover:text-gray-700"
                            >
                                <XCircle className="h-6 w-6" />
                            </button>
                        </div>
                        <img src={screenshotModal.url} alt="Payment Proof" className="w-full rounded-lg" />
                    </div>
                </div>
            )}

            {/* Team Members Modal */}
            {selectedProfile?.showTeamMembers && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={() => setSelectedProfile(null)}>
                    <div className="bg-white rounded-lg max-w-2xl w-full p-6" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-4">
                            <div>
                                <h3 className="text-lg font-semibold">{getTeamName(selectedProfile)}</h3>
                                <p className="text-sm text-gray-500">{selectedProfile.events?.name}</p>
                            </div>
                            <button
                                onClick={() => setSelectedProfile(null)}
                                className="text-gray-500 hover:text-gray-700"
                            >
                                <XCircle className="h-6 w-6" />
                            </button>
                        </div>
                        <div className="space-y-3">
                            {selectedProfile.team_members?.map((member, index) => (
                                <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-purple-400 to-indigo-500 flex items-center justify-center text-white font-bold">
                                        {member.full_name?.charAt(0)}
                                    </div>
                                    <div>
                                        <p className="font-medium text-gray-900">{member.full_name}</p>
                                        <p className="text-sm text-gray-500">{member.roll_number}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
