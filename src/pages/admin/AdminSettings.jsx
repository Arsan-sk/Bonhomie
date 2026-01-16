import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { Calendar, Save, Loader2, AlertCircle } from 'lucide-react'

export default function AdminSettings() {
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [settings, setSettings] = useState({
        fest_name: '',
        fest_start_date: '',
        fest_duration_days: 3
    })
    const [error, setError] = useState('')
    const [success, setSuccess] = useState('')

    useEffect(() => {
        fetchSettings()
    }, [])

    const fetchSettings = async () => {
        try {
            setLoading(true)
            const { data, error } = await supabase
                .from('global_settings')
                .select('*')
                .single()

            if (error) throw error

            if (data) {
                setSettings({
                    fest_name: data.fest_name,
                    fest_start_date: data.fest_start_date,
                    fest_duration_days: data.fest_duration_days
                })
            }
        } catch (error) {
            console.error('Error fetching settings:', error)
            setError('Failed to load settings')
        } finally {
            setLoading(false)
        }
    }

    const handleSave = async (e) => {
        e.preventDefault()
        setError('')
        setSuccess('')
        setSaving(true)

        try {
            const { error } = await supabase
                .from('global_settings')
                .upsert({
                    id: 1, // Singleton - always update row with id=1
                    fest_name: settings.fest_name,
                    fest_start_date: settings.fest_start_date,
                    fest_duration_days: parseInt(settings.fest_duration_days),
                    updated_at: new Date().toISOString()
                }, {
                    onConflict: 'id' // Specify conflict column
                })

            if (error) throw error

            setSuccess('Settings saved successfully!')
            setTimeout(() => setSuccess(''), 3000)
        } catch (error) {
            console.error('Error saving settings:', error)
            setError('Failed to save settings')
        } finally {
            setSaving(false)
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
            </div>
        )
    }

    return (
        <div className="max-w-4xl">
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-gray-900">Festival Settings</h1>
                <p className="mt-2 text-sm text-gray-600">
                    Configure global festival settings. Changes will affect all event dates dynamically.
                </p>
            </div>

            <div className="bg-white shadow-sm ring-1 ring-gray-900/5 sm:rounded-xl">
                <form onSubmit={handleSave} className="p-6 space-y-6">
                    {/* Fest Name */}
                    <div>
                        <label className="block text-sm font-medium text-gray-900 mb-2">
                            Festival Name
                        </label>
                        <input
                            type="text"
                            value={settings.fest_name}
                            onChange={(e) => setSettings({ ...settings, fest_name: e.target.value })}
                            required
                            className="block w-full rounded-md border-0 py-2 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm"
                            placeholder="e.g., Bonhomie 2026"
                        />
                    </div>

                    {/* Start Date */}
                    <div>
                        <label className="block text-sm font-medium text-gray-900 mb-2">
                            Festival Start Date
                        </label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Calendar className="h-5 w-5 text-gray-400" />
                            </div>
                            <input
                                type="date"
                                value={settings.fest_start_date}
                                onChange={(e) => setSettings({ ...settings, fest_start_date: e.target.value })}
                                required
                                className="block w-full rounded-md border-0 py-2 pl-10 pr-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm"
                            />
                        </div>
                        <p className="mt-1 text-xs text-gray-500">
                            This will be Day 1 of the festival
                        </p>
                    </div>

                    {/* Duration */}
                    <div>
                        <label className="block text-sm font-medium text-gray-900 mb-2">
                            Festival Duration (Days)
                        </label>
                        <input
                            type="number"
                            min="1"
                            max="10"
                            value={settings.fest_duration_days}
                            onChange={(e) => setSettings({ ...settings, fest_duration_days: e.target.value })}
                            required
                            className="block w-full rounded-md border-0 py-2 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm"
                        />
                        <p className="mt-1 text-xs text-gray-500">
                            Total number of days the festival will run (1-10 days)
                        </p>
                    </div>

                    {/* Preview */}
                    {settings.fest_start_date && settings.fest_duration_days && (
                        <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
                            <h3 className="text-sm font-medium text-indigo-900 mb-2">Preview</h3>
                            <div className="space-y-1 text-sm text-indigo-700">
                                {Array.from({ length: parseInt(settings.fest_duration_days) }, (_, i) => {
                                    const dayDate = new Date(settings.fest_start_date)
                                    dayDate.setDate(dayDate.getDate() + i)
                                    return (
                                        <div key={i} className="flex items-center gap-2">
                                            <span className="font-medium">Day {i + 1}:</span>
                                            <span>{dayDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</span>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    )}

                    {/* Error Message */}
                    {error && (
                        <div className="bg-red-50 border border-red-200 rounded-md p-3 flex items-start gap-2">
                            <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
                            <p className="text-sm text-red-700">{error}</p>
                        </div>
                    )}

                    {/* Success Message */}
                    {success && (
                        <div className="bg-green-50 border border-green-200 rounded-md p-3">
                            <p className="text-sm text-green-700">{success}</p>
                        </div>
                    )}

                    {/* Save Button */}
                    <div className="flex justify-end pt-4 border-t border-gray-200">
                        <button
                            type="submit"
                            disabled={saving}
                            className="inline-flex items-center gap-2 rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {saving ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Saving...
                                </>
                            ) : (
                                <>
                                    <Save className="h-4 w-4" />
                                    Save Settings
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
