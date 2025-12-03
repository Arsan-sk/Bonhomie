import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { Loader2, Calendar, MapPin, Clock, CheckCircle, AlertCircle } from 'lucide-react'
import { Link } from 'react-router-dom'
import { format } from 'date-fns'

export default function StudentDashboard() {
    const { user, profile } = useAuth()
    const [registrations, setRegistrations] = useState([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (user) {
            fetchRegistrations()
        }
    }, [user])

    const fetchRegistrations = async () => {
        try {
            const { data, error } = await supabase
                .from('registrations')
                .select(`
          *,
          event:events(*)
        `)
                .eq('profile_id', user.id)
                .order('registered_at', { ascending: false })

            if (error) throw error
            setRegistrations(data || [])
        } catch (error) {
            console.error('Error fetching registrations:', error)
        } finally {
            setLoading(false)
        }
    }

    if (loading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div>

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900">My Dashboard</h1>
                <p className="mt-2 text-gray-600">Welcome back, {profile?.full_name}</p>
            </div>

            <div className="bg-white shadow overflow-hidden sm:rounded-lg">
                <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
                    <h3 className="text-lg leading-6 font-medium text-gray-900">My Registrations</h3>
                    <Link to="/events" className="text-sm text-primary hover:text-blue-700 font-medium">
                        Browse Events &rarr;
                    </Link>
                </div>
                <div className="border-t border-gray-200">
                    {registrations.length > 0 ? (
                        <ul className="divide-y divide-gray-200">
                            {registrations.map((reg) => (
                                <li key={reg.id} className="px-4 py-4 sm:px-6 hover:bg-gray-50 transition-colors">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center">
                                            <div className="flex-shrink-0 h-16 w-16 rounded-md overflow-hidden">
                                                <img
                                                    className="h-full w-full object-cover"
                                                    src={reg.event.image_path || 'https://via.placeholder.com/150'}
                                                    alt={reg.event.name}
                                                />
                                            </div>
                                            <div className="ml-4">
                                                <Link to={`/events/${reg.event.id}`} className="text-lg font-medium text-primary hover:underline">
                                                    {reg.event.name}
                                                </Link>
                                                <div className="flex items-center text-sm text-gray-500 mt-1 space-x-4">
                                                    <span className="flex items-center">
                                                        <Calendar className="flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400" />
                                                        {reg.event.day}
                                                    </span>
                                                    <span className="flex items-center">
                                                        <Clock className="flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400" />
                                                        {reg.event.start_time?.slice(0, 5)}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex flex-col items-end">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${reg.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                                                    reg.status === 'rejected' ? 'bg-red-100 text-red-800' :
                                                        'bg-yellow-100 text-yellow-800'
                                                }`}>
                                                {reg.status.charAt(0).toUpperCase() + reg.status.slice(1)}
                                            </span>
                                            <span className="text-xs text-gray-400 mt-2">
                                                Registered on {format(new Date(reg.registered_at), 'MMM d, yyyy')}
                                            </span>
                                        </div>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <div className="text-center py-12">
                            <p className="text-gray-500">You haven't registered for any events yet.</p>
                            <Link to="/events" className="mt-4 inline-block text-primary font-medium hover:underline">
                                Explore Events
                            </Link>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
