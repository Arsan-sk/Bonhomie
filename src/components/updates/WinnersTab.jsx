import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { Trophy, Award, Medal, Filter, Search, Calendar, User, GraduationCap, Users } from 'lucide-react'
import { format } from 'date-fns'
import { getUnsplashImageUrl, getCategoryImage } from '../../utils/unsplashHelper'
import SimpleCardFallback from '../ui/SimpleCardFallback'

export default function WinnersTab() {
    const [recentWinners, setRecentWinners] = useState([])
    const [allWinners, setAllWinners] = useState([])
    const [loading, setLoading] = useState(true)
    const [imageErrors, setImageErrors] = useState({})
    
    // Filters for All Winners
    const [searchTerm, setSearchTerm] = useState('')
    const [selectedDepartment, setSelectedDepartment] = useState('')
    const [selectedGender, setSelectedGender] = useState('')
    const [selectedCategory, setSelectedCategory] = useState('')
    const [selectedEventType, setSelectedEventType] = useState('') // 'individual', 'group', or ''
    const [departments, setDepartments] = useState([])
    
    useEffect(() => {
        fetchWinnersData()
    }, [])

    const fetchWinnersData = async () => {
        try {
            setLoading(true)
            
            // Fetch recent winners (top 5 most recent)
            const { data: recentData, error: recentError } = await supabase
                .from('events')
                .select(`
                    id,
                    name,
                    category,
                    subcategory,
                    image_path,
                    updated_at,
                    max_team_size,
                    winner:profiles!winner_profile_id(id, full_name, department, gender, roll_number),
                    runnerup:profiles!runnerup_profile_id(id, full_name, department, gender, roll_number),
                    second_runnerup:profiles!second_runnerup_profile_id(id, full_name, department, gender, roll_number)
                `)
                .not('winner_profile_id', 'is', null)
                .order('updated_at', { ascending: false })
                .limit(5)

            if (recentError) throw recentError

            // For each event, fetch team members from event_results if it's a group event
            const recentWithTeams = await Promise.all((recentData || []).map(async (event) => {
                if (event.max_team_size > 1) {
                    const { data: results } = await supabase
                        .from('event_results')
                        .select('position, team_members')
                        .eq('event_id', event.id)
                    
                    return { ...event, event_results: results || [] }
                }
                return event
            }))

            setRecentWinners(recentWithTeams)

            // Fetch all winners
            const { data: allData, error: allError } = await supabase
                .from('events')
                .select(`
                    id,
                    name,
                    category,
                    subcategory,
                    image_path,
                    updated_at,
                    max_team_size,
                    winner:profiles!winner_profile_id(id, full_name, department, gender, roll_number),
                    runnerup:profiles!runnerup_profile_id(id, full_name, department, gender, roll_number),
                    second_runnerup:profiles!second_runnerup_profile_id(id, full_name, department, gender, roll_number)
                `)
                .not('winner_profile_id', 'is', null)
                .order('updated_at', { ascending: false })

            if (allError) throw allError

            // For all events, fetch team members if group event
            const allWithTeams = await Promise.all((allData || []).map(async (event) => {
                if (event.max_team_size > 1) {
                    const { data: results } = await supabase
                        .from('event_results')
                        .select('position, team_members')
                        .eq('event_id', event.id)
                    
                    return { ...event, event_results: results || [] }
                }
                return event
            }))

            setAllWinners(allWithTeams)

            // Extract unique departments from all winners
            const depts = []
            allData?.forEach(event => {
                if (event.winner?.department) depts.push(event.winner.department)
                if (event.runnerup?.department) depts.push(event.runnerup.department)
                if (event.second_runnerup?.department) depts.push(event.second_runnerup.department)
            })
            const uniqueDepts = [...new Set(depts)].filter(Boolean).sort()
            setDepartments(uniqueDepts)
            
            console.log('Departments found:', uniqueDepts)
        } catch (error) {
            console.error('Error fetching winners:', error)
        } finally {
            setLoading(false)
        }
    }

    // Filter logic for all winners
    const filteredWinners = allWinners.filter(event => {
        const matchesSearch = event.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            event.winner?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            event.runnerup?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            event.second_runnerup?.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
        
        const matchesDepartment = !selectedDepartment || 
                                 event.winner?.department === selectedDepartment ||
                                 event.runnerup?.department === selectedDepartment ||
                                 event.second_runnerup?.department === selectedDepartment
        
        const matchesGender = !selectedGender ||
                             event.winner?.gender === selectedGender ||
                             event.runnerup?.gender === selectedGender ||
                             event.second_runnerup?.gender === selectedGender
        
        const matchesCategory = !selectedCategory || event.category === selectedCategory

        const matchesEventType = !selectedEventType ||
                                (selectedEventType === 'individual' && event.max_team_size === 1) ||
                                (selectedEventType === 'group' && event.max_team_size > 1)

        return matchesSearch && matchesDepartment && matchesGender && matchesCategory && matchesEventType
    })

    const WinnerCard = ({ event, position, profile, icon: Icon, medalColor, teamMembers }) => {
        if (!profile) return null

        const hasTeam = teamMembers && teamMembers.length > 0

        return (
            <div className="relative group">
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                    <div className={`shrink-0 w-10 h-10 rounded-full ${medalColor} flex items-center justify-center`}>
                        <Icon className="h-5 w-5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 truncate">
                            {profile.full_name}
                            {hasTeam && <span className="ml-1.5 text-xs text-gray-500">(Team Leader)</span>}
                        </p>
                        <div className="flex items-center gap-3 text-xs text-gray-600 mt-0.5">
                            <span className="flex items-center gap-1">
                                <GraduationCap className="h-3 w-3" />
                                {profile.department}
                            </span>
                            {profile.roll_number && (
                                <span>• {profile.roll_number}</span>
                            )}
                        </div>
                    </div>
                    <span className="text-xs font-medium text-gray-500">{position}</span>
                    {hasTeam && (
                        <span className="ml-2 px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-[10px] font-semibold">
                            {teamMembers.length + 1} members
                        </span>
                    )}
                </div>

                {/* Team Members Tooltip on Hover */}
                {hasTeam && (
                    <div className="absolute left-0 right-0 top-full mt-1 invisible opacity-0 group-hover:visible group-hover:opacity-100 transition-all duration-200 z-10">
                        <div className="bg-white border-2 border-purple-200 rounded-lg shadow-xl p-3">
                            <p className="text-xs font-semibold text-purple-700 mb-2 flex items-center gap-1">
                                <Users className="h-3 w-3" />
                                Team Members:
                            </p>
                            <div className="space-y-1.5 max-h-32 overflow-y-auto">
                                {teamMembers.map((member, idx) => (
                                    <div key={idx} className="flex items-center gap-2 text-xs text-gray-700 bg-purple-50 px-2 py-1 rounded">
                                        <span className="font-medium">{member.full_name}</span>
                                        {member.roll_number && <span className="text-gray-500">• {member.roll_number}</span>}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        )
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
            </div>
        )
    }

    return (
        <div className="space-y-8">
            {/* Recent Winners Section */}
            <div>
                <div className="mb-6">
                    <h2 className="text-2xl font-bold text-gray-900 mb-2 flex items-center">
                        <Trophy className="h-6 w-6 mr-2 text-yellow-500" />
                        Recent Winners
                    </h2>
                    <p className="text-gray-600">Latest champions and achievers</p>
                </div>

                {recentWinners.length === 0 ? (
                    <div className="text-center py-16 bg-white rounded-xl shadow-sm border border-gray-200">
                        <Award className="mx-auto h-16 w-16 text-gray-400 mb-4" />
                        <p className="text-gray-500">No winners announced yet</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {recentWinners.map((event) => (
                            <div key={event.id} className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden hover:shadow-xl transition-all duration-300">
                                {/* Event Header with Image */}
                                <div className="relative h-32">
                                    {!imageErrors[`winner-${event.id}`] ? (
                                        <img
                                            src={event.image_path || getUnsplashImageUrl(event.name, 400, 200)}
                                            alt={event.name}
                                            className="w-full h-full object-cover"
                                            onError={(e) => {
                                                const categoryImg = getCategoryImage(event.category)
                                                if (e.target.src !== categoryImg) {
                                                    e.target.src = categoryImg
                                                } else {
                                                    setImageErrors(prev => ({ ...prev, [`winner-${event.id}`]: true }))
                                                }
                                            }}
                                        />
                                    ) : (
                                        <SimpleCardFallback category={event.category} height="h-full" />
                                    )}
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                                    <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between">
                                        <div>
                                            <h3 className="text-white font-bold text-lg line-clamp-1">{event.name}</h3>
                                            <p className="text-white/90 text-sm flex items-center gap-1.5">
                                                <Calendar className="h-3.5 w-3.5" />
                                                {format(new Date(event.updated_at), 'MMM dd, yyyy')}
                                            </p>
                                        </div>
                                        <span className={`px-2 py-1 rounded-md text-[10px] font-bold ${
                                            event.max_team_size > 1 
                                                ? 'bg-purple-500 text-white' 
                                                : 'bg-blue-500 text-white'
                                        }`}>
                                            {event.max_team_size > 1 ? 'GROUP' : 'INDIVIDUAL'}
                                        </span>
                                    </div>
                                </div>

                                {/* Winners List */}
                                <div className="p-4 space-y-2">
                                    <WinnerCard 
                                        event={event} 
                                        position="1st Place" 
                                        profile={event.winner} 
                                        icon={Trophy}
                                        medalColor="bg-yellow-500"
                                        teamMembers={event.event_results?.find(r => r.position === 1)?.team_members || []}
                                    />
                                    <WinnerCard 
                                        event={event} 
                                        position="2nd Place" 
                                        profile={event.runnerup} 
                                        icon={Medal}
                                        medalColor="bg-gray-400"
                                        teamMembers={event.event_results?.find(r => r.position === 2)?.team_members || []}
                                    />
                                    <WinnerCard 
                                        event={event} 
                                        position="3rd Place" 
                                        profile={event.second_runnerup} 
                                        icon={Award}
                                        medalColor="bg-amber-700"
                                        teamMembers={event.event_results?.find(r => r.position === 3)?.team_members || []}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* All Winners Section with Filters */}
            <div>
                <div className="mb-6">
                    <h2 className="text-2xl font-bold text-gray-900 mb-2 flex items-center">
                        <Award className="h-6 w-6 mr-2 text-purple-600" />
                        All Winners
                    </h2>
                    <p className="text-gray-600">Browse and filter winners by various criteria</p>
                </div>

                {/* Filters Section */}
                <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6 mb-6">
                    <div className="flex items-center gap-2 mb-4">
                        <Filter className="h-5 w-5 text-purple-600" />
                        <h3 className="font-semibold text-gray-900">Filters</h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                        {/* Search */}
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search event or winner..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                            />
                        </div>

                        {/* Event Type Filter */}
                        <select
                            value={selectedEventType}
                            onChange={(e) => setSelectedEventType(e.target.value)}
                            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        >
                            <option value="">All Event Types</option>
                            <option value="individual">Individual</option>
                            <option value="group">Group</option>
                        </select>

                        {/* Department Filter */}
                        <select
                            value={selectedDepartment}
                            onChange={(e) => setSelectedDepartment(e.target.value)}
                            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        >
                            <option value="">All Departments</option>
                            {departments.map(dept => (
                                <option key={dept} value={dept}>{dept}</option>
                            ))}
                        </select>

                        {/* Gender Filter */}
                        <select
                            value={selectedGender}
                            onChange={(e) => setSelectedGender(e.target.value)}
                            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        >
                            <option value="">All Genders</option>
                            <option value="Male">Male</option>
                            <option value="Female">Female</option>
                            <option value="Other">Other</option>
                        </select>

                        {/* Category Filter */}
                        <select
                            value={selectedCategory}
                            onChange={(e) => setSelectedCategory(e.target.value)}
                            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        >
                            <option value="">All Categories</option>
                            <option value="Cultural">Cultural</option>
                            <option value="Technical">Technical</option>
                            <option value="Sports">Sports</option>
                        </select>
                    </div>

                    {/* Active Filters Display */}
                    {(searchTerm || selectedEventType || selectedDepartment || selectedGender || selectedCategory) && (
                        <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-gray-200">
                            <span className="text-sm font-medium text-gray-600">Active filters:</span>
                            {searchTerm && (
                                <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm flex items-center gap-1">
                                    Search: "{searchTerm}"
                                    <button onClick={() => setSearchTerm('')} className="hover:text-purple-900">×</button>
                                </span>
                            )}
                            {selectedEventType && (
                                <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm flex items-center gap-1">
                                    {selectedEventType === 'individual' ? 'Individual' : 'Group'}
                                    <button onClick={() => setSelectedEventType('')} className="hover:text-purple-900">×</button>
                                </span>
                            )}
                            {selectedDepartment && (
                                <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm flex items-center gap-1">
                                    {selectedDepartment}
                                    <button onClick={() => setSelectedDepartment('')} className="hover:text-purple-900">×</button>
                                </span>
                            )}
                            {selectedGender && (
                                <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm flex items-center gap-1">
                                    {selectedGender}
                                    <button onClick={() => setSelectedGender('')} className="hover:text-purple-900">×</button>
                                </span>
                            )}
                            {selectedCategory && (
                                <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm flex items-center gap-1">
                                    {selectedCategory}
                                    <button onClick={() => setSelectedCategory('')} className="hover:text-purple-900">×</button>
                                </span>
                            )}
                            <button
                                onClick={() => {
                                    setSearchTerm('')
                                    setSelectedEventType('')
                                    setSelectedDepartment('')
                                    setSelectedGender('')
                                    setSelectedCategory('')
                                }}
                                className="px-3 py-1 text-sm text-purple-600 hover:text-purple-700 font-medium"
                            >
                                Clear all
                            </button>
                        </div>
                    )}
                </div>

                {/* All Winners List */}
                {filteredWinners.length === 0 ? (
                    <div className="text-center py-16 bg-white rounded-xl shadow-sm border border-gray-200">
                        <Award className="mx-auto h-16 w-16 text-gray-400 mb-4" />
                        <p className="text-gray-500">No winners found matching your filters</p>
                        <button
                            onClick={() => {
                                setSearchTerm('')
                                setSelectedDepartment('')
                                setSelectedGender('')
                                setSelectedCategory('')
                            }}
                            className="mt-4 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                        >
                            Clear Filters
                        </button>
                    </div>
                ) : (
                    <div>
                        <div className="flex items-center justify-between mb-4">
                            <p className="text-sm text-gray-600">
                                Showing <span className="font-semibold">{filteredWinners.length}</span> {filteredWinners.length === 1 ? 'event' : 'events'}
                            </p>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            {filteredWinners.map((event) => (
                                <div key={event.id} className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden hover:shadow-xl transition-all duration-300">
                                    {/* Event Header with Image */}
                                    <div className="relative h-28">
                                        {!imageErrors[`all-${event.id}`] ? (
                                            <img
                                                src={event.image_path || getUnsplashImageUrl(event.name, 400, 200)}
                                                alt={event.name}
                                                className="w-full h-full object-cover"
                                                onError={(e) => {
                                                    const categoryImg = getCategoryImage(event.category)
                                                    if (e.target.src !== categoryImg) {
                                                        e.target.src = categoryImg
                                                    } else {
                                                        setImageErrors(prev => ({ ...prev, [`all-${event.id}`]: true }))
                                                    }
                                                }}
                                            />
                                        ) : (
                                            <SimpleCardFallback category={event.category} height="h-full" />
                                        )}
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                                        <div className="absolute bottom-2 left-3 right-3 flex items-end justify-between">
                                            <div>
                                                <h3 className="text-white font-bold text-base line-clamp-1">{event.name}</h3>
                                                <div className="flex items-center gap-2 text-white/90 text-xs mt-0.5">
                                                    <span className={`px-2 py-0.5 rounded-full ${
                                                        event.category === 'Cultural' ? 'bg-purple-500/80' :
                                                        event.category === 'Technical' ? 'bg-blue-500/80' :
                                                        'bg-green-500/80'
                                                    }`}>
                                                        {event.category}
                                                    </span>
                                                    <span className="flex items-center gap-1">
                                                        <Calendar className="h-3 w-3" />
                                                        {format(new Date(event.updated_at), 'MMM dd, yyyy')}
                                                    </span>
                                                </div>
                                            </div>
                                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                                                event.max_team_size > 1 
                                                    ? 'bg-purple-500 text-white' 
                                                    : 'bg-blue-500 text-white'
                                            }`}>
                                                {event.max_team_size > 1 ? 'GRP' : 'IND'}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Winners List */}
                                    <div className="p-3 space-y-2">
                                        <WinnerCard 
                                            event={event} 
                                            position="1st" 
                                            profile={event.winner} 
                                            icon={Trophy}
                                            medalColor="bg-yellow-500"
                                            teamMembers={event.event_results?.find(r => r.position === 1)?.team_members || []}
                                        />
                                        <WinnerCard 
                                            event={event} 
                                            position="2nd" 
                                            profile={event.runnerup} 
                                            icon={Medal}
                                            medalColor="bg-gray-400"
                                            teamMembers={event.event_results?.find(r => r.position === 2)?.team_members || []}
                                        />
                                        <WinnerCard 
                                            event={event} 
                                            position="3rd" 
                                            profile={event.second_runnerup} 
                                            icon={Award}
                                            medalColor="bg-amber-700"
                                            teamMembers={event.event_results?.find(r => r.position === 3)?.team_members || []}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
