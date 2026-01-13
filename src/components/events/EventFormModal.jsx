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
        day_number: 1,
        start_time: '',
        end_time: '',
        venue: '',
        min_team_size: 1,
        max_team_size: 1,
        subcategory: 'Individual',
        registration_fee: 0,
        mode: 'offline',
        upi_id: '',
        image_url: '',
        payment_mode: 'hybrid',
        qr_code_path: '',
        rules: ''
    })

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
                day_number: 1,
                start_time: '',
                end_time: '',
                venue: '',
                min_team_size: 1,
                max_team_size: 1,
                subcategory: 'Individual',
                registration_fee: 0,
                mode: 'offline',
                upi_id: '',
                image_url: '',
                payment_mode: 'hybrid',
                qr_code_path: '',
                rules: ''
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
                {/* Header */}
                <div className="px-8 py-6 border-b border-gray-100 flex justify-between items-center">
                    <div>
                        <h3 className="text-xl font-bold text-gray-900">
                            {initialData ? 'Edit Event' : 'Create New Event'}
                        </h3>
                        <p className="text-sm text-gray-500 mt-1">
                            {initialData ? initialData.name : 'Fill in all event details'}
                        </p>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100">
                        <X className="h-6 w-6 text-gray-400" />
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
                                value={formData.day_number}
                                onChange={e => setFormData({ ...formData, day_number: e.target.value })}
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

                        {/* End Time */}
                        <div>
                            <AdminInput
                                label="End Time"
                                type="time"
                                value={formData.end_time}
                                onChange={e => setFormData({ ...formData, end_time: e.target.value })}
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

                        {/* Registration Fee */}
                        <div>
                            <AdminInput
                                label="Registration Fee (₹)"
                                type="number"
                                value={formData.registration_fee}
                                onChange={e => setFormData({ ...formData, registration_fee: e.target.value })}
                            />
                        </div>

                        {/* Mode */}
                        <div>
                            <AdminSelect
                                label="Mode"
                                value={formData.mode}
                                onChange={e => setFormData({ ...formData, mode: e.target.value })}
                            >
                                <option value="offline">Offline</option>
                                <option value="online">Online</option>
                                <option value="hybrid">Hybrid</option>
                            </AdminSelect>
                        </div>

                        {/* UPI ID - Only for hybrid/online */}
                        {(formData.payment_mode === 'hybrid' || formData.payment_mode === 'online') && (
                            <div className="col-span-2">
                                <AdminInput
                                    label="UPI ID (for payments)"
                                    placeholder="example@oksbi"
                                    value={formData.upi_id}
                                    onChange={e => setFormData({ ...formData, upi_id: e.target.value })}
                                    required
                                />
                            </div>
                        )}

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
                                            ? 'bg-indigo-600 text-white'
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

                        {/* QR Code Upload */}
                        {(formData.payment_mode === 'hybrid' || formData.payment_mode === 'online') && (
                            <div className="col-span-2">
                                <label className="block text-xs font-semibold text-gray-500 uppercase mb-2">
                                    Payment QR Code
                                </label>
                                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={handleQRUpload}
                                        className="hidden"
                                        id="qr-upload"
                                    />
                                    {formData.qr_code_path ? (
                                        <div className="flex items-center gap-4">
                                            <img
                                                src={formData.qr_code_path}
                                                alt="QR"
                                                className="h-32 w-32 object-contain border rounded"
                                            />
                                            <div>
                                                <p className="text-sm text-green-600 font-medium">QR Code uploaded</p>
                                                <button
                                                    type="button"
                                                    onClick={() => setFormData({ ...formData, qr_code_path: '' })}
                                                    className="text-xs text-red-600 hover:text-red-700 mt-1"
                                                >
                                                    Remove
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <label htmlFor="qr-upload" className="cursor-pointer">
                                            <div className="flex flex-col items-center">
                                                <Upload className="h-8 w-8 text-gray-400 mb-2" />
                                                <p className="text-sm text-gray-600">Click to upload QR code</p>
                                                <p className="text-xs text-gray-400 mt-1">PNG, JPG up to 5MB</p>
                                            </div>
                                        </label>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Cover Image */}
                        <div className="col-span-2">
                            <label className="block text-xs font-semibold text-gray-500 uppercase mb-2">
                                Cover Image
                            </label>
                            <UnsplashPicker onSelect={url => setFormData({ ...formData, image_url: url })} />
                        </div>

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
                        className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {saving ? 'Saving...' : initialData ? 'Update Event' : 'Create Event'}
                    </button>
                </div>
            </div>
        </div>
    )
}
