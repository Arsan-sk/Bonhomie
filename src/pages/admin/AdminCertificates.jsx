import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import SmartTable from '../../components/admin/ui/SmartTable'
import { Award, CheckCircle, XCircle, Search, Plus } from 'lucide-react'

export default function AdminCertificates() {
    const [certificates, setCertificates] = useState([])
    const [loading, setLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState('')

    useEffect(() => {
        fetchCertificates()
    }, [])

    const fetchCertificates = async () => {
        setLoading(true)
        try {
            const { data: certsData, error: certsError } = await supabase
                .from('certificates')
                .select('*')
                .order('created_at', { ascending: false })

            if (certsError) throw certsError

            if (!certsData || certsData.length === 0) {
                setCertificates([])
                setLoading(false)
                return
            }

            // Client-side joins
            const userIds = [...new Set(certsData.map(c => c.user_id))]
            const eventIds = [...new Set(certsData.map(c => c.event_id))]

            // Fetch Profiles
            const { data: profiles, error: profError } = await supabase
                .from('profiles')
                .select('id, full_name, email')
                .in('id', userIds)

            const profilesMap = (profiles || []).reduce((acc, p) => ({ ...acc, [p.id]: p }), {})

            // Fetch Events
            const { data: events, error: evError } = await supabase
                .from('events')
                .select('id, name')
                .in('id', eventIds)

            const eventsMap = (events || []).reduce((acc, e) => ({ ...acc, [e.id]: e }), {})

            const combinedData = certsData.map(c => ({
                ...c,
                user_name: profilesMap[c.user_id]?.full_name || 'Unknown',
                user_email: profilesMap[c.user_id]?.email || 'N/A',
                event_name: eventsMap[c.event_id]?.name || 'Unknown Event'
            }))

            setCertificates(combinedData)
        } catch (error) {
            console.error('Error fetching certificates:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleGenerate = () => {
        // Placeholder for generation logic
        alert("Certificate Generation Wizard would open here.")
    }

    const columns = [
        { key: 'unique_hash', title: 'Certificate ID', render: (row) => <span className="font-mono text-xs text-gray-500">{row.unique_hash?.slice(0, 8) || row.id.slice(0, 8)}</span> },
        {
            key: 'user_name', title: 'Recipient', sortable: true, render: (row) => (
                <div>
                    <div className="font-medium text-gray-900">{row.user_name}</div>
                    <div className="text-xs text-gray-500">{row.user_email}</div>
                </div>
            )
        },
        { key: 'event_name', title: 'Event', sortable: true },
        { key: 'issue_date', title: 'Issued On', sortable: true, render: (row) => new Date(row.issue_date).toLocaleDateString() },
        {
            key: 'actions', title: 'Actions', render: (row) => (
                <div className="flex items-center gap-2">
                    <button className="text-indigo-600 hover:text-indigo-900 text-xs font-medium">Verify</button>
                    <button className="text-red-600 hover:text-red-900 text-xs font-medium">Revoke</button>
                </div>
            )
        }
    ]

    const filteredCertificates = certificates.filter(c =>
        (c.user_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.event_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.unique_hash || '').toLowerCase().includes(searchQuery.toLowerCase())
    )

    return (
        <div className="space-y-6">
            <div className="sm:flex sm:items-center sm:justify-between">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight text-gray-900">Certificates</h2>
                    <p className="mt-1 text-sm text-gray-500">Manage and verify issued event certificates.</p>
                </div>
                <div className="mt-4 sm:ml-16 sm:mt-0 sm:flex-none">
                    <button
                        onClick={handleGenerate}
                        className="block rounded-md bg-indigo-600 px-3 py-2 text-center text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
                    >
                        <Plus className="inline-block w-4 h-4 mr-1" />
                        Generate Certificates
                    </button>
                </div>
            </div>

            <SmartTable
                columns={columns}
                data={filteredCertificates}
                loading={loading}
                searchable={true}
                onSearchChange={setSearchQuery}
                emptyMessage="No certificates issued yet."
            />
        </div>
    )
}
