/**
 * Static Card Fallback Component
 * 
 * Shows a static styled background with event name when image fails to load
 * Used for event cards in My Events, Live Events, etc.
 */

export default function StaticCardFallback({ 
    eventName, 
    category = 'Event',
    height = 'h-48'
}) {
    // Get gradient colors based on category
    const getCategoryGradient = () => {
        switch (category?.toLowerCase()) {
            case 'cultural':
                return 'from-purple-500 to-pink-600'
            case 'technical':
                return 'from-blue-500 to-indigo-600'
            case 'sports':
                return 'from-green-500 to-emerald-600'
            default:
                return 'from-indigo-500 to-purple-600'
        }
    }

    // Get category icon
    const getCategoryIcon = () => {
        switch (category?.toLowerCase()) {
            case 'cultural':
                return (
                    <svg className="h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                    </svg>
                )
            case 'technical':
                return (
                    <svg className="h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                )
            case 'sports':
                return (
                    <svg className="h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                )
            default:
                return (
                    <svg className="h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                    </svg>
                )
        }
    }

    return (
        <div className={`relative ${height} w-full overflow-hidden bg-gradient-to-br ${getCategoryGradient()}`}>
            {/* Subtle pattern overlay */}
            <div className="absolute inset-0 opacity-10"
                 style={{
                     backgroundImage: 'radial-gradient(circle at 20% 50%, rgba(255,255,255,0.5) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgba(255,255,255,0.3) 0%, transparent 50%)'
                 }} />
            
            {/* Grid pattern */}
            <div className="absolute inset-0 opacity-5"
                 style={{
                     backgroundImage: 'linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)',
                     backgroundSize: '30px 30px'
                 }} />

            {/* Gradient overlay for text readability */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/20" />

            {/* Content */}
            <div className="absolute inset-0 flex flex-col items-center justify-center px-4">
                {/* Category Icon */}
                <div className="text-white/80 mb-3">
                    {getCategoryIcon()}
                </div>
                
                {/* Event Name */}
                <h3 className="text-xl md:text-2xl font-bold text-white text-center drop-shadow-lg leading-tight line-clamp-2 max-w-full px-2">
                    {eventName || 'Event'}
                </h3>

                {/* Category Badge */}
                <div className="mt-3 px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full">
                    <span className="text-white text-xs font-semibold tracking-wide uppercase">
                        {category}
                    </span>
                </div>
            </div>
        </div>
    )
}
