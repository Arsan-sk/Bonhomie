import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import AdminAnalytics from '../admin/AdminAnalytics'

export default function CoordinatorAnalytics() {
    const { user } = useAuth()
    const [assignedEventIds, setAssignedEventIds] = useState([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (user) fetchAssignedEvents()
    }, [user])

    const fetchAssignedEvents = async () => {
        try {
            const { data, error } = await supabase
                .from('event_assignments')
                .select('event_id')
                .eq('coordinator_id', user.id)

            if (!error && data) {
                setAssignedEventIds(data.map(a => a.event_id))
            }
        } catch (error) {
            console.error('Error fetching assigned events:', error)
        } finally {
            setLoading(false)
        }
    }

    if (loading) return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div></div>

    // Use AdminAnalytics component with coordinator's event filtering
    return <AdminAnalytics coordinatorFilter={assignedEventIds} />
}
