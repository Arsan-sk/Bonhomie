import { useState, useEffect } from 'react'
import { X, Save, Loader2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import EventDetailsSection from './sections/EventDetailsSection'
import CoverImageSection from './sections/CoverImageSection'
import PaymentModeSection from './sections/PaymentModeSection'
import DescriptionSection from './sections/DescriptionSection'
import RulesSection from './sections/RulesSection'

export default function EventForm({ isOpen, onClose, onSubmit, initialData = null, role = 'admin' }) {
    const [formData, setFormData] = useState({
        name: '',
        category: 'Technical',
        subcategory: 'Individual',
        day: 'Day 1',
        day_order: 1,
        event_date: '',
        time_hour: '10',
        time_minute: '00',
        time_period: 'AM',
        venue: '',
        min_team_size: 1,
        max_team_size: 1,
        fee: 0,
        image_path: '',
        image_url: '',
        payment_mode: 'hybrid',
        upi_id: '',
        qr_code_path: '',
        description: '',
        rules: ''
    })

    const [globalSettings, setGlobalSettings] = useState(null)
    const [saving, setSaving] = useState(false)

    useEffect(() => {
        fetchGlobalSettings()
    }, [])

    useEffect(() => {
        if (initialData) {
            // Parse existing time if editing
            const timeMatch = initialData.start_time?.match(/(\d{1,2}):(\d{2})/)
            let hour = '10', minute = '00', period = 'AM'

            if (timeMatch) {
                let h = parseInt(timeMatch[1])
                minute = timeMatch[2]
                period = h >= 12 ? 'PM' : 'AM'
                hour = h > 12 ? h - 12 : (h === 0 ? 12 : h)
            }

            setFormData({
                ...initialData,
                time_hour: hour.toString(),
                time_minute: minute,
                time_period: period,
                // Ensure both image fields are populated
                image_path: initialData.image_path || initialData.image_url || '',
                image_url: initialData.image_url || initialData.image_path || ''
            })
        }
    }, [initialData, isOpen])

    const fetchGlobalSettings = async () => {
        try {
            const { data } = await supabase
                .from('global_settings')
                .select('*')
                .single()

            if (data) {
                setGlobalSettings(data)
            }
        } catch (error) {
            console.error('Error fetching settings:', error)
        }
    }

    const convertTo24Hour = (hour, minute, period) => {
        let h = parseInt(hour)
        if (period === 'PM' && h !== 12) h += 12
        if (period === 'AM' && h === 12) h = 0
        return `${h.toString().padStart(2, '0')}:${minute}:00`
    }

    const handleSubmit = async (e) => {
        e.preventDefault()

        // Validation
        if (!formData.name?.trim()) {
            alert('Please enter an event name')
            return
        }

        if (formData.payment_mode === 'online' && !formData.upi_id) {
            alert('UPI ID is required for online payment mode')
            return
        }

        if ((formData.payment_mode === 'hybrid' || formData.payment_mode === 'online') && !formData.qr_code_path) {
            alert('QR Code is required for hybrid/online payment modes')
            return
        }

        setSaving(true)

        try {
            // Convert time to 24-hour format for database
            const start_time = convertTo24Hour(formData.time_hour, formData.time_minute, formData.time_period)

            // Prepare payload with correct schema field names
            const payload = {
                name: formData.name,
                category: formData.category,
                subcategory: formData.subcategory,
                day: formData.day,
                day_order: Number(formData.day_order),
                event_date: formData.event_date,
                start_time: start_time,
                venue: formData.venue || null,
                min_team_size: Number(formData.min_team_size),
                max_team_size: Number(formData.max_team_size),
                fee: Number(formData.fee),
                description: formData.description || null,
                rules: formData.rules || null,
                // Store in BOTH image fields for OR operator
                image_path: formData.image_path || formData.image_url || null,
                image_url: formData.image_url || formData.image_path || null,
                // Payment fields
                payment_mode: formData.payment_mode || null,
                upi_id: formData.upi_id || null,
                qr_code_path: formData.qr_code_path || null
            }

            // Remove undefined/empty optional fields
            Object.keys(payload).forEach(key => {
                if (payload[key] === undefined || payload[key] === '') {
                    payload[key] = null
                }
            })

            // WAIT for onSubmit to complete!
            await onSubmit(payload)

            // Only close modal after successful save
            onClose()
        } catch (error) {
            console.error('Form submission error:', error)
            alert('Failed to save event: ' + (error.message || 'Please try again.'))
        } finally {
            setSaving(false)
        }
    }

    if (!isOpen) return null

    const themeColors = role === 'admin'
        ? { primary: 'indigo', gradient: 'from-indigo-600 to-blue-600' }
        : { primary: 'purple', gradient: 'from-purple-600 to-indigo-600' }

    return (
        <div className="fixed inset-0 z-50 overflow-hidden" role="dialog">
            <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm" onClick={onClose} />

            <div className="absolute inset-y-0 right-0 w-full max-w-4xl bg-gray-50 shadow-2xl flex flex-col">
                {/* Header */}
                <div className={`px-8 py-6 bg-gradient-to-r ${themeColors.gradient} border-b border-${themeColors.primary}-500/30 flex justify-between items-center`}>
                    <div>
                        <h3 className="text-2xl font-bold text-white">
                            {initialData ? 'Edit Event' : 'Create New Event'}
                        </h3>
                        <p className="text-sm text-white/80 mt-1">
                            {initialData ? initialData.name : 'Fill in all event details across sections'}
                        </p>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-white/10 transition-colors">
                        <X className="h-6 w-6 text-white" />
                    </button>
                </div>

                {/* Form Sections */}
                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-8">
                    <div className="space-y-6 max-w-5xl mx-auto">
                        <EventDetailsSection
                            formData={formData}
                            setFormData={setFormData}
                            globalSettings={globalSettings}
                        />

                        <CoverImageSection
                            formData={formData}
                            setFormData={setFormData}
                        />

                        <PaymentModeSection
                            formData={formData}
                            setFormData={setFormData}
                        />

                        <DescriptionSection
                            formData={formData}
                            setFormData={setFormData}
                        />

                        <RulesSection
                            formData={formData}
                            setFormData={setFormData}
                        />
                    </div>
                </form>

                {/* Footer */}
                <div className="px-8 py-5 border-t border-gray-200 bg-white flex gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex-1 px-6 py-3 border-2 border-gray-300 rounded-xl hover:bg-gray-50 font-semibold text-gray-700 transition-all"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={saving || !formData.name}
                        className={`flex-1 px-6 py-3 bg-${themeColors.primary}-600 text-white rounded-xl hover:bg-${themeColors.primary}-700 font-semibold shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2`}
                    >
                        {saving ? (
                            <>
                                <Loader2 className="h-5 w-5 animate-spin" />
                                Saving...
                            </>
                        ) : (
                            <>
                                <Save className="h-5 w-5" />
                                {initialData ? 'Save Changes' : 'Create Event'}
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    )
}
