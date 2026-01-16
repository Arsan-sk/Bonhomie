import { useState, useEffect } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { Calendar, MapPin, Clock, Users, Trophy, User, CheckCircle, AlertCircle } from 'lucide-react'
import { format } from 'date-fns'
import { formatEventDate, formatTime12Hour } from '../lib/dateUtils'

export default function EventDetail() {
    const { id } = useParams()
    const navigate = useNavigate()
    const location = useLocation()
    const { user } = useAuth()
    const [event, setEvent] = useState(null)
    const [loading, setLoading] = useState(true)
    const [registration, setRegistration] = useState(null)
    const [isRegistered, setIsRegistered] = useState(false)
    const [festSettings, setFestSettings] = useState(null)
    const [coordinators, setCoordinators] = useState([])
    const [selectedCoordinator, setSelectedCoordinator] = useState(null)
    const [showCoordinatorModal, setShowCoordinatorModal] = useState(false)
    const [registrationStats, setRegistrationStats] = useState({ total: 0, pending: 0, confirmed: 0, rejected: 0 })
    const [activeTab, setActiveTab] = useState('description')

    // Detect context
    const isStudentContext = location.pathname.startsWith('/student')
    const isCoordinatorContext = location.pathname.startsWith('/coordinator')

    useEffect(() => {
        fetchEvent()
        fetchFestSettings()
        fetchCoordinators()
        fetchRegistrationStats()
        if (user) {
            checkRegistration()
        }
    }, [id, user])

    const fetchFestSettings = async () => {
        try {
            const { data } = await supabase
                .from('global_settings')
                .select('*')
                .single()
            setFestSettings(data)
        } catch (error) {
            console.error('Error fetching settings:', error)
        }
    }

    const fetchCoordinators = async () => {
        try {
            console.log('Fetching coordinators for event:', id)

            const { data, error } = await supabase
                .from('event_assignments')
                .select(`*, coordinator:profiles (id, full_name, college_email, phone, roll_number, department, year_of_study)`)
                .eq('event_id', id)

            console.log('Coordinators query result:', { data, error })

            if (error) {
                console.error('Error fetching coordinators:', error)
                throw error
            }

            // Map the profiles from the nested structure  
            const coordinatorsList = data?.map(assignment => assignment.coordinator).filter(Boolean) || []
            console.log('Mapped coordinators:', coordinatorsList)

            setCoordinators(coordinatorsList)
        } catch (error) {
            console.error('Error fetching coordinators:', error)
            setCoordinators([])
        }
    }

    const fetchRegistrationStats = async () => {
        try {
            const { data, error } = await supabase
                .from('registrations')
                .select('status')
                .eq('event_id', id)

            if (error) throw error

            const stats = {
                total: data?.length || 0,
                pending: data?.filter(r => r.status === 'pending').length || 0,
                confirmed: data?.filter(r => r.status === 'confirmed').length || 0,
                rejected: data?.filter(r => r.status === 'rejected').length || 0
            }
            setRegistrationStats(stats)
        } catch (error) {
            console.error('Error fetching registration stats:', error)
        }
    }

    const fetchEvent = async () => {
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
        } catch (error) {
            console.error('Error fetching event details:', error)
        } finally {
            setLoading(false)
        }
    }

    const checkRegistration = async () => {
        if (!user) return

        try {
            const { data: regData } = await supabase
                .from('registrations')
                .select('*')
                .eq('event_id', id)
                .eq('profile_id', user.id)
                .maybeSingle()

            setRegistration(regData)
            setIsRegistered(!!regData)
        } catch (error) {
            console.error('Error checking registration status:', error)
        }
    }

    if (loading) return <div className="p-8 text-center">Loading...</div>
    if (!event) return <div className="p-8 text-center">Event not found</div>

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
                        {/* Description, Rules & Stats Section */}
                        <section className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                            {/* Tab Navigation */}
                            <div className="flex border-b border-gray-200">
                                <button
                                    onClick={() => setActiveTab('description')}
                                    className={`flex-1 px-6 py-4 text-sm font-semibold transition-colors ${activeTab === 'description'
                                        ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50'
                                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                                        }`}
                                >
                                    Description
                                </button>
                                <button
                                    onClick={() => setActiveTab('rules')}
                                    className={`flex-1 px-6 py-4 text-sm font-semibold transition-colors ${activeTab === 'rules'
                                        ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50'
                                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                                        }`}
                                >
                                    Rules & Regulations
                                </button>
                            </div>

                            {/* Tab Content */}
                            <div className="p-6">
                                {activeTab === 'description' && (
                                    <div className="space-y-6">
                                        <p className="text-gray-700 leading-relaxed">{event.description}</p>

                                        {/* Registration Stats */}
                                        <div>
                                            <h3 className="text-lg font-bold text-gray-900 mb-4">Registration Statistics</h3>
                                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                                <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200">
                                                    <div className="text-2xl font-bold text-blue-700">{registrationStats.total}</div>
                                                    <div className="text-xs font-medium text-blue-600 mt-1">Total</div>
                                                </div>
                                                <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-lg p-4 border border-yellow-200">
                                                    <div className="text-2xl font-bold text-yellow-700">{registrationStats.pending}</div>
                                                    <div className="text-xs font-medium text-yellow-600 mt-1">Pending</div>
                                                </div>
                                                <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 border border-green-200">
                                                    <div className="text-2xl font-bold text-green-700">{registrationStats.confirmed}</div>
                                                    <div className="text-xs font-medium text-green-600 mt-1">Confirmed</div>
                                                </div>
                                                <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-lg p-4 border border-red-200">
                                                    <div className="text-2xl font-bold text-red-700">{registrationStats.rejected}</div>
                                                    <div className="text-xs font-medium text-red-600 mt-1">Rejected</div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {activeTab === 'rules' && (
                                    <ul className="space-y-3">
                                        {Array.isArray(event.rules) ? event.rules.map((rule, idx) => (
                                            <li key={idx} className="flex items-start gap-3">
                                                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-semibold mt-0.5">{idx + 1}</span>
                                                <span className="text-gray-700 flex-1">{typeof rule === 'string' ? rule : JSON.stringify(rule)}</span>
                                            </li>
                                        )) : <li className="text-gray-500">No specific rules defined for this event.</li>}
                                    </ul>
                                )}
                            </div>
                        </section>

                        {/* Coordinators Section */}
                        <section className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
                            <h2 className="text-2xl font-bold text-gray-900 mb-6">Event Coordinators</h2>
                            {coordinators.length > 0 ? (
                                <div className="space-y-3">
                                    {coordinators.map((coord) => (
                                        <div
                                            key={coord.id}
                                            onClick={() => {
                                                setSelectedCoordinator(coord)
                                                setShowCoordinatorModal(true)
                                            }}
                                            className="flex items-center gap-4 p-4 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl border border-indigo-100 hover:border-indigo-300 hover:shadow-md transition-all cursor-pointer group"
                                        >
                                            <div className="flex-shrink-0">
                                                <div className="h-14 w-14 rounded-full bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center text-white font-bold text-lg shadow-md group-hover:scale-110 transition-transform">
                                                    {coord.full_name?.charAt(0).toUpperCase()}
                                                </div>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-base font-bold text-gray-900 truncate group-hover:text-indigo-700 transition-colors">{coord.full_name}</p>
                                                {coord.roll_number && (
                                                    <p className="text-sm text-indigo-600 font-medium truncate mt-1">{coord.roll_number}</p>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-8 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                                    <p className="text-gray-500">No coordinators assigned yet.</p>
                                </div>
                            )}
                        </section>
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
                                        <p className="font-medium text-gray-900">
                                            {event.start_time ? formatTime12Hour(event.start_time) : 'TBA'}
                                            {event.end_time && ` - ${formatTime12Hour(event.end_time)}`}
                                        </p>
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
                </div >
            </div >
            {/* Coordinator Profile Modal */}
            {showCoordinatorModal && selectedCoordinator && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => setShowCoordinatorModal(false)}>
                    <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
                        <div className="flex flex-col items-center">
                            <div className="h-24 w-24 rounded-full bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center text-white font-bold text-3xl shadow-lg mb-4">
                                {selectedCoordinator.full_name?.charAt(0).toUpperCase()}
                            </div>
                            <h3 className="text-2xl font-bold text-gray-900 mb-1">{selectedCoordinator.full_name}</h3>
                            {selectedCoordinator.roll_number && (
                                <p className="text-sm font-medium text-indigo-600 mb-4">{selectedCoordinator.roll_number}</p>
                            )}
                        </div>
                        <div className="space-y-3 mt-6">
                            <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                                <div className="text-gray-500 text-sm font-medium min-w-[80px]">Email:</div>
                                <div className="text-gray-900 text-sm flex-1 break-all">{selectedCoordinator.college_email}</div>
                            </div>
                            {selectedCoordinator.phone && (
                                <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                                    <div className="text-gray-500 text-sm font-medium min-w-[80px]">Phone:</div>
                                    <div className="text-gray-900 text-sm flex-1">{selectedCoordinator.phone}</div>
                                </div>
                            )}
                            {selectedCoordinator.department && (
                                <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                                    <div className="text-gray-500 text-sm font-medium min-w-[80px]">Department:</div>
                                    <div className="text-gray-900 text-sm flex-1">{selectedCoordinator.department}</div>
                                </div>
                            )}
                            {selectedCoordinator.year_of_study && (
                                <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                                    <div className="text-gray-500 text-sm font-medium min-w-[80px]">Year:</div>
                                    <div className="text-gray-900 text-sm flex-1">{selectedCoordinator.year_of_study}</div>
                                </div>
                            )}
                        </div>
                        <button
                            onClick={() => setShowCoordinatorModal(false)}
                            className="mt-6 w-full py-2.5 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition-colors"
                        >
                            Close
                        </button>
                    </div>
                </div>
            )}
        </div >
    )
}
