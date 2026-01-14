import { useState, useEffect } from 'react'
import { X, Upload } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import UnsplashPicker from '../dashboard/UnsplashPicker'
import { AdminInput, AdminSelect, AdminTextarea } from '../admin/ui/AdminForm'

export default function EventFormModal({ isOpen, onClose, onSubmit, initialData = null }) {
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        category: 'Technical',
        day_order: 1,
        date: '',
        start_time: '',
        venue: '',
        min_team_size: 1,
        max_team_size: 1,
        subcategory: 'Individual',
        registration_fee: 0,
        upi_id: '',
        image_path: '',
        payment_mode: 'hybrid',
        qr_code_path: '',
        rules: ''
    })
    const [coverImageUrl, setCoverImageUrl] = useState('')
    const [uploadingCover, setUploadingCover] = useState(false)

    const [globalSettings, setGlobalSettings] = useState(null)
    const [festDays, setFestDays] = useState([])
    const [uploadingQR, setUploadingQR] = useState(false)
    const [saving, setSaving] = useState(false)

    useEffect(() => {
        fetchGlobalSettings()
    }, [])

    useEffect(() => {
        if (initialData) {
            setFormData({ ...formData, ...initialData })
        } else {
            // Reset form
            setFormData({
                name: '',
                description: '',
                category: 'Technical',
                day_order: 1,
                date: '',
                start_time: '',
                venue: '',
                min_team_size: 1,
                max_team_size: 1,
                subcategory: 'Individual',
                registration_fee: 0,
                upi_id: '',
                image_path: '',
                payment_mode: 'hybrid',
                qr_code_path: '',
                rules: ''
            })
            setCoverImageUrl('')
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
                const days = []
                for (let i = 1; i <= data.fest_duration_days; i++) {
                    const dayDate = new Date(data.fest_start_date)
                    dayDate.setDate(dayDate.getDate() + (i - 1))
                    days.push({
                        number: i,
                        label: `Day ${i} (${dayDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })})`
                    })
                }
                setFestDays(days)
            }
        } catch (error) {
            console.error('Error fetching settings:', error)
            setFestDays([
                { number: 1, label: 'Day 1' },
                { number: 2, label: 'Day 2' },
                { number: 3, label: 'Day 3' }
            ])
        }
    }

    const handleCoverImageUpload = async (e) => {
        const file = e.target.files?.[0]
        if (!file) return

        if (file.size > 5 * 1024 * 1024) {
            alert('File size must be less than 5MB')
            return
        }

        setUploadingCover(true)
        try {
            const fileExt = file.name.split('.').pop()
            const fileName = `event-covers/${Date.now()}.${fileExt}`

            const { data, error } = await supabase.storage
                .from('event-assets')
                .upload(fileName, file)

            if (error) throw error

            const { data: { publicUrl } } = supabase.storage
                .from('event-assets')
                .getPublicUrl(fileName)

            setFormData({ ...formData, image_path: publicUrl })
            setCoverImageUrl(publicUrl)
        } catch (error) {
            console.error('Error uploading cover image:', error)
            alert('Failed to upload image. Please try again.')
        } finally {
            setUploadingCover(false)
        }
    }

    const handleDayChange = async (selectedDay) => {
        // Auto-fetch date from global_settings
        if (globalSettings) {
            const dayDate = new Date(globalSettings.fest_start_date)
            dayDate.setDate(dayDate.getDate() + (Number(selectedDay) - 1))
            const formattedDate = dayDate.toISOString().split('T')[0]
            setFormData({ ...formData, day_order: selectedDay, date: formattedDate })
        } else {
            setFormData({ ...formData, day_order: selectedDay })
        }
    }

    const handleQRUpload = async (e) => {
        const file = e.target.files[0]
        if (!file) return

        setUploadingQR(true)
        try {
            const filename = `qr-${Date.now()}-${file.name}`
            const { data, error } = await supabase.storage
                .from('event_images')
                .upload(filename, file)

            if (error) throw error

            const { data: urlData } = supabase.storage
                .from('event_images')
                .getPublicUrl(filename)

            setFormData({ ...formData, qr_code_path: urlData.publicUrl })
        } catch (error) {
            console.error('QR upload error:', error)
            alert('Failed to upload QR code')
        } finally {
            setUploadingQR(false)
        }
    }

    const handleSubmit = async (e) => {
        e.preventDefault()

        // Validate QR/UPI for hybrid/online modes
        if (formData.payment_mode === 'hybrid' || formData.payment_mode === 'online') {
            if (!formData.upi_id) {
                alert('UPI ID is required for hybrid/online payment modes')
                return
            }
            if (!formData.qr_code_path) {
                alert('QR code is required for hybrid/online payment modes')
                return
            }
        }

        setSaving(true)

        try {
            await onSubmit(formData)
            onClose()
        } catch (error) {
            console.error('Form submission error:', error)
        } finally {
            setSaving(false)
        }
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-50 overflow-hidden" role="dialog">
            <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm" onClick={onClose} />

            <div className="absolute inset-y-0 right-0 w-full max-w-2xl bg-white shadow-2xl flex flex-col">
                {/* Header - Purple Theme */}
                <div className="px-8 py-6 bg-gradient-to-r from-purple-600 to-indigo-600 border-b border-purple-500/30 flex justify-between items-center">
                    <div>
                        <h3 className="text-xl font-bold text-white">
                            {initialData ? 'Edit Event' : 'Create New Event'}
                        </h3>
                        <p className="text-sm text-purple-100 mt-1">
                            {initialData ? initialData.name : 'Fill in all event details'}
                        </p>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-white/10 transition-colors">
                        <X className="h-6 w-6 text-white" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-8 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Event Name */}
                        <div className="col-span-2">
                            <AdminInput
                                label="Event Name"
                                placeholder="e.g. Hackathon 2026"
                                value={formData.name}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                required
                            />
                        </div>

                        {/* Category */}
                        <div>
                            <AdminSelect
                                label="Category"
                                value={formData.category}
                                onChange={e => setFormData({ ...formData, category: e.target.value })}
                            >
                                <option>Technical</option>
                                <option>Cultural</option>
                                <option>Sports</option>
                                <option>Gaming</option>
                            </AdminSelect>
                        </div>

                        {/* Subcategory */}
                        <div>
                            <AdminSelect
                                label="Participation Type"
                                value={formData.subcategory}
                                onChange={e => setFormData({ ...formData, subcategory: e.target.value })}
                            >
                                <option value="Individual">Individual</option>
                                <option value="Group">Group/Team</option>
                            </AdminSelect>
                        </div>

                        {/* Day */}
                        <div>
                            <AdminSelect
                                label="Day"
                                value={formData.day_order}
                                onChange={e => handleDayChange(e.target.value)}
                            >
                                {festDays.map(day => (
                                    <option key={day.number} value={day.number}>
                                        {day.label}
                                    </option>
                                ))}
                            </AdminSelect>
                        </div>

                        {/* Start Time */}
                        <div>
                            <AdminInput
                                label="Start Time"
                                type="time"
                                value={formData.start_time}
                                onChange={e => setFormData({ ...formData, start_time: e.target.value })}
                            />
                        </div>

                        {/* Venue */}
                        <div className="col-span-2">
                            <AdminInput
                                label="Venue"
                                placeholder="Auditorium, Lab 1..."
                                value={formData.venue}
                                onChange={e => setFormData({ ...formData, venue: e.target.value })}
                            />
                        </div>

                        {/* Team Sizes */}
                        {formData.subcategory === 'Group' && (
                            <>
                                <div>
                                    <AdminInput
                                        label="Min Team Size"
                                        type="number"
                                        min="1"
                                        value={formData.min_team_size}
                                        onChange={e => setFormData({ ...formData, min_team_size: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <AdminInput
                                        label="Max Team Size"
                                        type="number"
                                        min="1"
                                        value={formData.max_team_size}
                                        onChange={e => setFormData({ ...formData, max_team_size: e.target.value })}
                                    />
                                </div>
                            </>
                        )}

                        {/* Cover Image - Upload or URL */}
                        <div className="col-span-2">
                            <label className="block text-xs font-semibold text-gray-500 uppercase mb-2">Cover Image</label>
                            <div className="space-y-4">
                                <div className="border-2 border-dashed border-gray-300 rounded-xl p-4">
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={handleCoverImageUpload}
                                        className="hidden"
                                        id="cover-upload-coord"
                                    />
                                    <label htmlFor="cover-upload-coord" className="cursor-pointer">
                                        <div className="flex flex-col items-center">
                                            <Upload className="h-8 w-8 text-gray-400 mb-2" />
                                            <p className="text-sm text-gray-600">Click to upload cover image</p>
                                            <p className="text-xs text-gray-400 mt-1">PNG, JPG up to 5MB</p>
                                        </div>
                                    </label>
                                    {uploadingCover && (
                                        <div className="flex items-center justify-center mt-2">
                                            <div className="h-5 w-5 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
                                            <span className="ml-2 text-sm text-gray-600">Uploading...</span>
                                        </div>
                                    )}
                                </div>

                                <div className="text-center text-gray-500 text-sm">OR</div>

                                <input
                                    type="url"
                                    value={coverImageUrl}
                                    onChange={(e) => {
                                        setCoverImageUrl(e.target.value)
                                        setFormData({ ...formData, image_path: e.target.value })
                                    }}
                                    placeholder="Paste image URL"
                                    className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200"
                                />

                                {(formData.image_path || coverImageUrl) && (
                                    <div className="mt-2">
                                        <img src={formData.image_path || coverImageUrl} alt="Preview" className="h-32 w-full object-cover rounded-lg" />
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Payment Mode */}
                        <div className="col-span-2">
                            <label className="block text-xs font-semibold text-gray-500 uppercase mb-2">
                                Payment Mode
                            </label>
                            <div className="grid grid-cols-3 gap-2">
                                {['cash', 'hybrid', 'online'].map(mode => (
                                    <button
                                        key={mode}
                                        type="button"
                                        onClick={() => setFormData({ ...formData, payment_mode: mode })}
                                        className={`px-4 py-2 rounded-lg text-sm font-medium transition ${formData.payment_mode === mode
                                            ? 'bg-purple-600 text-white'
                                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                            }`}
                                    >
                                        {mode === 'cash' && '💵 Cash Only'}
                                        {mode === 'hybrid' && '📱 Cash + Online'}
                                        {mode === 'online' && '🌐 Online Only'}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* UPI ID - Conditional */}
                        {(formData.payment_mode === 'hybrid' || formData.payment_mode === 'online') && (
                            <div className="col-span-2">
                                <AdminInput
                                    label={`UPI ID ${formData.payment_mode === 'online' ? '(Required)' : '(Optional)'}`}
                                    placeholder="example@oksbi"
                                    value={formData.upi_id}
                                    onChange={e => setFormData({ ...formData, upi_id: e.target.value })}
                                    required={formData.payment_mode === 'online'}
                                />
                            </div>
                        )}

                        {/* Description */}
                        <div className="col-span-2">
                            <AdminTextarea
                                label="Description"
                                rows={3}
                                placeholder="Brief event description..."
                                value={formData.description}
                                onChange={e => setFormData({ ...formData, description: e.target.value })}
                            />
                        </div>

                        {/* Rules */}
                        <div className="col-span-2">
                            <AdminTextarea
                                label="Rules & Guidelines"
                                rows={4}
                                placeholder="Enter rules (one per line)..."
                                value={formData.rules}
                                onChange={e => setFormData({ ...formData, rules: e.target.value })}
                            />
                        </div>
                    </div>
                </form>

                {/* Footer */}
                <div className="px-8 py-4 border-t border-gray-100 flex gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={saving || !formData.name}
                        className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                    >
                        {saving ? 'Saving...' : initialData ? 'Update Event' : 'Create Event'}
                    </button>
                </div>
            </div>
        </div>
    )
}
