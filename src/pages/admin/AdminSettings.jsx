import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { Save, Loader2, Settings, Calendar, Type } from 'lucide-react'

export default function AdminSettings() {
    const [config, setConfig] = useState({ name: '', dates: '', registration_enabled: false })
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)

    useEffect(() => { fetchSettings() }, [])

    const fetchSettings = async () => {
        try {
            const { data, error } = await supabase.from('settings').select('value').eq('key', 'fest_config').single()
            if (error && error.code !== 'PGRST116') throw error
            setConfig(data?.value || { name: 'Bonhomie 2026', dates: 'Feb 10-15', registration_enabled: true })
        } catch (error) { console.error(error) } finally { setLoading(false) }
    }

    const handleSave = async (e) => {
        e.preventDefault()
        setSaving(true)
        try {
            const { error } = await supabase.from('settings').upsert({ key: 'fest_config', value: config, updated_at: new Date() })
            if (error) throw error
            alert('Settings saved!')
        } catch (error) { alert('Failed to save.') } finally { setSaving(false) }
    }

    if (loading) return <div className="p-12 text-center"><Loader2 className="animate-spin h-8 w-8 text-indigo-600 mx-auto" /></div>

    return (
        <div className="max-w-3xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight text-gray-900">Global Settings</h2>
                    <p className="mt-1 text-sm text-gray-500">Manage platform-wide configurations.</p>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <form onSubmit={handleSave}>
                    <div className="p-6 space-y-8">
                        <div>
                            <h3 className="text-base font-semibold leading-7 text-gray-900 flex items-center gap-2">
                                <Settings className="h-5 w-5 text-indigo-500" />
                                General Configuration
                            </h3>
                            <p className="mt-1 text-sm leading-6 text-gray-500">Basic details displayed on the landing page and receipts.</p>

                            <div className="mt-6 grid grid-cols-1 gap-x-6 gap-y-6 sm:grid-cols-6">
                                <div className="sm:col-span-4">
                                    <label className="block text-sm font-medium leading-6 text-gray-900">Fest Name</label>
                                    <div className="relative mt-2 rounded-md shadow-sm">
                                        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                            <Type className="h-4 w-4 text-gray-400" />
                                        </div>
                                        <input
                                            type="text"
                                            value={config.name}
                                            onChange={e => setConfig({ ...config, name: e.target.value })}
                                            className="block w-full rounded-md border-0 py-1.5 pl-10 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                                        />
                                    </div>
                                </div>

                                <div className="sm:col-span-4">
                                    <label className="block text-sm font-medium leading-6 text-gray-900">Event Dates</label>
                                    <div className="relative mt-2 rounded-md shadow-sm">
                                        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                            <Calendar className="h-4 w-4 text-gray-400" />
                                        </div>
                                        <input
                                            type="text"
                                            value={config.dates}
                                            onChange={e => setConfig({ ...config, dates: e.target.value })}
                                            className="block w-full rounded-md border-0 py-1.5 pl-10 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="border-t border-gray-900/10 pt-8">
                            <h3 className="text-base font-semibold leading-7 text-gray-900">Access Control</h3>
                            <p className="mt-1 text-sm leading-6 text-gray-500">Control feature availability for users.</p>

                            <div className="mt-6 space-y-4">
                                <div className="relative flex items-start">
                                    <div className="flex h-6 items-center">
                                        <input
                                            id="registration"
                                            name="registration"
                                            type="checkbox"
                                            checked={config.registration_enabled}
                                            onChange={e => setConfig({ ...config, registration_enabled: e.target.checked })}
                                            className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600"
                                        />
                                    </div>
                                    <div className="ml-3 text-sm leading-6">
                                        <label htmlFor="registration" className="font-medium text-gray-900">Enable Student Registrations</label>
                                        <p className="text-gray-500">If disabled, students will see a 'Registration Closed' message on event pages.</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center justify-end gap-x-6 border-t border-gray-900/10 px-4 py-4 sm:px-8 bg-gray-50">
                        <button type="button" className="text-sm font-semibold leading-6 text-gray-900">Cancel</button>
                        <button
                            type="submit"
                            disabled={saving}
                            className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:opacity-50"
                        >
                            {saving ? <Loader2 className="animate-spin h-4 w-4 mr-1 inline" /> : <Save className="h-4 w-4 mr-1 inline" />}
                            Save Changes
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
