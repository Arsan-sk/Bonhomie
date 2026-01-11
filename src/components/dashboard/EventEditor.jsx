import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import UnsplashPicker from './UnsplashPicker'
import RoundManager from './RoundManager'
import { X, Save, Image, List, Loader2 } from 'lucide-react'

export default function EventEditor({ event, onClose, onUpdate }) {
    const [activeTab, setActiveTab] = useState('details')
    const [formData, setFormData] = useState({
        name: event.name || '',
        category: event.category || '',
        day: event.day || '',
        image_path: event.image_path || '', // Use image_path or add image_url logic
        image_url: event.image_url || '',
    })
    const [saving, setSaving] = useState(false)
    const [showUnsplash, setShowUnsplash] = useState(false)

    const handleSave = async () => {
        setSaving(true)
        try {
            const { error } = await supabase
                .from('events')
                .update({
                    name: formData.name,
                    category: formData.category,
                    day: formData.day,
                    image_url: formData.image_url,
                    image_path: formData.image_path // Keep sync if needed
                })
                .eq('id', event.id)

            if (error) throw error
            onUpdate()
            onClose()
        } catch (error) {
            console.error('Error updating event:', error)
            alert('Failed to update event')
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
            <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true" onClick={onClose}></div>

                <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

                <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full sm:p-6">
                    <div className="hidden sm:block absolute top-0 right-0 pt-4 pr-4">
                        <button
                            type="button"
                            className="bg-white rounded-md text-gray-400 hover:text-gray-500 focus:outline-none"
                            onClick={onClose}
                        >
                            <span className="sr-only">Close</span>
                            <X className="h-6 w-6" aria-hidden="true" />
                        </button>
                    </div>

                    <div className="sm:flex sm:items-start w-full">
                        <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                            <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-title">
                                Edit Event: {event.name}
                            </h3>

                            {/* Tabs */}
                            <div className="mt-4 border-b border-gray-200">
                                <nav className="-mb-px flex space-x-8">
                                    <button
                                        onClick={() => setActiveTab('details')}
                                        className={`${activeTab === 'details'
                                            ? 'border-primary text-primary'
                                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                            } whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm flex items-center`}
                                    >
                                        <List className="h-4 w-4 mr-2" />
                                        Details & Image
                                    </button>
                                    <button
                                        onClick={() => setActiveTab('rounds')}
                                        className={`${activeTab === 'rounds'
                                            ? 'border-primary text-primary'
                                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                            } whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm flex items-center`}
                                    >
                                        <i className="h-4 w-4 mr-2">🏆</i>
                                        Rounds
                                    </button>
                                </nav>
                            </div>

                            <div className="mt-6">
                                {activeTab === 'details' && (
                                    <div className="space-y-6">
                                        <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
                                            <div className="sm:col-span-4">
                                                <label className="block text-sm font-medium text-gray-700">Event Name</label>
                                                <input
                                                    type="text"
                                                    value={formData.name}
                                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                                    className="mt-1 flex-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm border p-2"
                                                />
                                            </div>

                                            <div className="sm:col-span-3">
                                                <label className="block text-sm font-medium text-gray-700">Category</label>
                                                <select
                                                    value={formData.category}
                                                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm border p-2"
                                                >
                                                    <option value="Technical">Technical</option>
                                                    <option value="Cultural">Cultural</option>
                                                    <option value="Sports">Sports</option>
                                                    <option value="Workshop">Workshop</option>
                                                </select>
                                            </div>

                                            <div className="sm:col-span-3">
                                                <label className="block text-sm font-medium text-gray-700">Day</label>
                                                <select
                                                    value={formData.day}
                                                    onChange={(e) => setFormData({ ...formData, day: e.target.value })}
                                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm border p-2"
                                                >
                                                    <option value="Day 1">Day 1</option>
                                                    <option value="Day 2">Day 2</option>
                                                    <option value="Day 3">Day 3</option>
                                                    <option value="Day 4">Day 4</option>
                                                    <option value="Day 5">Day 5</option>
                                                    <option value="Day 6">Day 6</option>
                                                </select>
                                            </div>

                                            <div className="sm:col-span-6">
                                                <label className="block text-sm font-medium text-gray-700">Cover Image URL</label>
                                                <div className="mt-1 flex rounded-md shadow-sm">
                                                    <input
                                                        type="text"
                                                        value={formData.image_url}
                                                        onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                                                        placeholder="https://..."
                                                        className="flex-1 min-w-0 block w-full px-3 py-2 rounded-none rounded-l-md focus:ring-primary focus:border-primary sm:text-sm border-gray-300 border"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowUnsplash(!showUnsplash)}
                                                        className="-ml-px relative inline-flex items-center space-x-2 px-4 py-2 border border-gray-300 text-sm font-medium rounded-r-md text-gray-700 bg-gray-50 hover:bg-gray-100 focus:outline-none"
                                                    >
                                                        <Image className="h-5 w-5 text-gray-400" />
                                                        <span>Pick Unsplash</span>
                                                    </button>
                                                </div>
                                            </div>

                                            {showUnsplash && (
                                                <div className="sm:col-span-6 border p-4 rounded-md bg-gray-50 relative">
                                                    <div className="absolute top-2 right-2 cursor-pointer" onClick={() => setShowUnsplash(false)}>
                                                        <X className="h-4 w-4 text-gray-400" />
                                                    </div>
                                                    <UnsplashPicker onSelect={(url) => {
                                                        setFormData({ ...formData, image_url: url })
                                                        setShowUnsplash(false)
                                                    }} />
                                                </div>
                                            )}
                                        </div>

                                        <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                                            <button
                                                type="button"
                                                onClick={handleSave}
                                                disabled={saving}
                                                className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-primary text-base font-medium text-white hover:bg-blue-700 focus:outline-none sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
                                            >
                                                {saving ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                                                Save Changes
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {activeTab === 'rounds' && (
                                    <RoundManager eventId={event.id} />
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
