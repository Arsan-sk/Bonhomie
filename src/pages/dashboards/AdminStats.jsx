import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import {
    Loader2, ArrowLeft, TrendingUp, DollarSign, Users, CheckCircle,
    Clock, XCircle, ChevronDown, ChevronUp, Download, Award, Calendar,
    Building, GraduationCap, UserCheck
} from 'lucide-react'
import { format } from 'date-fns'

export default function AdminStats() {
    const { user } = useAuth()
    const navigate = useNavigate()
    const [loading, setLoading] = useState(true)
    const [registrations, setRegistrations] = useState([])
    const [events, setEvents] = useState([])
    const [expandedEvent, setExpandedEvent] = useState(null)

    useEffect(() => {
        if (user) {
            fetchData()
        }
    }, [user])

    const fetchData = async () => {
        try {
            // Fetch all registrations with full details
            const { data: regData, error: regError } = await supabase
                .from('registrations')
                .select(`
                    *,
                    event:events(*),
                    profile:profiles(*)
                `)
                .order('registered_at', { ascending: false })

            if (regError) throw regError

            // Fetch all events
            const { data: eventData, error: eventError } = await supabase
                .from('events')
                .select('*')
                .order('name')

            if (eventError) throw eventError

            setRegistrations(regData || [])
            setEvents(eventData || [])
        } catch (error) {
            console.error('Error fetching data:', error)
        } finally {
            setLoading(false)
        }
    }

    // Calculate overall statistics
    const totalRegistrations = registrations.length
    const confirmedRegistrations = registrations.filter(r => r.status === 'confirmed')
    const pendingRegistrations = registrations.filter(r => r.status === 'pending')
    const rejectedRegistrations = registrations.filter(r => r.status === 'rejected')

    // Team-aware revenue calculation (match AdminAnalytics & AdminDashboard logic)
    // Only count leaders and individual participants, NOT team members
    const totalRevenue = (() => {
        let revenue = 0
        confirmedRegistrations.forEach(reg => {
            const isLeader = reg.team_members && reg.team_members.length > 0

            // Check if this registration is a team member (only within same event)
            let isTeamMember = false
            if (!isLeader && reg.profile_id && reg.event?.id) {
                isTeamMember = confirmedRegistrations.some(otherReg =>
                    otherReg.event?.id === reg.event.id &&
                    otherReg.team_members?.some(m => m.id === reg.profile_id)
                )
            }

            // Only count if NOT a team member
            if (!isTeamMember) {
                revenue += (reg.event?.fee || 0)
            }
        })
        return revenue
    })()

    const pendingRevenue = pendingRegistrations.reduce((sum, r) => sum + (r.event?.fee || 0), 0)
    const expectedRevenue = registrations.reduce((sum, r) => sum + (r.event?.fee || 0), 0)
    const averageFee = totalRegistrations > 0 ? expectedRevenue / totalRegistrations : 0

    // Category statistics
    const categoryStats = ['Cultural', 'Technical', 'Sports'].map(category => {
        const categoryRegs = registrations.filter(r => r.event?.category === category)
        const categoryRevenue = categoryRegs.filter(r => r.status === 'confirmed').reduce((sum, r) => sum + (r.event?.fee || 0), 0)
        return {
            category,
            registrations: categoryRegs.length,
            revenue: categoryRevenue,
            events: events.filter(e => e.category === category).length
        }
    })

    // Gender distribution
    const genderStats = {
        Male: registrations.filter(r => r.profile?.gender === 'Male').length,
        Female: registrations.filter(r => r.profile?.gender === 'Female').length,
        Other: registrations.filter(r => r.profile?.gender === 'Other').length
    }

    // School distribution (top 10)
    const schoolCounts = {}
    registrations.forEach(r => {
        const school = r.profile?.school
        if (school) schoolCounts[school] = (schoolCounts[school] || 0) + 1
    })
    const topSchools = Object.entries(schoolCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)

    // Department distribution (top 10)
    const deptCounts = {}
    registrations.forEach(r => {
        const dept = r.profile?.department
        if (dept) deptCounts[dept] = (deptCounts[dept] || 0) + 1
    })
    const topDepartments = Object.entries(deptCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)

    // Year distribution
    const yearStats = {
        '1st Year': registrations.filter(r => r.profile?.year_of_study === '1st Year').length,
        '2nd Year': registrations.filter(r => r.profile?.year_of_study === '2nd Year').length,
        '3rd Year': registrations.filter(r => r.profile?.year_of_study === '3rd Year').length,
        '4th Year': registrations.filter(r => r.profile?.year_of_study === '4th Year').length
    }

    // Event-specific statistics
    const getEventStats = (eventId) => {
        const eventRegs = registrations.filter(r => r.event_id === eventId)
        const event = events.find(e => e.id === eventId)

        const confirmed = eventRegs.filter(r => r.status === 'confirmed').length
        const pending = eventRegs.filter(r => r.status === 'pending').length
        const rejected = eventRegs.filter(r => r.status === 'rejected').length

        const revenue = eventRegs.filter(r => r.status === 'confirmed').reduce((sum, r) => sum + (event?.fee || 0), 0)
        const pendingRev = eventRegs.filter(r => r.status === 'pending').reduce((sum, r) => sum + (event?.fee || 0), 0)

        const genderDist = {
            Male: eventRegs.filter(r => r.profile?.gender === 'Male').length,
            Female: eventRegs.filter(r => r.profile?.gender === 'Female').length
        }

        const schoolDist = {}
        eventRegs.forEach(r => {
            const school = r.profile?.school
            if (school) schoolDist[school] = (schoolDist[school] || 0) + 1
        })
        const topEventSchools = Object.entries(schoolDist).sort((a, b) => b[1] - a[1]).slice(0, 5)

        const deptDist = {}
        eventRegs.forEach(r => {
            const dept = r.profile?.department
            if (dept) deptDist[dept] = (deptDist[dept] || 0) + 1
        })
        const topEventDepts = Object.entries(deptDist).sort((a, b) => b[1] - a[1]).slice(0, 5)

        const yearDist = {
            '1st': eventRegs.filter(r => r.profile?.year_of_study === '1st Year').length,
            '2nd': eventRegs.filter(r => r.profile?.year_of_study === '2nd Year').length,
            '3rd': eventRegs.filter(r => r.profile?.year_of_study === '3rd Year').length,
            '4th': eventRegs.filter(r => r.profile?.year_of_study === '4th Year').length
        }

        // Team statistics for group events
        let teamStats = null
        if (event?.subcategory === 'Group') {
            const teamSizes = eventRegs.map(r => (r.team_members?.length || 0) + 1)
            teamStats = {
                totalTeams: eventRegs.length,
                avgSize: teamSizes.length > 0 ? (teamSizes.reduce((a, b) => a + b, 0) / teamSizes.length).toFixed(1) : 0,
                minSize: teamSizes.length > 0 ? Math.min(...teamSizes) : 0,
                maxSize: teamSizes.length > 0 ? Math.max(...teamSizes) : 0
            }
        }

        return {
            total: eventRegs.length,
            confirmed,
            pending,
            rejected,
            revenue,
            pendingRev,
            genderDist,
            topEventSchools,
            topEventDepts,
            yearDist,
            teamStats,
            capacity: event?.capacity,
            utilizationPercent: event?.capacity ? ((eventRegs.length / event.capacity) * 100).toFixed(1) : null
        }
    }

    if (loading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div>

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            {/* Header */}
            <div className="mb-8 flex justify-between items-center">
                <div>
                    <button
                        onClick={() => navigate('/admin/dashboard')}
                        className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
                    >
                        <ArrowLeft className="h-5 w-5 mr-2" /> Back to Dashboard
                    </button>
                    <h1 className="text-3xl font-bold text-gray-900">Event Statistics</h1>
                    <p className="mt-2 text-gray-600">Comprehensive analytics and insights</p>
                </div>
            </div>

            {/* Overall Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
                <div className="bg-white p-6 rounded-lg shadow border-l-4 border-blue-500">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600">Total Registrations</p>
                            <p className="text-3xl font-bold text-gray-900">{totalRegistrations}</p>
                        </div>
                        <Users className="h-10 w-10 text-blue-500" />
                    </div>
                </div>

                <div className="bg-white p-6 rounded-lg shadow border-l-4 border-green-500">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600">Total Revenue</p>
                            <p className="text-3xl font-bold text-gray-900">₹{totalRevenue}</p>
                        </div>
                        <DollarSign className="h-10 w-10 text-green-500" />
                    </div>
                </div>

                <div className="bg-white p-6 rounded-lg shadow border-l-4 border-yellow-500">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600">Pending Revenue</p>
                            <p className="text-3xl font-bold text-gray-900">₹{pendingRevenue}</p>
                        </div>
                        <Clock className="h-10 w-10 text-yellow-500" />
                    </div>
                </div>

                <div className="bg-white p-6 rounded-lg shadow border-l-4 border-purple-500">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600">Confirmed</p>
                            <p className="text-3xl font-bold text-gray-900">{confirmedRegistrations.length}</p>
                            <p className="text-xs text-gray-500">{((confirmedRegistrations.length / totalRegistrations) * 100).toFixed(1)}%</p>
                        </div>
                        <CheckCircle className="h-10 w-10 text-purple-500" />
                    </div>
                </div>

                <div className="bg-white p-6 rounded-lg shadow border-l-4 border-orange-500">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600">Average Fee</p>
                            <p className="text-3xl font-bold text-gray-900">₹{averageFee.toFixed(0)}</p>
                        </div>
                        <TrendingUp className="h-10 w-10 text-orange-500" />
                    </div>
                </div>
            </div>

            {/* Category Performance */}
            <div className="bg-white rounded-lg shadow p-6 mb-8">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Category Performance</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {categoryStats.map(cat => (
                        <div key={cat.category} className="border rounded-lg p-4">
                            <h3 className="font-semibold text-lg text-gray-900">{cat.category}</h3>
                            <div className="mt-2 space-y-1">
                                <p className="text-sm text-gray-600">Events: <span className="font-medium">{cat.events}</span></p>
                                <p className="text-sm text-gray-600">Registrations: <span className="font-medium">{cat.registrations}</span></p>
                                <p className="text-sm text-gray-600">Revenue: <span className="font-medium text-green-600">₹{cat.revenue}</span></p>
                                <p className="text-sm text-gray-600">Avg/Event: <span className="font-medium">{cat.events > 0 ? (cat.registrations / cat.events).toFixed(1) : 0}</span></p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Demographics */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                {/* Gender Distribution */}
                <div className="bg-white rounded-lg shadow p-6">
                    <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                        <UserCheck className="h-5 w-5 mr-2" /> Gender Distribution
                    </h3>
                    <div className="space-y-2">
                        {Object.entries(genderStats).map(([gender, count]) => (
                            <div key={gender} className="flex justify-between items-center">
                                <span className="text-sm text-gray-600">{gender}</span>
                                <div className="flex items-center">
                                    <span className="text-sm font-medium mr-2">{count}</span>
                                    <span className="text-xs text-gray-500">({((count / totalRegistrations) * 100).toFixed(1)}%)</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Top Schools */}
                <div className="bg-white rounded-lg shadow p-6">
                    <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                        <Building className="h-5 w-5 mr-2" /> Top Schools
                    </h3>
                    <div className="space-y-2">
                        {topSchools.slice(0, 5).map(([school, count]) => (
                            <div key={school} className="flex justify-between items-center">
                                <span className="text-sm text-gray-600 truncate">{school}</span>
                                <span className="text-sm font-medium">{count}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Top Departments */}
                <div className="bg-white rounded-lg shadow p-6">
                    <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                        <GraduationCap className="h-5 w-5 mr-2" /> Top Departments
                    </h3>
                    <div className="space-y-2">
                        {topDepartments.slice(0, 5).map(([dept, count]) => (
                            <div key={dept} className="flex justify-between items-center">
                                <span className="text-sm text-gray-600 truncate">{dept}</span>
                                <span className="text-sm font-medium">{count}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Event-Wise Statistics */}
            <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-6">Event-Wise Statistics</h2>
                <div className="space-y-4">
                    {events.map(event => {
                        const stats = getEventStats(event.id)
                        const isExpanded = expandedEvent === event.id

                        return (
                            <div key={event.id} className="border rounded-lg overflow-hidden">
                                <div className="p-4 bg-gray-50 hover:bg-gray-100 cursor-pointer" onClick={() => setExpandedEvent(isExpanded ? null : event.id)}>
                                    <div className="flex justify-between items-start">
                                        <div className="flex-1">
                                            <h3 className="font-semibold text-lg text-gray-900">{event.name}</h3>
                                            <p className="text-sm text-gray-600">{event.category} • {event.subcategory}</p>
                                        </div>
                                        <div className="flex items-center space-x-4">
                                            <div className="text-right">
                                                <p className="text-sm text-gray-600">Registrations</p>
                                                <p className="text-xl font-bold text-gray-900">{stats.total}</p>
                                                {stats.capacity && (
                                                    <p className="text-xs text-gray-500">{stats.utilizationPercent}% filled</p>
                                                )}
                                            </div>
                                            <div className="text-right">
                                                <p className="text-sm text-gray-600">Revenue</p>
                                                <p className="text-xl font-bold text-green-600">₹{stats.revenue}</p>
                                            </div>
                                            <div className="flex items-center space-x-1">
                                                <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">✓{stats.confirmed}</span>
                                                <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded">⏳{stats.pending}</span>
                                                <span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded">✗{stats.rejected}</span>
                                            </div>
                                            {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                                        </div>
                                    </div>
                                </div>

                                {isExpanded && (
                                    <div className="p-6 border-t bg-white">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            {/* Demographics */}
                                            <div>
                                                <h4 className="font-semibold text-gray-900 mb-3">Demographics</h4>
                                                <div className="space-y-2">
                                                    <div>
                                                        <p className="text-sm text-gray-600">Gender Distribution:</p>
                                                        <p className="text-sm">Male: {stats.genderDist.Male}, Female: {stats.genderDist.Female}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-sm text-gray-600">Top Schools:</p>
                                                        {stats.topEventSchools.map(([school, count]) => (
                                                            <p key={school} className="text-sm">{school}: {count}</p>
                                                        ))}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm text-gray-600">Top Departments:</p>
                                                        {stats.topEventDepts.map(([dept, count]) => (
                                                            <p key={dept} className="text-sm">{dept}: {count}</p>
                                                        ))}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm text-gray-600">Year Distribution:</p>
                                                        <p className="text-sm">1st: {stats.yearDist['1st']}, 2nd: {stats.yearDist['2nd']}, 3rd: {stats.yearDist['3rd']}, 4th: {stats.yearDist['4th']}</p>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Event Details */}
                                            <div>
                                                <h4 className="font-semibold text-gray-900 mb-3">Event Details</h4>
                                                <div className="space-y-2">
                                                    <p className="text-sm"><span className="text-gray-600">Fee:</span> ₹{event.fee}</p>
                                                    <p className="text-sm"><span className="text-gray-600">Venue:</span> {event.venue}</p>
                                                    <p className="text-sm"><span className="text-gray-600">Date:</span> {event.event_date ? format(new Date(event.event_date), 'MMM d, yyyy') : 'TBA'}</p>
                                                    <p className="text-sm"><span className="text-gray-600">Time:</span> {event.start_time?.slice(0, 5)} - {event.end_time?.slice(0, 5)}</p>
                                                    {stats.capacity && (
                                                        <p className="text-sm"><span className="text-gray-600">Capacity:</span> {stats.total}/{stats.capacity}</p>
                                                    )}
                                                    {stats.teamStats && (
                                                        <div className="mt-2">
                                                            <p className="text-sm text-gray-600">Team Statistics:</p>
                                                            <p className="text-sm">Total Teams: {stats.teamStats.totalTeams}</p>
                                                            <p className="text-sm">Avg Size: {stats.teamStats.avgSize}</p>
                                                            <p className="text-sm">Range: {stats.teamStats.minSize}-{stats.teamStats.maxSize}</p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Coordinators */}
                                        {(event.faculty_coordinators?.length > 0 || event.student_coordinators?.length > 0) && (
                                            <div className="mt-4 pt-4 border-t">
                                                <h4 className="font-semibold text-gray-900 mb-2">Coordinators</h4>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    {event.faculty_coordinators?.length > 0 && (
                                                        <div>
                                                            <p className="text-sm text-gray-600 font-medium">Faculty:</p>
                                                            {event.faculty_coordinators.map((coord, i) => (
                                                                <p key={i} className="text-sm">{coord.name} ({coord.phone})</p>
                                                            ))}
                                                        </div>
                                                    )}
                                                    {event.student_coordinators?.length > 0 && (
                                                        <div>
                                                            <p className="text-sm text-gray-600 font-medium">Student:</p>
                                                            {event.student_coordinators.map((coord, i) => (
                                                                <p key={i} className="text-sm">{coord.name} ({coord.phone})</p>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>
            </div>
        </div>
    )
}
