import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import EventCard from '../components/events/EventCard'
import { Loader2, Search, Filter } from 'lucide-react'
import clsx from 'clsx'

const CATEGORIES = ['All', 'Cultural', 'Technical', 'Sports']
const SUBCATEGORIES = ['All', 'Individual', 'Group']

export default function Events() {
    const [selectedCategory, setSelectedCategory] = useState('All')
    const [selectedSubcategory, setSelectedSubcategory] = useState('All')
    const [events, setEvents] = useState([])
    const [loading, setLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState('')
    const [festSettings, setFestSettings] = useState(null)

    useEffect(() => {
        fetchFestSettings()
        fetchEvents()
    }, [])

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

    const fetchEvents = async () => {
        try {
            const { data, error } = await supabase
                .from('events')
                .select('*')
                .order('day_number', { ascending: true })
                .order('start_time', { ascending: true })

            if (error) throw error
            setEvents(data || [])
        } catch (error) {
            console.error('Error fetching events:', error)
        } finally {
            setLoading(false)
        }
    }

    const filteredEvents = events.filter(event => {
        const matchesCategory = selectedCategory === 'All' || event.category === selectedCategory
        const matchesSubcategory = selectedSubcategory === 'All' || event.subcategory === selectedSubcategory
        const matchesSearch = event.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            event.description?.toLowerCase().includes(searchQuery.toLowerCase())
        return matchesCategory && matchesSubcategory && matchesSearch
    })

    return (
        <div className="bg-gray-50 min-h-screen py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-7xl mx-auto">
                <div className="text-center">
                    <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">Event Schedule</h2>
                    <p className="mt-4 text-lg text-gray-500">
                        Explore the exciting lineup of events for {festSettings?.fest_name || 'Bonhomie'}.
                    </p>
                </div>

                {/* Search and Filter Controls */}
                <div className="mt-8 flex flex-col md:flex-row justify-between items-center gap-4">
                    {/* Search */}
                    <div className="relative w-full md:w-96">
                        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                            <Search className="h-5 w-5 text-gray-400" aria-hidden="true" />
                        </div>
                        <input
                            type="text"
                            className="block w-full rounded-md border-0 py-1.5 pl-10 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-primary sm:text-sm sm:leading-6"
                            placeholder="Search events..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>

                    {/* Subcategory Filter */}
                    <div className="flex items-center space-x-2">
                        <Filter className="h-5 w-5 text-gray-400" />
                        <span className="text-sm text-gray-500">Type:</span>
                        <select
                            value={selectedSubcategory}
                            onChange={(e) => setSelectedSubcategory(e.target.value)}
                            className="block w-full rounded-md border-0 py-1.5 pl-3 pr-10 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-primary sm:text-sm sm:leading-6"
                        >
                            {SUBCATEGORIES.map((sub) => (
                                <option key={sub} value={sub}>{sub}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Category Tabs */}
                <div className="mt-8 border-b border-gray-200">
                    <nav className="-mb-px flex space-x-8 overflow-x-auto" aria-label="Tabs">
                        {CATEGORIES.map((category) => (
                            <button
                                key={category}
                                onClick={() => setSelectedCategory(category)}
                                className={clsx(
                                    selectedCategory === category
                                        ? 'border-primary text-primary'
                                        : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700',
                                    'whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium'
                                )}
                            >
                                {category}
                            </button>
                        ))}
                    </nav>
                </div>

                {/* Event Grid */}
                <div className="mt-12">
                    {loading ? (
                        <div className="flex justify-center">
                            <Loader2 className="h-12 w-12 animate-spin text-primary" />
                        </div>
                    ) : filteredEvents.length > 0 ? (
                        <div className="grid gap-8 mx-auto mt-8 sm:grid-cols-2 lg:grid-cols-3">
                            {filteredEvents.map((event) => (
                                <EventCard key={event.id} event={event} />
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-12">
                            <p className="text-gray-500 text-lg">
                                No events found for {selectedCategory} ({selectedSubcategory}).
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
