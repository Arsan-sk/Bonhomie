import { useState } from 'react'
import { Activity, Trophy, UtensilsCrossed, RefreshCw } from 'lucide-react'
import LiveEventsTab from '../../components/updates/LiveEventsTab'
import WinnersTab from '../../components/updates/WinnersTab'
import { useZaikaLeaderboard } from '../../hooks/useZaika'
import { formatCurrency } from '../../utils/zaikaConfig'

export default function StudentUpdates() {
    const [activeTab, setActiveTab] = useState('live') // 'live', 'winners', or 'zaika'
    const { leaderboard, loading: leaderboardLoading, refresh: refreshLeaderboard } = useZaikaLeaderboard()

    const tabs = [
        { id: 'live', name: 'Live Events', icon: Activity, color: 'red' },
        { id: 'winners', name: 'Winners', icon: Trophy, color: 'yellow' },
        { id: 'zaika', name: 'Zaika', icon: UtensilsCrossed, color: 'orange' }
    ]

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900">Updates</h1>
                <p className="mt-2 text-gray-600">Stay updated with live events, winners & Zaika leaderboard</p>
            </div>

            {/* Responsive Tab Navigation - Square on mobile, horizontal on desktop */}
            <div className="bg-white rounded-xl shadow-md border border-gray-200 p-1.5 mb-8">
                <div className="flex justify-center md:justify-start md:inline-flex gap-1">
                    {tabs.map((tab) => {
                        const Icon = tab.icon
                        const isActive = activeTab === tab.id
                        
                        const gradients = {
                            red: 'from-red-500 to-pink-500',
                            yellow: 'from-yellow-500 to-amber-500',
                            orange: 'from-orange-500 to-amber-500'
                        }
                        
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`relative flex flex-col md:flex-row items-center justify-center gap-1 md:gap-2 min-w-[60px] md:min-w-0 px-2 md:px-6 py-2 md:py-3 rounded-lg font-medium transition-all duration-300 ${
                                    isActive
                                        ? `bg-gradient-to-r ${gradients[tab.color]} text-white shadow-lg`
                                        : 'text-gray-600 hover:bg-gray-100'
                                }`}
                            >
                                <div className={`p-1.5 md:p-0 rounded-md md:rounded-none ${
                                    isActive ? 'bg-white/20 md:bg-transparent' : 'bg-gray-100 md:bg-transparent'
                                }`}>
                                    <Icon className={`h-4 w-4 md:h-5 md:w-5 ${isActive ? 'text-white' : 'text-gray-500'}`} />
                                </div>
                                <span className="text-[10px] md:text-sm font-semibold">{tab.name}</span>
                                {isActive && (
                                    <span className="hidden md:inline-block ml-1 w-2 h-2 bg-white rounded-full animate-pulse" />
                                )}
                            </button>
                        )
                    })}
                </div>
            </div>

            {/* Tab Content */}
            <div className="animate-fadeIn">
                {activeTab === 'live' && <LiveEventsTab />}
                {activeTab === 'winners' && <WinnersTab />}
                {activeTab === 'zaika' && (
                    <div className="bg-white rounded-xl shadow-md border border-gray-200 p-4 sm:p-6">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-lg sm:text-xl font-semibold text-gray-900 flex items-center gap-2">
                                <Trophy className="h-5 w-5 sm:h-6 sm:w-6 text-amber-500" />
                                Zaika Sales Leaderboard
                            </h3>
                            <button
                                onClick={refreshLeaderboard}
                                className="flex items-center gap-1 px-3 py-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                                <RefreshCw className="h-4 w-4" />
                                <span className="hidden sm:inline">Refresh</span>
                            </button>
                        </div>

                        {leaderboardLoading ? (
                            <div className="flex flex-col items-center justify-center py-12">
                                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-orange-500 mb-4"></div>
                                <p className="text-gray-500">Loading leaderboard...</p>
                            </div>
                        ) : leaderboard.length === 0 ? (
                            <div className="text-center py-12">
                                <Trophy className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                                <p className="text-gray-500 text-lg">No sales yet</p>
                                <p className="text-gray-400 text-sm mt-1">The leaderboard will appear once stalls start selling</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {leaderboard.map((stall, index) => (
                                    <div
                                        key={stall.stall_id}
                                        className={`flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl transition-all ${
                                            index === 0 
                                                ? 'bg-gradient-to-r from-amber-50 to-yellow-50 border-2 border-amber-300 shadow-md' 
                                                : index === 1 
                                                    ? 'bg-gray-50 border-2 border-gray-300'
                                                    : index === 2
                                                        ? 'bg-orange-50/50 border-2 border-orange-200'
                                                        : 'bg-white border border-gray-100 hover:border-gray-200'
                                        }`}
                                    >
                                        {/* Rank Badge */}
                                        <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center text-lg sm:text-xl font-bold flex-shrink-0 ${
                                            index === 0 
                                                ? 'bg-gradient-to-br from-amber-400 to-yellow-500 text-white shadow-lg' 
                                                : index === 1 
                                                    ? 'bg-gradient-to-br from-gray-400 to-gray-500 text-white shadow'
                                                    : index === 2
                                                        ? 'bg-gradient-to-br from-orange-400 to-orange-500 text-white shadow'
                                                        : 'bg-gray-100 text-gray-600'
                                        }`}>
                                            {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : index + 1}
                                        </div>
                                        
                                        {/* Stall Info */}
                                        <div className="flex-1 min-w-0">
                                            <p className="font-semibold text-gray-900 truncate text-sm sm:text-base">{stall.stall_name}</p>
                                            <p className="text-xs sm:text-sm text-gray-500 truncate">{stall.team_name}</p>
                                        </div>
                                        
                                        {/* Sales Amount */}
                                        <div className="text-right flex-shrink-0">
                                            <p className={`text-lg sm:text-xl font-bold ${
                                                index === 0 ? 'text-amber-600' : index === 1 ? 'text-gray-600' : index === 2 ? 'text-orange-600' : 'text-green-600'
                                            }`}>
                                                {formatCurrency(stall.total_sales)}
                                            </p>
                                            <p className="text-xs text-gray-400">
                                                {stall.is_active 
                                                    ? <span className="text-green-600">● Open</span> 
                                                    : <span className="text-gray-400">○ Closed</span>
                                                }
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
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
