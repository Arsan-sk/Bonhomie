import { Link } from 'react-router-dom'
import { Calendar, MapPin, Clock } from 'lucide-react'
import { format } from 'date-fns'

export default function EventCard({ event, baseUrl = '/events' }) {
    return (
        <div className="flex flex-col overflow-hidden rounded-xl shadow-lg bg-white hover:shadow-2xl transition-all duration-300 hover:scale-[1.02] border border-gray-100">
            <div className="flex-shrink-0 relative overflow-hidden">
                <img
                    className="h-48 w-full object-cover transition-transform duration-300 hover:scale-105"
                    src={event.image_path || 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80'}
                    alt={event.name}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
            </div>
            <div className="flex flex-1 flex-col justify-between p-6">
                <div className="flex-1">
                    <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-indigo-600">
                            {event.category}
                        </p>
                        <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${event.subcategory === 'Individual'
                                ? 'bg-green-100 text-green-800 ring-1 ring-green-600/20'
                                : 'bg-purple-100 text-purple-800 ring-1 ring-purple-600/20'
                            }`}>
                            {event.subcategory}
                        </span>
                    </div>
                    <Link to={`${baseUrl}/${event.id}`} className="mt-2 block group">
                        <p className="text-xl font-bold text-gray-900 group-hover:text-indigo-600 transition-colors">{event.name}</p>
                        <p className="mt-3 text-base text-gray-600 line-clamp-3">{event.description}</p>
                    </Link>
                </div>
                <div className="mt-6 flex items-center">
                    <div className="flex-shrink-0">
                        <div className="flex space-x-4 text-sm text-gray-500">
                            <div className="flex items-center">
                                <Clock className="mr-1.5 h-4 w-4 flex-shrink-0 text-indigo-500" aria-hidden="true" />
                                {event.start_time ? event.start_time.slice(0, 5) : 'TBA'}
                            </div>
                            <div className="flex items-center">
                                <MapPin className="mr-1.5 h-4 w-4 flex-shrink-0 text-indigo-500" aria-hidden="true" />
                                {event.venue || 'TBA'}
                            </div>
                        </div>
                    </div>
                </div>
                <div className="mt-6">
                    <Link
                        to={`${baseUrl}/${event.id}`}
                        className="flex w-full items-center justify-center rounded-lg border border-transparent bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md hover:bg-indigo-700 hover:shadow-lg transition-all duration-200 hover:scale-105 active:scale-95"
                    >
                        View Details
                    </Link>
                </div>
            </div>
        </div>
    )
}
