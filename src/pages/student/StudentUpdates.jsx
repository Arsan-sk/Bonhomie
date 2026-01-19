import { useState } from 'react'
import { Activity, Trophy } from 'lucide-react'
import LiveEventsTab from '../../components/updates/LiveEventsTab'
import WinnersTab from '../../components/updates/WinnersTab'

export default function StudentUpdates() {
    const [activeTab, setActiveTab] = useState('live') // 'live' or 'winners'

    const tabs = [
        { id: 'live', name: 'Live Events', icon: Activity, color: 'red' },
        { id: 'winners', name: 'Winners', icon: Trophy, color: 'yellow' }
    ]

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900">Updates</h1>
                <p className="mt-2 text-gray-600">Stay updated with live events and winners</p>
            </div>

            {/* Tab Navigation */}
            <div className="bg-white rounded-xl shadow-md border border-gray-200 p-1.5 mb-8 inline-flex gap-1">
                {tabs.map((tab) => {
                    const Icon = tab.icon
                    const isActive = activeTab === tab.id
                    
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all duration-300 ${
                                isActive
                                    ? tab.id === 'live'
                                        ? 'bg-gradient-to-r from-red-500 to-pink-500 text-white shadow-lg'
                                        : 'bg-gradient-to-r from-yellow-500 to-amber-500 text-white shadow-lg'
                                    : 'text-gray-600 hover:bg-gray-100'
                            }`}
                        >
                            <Icon className={`h-5 w-5 ${isActive ? '' : 'text-gray-500'}`} />
                            <span>{tab.name}</span>
                            {isActive && (
                                <span className="ml-1 w-2 h-2 bg-white rounded-full animate-pulse" />
                            )}
                        </button>
                    )
                })}
            </div>

            {/* Tab Content */}
            <div className="animate-fadeIn">
                {activeTab === 'live' ? <LiveEventsTab /> : <WinnersTab />}
            </div>

            {/* Custom fade-in animation */}
            <style jsx>{`
                @keyframes fadeIn {
                    from {
                        opacity: 0;
                        transform: translateY(10px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
                
                .animate-fadeIn {
                    animation: fadeIn 0.3s ease-out;
                }
            `}</style>
        </div>
    )
}
