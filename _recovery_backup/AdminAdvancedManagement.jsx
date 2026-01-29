import { useState } from 'react'
import { Settings, Search, List } from 'lucide-react'
import AdminEventManagement from './AdminEventManagement'
import AdminAdvancedSearchNew from './AdminAdvancedSearchNew'

export default function AdminAdvancedManagement() {
    const [activeTab, setActiveTab] = useState('event-management') // 'event-management' or 'advanced-search'

    const tabs = [
        { id: 'event-management', label: 'Event Management', icon: Settings },
        { id: 'advanced-search', label: 'Advanced Search', icon: Search }
    ]

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold text-gray-900">Advanced Management</h1>
                <p className="text-sm text-gray-500 mt-1">Manage all events and search through all registrations</p>
            </div>

            {/* Main Tabs */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                <div className="border-b border-gray-200">
                    <nav className="flex -mb-px">
                        {tabs.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center gap-2 px-6 py-4 text-sm font-semibold border-b-2 transition-all ${
                                    activeTab === tab.id
                                        ? 'border-indigo-600 text-indigo-700 bg-indigo-50/50'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                                }`}
                            >
                                <tab.icon className={`h-4 w-4 ${activeTab === tab.id ? 'text-indigo-600' : 'text-gray-400'}`} />
                                {tab.label}
                            </button>
                        ))}
                    </nav>
                </div>

                {/* Tab Content */}
                <div className="p-6">
                    {activeTab === 'event-management' && <AdminEventManagement />}
                    {activeTab === 'advanced-search' && <AdminAdvancedSearchNew />}
                </div>
            </div>
        </div>
    )
}
