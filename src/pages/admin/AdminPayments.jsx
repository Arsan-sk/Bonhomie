import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import SmartTable from '../../components/admin/ui/SmartTable'

export default function AdminPayments() {
    const [payments, setPayments] = useState([])
    const [loading, setLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState('')

    useEffect(() => {
        fetchPayments()
    }, [])

    const fetchPayments = async () => {
        setLoading(true)
        try {
            const { data: paymentsData, error: paymentsError } = await supabase
                .from('payments')
                .select('*')
                .order('created_at', { ascending: false })

            if (paymentsError) throw paymentsError

            // Client-side joins
            const userIds = [...new Set(paymentsData.map(p => p.user_id))]
            const eventIds = [...new Set(paymentsData.map(p => p.event_id))]

            let profilesMap = {}
            if (userIds.length > 0) {
                const { data: profiles, error: profError } = await supabase
                    .from('profiles')
                    .select('id, full_name, email')
                    .in('id', userIds)
                if (!profError) {
                    profilesMap = profiles.reduce((acc, p) => ({ ...acc, [p.id]: p }), {})
                }
            }

            let eventsMap = {}
            if (eventIds.length > 0) {
                const { data: events, error: evError } = await supabase
                    .from('events')
                    .select('id, name')
                    .in('id', eventIds)
                if (!evError) {
                    eventsMap = events.reduce((acc, e) => ({ ...acc, [e.id]: e }), {})
                }
            }

            const combinedData = paymentsData.map(p => ({
                ...p,
                user_name: profilesMap[p.user_id]?.full_name || 'Unknown',
                user_email: profilesMap[p.user_id]?.email || 'N/A',
                event_name: eventsMap[p.event_id]?.name || 'Unknown Event'
            }))

            setPayments(combinedData)
        } catch (error) {
            console.error('Error fetching payments:', error)
        } finally {
            setLoading(false)
        }
    }

    const columns = [
        { key: 'payment_id', title: 'Transaction ID', render: (row) => <span className="font-mono text-xs text-gray-500">{row.payment_id || row.id.slice(0, 8)}</span> },
        {
            key: 'user_name', title: 'User', sortable: true, render: (row) => (
                <div>
                    <div className="font-medium text-gray-900">{row.user_name}</div>
                    <div className="text-xs text-gray-500">{row.user_email}</div>
                </div>
            )
        },
        { key: 'event_name', title: 'Event', sortable: true },
        { key: 'amount', title: 'Amount', sortable: true, render: (row) => <span className="font-medium text-gray-900">₹{row.amount}</span> },
        {
            key: 'status', title: 'Status', sortable: true, render: (row) => (
                <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${row.status === 'confirmed' ? 'bg-green-50 text-green-700 ring-green-600/20' :
                        row.status === 'pending' ? 'bg-yellow-50 text-yellow-800 ring-yellow-600/20' :
                            'bg-red-50 text-red-700 ring-red-600/10'
                    }`}>
                    {row.status ? row.status.charAt(0).toUpperCase() + row.status.slice(1) : 'Pending'}
                </span>
            )
        },
        { key: 'created_at', title: 'Date', sortable: true, render: (row) => new Date(row.created_at).toLocaleDateString() }
    ]

    const filteredPayments = payments.filter(p =>
        p.user_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.event_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.payment_id || '').toLowerCase().includes(searchQuery.toLowerCase())
    )

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold tracking-tight text-gray-900">Payment Transactions</h2>
                <p className="mt-1 text-sm text-gray-500">Monitor revenue and verify payment statuses.</p>
            </div>

            <SmartTable
                columns={columns}
                data={filteredPayments}
                loading={loading}
                searchable={true}
                onSearchChange={setSearchQuery}
            />
        </div>
    )
}
