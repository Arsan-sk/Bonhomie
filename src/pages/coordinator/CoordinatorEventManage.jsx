import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { ArrowLeft, Edit2, Users, Trophy, DollarSign, BarChart3, Clock, Calendar, MapPin, Download, Check, X as XIcon, Search, Plus, Trash2, Eye, Activity } from 'lucide-react'
import SmartTable from '../../components/admin/ui/SmartTable'
import { AdminInput, AdminSelect } from '../../components/admin/ui/AdminForm'

export default function CoordinatorEventManage() {
    const { id } = useParams()
    const [activeTab, setActiveTab] = useState('overview')
    const [event, setEvent] = useState(null)
    const [loading, setLoading] = useState(true)

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

    // Payments State
    const [payments, setPayments] = useState([])
    const [loadingPayments, setLoadingPayments] = useState(false)

    useEffect(() => {
        fetchEventDetails()
    }, [id])

    useEffect(() => {
        if (activeTab === 'participants' || activeTab === 'analytics') fetchParticipants()
        if (activeTab === 'rounds' || activeTab === 'results') fetchRounds()
        if (activeTab === 'payments') fetchPayments()
    }, [activeTab, id])

    useEffect(() => {
        if (activeTab === 'results' && selectedRoundId) fetchRoundParticipants(selectedRoundId)
        else if (activeTab === 'results' && rounds.length > 0 && !selectedRoundId) {
            setSelectedRoundId(rounds[0].id)
        }
    }, [activeTab, selectedRoundId, rounds])

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
            .select(`*, user:profiles (id, full_name, college_email, roll_number)`)
            .eq('event_id', id)
            .select(`*, user:profiles (id, full_name, college_email, roll_number)`)
        //.order('created_at', { ascending: false }) // created_at might be missing
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
        let { data, error } = await supabase.from('payments')
            .select(`*, user:profiles(full_name, college_email)`)
            .eq('event_id', id)

        if (error || !data) {
            const { data: regData, error: regError } = await supabase.from('registrations')
                .select(`id, payment_status, transaction_id, screenshot_url, amount, created_at, user:profiles(full_name, college_email)`)
                .eq('event_id', id)
                .not('transaction_id', 'is', null)

            if (!regError) setPayments(regData || [])
        } else {
            setPayments(data || [])
        }

        setLoadingPayments(false)
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

    const handleParticipantAction = async (registrationId, action) => {
        if (!confirm(`Are you sure you want to ${action} this participant?`)) return
        const newStatus = action === 'approve' ? 'confirmed' : 'cancelled'
        const { error } = await supabase.from('registrations').update({ status: newStatus }).eq('id', registrationId)
        if (error) alert('Error updating status')
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

    const verifyPayment = async (id, isFromRegistrations, status) => {
        const table = isFromRegistrations ? 'registrations' : 'payments'
        const field = isFromRegistrations ? 'payment_status' : 'status'
        const { error } = await supabase.from(table).update({ [field]: status }).eq('id', id)
        if (error) alert("Update failed")
        else fetchPayments()
    }

    if (loading) return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div></div>
    if (!event) return <div className="p-8 text-center">Event not found.</div>

    const tabs = [
        { id: 'overview', label: 'Overview', icon: Clock },
        { id: 'participants', label: 'Participants', icon: Users },
        { id: 'rounds', label: 'Rounds', icon: Trophy },
        { id: 'results', label: 'Results', icon: BarChart3 },
        { id: 'payments', label: 'Payments', icon: DollarSign },
        { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    ]

    const participantColumns = [
        { key: 'user', title: 'Participant', sortable: true, render: (row) => (<div><div className="font-bold text-gray-900">{row.user?.full_name || 'Unknown'}</div><div className="text-xs text-gray-500">{row.user?.college_email}</div></div>) },
        { key: 'roll', title: 'Roll No', render: (row) => row.user?.roll_number || '-' },
        { key: 'status', title: 'Status', sortable: true, render: (row) => (<span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase ${row.status === 'confirmed' ? 'bg-green-100 text-green-700' : row.status === 'cancelled' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>{row.status}</span>) },
        { key: 'actions', title: 'Actions', render: (row) => (<div className="flex gap-2"><button onClick={() => handleParticipantAction(row.id, 'approve')} disabled={row.status === 'confirmed'} className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg disabled:opacity-50" title="Approve"><Check className="h-4 w-4" /></button><button onClick={() => handleParticipantAction(row.id, 'remove')} className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg" title="Remove"><XIcon className="h-4 w-4" /></button></div>) }
    ]

    const paymentColumns = [
        { key: 'user', title: 'User', render: (row) => row.user?.full_name || 'Unknown' },
        { key: 'amount', title: 'Amount', render: (row) => `₹${row.amount || 500}` },
        { key: 'txn', title: 'Transaction ID', render: (row) => <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">{row.transaction_id || 'N/A'}</span> },
        { key: 'screenshot', title: 'Proof', render: (row) => row.screenshot_url ? <a href={row.screenshot_url} target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline flex items-center gap-1"><Eye className="h-3 w-3" /> View</a> : <span className="text-gray-400">None</span> },
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
                <img src={event.image_url || 'https://via.placeholder.com/1200x300'} alt="" className="w-full h-full object-cover" />
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
                                <div className="p-4 rounded-xl bg-indigo-50 border border-indigo-100"><p className="text-xs text-indigo-600 uppercase font-bold tracking-wider">Total Registrations</p><h3 className="text-2xl font-bold text-gray-900 mt-1">{participants.length > 0 ? participants.length : '-'}</h3></div>
                                <div className="p-4 rounded-xl bg-green-50 border border-green-100"><p className="text-xs text-green-600 uppercase font-bold tracking-wider">Confirmed</p><h3 className="text-2xl font-bold text-gray-900 mt-1">{participants.filter(p => p.status === 'confirmed').length || '-'}</h3></div>
                                <div className="p-4 rounded-xl bg-orange-50 border border-orange-100"><p className="text-xs text-orange-600 uppercase font-bold tracking-wider">Pending</p><h3 className="text-2xl font-bold text-gray-900 mt-1">{participants.filter(p => p.status !== 'confirmed').length || '-'}</h3></div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                <div className="md:col-span-2 space-y-6">
                                    <div><h3 className="text-lg font-bold text-gray-900 mb-2">Description</h3><p className="text-gray-600 leading-relaxed">{event.description || 'No description provided.'}</p></div>
                                    <div><h3 className="text-lg font-bold text-gray-900 mb-2">Rules</h3><div className="prose prose-sm prose-indigo text-gray-600 bg-gray-50 p-4 rounded-xl border border-gray-100">{event.rules || 'No rules.'}</div></div>
                                </div>
                                <div className="space-y-6">
                                    <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm"><h4 className="text-sm font-bold text-gray-900 mb-3">Event Details</h4><dl className="space-y-3 text-sm"><div className="flex justify-between"><dt className="text-gray-500">Day</dt><dd className="font-medium">{event.day}</dd></div><div className="flex justify-between"><dt className="text-gray-500">Mode</dt><dd className="font-medium">{event.mode}</dd></div><div className="flex justify-between"><dt className="text-gray-500">Fee</dt><dd className="font-medium text-green-600">₹{event.registration_fee}</dd></div></dl></div>
                                </div>
                            </div>
                        </div>
                    )}
                    {/* PARTICIPANTS */}
                    {activeTab === 'participants' && (
                        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <div className="flex justify-between items-center mb-6">
                                <div><h3 className="text-lg font-bold text-gray-900">Participants</h3><p className="text-sm text-gray-500">Manage individuals and teams.</p></div>
                                <button className="flex items-center gap-2 px-3 py-2 bg-indigo-50 text-indigo-700 rounded-lg text-sm font-semibold hover:bg-indigo-100"><Download className="h-4 w-4" /> Export CSV</button>
                            </div>
                            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                                <SmartTable columns={participantColumns} data={participants.filter(p => p.user?.full_name?.toLowerCase().includes(participantSearch.toLowerCase()))} loading={loadingParticipants} searchable={true} onSearchChange={setParticipantSearch} emptyMessage="No participants." />
                            </div>
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
                                <div><h3 className="text-lg font-bold text-gray-900">Score & Results</h3><p className="text-sm text-gray-500">Enter scores and qualify winners.</p></div>
                                <div className="w-64">
                                    <AdminSelect value={selectedRoundId} onChange={e => setSelectedRoundId(e.target.value)}>
                                        <option value="" disabled>Select Round</option>
                                        {rounds.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                                    </AdminSelect>
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
                                    ) : (
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
                                <div><h3 className="text-lg font-bold text-gray-900">Payment Verification</h3><p className="text-sm text-gray-500">Verify transaction IDs and screenshots.</p></div>
                            </div>
                            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                                <SmartTable columns={paymentColumns} data={payments} loading={loadingPayments} emptyMessage="No transactions found." />
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
                                        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex items-center justify-between">
                                            <div>
                                                <p className="text-sm text-gray-500 mb-1">Confirmation Rate</p>
                                                <h3 className="text-3xl font-bold text-gray-900">
                                                    {participants.length > 0
                                                        ? Math.round((participants.filter(p => p.status === 'confirmed').length / participants.length) * 100)
                                                        : 0}%
                                                </h3>
                                                <p className="text-xs text-green-600 mt-1 font-medium flex items-center gap-1">
                                                    <Check className="h-3 w-3" /> Based on total registrations
                                                </p>
                                            </div>
                                            <div className="h-16 w-16 rounded-full border-4 border-gray-100 border-t-green-500 flex items-center justify-center bg-gray-50">
                                                <Activity className="h-6 w-6 text-green-600" />
                                            </div>
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
        </div>
    )
}
