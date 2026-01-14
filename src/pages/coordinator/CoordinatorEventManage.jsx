import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { ArrowLeft, Edit2, Users, Trophy, DollarSign, BarChart3, Clock, Calendar, MapPin, Download, Check, X as XIcon, Search, Plus, Trash2, Eye, Activity, ChevronDown, ChevronUp, User } from 'lucide-react'
import SmartTable from '../../components/admin/ui/SmartTable'
import { AdminInput, AdminSelect } from '../../components/admin/ui/AdminForm'
import ProfilePage from '../../components/profile/ProfilePage'

export default function CoordinatorEventManage() {
    const { id } = useParams()
    const [activeTab, setActiveTab] = useState('overview')
    const [event, setEvent] = useState(null)
    const [loading, setLoading] = useState(true)
    const [expandedTeams, setExpandedTeams] = useState(new Set()) // Track which teams are expanded
    const [showMembersOnly, setShowMembersOnly] = useState(false) // Toggle for members view

    // Participants State
    const [participants, setParticipants] = useState([])
    const [loadingParticipants, setLoadingParticipants] = useState(false)
    const [participantSearch, setParticipantSearch] = useState('')

    // Rounds State
    const [rounds, setRounds] = useState([])
    const [loadingRounds, setLoadingRounds] = useState(false)
    const [isRoundModalOpen, setIsRoundModalOpen] = useState(false)
    const [roundForm, setRoundForm] = useState({ name: '', type: 'elimination', sequence_order: 1 })

    // Results State
    const [selectedRoundId, setSelectedRoundId] = useState('')
    const [roundParticipants, setRoundParticipants] = useState([])
    const [loadingResults, setLoadingResults] = useState(false)
    const [resultsView, setResultsView] = useState('manage') // 'manage' or 'leaderboard'

    // Payments State
    const [payments, setPayments] = useState([])
    const [loadingPayments, setLoadingPayments] = useState(false)
    const [paymentModeFilter, setPaymentModeFilter] = useState('all') // 'all', 'cash', 'online'
    const [screenshotModal, setScreenshotModal] = useState({ isOpen: false, url: '' })
    const [selectedProfile, setSelectedProfile] = useState(null) // For viewing participant profile

    useEffect(() => {
        fetchEventDetails()
    }, [id])

    useEffect(() => {
        if (activeTab === 'participants' || activeTab === 'analytics') fetchParticipants()
        if (activeTab === 'rounds' || activeTab === 'results') fetchRounds()
        if (activeTab === 'payments') fetchPayments()
    }, [activeTab, id])

    useEffect(() => {
        if (selectedRoundId) {
            fetchRoundParticipants(selectedRoundId)
        } else if (activeTab === 'results' && rounds.length > 0 && !selectedRoundId) {
            setSelectedRoundId(rounds[0].id)
        }
    }, [activeTab, selectedRoundId, rounds])

    const toggleTeamExpansion = (registrationId) => {
        setExpandedTeams(prev => {
            const newSet = new Set(prev)
            if (newSet.has(registrationId)) {
                newSet.delete(registrationId)
            } else {
                newSet.add(registrationId)
            }
            return newSet
        })
    }

    const fetchEventDetails = async () => {
        setLoading(true)
        const { data, error } = await supabase.from('events').select('*').eq('id', id).single()
        if (error) console.error('Error fetching event:', error)
        else setEvent(data)
        setLoading(false)
    }

    const fetchParticipants = async () => {
        setLoadingParticipants(true)
        const { data, error } = await supabase.from('registrations')
            .select(`*, user:profiles (id, full_name, college_email, roll_number, department, year_of_study)`)
            .eq('event_id', id)
        if (error) console.error('Error fetching participants:', error)
        else setParticipants(data || [])
        setLoadingParticipants(false)
    }

    const fetchRounds = async () => {
        setLoadingRounds(true)
        const { data, error } = await supabase.from('rounds')
            .select('*')
            .eq('event_id', id)
            .order('sequence_order', { ascending: true })
        if (error) console.error(error)
        else {
            setRounds(data || [])
            if (data && data.length > 0 && !selectedRoundId) setSelectedRoundId(data[0].id)
        }
        setLoadingRounds(false)
    }

    const fetchRoundParticipants = async (roundId) => {
        setLoadingResults(true)
        const { data, error } = await supabase.from('round_participants')
            .select(`*, registration:registrations!registration_id(user:profiles(full_name))`)
            .eq('round_id', roundId)
        if (error) console.error(error)
        else setRoundParticipants(data || [])
        setLoadingResults(false)
    }

    const fetchPayments = async () => {
        setLoadingPayments(true)
        console.log('Fetching payments for event:', id)

        // Fetch ALL pending registrations
        const { data, error } = await supabase
            .from('registrations')
            .select(`id, transaction_id, payment_screenshot_path, status, registered_at, payment_mode, user:profiles(id, full_name, college_email, roll_number)`)
            .eq('event_id', id)
            .order('registered_at', { ascending: false })

        if (error) {
            console.error(error)
            setPayments([])
        } else {
            // Generate public URLs for payment screenshots
            const paymentsWithUrls = (data || []).map(payment => {
                if (payment.payment_screenshot_path) {
                    const { data: { publicUrl } } = supabase.storage
                        .from('payment_proofs')
                        .getPublicUrl(payment.payment_screenshot_path)
                    return { ...payment, payment_screenshot_url: publicUrl }
                }
                return payment
            })
            setPayments(paymentsWithUrls)
        }

        setLoadingPayments(false)
    }

    const handleExportCSV = async () => {
        if (!event) return

        try {
            console.log('Starting CSV export for event:', event.name)

            // Fetch all confirmed participants with full profile data
            const { data: registrations, error } = await supabase
                .from('registrations')
                .select(`
                    *,
                    user:profiles (
                        id,
                        full_name,
                        college_email,
                        roll_number,
                        department,
                        year_of_study,
                        gender,
                        phone,
                        school
                    )
                `)
                .eq('event_id', id)
                .eq('status', 'confirmed')
                .order('registered_at', { ascending: true })

            if (error) throw error
            if (!registrations || registrations.length === 0) {
                alert('No confirmed participants to export')
                return
            }

            console.log('Fetched registrations:', registrations.length)

            // Build CSV content
            let csvContent = ''

            // EVENT HEADER SECTION
            csvContent += `Event Name:,${event.name}\n`
            csvContent += `Category:,${event.category}\n`
            csvContent += `Event Type:,${event.subcategory}\n`
            csvContent += `Date:,${event.event_date || 'TBA'}\n`
            csvContent += `Venue:,${event.venue || 'TBA'}\n`
            csvContent += `Fee:,₹${event.fee || 0}\n`

            // Fetch coordinator details
            const { data: assignments } = await supabase
                .from('event_assignments')
                .select('coordinator:profiles(full_name, college_email)')
                .eq('event_id', id)

            if (assignments && assignments.length > 0) {
                const coordinatorNames = assignments.map(a => a.coordinator?.full_name).filter(Boolean).join(', ')
                csvContent += `Coordinators:,${coordinatorNames}\n`
            }

            csvContent += `Total Participants:,${registrations.length}\n`
            csvContent += `\n` // Empty line

            // CHECK IF INDIVIDUAL OR GROUP EVENT
            const isGroupEvent = event.subcategory?.toLowerCase() === 'group'

            if (isGroupEvent) {
                // GROUP EVENT CSV
                csvContent += 'Team No,Member No,Roll Number,Name,Email,School,Department,Year of Study,Gender,Phone Number\n'

                let teamNumber = 0
                registrations.forEach((reg) => {
                    const teamMembers = reg.team_members || []

                    if (teamMembers.length > 0) {
                        teamNumber++

                        // Team Leader (first member)
                        const leader = reg.user
                        if (leader) {
                            csvContent += `${teamNumber},1,${escapeCSV(leader.roll_number)},${escapeCSV(leader.full_name)},${escapeCSV(leader.college_email)},${escapeCSV(leader.school)},${escapeCSV(leader.department)},${escapeCSV(leader.year_of_study)},${escapeCSV(leader.gender)},${escapeCSV(leader.phone)}\n`
                        }

                        // Team Members - leave team number blank for cleaner look
                        teamMembers.forEach((member, idx) => {
                            csvContent += `,${idx + 2},${escapeCSV(member.roll_number)},${escapeCSV(member.name)},${escapeCSV(member.email)},${escapeCSV(member.school)},${escapeCSV(member.department)},${escapeCSV(member.year_of_study)},${escapeCSV(member.gender)},${escapeCSV(member.phone)}\n`
                        })
                    }
                })
            } else {
                // INDIVIDUAL EVENT CSV
                csvContent += 'Serial No,Roll Number,Name,Email,School,Department,Year of Study,Gender,Phone Number\n'

                registrations.forEach((reg, index) => {
                    const user = reg.user
                    if (user) {
                        csvContent += `${index + 1},${escapeCSV(user.roll_number)},${escapeCSV(user.full_name)},${escapeCSV(user.college_email)},${escapeCSV(user.school)},${escapeCSV(user.department)},${escapeCSV(user.year_of_study)},${escapeCSV(user.gender)},${escapeCSV(user.phone)}\n`
                    }
                })
            }

            // Download CSV
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
            const link = document.createElement('a')
            const url = URL.createObjectURL(blob)
            link.setAttribute('href', url)
            link.setAttribute('download', `${event.name.replace(/[^a-z0-9]/gi, '_')}_Participants_${new Date().toISOString().split('T')[0]}.csv`)
            link.style.visibility = 'hidden'
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)

            console.log('CSV exported successfully')
        } catch (error) {
            console.error('Error exporting CSV:', error)
            alert('Failed to export CSV: ' + error.message)
        }
    }

    // Helper function to escape CSV values
    const escapeCSV = (value) => {
        if (value === null || value === undefined) return ''
        const str = String(value)
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
            return `"${str.replace(/"/g, '""')}"`
        }
        return str
    }


    const handleCreateRound = async () => {
        const { error } = await supabase.from('rounds').insert([{ ...roundForm, event_id: id }])
        if (error) alert('Error creating round')
        else { setIsRoundModalOpen(false); fetchRounds() }
    }

    const handleDeleteRound = async (roundId) => {
        if (!confirm("Delete this round?")) return
        const { error } = await supabase.from('rounds').delete().eq('id', roundId)
        if (error) alert("Error deleting round")
        else fetchRounds()
    }

    const handleRejectParticipant = async (registrationId) => {
        if (!confirm('Are you sure you want to reject this participant?')) return
        const { error } = await supabase.from('registrations').update({ status: 'rejected' }).eq('id', registrationId)
        if (error) alert('Error rejecting participant')
        else fetchParticipants()
    }

    const updateScore = async (rpId, score) => {
        await supabase.from('round_participants').update({ score }).eq('id', rpId)
    }

    const promoteParticipant = async (rpId, status) => {
        await supabase.from('round_participants').update({ status }).eq('id', rpId)
        fetchRoundParticipants(selectedRoundId)
    }

    const populateRound1 = async () => {
        if (!selectedRoundId) return
        const { data: confirmed } = await supabase.from('registrations').select('id').eq('event_id', id).eq('status', 'confirmed')
        if (!confirmed) return
        const inserts = confirmed.map(r => ({ round_id: selectedRoundId, registration_id: r.id, status: 'pending' }))
        const { error } = await supabase.from('round_participants').insert(inserts)
        if (error) alert('Error populating participants')
        else fetchRoundParticipants(selectedRoundId)
    }

    const verifyPayment = async (registrationId) => {
        try {
            // 1. Get leader registration details
            const { data: leaderReg, error: fetchError } = await supabase
                .from('registrations')
                .select('*')
                .eq('id', registrationId)
                .single()

            if (fetchError) throw fetchError

            // 2. Update leader registration status to 'confirmed'
            const { error } = await supabase
                .from('registrations')
                .update({ status: 'confirmed' })
                .eq('id', registrationId)

            if (error) throw error

            // 3. If team event, verify all member registrations
            if (leaderReg.team_members && leaderReg.team_members.length > 0) {
                const memberIds = leaderReg.team_members.map(m => m.id)

                const { error: bulkError } = await supabase
                    .from('registrations')
                    .update({ status: 'confirmed' })
                    .eq('event_id', leaderReg.event_id)
                    .in('profile_id', memberIds)

                if (bulkError) console.error('Bulk verify error:', bulkError)
            }

            // 4. Refresh views
            await fetchPayments()
            await fetchParticipants()

            const teamMsg = (leaderReg.team_members?.length > 0)
                ? ` and ${leaderReg.team_members.length} team member(s)`
                : ''
            alert(`Payment verified! Student${teamMsg} moved to Participants.`)
        } catch (error) {
            console.error('Verification error:', error)
            alert('Failed to verify payment: ' + error.message)
        }
    }

    const exportResults = () => {
        if (roundParticipants.length === 0) {
            alert('No participants to export')
            return
        }

        // Sort by score descending
        const sorted = [...roundParticipants]
            .filter(rp => rp.status !== 'eliminated')
            .sort((a, b) => (b.score || 0) - (a.score || 0))

        const csv = sorted.map((rp, i) =>
            `${i + 1},"${rp.registration?.user?.full_name || 'Unknown'}",${rp.registration?.user?.roll_number || '-'},${rp.score || 0},${rp.status}`
        ).join('\n')

        const blob = new Blob([`Rank,Name,Roll Number,Score,Status\n${csv}`], { type: 'text/csv' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${event.name}_results_${Date.now()}.csv`
        a.click()
        URL.revokeObjectURL(url)
    }

    if (loading) return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div></div>
    if (!event) return <div className="p-8 text-center">Event not found.</div>

    const tabs = [
        { id: 'overview', label: 'Overview', icon: Clock },
        { id: 'payments', label: 'Payments', icon: DollarSign }, // Moved to 2nd position
        { id: 'participants', label: 'Participants', icon: Users },
        { id: 'rounds', label: 'Rounds', icon: Trophy },
        { id: 'results', label: 'Results', icon: BarChart3 },
    ]

    const participantColumns = [
        {
            key: 'user', title: 'Participant', sortable: true, render: (row) => (
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setSelectedProfile(row.user)}
                        className="h-10 w-10 rounded-full bg-gradient-to-br from-purple-400 to-indigo-500 flex items-center justify-center text-white font-bold hover:ring-2 hover:ring-purple-300 transition-all cursor-pointer"
                        title="View Profile"
                    >
                        {row.user?.avatar_url ? (
                            <img src={row.user.avatar_url} alt="" className="h-full w-full rounded-full object-cover" />
                        ) : (
                            <span>{row.user?.full_name?.charAt(0) || 'U'}</span>
                        )}
                    </button>
                    <div>
                        <div className="font-bold text-gray-900">{row.user?.full_name || 'Unknown'}</div>
                        <div className="text-xs text-gray-500">{row.user?.college_email}</div>
                    </div>
                </div>
            )
        },
        { key: 'roll', title: 'Roll No', render: (row) => row.user?.roll_number || '-' },
        { key: 'department', title: 'Department', render: (row) => row.user?.department || '-' },
        { key: 'year', title: 'Year', render: (row) => row.user?.year_of_study || '-' },
        {
            key: 'team', title: 'Team', render: (row) => {
                try {
                    // Check if this is a LEADER (has team_members array with length > 0)
                    if (row.team_members && row.team_members.length > 0) {
                        const teamSize = row.team_members.length + 1; // +1 for leader
                        return `Team Leader · ${teamSize} members`;
                    }

                    // Check if this is a MEMBER (find if their ID is in another registration's team_members)
                    // We need to search through all participants to find the leader
                    const leader = participants.find(p =>
                        p.team_members &&
                        p.team_members.length > 0 &&
                        p.team_members.some(m => m.id === row.user?.id)
                    );

                    if (leader) {
                        const teamSize = leader.team_members.length + 1; // +1 for leader
                        return `Team Member · ${teamSize} total`;
                    }

                    return 'Solo';
                } catch (e) {
                    console.error('Team render error:', e);
                    return 'Solo';
                }
            }
        },
        { key: 'status', title: 'Status', sortable: true, render: (row) => (<span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase ${row.status === 'confirmed' ? 'bg-green-100 text-green-700' : row.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>{row.status}</span>) },
        { key: 'actions', title: 'Actions', render: (row) => (<button onClick={() => handleRejectParticipant(row.id)} disabled={row.status === 'rejected'} className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-sm font-semibold hover:bg-red-700 transition disabled:opacity-50 disabled:cursor-not-allowed" title="Reject participant">Reject</button>) }
    ]

    const paymentColumns = [
        {
            key: 'user',
            title: 'User',
            render: (row) => {
                const isTeamLeader = row.team_members && row.team_members.length > 0;
                return (
                    <div>
                        <div className="font-medium">{row.user?.full_name || 'Unknown'}</div>
                        {isTeamLeader && (
                            <div className="text-xs text-indigo-600 font-semibold flex items-center gap-1">
                                <Users className="h-3 w-3" /> Team Leader · {row.team_members.length + 1} members
                            </div>
                        )}
                    </div>
                )
            }
        },
        { key: 'amount', title: 'Amount', render: (row) => `₹${row.amount || 500}` },
        { key: 'txn', title: 'Transaction ID', render: (row) => <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">{row.transaction_id || 'N/A'}</span> },
        { key: 'screenshot', title: 'Proof', render: (row) => row.payment_screenshot_path ? <a href={row.payment_screenshot_path} target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline flex items-center gap-1"><Eye className="h-3 w-3" /> View</a> : <span className="text-gray-400">None</span> },
        { key: 'status', title: 'Status', render: (row) => <span className={`px-2 py-1 rounded text-xs font-bold ${row.payment_status === 'verified' || row.status === 'verified' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>{row.payment_status || row.status || 'Pending'}</span> },
        {
            key: 'actions', title: 'Verify', render: (row) => (
                <button onClick={() => verifyPayment(row.id, !row.hasOwnProperty('status'), 'verified')} className="p-1.5 text-green-600 bg-green-50 hover:bg-green-100 rounded-lg text-xs font-bold">Verify</button>
            )
        }
    ]

    return (
        <div className="max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Link to="/coordinator/events" className="p-2 hover:bg-gray-100 rounded-full text-gray-500 transition-colors"><ArrowLeft className="h-5 w-5" /></Link>
                <div><h1 className="text-2xl font-bold text-gray-900">{event.name}</h1><p className="text-gray-500 text-sm">Manage your event details and lifecycle.</p></div>
                <div className="ml-auto flex gap-2">
                    <button className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 font-medium transition-colors"><Download className="h-4 w-4" /> Reports</button>
                    <button className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 font-medium shadow-md transition-colors"><Edit2 className="h-4 w-4" /> Edit Event</button>
                </div>
            </div>

            {/* Banner */}
            <div className="h-48 rounded-2xl overflow-hidden relative group">
                <img src={event.image_path || 'https://via.placeholder.com/1200x300'} alt="" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <div className="absolute bottom-6 left-6 text-white">
                    <div className="flex items-center gap-4 text-sm font-medium opacity-90">
                        <span className="flex items-center gap-1.5"><Calendar className="h-4 w-4" /> {event.day}</span>
                        <span className="flex items-center gap-1.5"><Clock className="h-4 w-4" /> {event.time}</span>
                        <span className="flex items-center gap-1.5"><MapPin className="h-4 w-4" /> {event.venue}</span>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col min-h-[500px]">
                <div className="flex border-b border-gray-100 px-6 bg-gray-50/50">
                    {tabs.map(tab => (
                        <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex items-center gap-2 px-4 py-4 text-sm font-semibold border-b-2 transition-all ${activeTab === tab.id ? 'border-indigo-600 text-indigo-700 bg-indigo-50/50' : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}>
                            <tab.icon className={`h-4 w-4 ${activeTab === tab.id ? 'text-indigo-600' : 'text-gray-400'}`} /> {tab.label}
                        </button>
                    ))}
                </div>

                <div className="p-6 flex-1 bg-white">
                    {/* OVERVIEW */}
                    {activeTab === 'overview' && (
                        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 space-y-8">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div className="p-4 rounded-xl bg-indigo-50 border border-indigo-100"><p className="text-xs text-indigo-600 uppercase font-bold tracking-wider">Total Registrations</p><h3 className="text-2xl font-bold text-gray-900 mt-1">{loadingParticipants ? '...' : (participants.length || 0)}</h3></div>
                                <div className="p-4 rounded-xl bg-green-50 border border-green-100"><p className="text-xs text-green-600 uppercase font-bold tracking-wider">Confirmed</p><h3 className="text-2xl font-bold text-gray-900 mt-1">{loadingParticipants ? '...' : (participants.filter(p => p.status === 'confirmed').length || 0)}</h3></div>
                                <div className="p-4 rounded-xl bg-yellow-50 border border-yellow-100"><p className="text-xs text-yellow-600 uppercase font-bold tracking-wider">Pending</p><h3 className="text-2xl font-bold text-gray-900 mt-1">{loadingParticipants ? '...' : (participants.filter(p => p.status === 'pending').length || 0)}</h3></div>
                                <div className="p-4 rounded-xl bg-red-50 border border-red-100"><p className="text-xs text-red-600 uppercase font-bold tracking-wider">Rejected</p><h3 className="text-2xl font-bold text-gray-900 mt-1">{loadingParticipants ? '...' : (participants.filter(p => p.status === 'rejected').length || 0)}</h3></div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                <div className="md:col-span-2 space-y-6">
                                    <div><h3 className="text-lg font-bold text-gray-900 mb-2">Description</h3><p className="text-gray-600 leading-relaxed">{event.description || 'No description provided.'}</p></div>
                                    <div><h3 className="text-lg font-bold text-gray-900 mb-2">Rules</h3><div className="prose prose-sm prose-indigo text-gray-600 bg-gray-50 p-4 rounded-xl border border-gray-100">{event.rules || 'No rules.'}</div></div>
                                </div>
                                <div className="space-y-6">
                                    <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm"><h4 className="text-sm font-bold text-gray-900 mb-3">Event Details</h4><dl className="space-y-3 text-sm"><div className="flex justify-between"><dt className="text-gray-500">Day</dt><dd className="font-medium">{event.day}</dd></div><div className="flex justify-between"><dt className="text-gray-500">Mode</dt><dd className="font-medium">{event.mode}</dd></div><div className="flex justify-between"><dt className="text-gray-500">Fee</dt><dd className="font-medium text-green-600">₹{event.fee || 0}</dd></div></dl></div>
                                </div>
                            </div>
                        </div>
                    )}
                    {/* PARTICIPANTS */}
                    {activeTab === 'participants' && (
                        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <div className="flex justify-between items-center mb-6">
                                <div><h3 className="text-lg font-bold text-gray-900">Participants</h3><p className="text-sm text-gray-500">Manage individuals and teams.</p></div>
                                <div className="flex gap-2">
                                    {/* Members Only Toggle (Group Events Only) */}
                                    {event?.subcategory?.toLowerCase() === 'group' && (
                                        <button
                                            onClick={() => setShowMembersOnly(!showMembersOnly)}
                                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${showMembersOnly
                                                ? 'bg-purple-600 text-white hover:bg-purple-700'
                                                : 'bg-purple-50 text-purple-700 hover:bg-purple-100'
                                                }`}
                                        >
                                            <Users className="h-4 w-4" />
                                            {showMembersOnly ? 'Show Leaders' : 'Members Only'}
                                        </button>
                                    )}
                                    <button onClick={handleExportCSV} className="flex items-center gap-2 px-3 py-2 bg-indigo-50 text-indigo-700 rounded-lg text-sm font-semibold hover:bg-indigo-100"><Download className="h-4 w-4" /> Export CSV</button>
                                </div>
                            </div>
                            {loadingParticipants ? (
                                <div className="text-center py-10">Loading...</div>
                            ) : participants.length === 0 ? (
                                <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed"><Users className="h-10 w-10 text-gray-300 mx-auto mb-3" /><p className="text-gray-500">No participants yet.</p></div>
                            ) : (
                                <div className="space-y-2">
                                    {(() => {
                                        const isGroupEvent = event?.subcategory?.toLowerCase() === 'group';

                                        let displayParticipants;

                                        if (isGroupEvent) {
                                            const confirmed = participants.filter(p => p.status === 'confirmed');

                                            if (showMembersOnly) {
                                                // MEMBERS ONLY MODE: Show participants with EMPTY team_members
                                                displayParticipants = confirmed.filter(p =>
                                                    !p.team_members || p.team_members.length === 0
                                                );
                                                console.log('👥 MEMBERS ONLY MODE - Showing', displayParticipants.length, 'members');
                                            } else {
                                                // LEADERS MODE (default): Show participants with NON-EMPTY team_members
                                                displayParticipants = confirmed.filter(p =>
                                                    p.team_members && p.team_members.length > 0
                                                );
                                                console.log('👑 LEADERS MODE - Showing', displayParticipants.length, 'leaders');
                                            }
                                        } else {
                                            // Individual events: show all confirmed
                                            displayParticipants = participants.filter(p => p.status === 'confirmed');
                                        }

                                        return displayParticipants.map((participant) => {
                                            const isLeader = participant.team_members && participant.team_members.length > 0;
                                            const isExpanded = expandedTeams.has(participant.id);
                                            const totalTeamSize = isLeader ? participant.team_members.length + 1 : 1;

                                            return (
                                                <div
                                                    key={participant.id}
                                                    className="group border border-gray-200 rounded-lg overflow-hidden hover:border-indigo-300 transition"
                                                    onMouseEnter={() => !showMembersOnly && isLeader && toggleTeamExpansion(participant.id)}
                                                    onMouseLeave={() => !showMembersOnly && isLeader && toggleTeamExpansion(participant.id)}
                                                >
                                                    <div className={`p-4 flex items-center justify-between ${isLeader ? 'bg-indigo-50' : 'bg-white'}`}>
                                                        <div className="flex items-center gap-4 flex-1">
                                                            <div className="h-12 w-12 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold">
                                                                {participant.user?.full_name?.[0]?.toUpperCase() || '?'}
                                                            </div>
                                                            <div className="flex-1">
                                                                <div className="flex items-center gap-2 mb-1">
                                                                    <span className="font-bold text-gray-900">{participant.user?.full_name || 'Unknown'}</span>
                                                                    {showMembersOnly ? (
                                                                        <span className="px-2 py-1 bg-gray-500 text-white text-xs font-bold rounded-full">
                                                                            Team Member
                                                                        </span>
                                                                    ) : isLeader && (
                                                                        <>
                                                                            <span className="px-2 py-1 bg-indigo-600 text-white text-xs font-bold rounded-full flex items-center gap-1">
                                                                                <Users className="h-3 w-3" />Team Leader
                                                                            </span>
                                                                            <span className="px-2 py-1 bg-purple-600 text-white text-xs font-bold rounded-full">
                                                                                Team Members: {totalTeamSize}
                                                                            </span>
                                                                        </>
                                                                    )}
                                                                </div>
                                                                <div className="text-sm text-gray-600">{participant.user?.college_email} • {participant.user?.roll_number}</div>
                                                            </div>
                                                            <span className={`px-3 py-1 rounded-full text-xs font-bold ${participant.status === 'confirmed' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>{participant.status}</span>
                                                        </div>

                                                        {/* Reject Button */}
                                                        <button
                                                            onClick={async () => {
                                                                if (isLeader && !showMembersOnly) {
                                                                    // Bulk reject team
                                                                    if (!confirm(`Reject entire team? This will reject the leader and all ${participant.team_members.length} team members.`)) return;

                                                                    try {
                                                                        // Get member profile IDs
                                                                        const memberProfileIds = participant.team_members.map(m => m.id);

                                                                        // Reject all team members
                                                                        const { error: memberError } = await supabase
                                                                            .from('registrations')
                                                                            .update({ status: 'rejected' })
                                                                            .eq('event_id', id)
                                                                            .in('profile_id', memberProfileIds);

                                                                        if (memberError) {
                                                                            console.error('Error rejecting team members:', memberError);
                                                                            alert('Error rejecting team members');
                                                                            return;
                                                                        }

                                                                        // Reject leader
                                                                        await handleRejectParticipant(participant.id);
                                                                    } catch (error) {
                                                                        console.error('Bulk reject error:', error);
                                                                        alert('Error rejecting team');
                                                                    }
                                                                } else {
                                                                    // Individual participant/member
                                                                    handleRejectParticipant(participant.id);
                                                                }
                                                            }}
                                                            className="ml-4 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-semibold hover:bg-red-700 transition"
                                                        >
                                                            {isLeader && !showMembersOnly ? 'Reject Team' : 'Reject'}
                                                        </button>
                                                    </div>
                                                    {!showMembersOnly && isLeader && (
                                                        <div className={`transition-all duration-300 ${isExpanded ? 'max-h-96' : 'max-h-0'} overflow-hidden`}>
                                                            <div className="bg-gray-50 border-t p-4">
                                                                <div className="text-xs font-bold text-gray-500 mb-2">TEAM MEMBERS:</div>
                                                                <div className="grid md:grid-cols-2 gap-2">
                                                                    {participant.team_members.map((m, i) => (
                                                                        <div key={m.id} className="p-3 bg-white rounded border flex items-center gap-3">
                                                                            <div className="h-8 w-8 rounded-full bg-gray-400 text-white flex items-center justify-center font-bold text-sm">{m.full_name?.[0] || '?'}</div>
                                                                            <div className="flex-1"><div className="font-medium text-sm">{m.full_name}</div><div className="text-xs text-gray-500">{m.roll_number}</div></div>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        });
                                    })()}
                                </div>
                            )}
                        </div>
                    )}
                    {/* ROUNDS */}
                    {activeTab === 'rounds' && (
                        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <div className="flex justify-between items-center mb-6">
                                <div><h3 className="text-lg font-bold text-gray-900">Rounds Management</h3><p className="text-sm text-gray-500">Define the competition structure.</p></div>
                                <button onClick={() => setIsRoundModalOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 font-semibold shadow-md"><Plus className="h-4 w-4" /> Add Round</button>
                            </div>
                            {loadingRounds ? (<div className="text-center py-8">Loading Rounds...</div>) : rounds.length === 0 ? (<div className="text-center py-12 bg-gray-50 rounded-2xl border border-dashed border-gray-200"><Trophy className="h-10 w-10 text-gray-300 mx-auto mb-3" /><p className="text-gray-500">No rounds created yet.</p></div>) : (<div className="space-y-4">{rounds.map(round => (<div key={round.id} className="flex justify-between items-center p-4 bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow"><div className="flex items-center gap-4"><div className="h-10 w-10 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">{round.sequence_order}</div><div><h4 className="font-bold text-gray-900">{round.name}</h4><p className="text-xs text-gray-500 uppercase">{round.type} • {round.status}</p></div></div><div className="flex gap-2"><button onClick={() => handleDeleteRound(round.id)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"><Trash2 className="h-4 w-4" /></button></div></div>))}</div>)}
                            {isRoundModalOpen && (
                                <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 backdrop-blur-sm">
                                    <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md">
                                        <h3 className="text-lg font-bold text-gray-900 mb-4">Create Round</h3>
                                        <div className="space-y-4"><AdminInput label="Round Name" placeholder="e.g. Qualification Round" value={roundForm.name} onChange={e => setRoundForm({ ...roundForm, name: e.target.value })} /><AdminInput label="Sequence Order" type="number" value={roundForm.sequence_order} onChange={e => setRoundForm({ ...roundForm, sequence_order: e.target.value })} /><AdminSelect label="Type" value={roundForm.type} onChange={e => setRoundForm({ ...roundForm, type: e.target.value })}><option value="elimination">Elimination</option><option value="scoring">Scoring (Points)</option><option value="final">Final</option></AdminSelect></div>
                                        <div className="mt-6 flex justify-end gap-3"><button onClick={() => setIsRoundModalOpen(false)} className="px-4 py-2 text-gray-600 font-medium hover:bg-gray-100 rounded-lg">Cancel</button><button onClick={handleCreateRound} className="px-4 py-2 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700">Create Round</button></div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                    {/* RESULTS */}
                    {activeTab === 'results' && (
                        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <div className="flex justify-between items-center mb-6">
                                <div><h3 className="text-lg font-bold text-gray-900">Score & Results</h3><p className="text-sm text-gray-500">Enter scores and view leaderboard.</p></div>
                                <div className="flex gap-3">
                                    {/* View Toggle */}
                                    <div className="flex bg-gray-100 rounded-lg p-1">
                                        <button onClick={() => setResultsView('manage')} className={`px-3 py-1.5 text-sm font-semibold rounded-md transition ${resultsView === 'manage' ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-600'}`}>Manage Scores</button>
                                        <button onClick={() => setResultsView('leaderboard')} className={`px-3 py-1.5 text-sm font-semibold rounded-md transition ${resultsView === 'leaderboard' ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-600'}`}>Leaderboard</button>
                                    </div>
                                    <div className="w-64">
                                        <AdminSelect value={selectedRoundId} onChange={e => setSelectedRoundId(e.target.value)}>
                                            <option value="" disabled>Select Round</option>
                                            {rounds.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                                        </AdminSelect>
                                    </div>
                                </div>
                            </div>

                            {!selectedRoundId ? (
                                <div className="text-center py-20 bg-gray-50 rounded-2xl"><p className="text-gray-500">Please select a round to manage results.</p></div>
                            ) : (
                                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                                    {roundParticipants.length === 0 ? (
                                        <div className="p-8 text-center">
                                            <p className="text-gray-500 mb-4">No participants found in this round.</p>
                                            <button onClick={populateRound1} className="px-4 py-2 bg-indigo-50 text-indigo-600 font-bold rounded-lg hover:bg-indigo-100">Fetch Participants from Registrations</button>
                                        </div>
                                    ) : resultsView === 'leaderboard' ? (
                                        // LEADERBOARD VIEW
                                        (() => {
                                            const ranked = [...roundParticipants]
                                                .filter(rp => rp.status !== 'eliminated')
                                                .sort((a, b) => (b.score || 0) - (a.score || 0))

                                            return (
                                                <div className="p-6 space-y-4">
                                                    <div className="flex justify-between items-center mb-2">
                                                        <h4 className="text-lg font-bold">🏆 Leaderboard</h4>
                                                        <button onClick={exportResults} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold shadow-md">
                                                            <Download className="h-4 w-4" /> Export CSV
                                                        </button>
                                                    </div>
                                                    {ranked.length === 0 ? (
                                                        <p className="text-center text-gray-500 py-8">No qualified participants yet</p>
                                                    ) : (
                                                        ranked.map((rp, index) => (
                                                            <div key={rp.id} className={`flex items-center gap-4 p-4 rounded-xl transition ${index === 0 ? 'bg-gradient-to-r from-yellow-50 to-orange-50 border-2 border-yellow-400 shadow-md' :
                                                                index === 1 ? 'bg-gradient-to-r from-gray-50 to-slate-100 border-2 border-gray-400' :
                                                                    index === 2 ? 'bg-gradient-to-r from-orange-50 to-amber-50 border-2 border-orange-300' :
                                                                        'bg-gray-50 border border-gray-200'
                                                                }`}>
                                                                <div className="text-3xl font-bold w-14 text-center">
                                                                    {index + 1}
                                                                </div>
                                                                <div className="flex-1">
                                                                    <div className="font-bold text-lg text-gray-900">{rp.registration?.user?.full_name || 'Unknown'}</div>
                                                                    <div className="text-sm text-gray-600">{rp.registration?.user?.roll_number || '-'}</div>
                                                                </div>
                                                                <div className="text-2xl font-bold text-indigo-600">
                                                                    {rp.score || 0} pts
                                                                </div>
                                                                {index < 3 && (
                                                                    <div className="text-4xl">
                                                                        {index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        ))
                                                    )}
                                                </div>
                                            )
                                        })()
                                    ) : (
                                        // MANAGE SCORES VIEW (existing table)
                                        <table className="w-full text-sm text-left">
                                            <thead className="bg-gray-50 border-b border-gray-100 text-gray-500"><tr><th className="px-6 py-4">Participant</th><th className="px-6 py-4">Score</th><th className="px-6 py-4">Status</th><th className="px-6 py-4">Actions</th></tr></thead>
                                            <tbody className="divide-y divide-gray-100">
                                                {roundParticipants.map(rp => (
                                                    <tr key={rp.id} className="hover:bg-gray-50/50">
                                                        <td className="px-6 py-4 font-medium text-gray-900">{rp.registration?.user?.full_name}</td>
                                                        <td className="px-6 py-4"><input type="number" className="w-20 px-2 py-1 border rounded" defaultValue={rp.score || 0} onBlur={(e) => updateScore(rp.id, e.target.value)} /></td>
                                                        <td className="px-6 py-4"><span className={`px-2 py-1 rounded text-xs font-bold uppercase ${rp.status === 'qualified' ? 'bg-green-100 text-green-700' : rp.status === 'eliminated' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'}`}>{rp.status}</span></td>
                                                        <td className="px-6 py-4 flex gap-2">
                                                            <button onClick={() => promoteParticipant(rp.id, 'qualified')} className="p-1.5 text-green-600 hover:bg-green-50 rounded" title="Qualify"><Check className="h-4 w-4" /></button>
                                                            <button onClick={() => promoteParticipant(rp.id, 'eliminated')} className="p-1.5 text-red-600 hover:bg-red-50 rounded" title="Eliminate"><XIcon className="h-4 w-4" /></button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                    {/* PAYMENTS */}
                    {activeTab === 'payments' && (
                        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <div className="flex justify-between items-center mb-6">
                                <div><h3 className="text-lg font-bold text-gray-900">Payment Verification</h3><p className="text-sm text-gray-500">Verify payments to move students to Participants.</p></div>

                                {/* Payment Mode Toggle */}
                                <div className="flex gap-2 border border-gray-200 rounded-lg p-1 bg-gray-50">
                                    <button
                                        onClick={() => setPaymentModeFilter('all')}
                                        className={`px-4 py-2 rounded-md text-sm font-medium transition ${paymentModeFilter === 'all' ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
                                    >
                                        All
                                    </button>
                                    <button
                                        onClick={() => setPaymentModeFilter('cash')}
                                        className={`px-4 py-2 rounded-md text-sm font-medium transition ${paymentModeFilter === 'cash' ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
                                    >
                                        💵 Cash
                                    </button>
                                    <button
                                        onClick={() => setPaymentModeFilter('online')}
                                        className={`px-4 py-2 rounded-md text-sm font-medium transition ${paymentModeFilter === 'online' ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
                                    >
                                        📱 Online
                                    </button>
                                </div>
                            </div>

                            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                                {(() => {
                                    // Filter payments by mode
                                    const filteredPayments = payments.filter(p => {
                                        if (paymentModeFilter === 'all') return true
                                        if (paymentModeFilter === 'cash') return p.payment_mode === 'cash'
                                        if (paymentModeFilter === 'online') return p.payment_mode === 'hybrid' || p.payment_mode === 'online'
                                        return true
                                    })

                                    // Dynamic columns based on filter
                                    const paymentColumns = paymentModeFilter === 'cash' ? [
                                        {
                                            key: 'user', title: 'Student', render: (row) => (
                                                <div>
                                                    <div className="font-medium text-gray-900">{row.user?.full_name || 'Unknown'}</div>
                                                    <div className="text-xs text-gray-500">{row.user?.roll_number} • {row.user?.department}</div>
                                                </div>
                                            )
                                        },
                                        { key: 'amount', title: 'Amount', render: (row) => <span className="font-semibold text-green-600">₹{event.fee || 0}</span> },
                                        {
                                            key: 'verify', title: 'Action', render: (row) => (
                                                <button
                                                    onClick={() => verifyPayment(row.id)}
                                                    className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm font-semibold hover:bg-green-700 transition"
                                                >
                                                    ✓ Verify Cash
                                                </button>
                                            )
                                        }
                                    ] : paymentModeFilter === 'online' ? [
                                        {
                                            key: 'user', title: 'Student', render: (row) => (
                                                <div>
                                                    <div className="font-medium text-gray-900">{row.user?.full_name || 'Unknown'}</div>
                                                    <div className="text-xs text-gray-500">{row.user?.roll_number}</div>
                                                </div>
                                            )
                                        },
                                        { key: 'amount', title: 'Amount', render: (row) => <span className="font-semibold text-green-600">₹{event.fee || 0}</span> },
                                        { key: 'txn', title: 'Transaction ID', render: (row) => row.transaction_id ? <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">{row.transaction_id}</span> : <span className="text-gray-400 text-xs">Not provided</span> },
                                        {
                                            key: 'screenshot', title: 'Screenshot', render: (row) => row.payment_screenshot_path ? (
                                                <button
                                                    onClick={() => setScreenshotModal({ isOpen: true, url: row.payment_screenshot_path })}
                                                    className="text-indigo-600 hover:text-indigo-800 flex items-center gap-1 text-sm font-medium"
                                                >
                                                    <Eye className="h-4 w-4" /> View
                                                </button>
                                            ) : <span className="text-gray-400 text-xs">Not uploaded</span>
                                        },
                                        {
                                            key: 'verify', title: 'Action', render: (row) => (
                                                <button
                                                    onClick={() => verifyPayment(row.id)}
                                                    disabled={!row.transaction_id || !row.payment_screenshot_path}
                                                    className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm font-semibold hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                                                >
                                                    ✓ Verify
                                                </button>
                                            )
                                        }
                                    ] : [
                                        // 'all' mode - shows all payments with smart verify logic
                                        {
                                            key: 'user', title: 'Student', render: (row) => (
                                                <div>
                                                    <div className="font-medium text-gray-900">{row.user?.full_name || 'Unknown'}</div>
                                                    <div className="text-xs text-gray-500">{row.user?.roll_number} • {row.user?.department}</div>
                                                </div>
                                            )
                                        },
                                        { key: 'mode', title: 'Mode', render: (row) => <span className={`px-2 py-1 rounded text-xs font-semibold ${row.payment_mode === 'cash' ? 'bg-green-50 text-green-700' : 'bg-blue-50 text-blue-700'}`}>{row.payment_mode === 'cash' ? '💵 Cash' : '💳 Online'}</span> },
                                        { key: 'amount', title: 'Amount', render: (row) => <span className="font-semibold text-green-600">₹{event.fee || 0}</span> },
                                        { key: 'txn', title: 'Transaction ID', render: (row) => row.transaction_id ? <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">{row.transaction_id}</span> : <span className="text-gray-400 text-xs">N/A</span> },
                                        {
                                            key: 'screenshot', title: 'Proof', render: (row) => (row.payment_screenshot_url || row.payment_screenshot_path) ? (
                                                <button
                                                    onClick={() => setScreenshotModal({ isOpen: true, url: row.payment_screenshot_url || row.payment_screenshot_path })}
                                                    className="text-indigo-600 hover:text-indigo-800 flex items-center gap-1 text-sm font-medium"
                                                >
                                                    <Eye className="h-4 w-4" /> View
                                                </button>
                                            ) : <span className="text-gray-400 text-xs">None</span>
                                        },
                                        {
                                            key: 'verify', title: 'Action', render: (row) => {
                                                // Smart logic: Cash payments don't need transaction_id or screenshot
                                                const isCash = row.payment_mode === 'cash';
                                                const isOnline = row.payment_mode === 'online' || row.payment_mode === 'hybrid';
                                                const canVerify = isCash || (isOnline && row.transaction_id && row.payment_screenshot_path);

                                                return (
                                                    <button
                                                        onClick={() => verifyPayment(row.id)}
                                                        disabled={!canVerify}
                                                        className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm font-semibold hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                                                        title={!canVerify ? 'Online payment requires transaction ID and screenshot' : 'Verify payment'}
                                                    >
                                                        ✓ Verify
                                                    </button>
                                                );
                                            }
                                        }
                                    ]

                                    return <SmartTable columns={paymentColumns} data={filteredPayments} loading={loadingPayments} emptyMessage={`No ${paymentModeFilter === 'all' ? '' : paymentModeFilter} payments pending.`} />
                                })()}
                            </div>
                        </div>
                    )}
                    {/* ANALYTICS */}
                    {activeTab === 'analytics' && (
                        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 space-y-8">
                            {participants.length === 0 ? (
                                <div className="text-center py-20 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                                    <BarChart3 className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                                    <p className="text-gray-500">No data available for analytics yet.</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {/* Registration Trends (Dynamic) */}
                                    {(() => {
                                        // Group by Date
                                        const last7Days = [...Array(7)].map((_, i) => {
                                            const d = new Date()
                                            d.setDate(d.getDate() - (6 - i))
                                            return d.toISOString().split('T')[0]
                                        })

                                        const counts = last7Days.map(date =>
                                            participants.filter(p => p.created_at.startsWith(date)).length
                                        )

                                        const maxCount = Math.max(...counts, 10) // Scale max

                                        return (
                                            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                                                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-6">Last 7 Days Registrations</h4>
                                                <div className="h-48 flex items-end gap-2">
                                                    {counts.map((count, i) => {
                                                        const height = (count / maxCount) * 100
                                                        return (
                                                            <div key={i} className="flex-1 flex flex-col justify-end group relative">
                                                                <div
                                                                    className="bg-indigo-100 rounded-t-lg transition-all duration-500 relative hover:bg-indigo-200"
                                                                    style={{ height: `${Math.max(height, 5)}%` }} // Min height for visibility
                                                                >
                                                                    {count > 0 && (
                                                                        <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                                                                            {count}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                                <div className="text-[10px] text-gray-400 text-center mt-2 truncate">
                                                                    {new Date(last7Days[i]).toLocaleDateString('en-US', { weekday: 'short' })}
                                                                </div>
                                                            </div>
                                                        )
                                                    })}
                                                </div>
                                            </div>
                                        )
                                    })()}

                                    {/* Metrics Grid */}
                                    <div className="space-y-6">
                                        {/* Confirmation Rate */}
                                        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                                            <p className="text-sm text-gray-500 font-medium mb-1">Total Registrations</p>
                                            <p className="text-3xl font-bold text-gray-900">{loadingParticipants ? '...' : (participants.length || 0)}</p>
                                        </div>
                                        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                                            <p className="text-sm text-gray-500 font-medium mb-1">Confirmed</p>
                                            <p className="text-3xl font-bold text-green-600">{loadingParticipants ? '...' : (participants.filter(p => p.status === 'confirmed').length || 0)}</p>
                                        </div>
                                        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                                            <p className="text-sm text-gray-500 font-medium mb-1">Pending Payment</p>
                                            <p className="text-3xl font-bold text-yellow-600">{loadingParticipants ? '...' : (participants.filter(p => p.status === 'pending').length || 0)}</p>
                                        </div>
                                        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                                            <p className="text-sm text-gray-500 font-medium mb-1">Rejected</p>
                                            <p className="text-3xl font-bold text-red-600">{loadingParticipants ? '...' : (participants.filter(p => p.status === 'rejected').length || 0)}</p>
                                        </div>
                                        {/* Status Breakdown */}
                                        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                                            <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">Status Distribution</h4>
                                            <div className="space-y-3">
                                                {['confirmed', 'pending', 'cancelled'].map(status => {
                                                    const count = participants.filter(p => p.status === status).length
                                                    const pct = participants.length > 0 ? (count / participants.length) * 100 : 0
                                                    const color = status === 'confirmed' ? 'bg-green-500' : status === 'pending' ? 'bg-orange-400' : 'bg-red-500'

                                                    return (
                                                        <div key={status}>
                                                            <div className="flex justify-between text-sm mb-1">
                                                                <span className="capitalize font-medium text-gray-700">{status}</span>
                                                                <span className="text-gray-500">{count} ({Math.round(pct)}%)</span>
                                                            </div>
                                                            <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                                                                <div className={`h-full ${color}`} style={{ width: `${pct}%` }} />
                                                            </div>
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Screenshot Viewer Modal */}
            {screenshotModal.isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm" onClick={() => setScreenshotModal({ isOpen: false, url: '' })}>
                    <div className="relative max-w-4xl max-h-[90vh] p-4" onClick={e => e.stopPropagation()}>
                        <button
                            onClick={() => setScreenshotModal({ isOpen: false, url: '' })}
                            className="absolute -top-12 right-0 text-white hover:text-gray-300 transition"
                        >
                            <XIcon className="h-8 w-8" />
                        </button>
                        <img
                            src={screenshotModal.url}
                            alt="Payment Screenshot"
                            className="max-w-full max-h-[85vh] rounded-lg shadow-2xl"
                        />
                    </div>
                </div>
            )}

            {/* Profile View Modal */}
            {selectedProfile && (
                <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-sm" onClick={() => setSelectedProfile(null)}>
                    <div className="flex min-h-screen items-center justify-center p-4">
                        <div
                            className="relative bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <button
                                onClick={() => setSelectedProfile(null)}
                                className="sticky top-4 right-4 float-right z-10 p-2 bg-white rounded-full shadow-lg hover:bg-gray-100 transition"
                            >
                                <XIcon className="h-5 w-5" />
                            </button>
                            <ProfilePage profileId={selectedProfile.id} role={selectedProfile.role} isViewOnly={true} />
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
