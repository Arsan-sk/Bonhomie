/**
 * Animated Banner Fallback Component
 * 
 * Shows an animated gradient background with event name when image fails to load
 * Used for banners in View Details and Manage Events pages
 */

export default function AnimatedBannerFallback({ 
    eventName, 
    category = 'Event',
    height = 'h-48',
    showEventInfo = false,
    eventDay,
    eventTime,
    eventVenue
}) {
    // Get gradient colors based on category
    const getCategoryGradient = () => {
        switch (category?.toLowerCase()) {
            case 'cultural':
                return 'from-purple-600 via-pink-600 to-purple-800'
            case 'technical':
                return 'from-blue-600 via-indigo-600 to-blue-800'
            case 'sports':
                return 'from-green-600 via-emerald-600 to-green-800'
            default:
                return 'from-indigo-600 via-purple-600 to-indigo-800'
        }
    }

    return (
        <div className={`relative ${height} w-full overflow-hidden bg-gradient-to-br ${getCategoryGradient()}`}>
            {/* Animated background patterns */}
            <div className="absolute inset-0 opacity-30">
                {/* Moving diagonal lines */}
                <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-transparent animate-[slide_20s_linear_infinite]" 
                     style={{ backgroundSize: '200% 200%' }} />
                
                {/* Floating circles */}
                <div className="absolute top-10 left-10 w-32 h-32 bg-white/10 rounded-full blur-3xl animate-float" />
                <div className="absolute bottom-10 right-10 w-40 h-40 bg-white/10 rounded-full blur-3xl animate-float-delayed" />
                <div className="absolute top-1/2 left-1/2 w-24 h-24 bg-white/10 rounded-full blur-2xl animate-pulse" />
                
                {/* Grid pattern overlay */}
                <div className="absolute inset-0" 
                     style={{
                         backgroundImage: 'linear-gradient(rgba(255,255,255,.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.05) 1px, transparent 1px)',
                         backgroundSize: '50px 50px'
                     }} />
            </div>

            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />

            {/* Content */}
            <div className="absolute inset-0 flex flex-col items-center justify-center px-6">
                {/* Event Name */}
                <div className="text-center max-w-4xl">
                    <div className="inline-block px-4 py-1.5 mb-3 bg-white/20 backdrop-blur-sm rounded-full">
                        <span className="text-white/90 text-xs font-semibold tracking-wider uppercase">
                            {category}
                        </span>
                    </div>
                    <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white drop-shadow-2xl leading-tight">
                        {eventName || 'Event'}
                    </h2>
                </div>

                {/* Event Info (for manage events banner) */}
                {showEventInfo && (
                    <div className="absolute bottom-4 md:bottom-6 left-4 md:left-6 right-4 md:right-6">
                        <div className="flex flex-wrap items-center gap-3 md:gap-4 text-white/90">
                            {eventDay && (
                                <div className="flex items-center gap-1.5 text-xs md:text-sm font-medium bg-white/10 backdrop-blur-sm px-3 py-1.5 rounded-lg">
                                    <svg className="h-3 md:h-4 w-3 md:w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                    {eventDay}
                                </div>
                            )}
                            {eventTime && (
                                <div className="flex items-center gap-1.5 text-xs md:text-sm font-medium bg-white/10 backdrop-blur-sm px-3 py-1.5 rounded-lg">
                                    <svg className="h-3 md:h-4 w-3 md:w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    {eventTime}
                                </div>
                            )}
                            {eventVenue && (
                                <div className="flex items-center gap-1.5 text-xs md:text-sm font-medium bg-white/10 backdrop-blur-sm px-3 py-1.5 rounded-lg">
                                    <svg className="h-3 md:h-4 w-3 md:w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                    </svg>
                                    {eventVenue}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Add custom animations to global styles */}
            <style jsx>{`
                @keyframes slide {
                    0% { background-position: 0% 50%; }
                    50% { background-position: 100% 50%; }
                    100% { background-position: 0% 50%; }
                }
                @keyframes float {
                    0%, 100% { transform: translate(0, 0) scale(1); }
                    50% { transform: translate(20px, -20px) scale(1.1); }
                }
                @keyframes float-delayed {
                    0%, 100% { transform: translate(0, 0) scale(1); }
                    50% { transform: translate(-30px, 20px) scale(1.15); }
                }
                .animate-float {
                    animation: float 15s ease-in-out infinite;
                }
                .animate-float-delayed {
                    animation: float-delayed 18s ease-in-out infinite;
                }
            `}</style>
        </div>
    )
}
