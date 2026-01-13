import { Link } from 'react-router-dom'
import { Calendar, MapPin, Clock } from 'lucide-react'
import { format } from 'date-fns'

export default function EventCard({ event, baseUrl = '/events' }) {
    return (
        <div className="flex flex-col overflow-hidden rounded-lg shadow-lg bg-white hover:shadow-xl transition-shadow duration-300">
            <div className="flex-shrink-0">
                <img
                    className="h-48 w-full object-cover"
                    src={event.image_path || 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80'}
                    alt={event.name}
                />
            </div>
            <div className="flex flex-1 flex-col justify-between p-6">
                <div className="flex-1">
                    <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-primary">
                            {event.category}
                        </p>
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${event.subcategory === 'Individual' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                            }`}>
                            {event.subcategory}
                        </span>
                    </div>
                    <Link to={`${baseUrl}/${event.id}`} className="mt-2 block">
                        <p className="text-xl font-semibold text-gray-900">{event.name}</p>
                        <p className="mt-3 text-base text-gray-500 line-clamp-3">{event.description}</p>
                    </Link>
                </div>
                <div className="mt-6 flex items-center">
                    <div className="flex-shrink-0">
                        <div className="flex space-x-4 text-sm text-gray-500">
                            <div className="flex items-center">
                                <Clock className="mr-1.5 h-4 w-4 flex-shrink-0 text-gray-400" aria-hidden="true" />
                                {event.start_time ? event.start_time.slice(0, 5) : 'TBA'}
                            </div>
                            <div className="flex items-center">
                                <MapPin className="mr-1.5 h-4 w-4 flex-shrink-0 text-gray-400" aria-hidden="true" />
                                {event.venue || 'TBA'}
                            </div>
                        </div>
                    </div>
                </div>
                <div className="mt-6">
                    <Link
                        to={`${baseUrl}/${event.id}`}
                        className="flex w-full items-center justify-center rounded-md border border-transparent bg-primary px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700"
                    >
                        View Details
                    </Link>
                </div>
            </div>
        </div>
    )
}
