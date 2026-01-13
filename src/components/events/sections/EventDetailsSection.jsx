import { useState, useEffect } from 'react'
import { Calendar, Clock, MapPin, Users, DollarSign } from 'lucide-react'

export default function EventDetailsSection({ formData, setFormData, globalSettings }) {
    const [festDays, setFestDays] = useState([])

    useEffect(() => {
        if (globalSettings) {
            const days = []
            for (let i = 1; i <= globalSettings.fest_duration_days; i++) {
                const dayDate = new Date(globalSettings.fest_start_date)
                dayDate.setDate(dayDate.getDate() + (i - 1))
                days.push({
                    number: i,
                    label: `Day ${i}`,
                    date: dayDate.toISOString().split('T')[0]
                })
            }
            setFestDays(days)
        }
    }, [globalSettings])

    const handleDayChange = (dayNumber) => {
        const selectedDay = festDays.find(d => d.number === Number(dayNumber))
        if (selectedDay) {
            setFormData({
                ...formData,
                day: selectedDay.label,
                day_order: selectedDay.number,
                event_date: selectedDay.date
            })
        }
    }

    const handleParticipationChange = (type) => {
        setFormData({
            ...formData,
            subcategory: type,
            min_team_size: type === 'Individual' ? 1 : (formData.min_team_size || 2),
            max_team_size: type === 'Individual' ? 1 : (formData.max_team_size || 5)
        })
    }

    const handleTimeChange = (field, value) => {
        setFormData({
            ...formData,
            [field]: value
        })
    }

    // Generate hour/minute options
    const hours = Array.from({ length: 12 }, (_, i) => i + 1)
    const minutes = Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0'))

    return (
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-indigo-50 rounded-lg">
                    <Calendar className="h-5 w-5 text-indigo-600" />
                </div>
                <div>
                    <h3 className="text-lg font-bold text-gray-900">Event Details</h3>
                    <p className="text-sm text-gray-500">Basic information about your event</p>
                </div>
            </div>

            <div className="space-y-5">
                {/* Event Name */}
                <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Event Name <span className="text-red-500">*</span>
                    </label>
                    <input
                        type="text"
                        value={formData.name || ''}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="e.g., Hackathon 2026"
                        className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                        required
                    />
                </div>

                {/* Category & Participation Type */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Category <span className="text-red-500">*</span>
                        </label>
                        <select
                            value={formData.category || 'Technical'}
                            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                            className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                        >
                            <option value="Technical">Technical</option>
                            <option value="Cultural">Cultural</option>
                            <option value="Sports">Sports</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Participation Type <span className="text-red-500">*</span>
                        </label>
                        <select
                            value={formData.subcategory || 'Individual'}
                            onChange={(e) => handleParticipationChange(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                        >
                            <option value="Individual">Individual</option>
                            <option value="Group">Group / Team</option>
                        </select>
                    </div>
                </div>

                {/* Day Selection */}
                <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Festival Day <span className="text-red-500">*</span>
                    </label>
                    <select
                        value={formData.day_order || 1}
                        onChange={(e) => handleDayChange(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                    >
                        {festDays.map(day => (
                            <option key={day.number} value={day.number}>
                                {day.label} ({new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })})
                            </option>
                        ))}
                    </select>
                    {formData.event_date && (
                        <p className="text-xs text-gray-500 mt-1">
                            Date: {new Date(formData.event_date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                        </p>
                    )}
                </div>

                {/* Time Selection */}
                <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Start Time <span className="text-red-500">*</span>
                    </label>
                    <div className="grid grid-cols-3 gap-3">
                        <select
                            value={formData.time_hour || '10'}
                            onChange={(e) => handleTimeChange('time_hour', e.target.value)}
                            className="px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                        >
                            {hours.map(h => (
                                <option key={h} value={h}>{h}</option>
                            ))}
                        </select>
                        <select
                            value={formData.time_minute || '00'}
                            onChange={(e) => handleTimeChange('time_minute', e.target.value)}
                            className="px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                        >
                            {minutes.map(m => (
                                <option key={m} value={m}>{m}</option>
                            ))}
                        </select>
                        <select
                            value={formData.time_period || 'AM'}
                            onChange={(e) => handleTimeChange('time_period', e.target.value)}
                            className="px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                        >
                            <option value="AM">AM</option>
                            <option value="PM">PM</option>
                        </select>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                        Selected: {formData.time_hour || '10'}:{formData.time_minute || '00'} {formData.time_period || 'AM'}
                    </p>
                </div>

                {/* Venue */}
                <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Venue
                    </label>
                    <div className="relative">
                        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <input
                            type="text"
                            value={formData.venue || ''}
                            onChange={(e) => setFormData({ ...formData, venue: e.target.value })}
                            placeholder="e.g., Auditorium, Lab 1"
                            className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                        />
                    </div>
                </div>

                {/* Team Size - Only for Group Events */}
                {formData.subcategory === 'Group' && (
                    <div className="grid grid-cols-2 gap-4 p-4 bg-indigo-50 rounded-xl">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                Min Team Size
                            </label>
                            <div className="relative">
                                <Users className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                                <input
                                    type="number"
                                    min="2"
                                    value={formData.min_team_size || 2}
                                    onChange={(e) => setFormData({ ...formData, min_team_size: Number(e.target.value) })}
                                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                Max Team Size
                            </label>
                            <div className="relative">
                                <Users className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                                <input
                                    type="number"
                                    min={formData.min_team_size || 2}
                                    value={formData.max_team_size || 5}
                                    onChange={(e) => setFormData({ ...formData, max_team_size: Number(e.target.value) })}
                                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                                />
                            </div>
                        </div>
                    </div>
                )}

                {/* Registration Fee */}
                <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Registration Fee (₹)
                    </label>
                    <div className="relative">
                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <input
                            type="number"
                            min="0"
                            value={formData.fee || 0}
                            onChange={(e) => setFormData({ ...formData, fee: Number(e.target.value) })}
                            placeholder="0"
                            className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                        />
                    </div>
                </div>
            </div>
        </div>
    )
}
