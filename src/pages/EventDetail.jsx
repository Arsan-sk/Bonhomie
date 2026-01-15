import { useState, useEffect } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { Calendar, MapPin, Clock, Users, Trophy, User, CheckCircle, AlertCircle } from 'lucide-react'
import { format } from 'date-fns'
import { formatEventDate } from '../lib/dateUtils'

export default function EventDetail() {
    const { id } = useParams()
    const navigate = useNavigate()
    const location = useLocation()
    const { user } = useAuth()
    const [event, setEvent] = useState(null)
    const [loading, setLoading] = useState(true)
    const [registration, setRegistration] = useState(null)
    const [festSettings, setFestSettings] = useState(null)

    // Detect context
    const isStudentContext = location.pathname.startsWith('/student')
    const isCoordinatorContext = location.pathname.startsWith('/coordinator')

    useEffect(() => {
        fetchFestSettings()
        fetchEventDetails()
    }, [id, user])

    const fetchFestSettings = async () => {
        try {
            const { data } = await supabase
                .from('global_settings')
                .select('*')
                .single()
            setFestSettings(data)
        } catch (error) {
            console.error('Error fetching fest settings:', error)
        }
    }

    const fetchEventDetails = async () => {
        try {
            // Fetch event
            const { data: eventData, error: eventError } = await supabase
                .from('events')
                .select(`
          *,
          winner:profiles!winner_profile_id(full_name),
          runnerup:profiles!runnerup_profile_id(full_name)
        `)
                .eq('id', id)
                .single()

            if (eventError) throw eventError
            setEvent(eventData)

            // Fetch registration status if logged in
            if (user) {
                const { data: regData } = await supabase
                    .from('registrations')
                    .select('*')
                    .eq('event_id', id)
                    .eq('profile_id', user.id)
                    .maybeSingle()

                setRegistration(regData)
            }
        } catch (error) {
            console.error('Error fetching event details:', error)
        } finally {
            setLoading(false)
        }
    }

    if (loading) return <div className="p-8 text-center">Loading...</div>
    if (!event) return <div className="p-8 text-center">Event not found</div>

    const isRegistered = !!registration
    const isFull = event.capacity && event.registrations_count >= event.capacity // Note: Need to implement count logic or fetch separate count
    // For now assuming capacity check is server side or we ignore count for prototype

    return (
        <div className="bg-white min-h-screen pb-12">
            {/* Hero Image - Enhanced */}
            <div className="relative h-64 sm:h-80 lg:h-96 w-full overflow-hidden">
                <img
                    src={event.image_path || 'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80'}
                    alt={event.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                        e.target.src = 'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80'
                    }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent flex items-end">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full pb-8">
                        <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold shadow-lg ${event.category === 'Cultural' ? 'bg-purple-100 text-purple-800 ring-1 ring-purple-600/20' :
                            event.category === 'Technical' ? 'bg-indigo-100 text-indigo-800 ring-1 ring-indigo-600/20' :
                                'bg-green-100 text-green-800 ring-1 ring-green-600/20'
                            }`}>
                            {event.category}
                        </span>
                        <h1 className="mt-3 text-4xl font-bold text-white sm:text-5xl drop-shadow-lg">{event.name}</h1>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Main Content */}
                    <div className="lg:col-span-2 space-y-8">
                        <section>
                            <h2 className="text-2xl font-bold text-gray-900">Description</h2>
                            <p className="mt-4 text-gray-600 leading-relaxed">{event.description}</p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold text-gray-900">Rules & Regulations</h2>
                            <ul className="mt-4 list-disc list-inside text-gray-600 space-y-2">
                                {Array.isArray(event.rules) ? event.rules.map((rule, idx) => (
                                    <li key={idx}>{typeof rule === 'string' ? rule : JSON.stringify(rule)}</li>
                                )) : <li>See event details for rules.</li>}
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold text-gray-900">Coordinators</h2>
                            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <h3 className="font-semibold text-gray-900">Faculty Coordinators</h3>
                                    <ul className="mt-2 text-gray-600">
                                        {Array.isArray(event.faculty_coordinators) && event.faculty_coordinators.map((c, i) => (
                                            <li key={i}>{c.name} ({c.phone || 'N/A'})</li>
                                        ))}
                                    </ul>
                                </div>
                                <div>
                                    <h3 className="font-semibold text-gray-900">Student Coordinators</h3>
                                    <ul className="mt-2 text-gray-600">
                                        {Array.isArray(event.student_coordinators) && event.student_coordinators.map((c, i) => (
                                            <li key={i}>{c.name} ({c.phone || 'N/A'})</li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        </section>

                        {/* Winners Section (if event over) */}
                        {(event.winner || event.runnerup) && (
                            <section className="bg-yellow-50 p-6 rounded-lg border border-yellow-200">
                                <h2 className="text-2xl font-bold text-yellow-800 flex items-center">
                                    <Trophy className="mr-2 h-6 w-6" /> Winners
                                </h2>
                                <div className="mt-4 space-y-2">
                                    {event.winner && <p className="text-gray-800"><strong>Winner:</strong> {event.winner.full_name}</p>}
                                    {event.runnerup && <p className="text-gray-800"><strong>Runner Up:</strong> {event.runnerup.full_name}</p>}
                                </div>
                            </section>
                        )}
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-6">
                        <div className="bg-gray-50 p-6 rounded-lg border border-gray-200 shadow-sm">
                            <h3 className="text-lg font-semibold text-gray-900 mb-4">Event Details</h3>
                            <div className="space-y-3">
                                <div className="flex items-center text-gray-700">
                                    <Calendar className="h-5 w-5 mr-3 text-gray-400" />
                                    <div>
                                        <p className="font-medium text-gray-900">Day {event.day_order || 1}</p>
                                        <p className="text-sm text-gray-500">
                                            {festSettings && event.day_order
                                                ? formatEventDate(event.day_order, festSettings.fest_start_date)
                                                : event.date || 'Date TBA'
                                            }
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-start">
                                    <Clock className="h-5 w-5 text-gray-400 mt-0.5 mr-3" />
                                    <div>
                                        <p className="font-medium text-gray-900">{event.start_time ? event.start_time.slice(0, 5) : 'TBA'} - {event.end_time ? event.end_time.slice(0, 5) : 'TBA'}</p>
                                    </div>
                                </div>
                                <div className="flex items-start">
                                    <MapPin className="h-5 w-5 text-gray-400 mt-0.5 mr-3" />
                                    <div>
                                        <p className="font-medium text-gray-900">{event.venue}</p>
                                        <p className="text-sm text-gray-500">{event.venue_details}</p>
                                    </div>
                                </div>
                                <div className="flex items-start">
                                    <Users className="h-5 w-5 text-gray-400 mt-0.5 mr-3" />
                                    <div>
                                        <p className="font-medium text-gray-900">{event.subcategory}</p>
                                        <p className="text-sm text-gray-500">
                                            {event.subcategory === 'Group' ? `Team: ${event.min_team_size}-${event.max_team_size} members` : 'Individual Participation'}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-start">
                                    <div className="font-bold text-2xl text-indigo-600 ml-8">
                                        ₹{event.fee}
                                    </div>
                                </div>
                            </div>

                            <div className="mt-8">
                                {isRegistered ? (
                                    <div className={`w-full flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-base font-medium text-white ${registration.status === 'confirmed' ? 'bg-green-600' :
                                        registration.status === 'rejected' ? 'bg-red-600' : 'bg-yellow-500'
                                        }`}>
                                        {registration.status === 'confirmed' && <CheckCircle className="mr-2 h-5 w-5" />}
                                        {registration.status === 'pending' && <Clock className="mr-2 h-5 w-5" />}
                                        {registration.status === 'rejected' && <AlertCircle className="mr-2 h-5 w-5" />}
                                        {registration.status.charAt(0).toUpperCase() + registration.status.slice(1)}
                                    </div>
                                ) : user ? (
                                    <button
                                        onClick={() => {
                                            if (isStudentContext) {
                                                navigate(`/student/events/${id}/register`)
                                            } else if (isCoordinatorContext) {
                                                navigate(`/coordinator/browse-events/${id}/register`)
                                            } else {
                                                navigate(`/events/${id}/register`)
                                            }
                                        }}
                                        disabled={!event.is_active}
                                        className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-md text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-400 disabled:cursor-not-allowed transition-all duration-200 hover:scale-105 active:scale-95"
                                    >
                                        {event.is_active ? 'Register Now' : 'Registration Closed'}
                                    </button>
                                ) : (
                                    <button
                                        onClick={() => navigate('/login')}
                                        className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-gray-600 hover:bg-gray-700 focus:outline-none"
                                    >
                                        Login to Register
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

        </div>
    )
}
