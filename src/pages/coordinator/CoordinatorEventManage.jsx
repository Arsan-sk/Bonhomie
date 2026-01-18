import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { ArrowLeft, Edit2, Users, DollarSign, BarChart3, Clock, Calendar, MapPin, Download, Check, X as XIcon, Search, Plus, Trash2, Eye, Activity, ChevronDown, ChevronUp, User } from 'lucide-react'
import SmartTable from '../../components/admin/ui/SmartTable'
import { AdminInput, AdminSelect } from '../../components/admin/ui/AdminForm'
import ProfilePage from '../../components/profile/ProfilePage'
import ConfirmDialog from '../../components/ui/ConfirmDialog'
import { getUnsplashImageUrl, getCategoryImage } from '../../utils/unsplashHelper'

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

    // Results State
    const [loadingResults, setLoadingResults] = useState(false)
    const [resultForm, setResultForm] = useState({ first_place: '', second_place: '', third_place: '' })
    const [announcingResults, setAnnouncingResults] = useState(false)

    // Control Tab State
    const [isGoingLive, setIsGoingLive] = useState(false)
    const [showDateWarning, setShowDateWarning] = useState(false)
    const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, type: 'confirm', title: '', message: '', onConfirm: null })

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
        if (activeTab === 'overview' || activeTab === 'participants' || activeTab === 'analytics') fetchParticipants()
        if (activeTab === 'payments') fetchPayments()
    }, [activeTab, id])

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



    const fetchPayments = async () => {
        setLoadingPayments(true)
        console.log('📋 Fetching payments for event:', id)

        // Fetch ONLY pending registrations
        const { data, error } = await supabase
            .from('registrations')
            .select(`id, transaction_id, payment_screenshot_path, status, registered_at, payment_mode, user:profiles(id, full_name, college_email, roll_number)`)
            .eq('event_id', id)
            .eq('status', 'pending') // ONLY pending payments
            .order('registered_at', { ascending: false })

        console.log('📊 Query result:', { count: data?.length, error })

        if (error) {
            console.error('❌ Error fetching payments:', error)
            setPayments([])
        } else {
            console.log('✅ Fetched pending payments:', data?.length)

            // Filter to show ONLY team leaders or individual participants
            // Team members (those with empty team_members array but part of someone's team) should be hidden

            // Step 1: Collect all member profile IDs from team_members arrays
            const allMemberIds = new Set()
            data?.forEach(reg => {
                if (reg.team_members && Array.isArray(reg.team_members) && reg.team_members.length > 0) {
                    reg.team_members.forEach(member => {
                        // team_members contains objects with id, name, roll_number
                        if (member.id) {
                            allMemberIds.add(member.id)
                        }
                    })
                }
            })

            console.log('🔍 Found member IDs in teams:', Array.from(allMemberIds))

            // Step 2: Filter out members - keep only:
            // - Leaders (have non-empty team_members array)
            // - Individuals (not found in any team_members array)
            const leadersAndIndividuals = (data || []).filter(reg => {
                const userProfileId = reg.user?.id
                const isPartOfSomeoneTeam = allMemberIds.has(userProfileId)
                const isLeader = reg.team_members && reg.team_members.length > 0

                // Keep if: is a leader OR not part of anyone's team (individual)
                const shouldKeep = isLeader || !isPartOfSomeoneTeam

                console.log(`User: ${reg.user?.full_name}, ProfileID: ${userProfileId}, IsLeader: ${isLeader}, InTeam: ${isPartOfSomeoneTeam}, Keep: ${shouldKeep}`)

                return shouldKeep
            })

            console.log('👥 Filtered results:', leadersAndIndividuals.length, 'from', data?.length)

            // Generate public URLs for payment screenshots
            const paymentsWithUrls = leadersAndIndividuals.map(payment => {
                if (payment.payment_screenshot_path) {
                    // Get public URL from storage
                    const { data: urlData } = supabase.storage
                        .from('payment_proofs')
                        .getPublicUrl(payment.payment_screenshot_path)

                    console.log('🖼️ Screenshot URL:', {
                        original_path: payment.payment_screenshot_path,
                        generated_url: urlData.publicUrl,
                        user: payment.user?.full_name
                    })

                    return { ...payment, payment_screenshot_url: urlData.publicUrl }
                }
                return payment
            })

            console.log('💾 Final payments with URLs:', paymentsWithUrls.length)
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
                // GROUP EVENT CSV - Only process team leaders with team_members
                csvContent += 'Team No,Member No,Roll Number,Name,Email,School,Department,Year of Study,Gender,Phone Number\n'

                let teamNumber = 0
                // Filter to only team leaders (those with non-empty team_members array)
                const teamLeaders = registrations.filter(reg => reg.team_members && reg.team_members.length > 0)

                teamLeaders.forEach((reg) => {
                    teamNumber++
                    const teamMembers = reg.team_members || []

                    // Team Leader (Member 1) - show team number
                    const leader = reg.user
                    if (leader) {
                        csvContent += `${teamNumber},1,${escapeCSV(leader.roll_number)},${escapeCSV(leader.full_name)},${escapeCSV(leader.college_email)},${escapeCSV(leader.school)},${escapeCSV(leader.department)},${escapeCSV(leader.year_of_study)},${escapeCSV(leader.gender)},${escapeCSV(leader.phone)}\n`
                    }

                    // Team Members (2, 3, ...) - blank team number for clean look
                    teamMembers.forEach((member, idx) => {
                        csvContent += `,${idx + 2},${escapeCSV(member.roll_number)},${escapeCSV(member.full_name || member.name)},${escapeCSV(member.college_email || member.email)},${escapeCSV(member.school)},${escapeCSV(member.department)},${escapeCSV(member.year_of_study)},${escapeCSV(member.gender)},${escapeCSV(member.phone)}\n`
                    })
                })
            } else {
                // INDIVIDUAL EVENT CSV - remove Serial No for consistency
                csvContent += 'Member No,Roll Number,Name,Email,School,Department,Year of Study,Gender,Phone Number\n'

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




    const handleRejectParticipant = async (registrationId) => {
        if (!confirm('Are you sure you want to reject this participant?')) return
        const { error } = await supabase.from('registrations').update({ status: 'rejected' }).eq('id', registrationId)
        if (error) alert('Error rejecting participant')
        else fetchParticipants()
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

    // Control Tab Functions
    const checkEventDateMatch = () => {
        if (!event?.event_date) return false
        const today = new Date().toISOString().split('T')[0]
        const eventDate = new Date(event.event_date).toISOString().split('T')[0]
        return today === eventDate
    }

    const handleGoLive = async (forceLive = false) => {
        if (!forceLive && !checkEventDateMatch()) {
            setShowDateWarning(true)
            return
        }

        setIsGoingLive(true)
        try {
            const { error } = await supabase
                .from('events')
                .update({
                    is_live: true,
                    event_status: 'live',
                    live_started_at: new Date().toISOString()
                })
                .eq('id', id)

            if (error) throw error

            await fetchEventDetails()
            alert('Event is now LIVE! 🔴')
        } catch (error) {
            console.error('Error going live:', error)
            alert('Failed to go live: ' + error.message)
        } finally {
            setIsGoingLive(false)
            setShowDateWarning(false)
        }
    }

    const handleEndLive = async () => {
        if (!confirm('Stop live broadcasting? You can go live again anytime.')) return

        setIsGoingLive(true)
        try {
            const { error } = await supabase
                .from('events')
                .update({
                    is_live: false,
                    event_status: 'upcoming',
                    live_ended_at: new Date().toISOString()
                })
                .eq('id', id)

            if (error) throw error

            await fetchEventDetails()
            alert('Event is now offline. You can go live again anytime!')
        } catch (error) {
            console.error('Error stopping live:', error)
            alert('Failed to stop live: ' + error.message)
        } finally {
            setIsGoingLive(false)
        }
    }

    // Results Functions
    const handleAnnounceResults = async () => {
        if (!resultForm.first_place) {
            setConfirmDialog({
                isOpen: true,
                type: 'warning',
                title: 'Missing Winner',
                message: 'At least first place winner must be selected before announcing results.',
                confirmText: 'OK',
                showCancel: false,
                onConfirm: () => { }
            })
            return
        }

        setConfirmDialog({
            isOpen: true,
            type: 'confirm',
            title: 'Announce Results?',
            message: 'This will update win counts for all winners and mark the event as completed. This action cannot be undone.',
            confirmText: 'Announce Results',
            cancelText: 'Cancel',
            showCancel: true,
            onConfirm: async () => {
                setAnnouncingResults(true)
                try {
                    // Get current user ID
                    const { data: { user } } = await supabase.auth.getUser()
                    const currentUserId = user?.id

                    // Process each position
                    const positions = [
                        { key: 'first_place', position: 1 },
                        { key: 'second_place', position: 2 },
                        { key: 'third_place', position: 3 }
                    ]

                    for (const { key, position } of positions) {
                        const regId = resultForm[key]
                        if (!regId) continue

                        // Get registration with team members
                        const { data: registration, error: regError } = await supabase
                            .from('registrations')
                            .select('*, user:profiles(id)')
                            .eq('id', regId)
                            .single()

                        if (regError || !registration) {
                            console.error('Error fetching registration:', regError)
                            continue
                        }

                        // Collect all profile IDs (leader + team members)
                        const profileIds = [registration.user.id]
                        if (registration.team_members && registration.team_members.length > 0) {
                            profileIds.push(...registration.team_members.map(m => m.id))
                        }

                        // Increment win counts
                        const { error: rpcError } = await supabase.rpc('increment_win_count', {
                            profile_ids: profileIds,
                            place_position: position
                        })

                        if (rpcError) {
                            console.error('Error incrementing win counts:', rpcError)
                            throw rpcError
                        }

                        // Store result in event_results table
                        const { error: insertError } = await supabase.from('event_results').insert({
                            event_id: id,
                            registration_id: regId,
                            position: position,
                            team_members: registration.team_members || [],
                            announced_by: currentUserId
                        })

                        if (insertError) {
                            console.error('Error storing result:', insertError)
                        }
                    }

                    // Update event with winners and mark results as announced
                    const { error: updateError } = await supabase.from('events').update({
                        winner_profile_id: resultForm.first_place || null,
                        runnerup_profile_id: resultForm.second_place || null,
                        second_runnerup_profile_id: resultForm.third_place || null,
                        results_announced: true,
                        results_announced_at: new Date().toISOString(),
                        event_status: 'completed'
                    }).eq('id', id)

                    if (updateError) throw updateError

                    setConfirmDialog({
                        isOpen: true,
                        type: 'success',
                        title: 'Results Announced!',
                        message: '✅ Results have been announced successfully! Win counts have been updated for all winners.',
                        confirmText: 'OK',
                        showCancel: false,
                        onConfirm: () => { }
                    })

                    await fetchEventDetails()
                    if (activeTab === 'participants') await fetchParticipants()
                } catch (error) {
                    console.error('Error announcing results:', error)
                    setConfirmDialog({
                        isOpen: true,
                        type: 'error',
                        title: 'Failed to Announce Results',
                        message: 'An error occurred: ' + error.message,
                        confirmText: 'OK',
                        showCancel: false,
                        onConfirm: () => { }
                    })
                } finally {
                    setAnnouncingResults(false)
                }
            }
        })
    }

    if (loading) return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div></div>
    if (!event) return <div className="p-8 text-center">Event not found.</div>

    const tabs = [
        { id: 'overview', label: 'Overview', icon: Clock },
        { id: 'payments', label: 'Payments', icon: DollarSign },
        { id: 'participants', label: 'Participants', icon: Users },
        { id: 'results', label: 'Results', icon: BarChart3 },
        { id: 'control', label: 'Control', icon: Activity },
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
        <div className="max-w-7xl mx-auto px-4 md:px-0 space-y-6">
            {/* Header - Responsive */}
            <div className="flex flex-col md:flex-row md:items-center gap-4">
                <div className="flex items-center gap-3">
                    <Link to="/coordinator/events" className="p-2 hover:bg-gray-100 rounded-full text-gray-500 transition-colors"><ArrowLeft className="h-5 w-5" /></Link>
                    <div>
                        <h1 className="text-xl md:text-2xl font-bold text-gray-900">{event.name}</h1>
                        <p className="text-gray-500 text-xs md:text-sm hidden md:block">Manage your event details and lifecycle.</p>
                    </div>
                </div>
                <div className="flex gap-2 md:ml-auto">
                    <button className="flex items-center justify-center gap-2 px-3 md:px-4 py-2 border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 font-medium transition-colors text-sm">
                        <Download className="h-4 w-4" />
                        <span className="hidden sm:inline">Reports</span>
                    </button>
                    <button className="flex items-center justify-center gap-2 px-3 md:px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 font-medium shadow-md transition-colors text-sm">
                        <Edit2 className="h-4 w-4" />
                        <span className="hidden sm:inline">Edit Event</span>
                    </button>
                </div>
            </div>

            {/* Banner - Responsive */}
            <div className="h-32 md:h-48 rounded-xl md:rounded-2xl overflow-hidden relative group">
                <img
                    src={event.image_path || getUnsplashImageUrl(event.name, 1200, 300)}
                    alt={event.name}
                    className="w-full h-full object-cover"
                    onError={(e) => { e.target.src = getCategoryImage(event.category) }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <div className="absolute bottom-3 md:bottom-6 left-3 md:left-6 text-white">
                    <div className="flex flex-wrap items-center gap-2 md:gap-4 text-xs md:text-sm font-medium opacity-90">
                        <span className="flex items-center gap-1.5"><Calendar className="h-3 md:h-4 w-3 md:w-4" /> {event.day}</span>
                        <span className="flex items-center gap-1.5"><Clock className="h-3 md:h-4 w-3 md:w-4" /> {event.time}</span>
                        <span className="flex items-center gap-1.5 hidden sm:flex"><MapPin className="h-3 md:h-4 w-3 md:w-4" /> {event.venue}</span>
                    </div>
                </div>
            </div>

            {/* Tabs - Sticky & Responsive */}
            <div className="bg-white rounded-xl md:rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col min-h-[500px]">
                <div className="sticky top-0 z-20 flex border-b border-gray-100 px-2 md:px-6 bg-white shadow-sm">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex-1 md:flex-auto flex flex-col md:flex-row items-center justify-center gap-1 md:gap-2 px-2 md:px-4 py-3 md:py-4 text-xs md:text-sm font-semibold border-b-2 transition-all ${activeTab === tab.id
                                ? 'border-indigo-600 text-indigo-700 bg-indigo-50/50'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                                }`}
                            title={tab.label}
                        >
                            <tab.icon className={`h-4 w-4 md:h-4 md:w-4 ${activeTab === tab.id ? 'text-indigo-600' : 'text-gray-400'}`} />
                            <span className="hidden md:inline text-sm">{tab.label}</span>
                            <span className="md:hidden text-[10px] leading-tight">{tab.label.split(' ')[0]}</span>
                        </button>
                    ))}
                </div>

                <div className="p-3 md:p-6 flex-1 bg-white">
                    {/* OVERVIEW */}
                    {activeTab === 'overview' && (
                        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 space-y-8">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div className="p-4 rounded-xl bg-indigo-50 border border-indigo-100"><p className="text-xs text-indigo-600 uppercase font-bold tracking-wider">Total Registrations</p><h3 className="text-2xl font-bold text-gray-900 mt-1">{participants.length || 0}</h3></div>
                                <div className="p-4 rounded-xl bg-green-50 border border-green-100"><p className="text-xs text-green-600 uppercase font-bold tracking-wider">Confirmed</p><h3 className="text-2xl font-bold text-gray-900 mt-1">{participants.filter(p => p.status === 'confirmed').length || 0}</h3></div>
                                <div className="p-4 rounded-xl bg-yellow-50 border border-yellow-100"><p className="text-xs text-yellow-600 uppercase font-bold tracking-wider">Pending</p><h3 className="text-2xl font-bold text-gray-900 mt-1">{participants.filter(p => p.status === 'pending').length || 0}</h3></div>
                                <div className="p-4 rounded-xl bg-red-50 border border-red-100"><p className="text-xs text-red-600 uppercase font-bold tracking-wider">Rejected</p><h3 className="text-2xl font-bold text-gray-900 mt-1">{participants.filter(p => p.status === 'rejected').length || 0}</h3></div>
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
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation()
                                                                    setSelectedProfile(participant.user)
                                                                }}
                                                                className="h-12 w-12 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold hover:ring-4 hover:ring-indigo-200 transition-all cursor-pointer"
                                                                title="View Profile"
                                                            >
                                                                {participant.user?.full_name?.[0]?.toUpperCase() || '?'}
                                                            </button>
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

                    {/* RESULTS */}
                    {activeTab === 'results' && (
                        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <div className="flex justify-between items-center mb-6">
                                <div>
                                    <h3 className="text-lg font-bold text-gray-900">Results & Winners</h3>
                                    <p className="text-sm text-gray-500">Select winners and announce results</p>
                                </div>
                                {event?.results_announced && (
                                    <span className="px-4 py-2 bg-green-100 text-green-700 rounded-lg font-semibold flex items-center gap-2">
                                        <Check className="h-5 w-5" /> Results Announced
                                    </span>
                                )}
                            </div>

                            <div className="space-y-6">
                                {/* Winner Selection Form */}
                                <div className="bg-white rounded-2xl border-2 border-gray-200 shadow-lg p-6">
                                    <h4 className="text-lg font-bold text-gray-900 mb-4">🏆 Select Winners</h4>

                                    {participants.length === 0 ? (
                                        <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                                            <Users className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                                            <p className="text-gray-500 mb-2">No confirmed participants yet</p>
                                            <p className="text-sm text-gray-400">Participants must be confirmed before announcing results</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-6">
                                            {/* First Place */}
                                            <div className="space-y-2">
                                                <label className="flex items-center gap-2 text-sm font-bold text-gray-700">
                                                    <span className="text-2xl">🥇</span> First Place (Required)
                                                </label>
                                                <select
                                                    value={resultForm.first_place}
                                                    onChange={(e) => setResultForm({ ...resultForm, first_place: e.target.value })}
                                                    disabled={event?.results_announced}
                                                    className="w-full px-4 py-3 border-2 border-yellow-300 rounded-xl focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 disabled:bg-gray-50 disabled:cursor-not-allowed bg-yellow-50"
                                                >
                                                    <option value="">-- Select First Place Winner --</option>
                                                    {participants
                                                        .filter(p => p.status === 'confirmed')
                                                        .map(p => (
                                                            <option key={p.id} value={p.id}>
                                                                {p.user?.full_name} ({p.user?.roll_number})
                                                                {p.team_members?.length > 0 ? ` - Team Leader (${p.team_members.length + 1} members)` : ''}
                                                            </option>
                                                        ))}
                                                </select>
                                            </div>

                                            {/* Second Place */}
                                            <div className="space-y-2">
                                                <label className="flex items-center gap-2 text-sm font-bold text-gray-700">
                                                    <span className="text-2xl">🥈</span> Second Place (Optional)
                                                </label>
                                                <select
                                                    value={resultForm.second_place}
                                                    onChange={(e) => setResultForm({ ...resultForm, second_place: e.target.value })}
                                                    disabled={event?.results_announced}
                                                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-gray-500 focus:border-gray-500 disabled:bg-gray-50 disabled:cursor-not-allowed bg-gray-50"
                                                >
                                                    <option value="">-- Select Second Place Winner --</option>
                                                    {participants
                                                        .filter(p => p.status === 'confirmed' && p.id !== resultForm.first_place)
                                                        .map(p => (
                                                            <option key={p.id} value={p.id}>
                                                                {p.user?.full_name} ({p.user?.roll_number})
                                                                {p.team_members?.length > 0 ? ` - Team Leader (${p.team_members.length + 1} members)` : ''}
                                                            </option>
                                                        ))}
                                                </select>
                                            </div>

                                            {/* Third Place */}
                                            <div className="space-y-2">
                                                <label className="flex items-center gap-2 text-sm font-bold text-gray-700">
                                                    <span className="text-2xl">🥉</span> Third Place (Optional)
                                                </label>
                                                <select
                                                    value={resultForm.third_place}
                                                    onChange={(e) => setResultForm({ ...resultForm, third_place: e.target.value })}
                                                    disabled={event?.results_announced}
                                                    className="w-full px-4 py-3 border-2 border-orange-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 disabled:bg-gray-50 disabled:cursor-not-allowed bg-orange-50"
                                                >
                                                    <option value="">-- Select Third Place Winner --</option>
                                                    {participants
                                                        .filter(p => p.status === 'confirmed' && p.id !== resultForm.first_place && p.id !== resultForm.second_place)
                                                        .map(p => (
                                                            <option key={p.id} value={p.id}>
                                                                {p.user?.full_name} ({p.user?.roll_number})
                                                                {p.team_members?.length > 0 ? ` - Team Leader (${p.team_members.length + 1} members)` : ''}
                                                            </option>
                                                        ))}
                                                </select>
                                            </div>

                                            {/* Announce Button */}
                                            {!event?.results_announced && (
                                                <button
                                                    onClick={handleAnnounceResults}
                                                    disabled={!resultForm.first_place || announcingResults}
                                                    className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-bold text-lg hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                                                >
                                                    <BarChart3 className="h-6 w-6" />
                                                    {announcingResults ? 'Announcing...' : '📢 Announce Results'}
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Current Results Display (if announced) */}
                                {event?.results_announced && (
                                    <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl border-2 border-green-200 shadow-lg p-6">
                                        <h4 className="font-bold text-green-800 mb-4 text-xl flex items-center gap-2">
                                            <Check className="h-6 w-6" /> Results Announced
                                        </h4>
                                        <div className="text-sm text-green-700 mb-4">
                                            Announced on: {event.results_announced_at ? new Date(event.results_announced_at).toLocaleString() : 'N/A'}
                                        </div>

                                        <div className="space-y-3">
                                            {/* Display winners */}
                                            {[
                                                { key: 'first_place', label: '🥇 First Place', id: event.winner_profile_id },
                                                { key: 'second_place', label: '🥈 Second Place', id: event.runnerup_profile_id },
                                                { key: 'third_place', label: '🥉 Third Place', id: event.second_runnerup_profile_id }
                                            ].map(({ key, label, id: winnerId }) => {
                                                if (!winnerId) return null
                                                const winner = participants.find(p => p.id === winnerId)
                                                if (!winner) return null

                                                return (
                                                    <div key={key} className="bg-white rounded-xl p-4 shadow-sm border border-green-200">
                                                        <div className="font-semibold text-gray-700 mb-2">{label}</div>
                                                        <div className="flex items-center gap-3">
                                                            <div className="h-12 w-12 rounded-full bg-gradient-to-br from-purple-400 to-indigo-500 flex items-center justify-center text-white font-bold text-lg">
                                                                {winner.user?.avatar_url ? (
                                                                    <img src={winner.user.avatar_url} alt="" className="h-full w-full rounded-full object-cover" />
                                                                ) : (
                                                                    <span>{winner.user?.full_name?.charAt(0) || 'U'}</span>
                                                                )}
                                                            </div>
                                                            <div>
                                                                <div className="font-bold text-gray-900">{winner.user?.full_name}</div>
                                                                <div className="text-sm text-gray-500">{winner.user?.roll_number}</div>
                                                                {winner.team_members?.length > 0 && (
                                                                    <div className="text-xs text-purple-600 font-semibold mt-1">
                                                                        Team Leader • {winner.team_members.length + 1} members
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    </div>
                                )}

                                {/* Info Box */}
                                <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
                                    <div className="flex gap-3">
                                        <div className="text-blue-600 mt-0.5">ℹ️</div>
                                        <div className="text-sm text-blue-900">
                                            <p className="font-semibold mb-1">About Results</p>
                                            <ul className="list-disc list-inside space-y-1 text-blue-800">
                                                <li>Select winners from confirmed participants only</li>
                                                <li>Win counts are automatically updated in user profiles</li>
                                                <li>For team events, all team members get win count increments</li>
                                                <li>Results cannot be changed once announced</li>
                                            </ul>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                    {/* CONTROL */}
                    {activeTab === 'control' && (
                        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <div className="flex justify-between items-center mb-6">
                                <div>
                                    <h3 className="text-lg font-bold text-gray-900">Live Event Control</h3>
                                    <p className="text-sm text-gray-500">Manage event live status and visibility</p>
                                </div>
                            </div>

                            {/* Live Status Card */}
                            <div className="bg-white rounded-2xl border-2 border-gray-200 shadow-lg overflow-hidden">
                                <div className={`p-6 ${event?.is_live ? 'bg-gradient-to-r from-red-50 to-orange-50 border-b-4 border-red-500' : 'bg-gray-50'}`}>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            {event?.is_live ? (
                                                <>
                                                    <div className="relative">
                                                        <Activity className="h-12 w-12 text-red-600 animate-pulse" />
                                                        <div className="absolute -top-1 -right-1 h-4 w-4 bg-red-600 rounded-full animate-ping"></div>
                                                    </div>
                                                    <div>
                                                        <h4 className="text-2xl font-bold text-red-600 flex items-center gap-2">
                                                            🔴 LIVE NOW
                                                        </h4>
                                                        <p className="text-sm text-gray-600 mt-1">
                                                            Started: {event.live_started_at ? new Date(event.live_started_at).toLocaleString() : 'N/A'}
                                                        </p>
                                                    </div>
                                                </>
                                            ) : (
                                                <>
                                                    <div className="h-12 w-12 rounded-full bg-gray-200 flex items-center justify-center">
                                                        <Activity className="h-6 w-6 text-gray-400" />
                                                    </div>
                                                    <div>
                                                        <h4 className="text-2xl font-bold text-gray-900">Event Offline</h4>
                                                        <p className="text-sm text-gray-500 mt-1">Not currently visible in "Happening Now"</p>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                        <div className="text-right">
                                            <div className="text-sm text-gray-500 mb-1">Status</div>
                                            <span className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-bold ${event?.event_status === 'ongoing' ? 'bg-green-100 text-green-700' :
                                                event?.event_status === 'completed' ? 'bg-blue-100 text-blue-700' :
                                                    'bg-gray-100 text-gray-700'
                                                }`}>
                                                {event?.event_status || 'upcoming'}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="p-6 space-y-6">
                                    {/* Event Info */}
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="p-4 bg-gray-50 rounded-xl">
                                            <div className="text-xs text-gray-500 uppercase font-bold mb-1">Event Date</div>
                                            <div className="text-lg font-bold text-gray-900">{event?.event_date || 'Not set'}</div>
                                        </div>
                                        <div className="p-4 bg-gray-50 rounded-xl">
                                            <div className="text-xs text-gray-500 uppercase font-bold mb-1">Today's Date</div>
                                            <div className="text-lg font-bold text-gray-900">{new Date().toISOString().split('T')[0]}</div>
                                        </div>
                                    </div>

                                    {/* Date Match Indicator */}
                                    {event?.event_date && (
                                        <div className={`p-4 rounded-xl border-2 ${checkEventDateMatch()
                                            ? 'bg-green-50 border-green-200'
                                            : 'bg-yellow-50 border-yellow-200'
                                            }`}>
                                            <div className="flex items-center gap-3">
                                                {checkEventDateMatch() ? (
                                                    <>
                                                        <Check className="h-6 w-6 text-green-600" />
                                                        <div>
                                                            <div className="font-bold text-green-900">Event Date Matches</div>
                                                            <div className="text-sm text-green-700">You can go live without warnings</div>
                                                        </div>
                                                    </>
                                                ) : (
                                                    <>
                                                        <XIcon className="h-6 w-6 text-yellow-600" />
                                                        <div>
                                                            <div className="font-bold text-yellow-900">Date Mismatch Warning</div>
                                                            <div className="text-sm text-yellow-700">Today is not the scheduled event date</div>
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {/* Control Buttons */}
                                    <div className="flex gap-4">
                                        {!event?.is_live ? (
                                            <button
                                                onClick={() => handleGoLive(false)}
                                                disabled={isGoingLive}
                                                className="flex-1 flex items-center justify-center gap-3 px-6 py-4 bg-gradient-to-r from-red-600 to-orange-600 text-white rounded-xl font-bold text-lg hover:from-red-700 hover:to-orange-700 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                <Activity className="h-6 w-6" />
                                                {isGoingLive ? 'Going Live...' : '🔴 Go Live'}
                                            </button>
                                        ) : (
                                            <button
                                                onClick={handleEndLive}
                                                disabled={isGoingLive}
                                                className="flex-1 flex items-center justify-center gap-3 px-6 py-4 bg-gray-600 text-white rounded-xl font-bold text-lg hover:bg-gray-700 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                <XIcon className="h-6 w-6" />
                                                {isGoingLive ? 'Stopping...' : 'Stop Live'}
                                            </button>
                                        )}
                                    </div>

                                    {/* Info Box */}
                                    <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
                                        <div className="flex gap-3">
                                            <div className="text-blue-600 mt-0.5">ℹ️</div>
                                            <div className="text-sm text-blue-900">
                                                <p className="font-semibold mb-1">About Live Events</p>
                                                <ul className="list-disc list-inside space-y-1 text-blue-800">
                                                    <li>Live events appear in the "Happening Now" section for students</li>
                                                    <li>You can override date warnings if needed</li>
                                                    <li>Event status automatically updates when going live or ending</li>
                                                </ul>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Date Warning Modal */}
                    {showDateWarning && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                            <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4">
                                <div className="text-center mb-6">
                                    <div className="h-16 w-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <span className="text-4xl">⚠️</span>
                                    </div>
                                    <h3 className="text-2xl font-bold text-gray-900 mb-2">Date Mismatch Warning</h3>
                                    <p className="text-gray-600">
                                        Today is <span className="font-bold text-gray-900">{new Date().toISOString().split('T')[0]}</span>
                                        <br />
                                        Event is scheduled for <span className="font-bold text-gray-900">{event?.event_date}</span>
                                    </p>
                                    <p className="text-sm text-yellow-700 mt-3 bg-yellow-50 p-3 rounded-lg">
                                        Are you sure you want to go live anyway?
                                    </p>
                                </div>
                                <div className="flex gap-3">
                                    <button
                                        onClick={() => setShowDateWarning(false)}
                                        className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={() => handleGoLive(true)}
                                        className="flex-1 px-4 py-3 bg-gradient-to-r from-red-600 to-orange-600 text-white rounded-xl font-semibold hover:from-red-700 hover:to-orange-700 transition shadow-lg"
                                    >
                                        Go Live Anyway
                                    </button>
                                </div>
                            </div>
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
                                            key: 'user', title: 'Student', render: (row) => {
                                                const teamSize = row.team_members?.length || 0
                                                return (
                                                    <div className="relative group">
                                                        <div>
                                                            <div className="font-medium text-gray-900">{row.user?.full_name || 'Unknown'}</div>
                                                            <div className="text-xs text-gray-500">
                                                                {row.user?.roll_number} • {row.user?.department}
                                                                {teamSize > 0 && (
                                                                    <span className="ml-2 px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-xs font-semibold">
                                                                        👥 Team Lead (+{teamSize})
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>

                                                        {/* Team Members Hover Tooltip */}
                                                        {teamSize > 0 && (
                                                            <div className="absolute left-0 top-full mt-2 w-64 bg-white border-2 border-purple-200 rounded-lg shadow-xl p-4 z-50 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                                                                <div className="text-xs font-bold text-purple-700 mb-2 uppercase tracking-wide">Team Members ({teamSize})</div>
                                                                <div className="space-y-2">
                                                                    {row.team_members.map((member, idx) => (
                                                                        <div key={idx} className="flex items-start gap-2 text-xs border-b border-gray-100 pb-2 last:border-0">
                                                                            <User className="h-3 w-3 text-purple-500 flex-shrink-0 mt-0.5" />
                                                                            <div>
                                                                                <div className="font-medium text-gray-900">{member.name}</div>
                                                                                <div className="text-gray-500">{member.roll_number}</div>
                                                                            </div>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                )
                                            }
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
                                            key: 'user', title: 'Student', render: (row) => {
                                                const teamSize = row.team_members?.length || 0
                                                return (
                                                    <div className="relative group">
                                                        <div>
                                                            <div className="font-medium text-gray-900">{row.user?.full_name || 'Unknown'}</div>
                                                            <div className="text-xs text-gray-500">
                                                                {row.user?.roll_number}
                                                                {teamSize > 0 && (
                                                                    <span className="ml-2 px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-xs font-semibold">
                                                                        👥 Team Lead (+{teamSize})
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>

                                                        {/* Team Members Hover Tooltip */}
                                                        {teamSize > 0 && (
                                                            <div className="absolute left-0 top-full mt-2 w-64 bg-white border-2 border-purple-200 rounded-lg shadow-xl p-4 z-50 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                                                                <div className="text-xs font-bold text-purple-700 mb-2 uppercase tracking-wide">Team Members ({teamSize})</div>
                                                                <div className="space-y-2">
                                                                    {row.team_members.map((member, idx) => (
                                                                        <div key={idx} className="flex items-start gap-2 text-xs border-b border-gray-100 pb-2 last:border-0">
                                                                            <User className="h-3 w-3 text-purple-500 flex-shrink-0 mt-0.5" />
                                                                            <div>
                                                                                <div className="font-medium text-gray-900">{member.name}</div>
                                                                                <div className="text-gray-500">{member.roll_number}</div>
                                                                            </div>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                )
                                            }
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
                                            key: 'user', title: 'Student', render: (row) => {
                                                const teamSize = row.team_members?.length || 0
                                                return (
                                                    <div className="relative group">
                                                        <div>
                                                            <div className="font-medium text-gray-900">{row.user?.full_name || 'Unknown'}</div>
                                                            <div className="text-xs text-gray-500">
                                                                {row.user?.roll_number} • {row.user?.department}
                                                                {teamSize > 0 && (
                                                                    <span className="ml-2 px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-xs font-semibold">
                                                                        👥 Team Lead (+{teamSize})
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>

                                                        {/* Team Members Hover Tooltip */}
                                                        {teamSize > 0 && (
                                                            <div className="absolute left-0 top-full mt-2 w-64 bg-white border-2 border-purple-200 rounded-lg shadow-xl p-4 z-50 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                                                                <div className="text-xs font-bold text-purple-700 mb-2 uppercase tracking-wide">Team Members ({teamSize})</div>
                                                                <div className="space-y-2">
                                                                    {row.team_members.map((member, idx) => (
                                                                        <div key={idx} className="flex items-start gap-2 text-xs border-b border-gray-100 pb-2 last:border-0">
                                                                            <User className="h-3 w-3 text-purple-500 flex-shrink-0 mt-0.5" />
                                                                            <div>
                                                                                <div className="font-medium text-gray-900">{member.name}</div>
                                                                                <div className="text-gray-500">{member.roll_number}</div>
                                                                            </div>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                )
                                            }
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
                                            key: 'actions', title: 'Actions', render: (row) => {
                                                // Smart logic: Cash payments don't need transaction_id or screenshot
                                                const isCash = row.payment_mode === 'cash';
                                                const isOnline = row.payment_mode === 'online' || row.payment_mode === 'hybrid';
                                                const canVerify = isCash || (isOnline && row.transaction_id && row.payment_screenshot_path);

                                                return (
                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            onClick={() => verifyPayment(row.id)}
                                                            disabled={!canVerify}
                                                            className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm font-semibold hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                                                            title={!canVerify ? 'Online payment requires transaction ID and screenshot' : 'Verify payment'}
                                                        >
                                                            ✓ Verify
                                                        </button>
                                                        <button
                                                            onClick={() => handleRejectPayment(row.id)}
                                                            className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-sm font-semibold hover:bg-red-700 transition"
                                                            title="Reject payment"
                                                        >
                                                            ✗ Reject
                                                        </button>
                                                    </div>
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

            {/* Unified Confirmation Dialog */}
            <ConfirmDialog
                isOpen={confirmDialog.isOpen}
                onClose={() => setConfirmDialog({ ...confirmDialog, isOpen: false })}
                onConfirm={confirmDialog.onConfirm}
                title={confirmDialog.title}
                message={confirmDialog.message}
                type={confirmDialog.type}
                confirmText={confirmDialog.confirmText}
                cancelText={confirmDialog.cancelText}
                showCancel={confirmDialog.showCancel}
            />
        </div>
    )
}
