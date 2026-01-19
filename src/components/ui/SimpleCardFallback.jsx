/**
 * Simple Card Fallback Component
 * 
 * Minimal fallback design showing only category badge, no icon or event name
 * Used for live event cards and compact displays
 */

export default function SimpleCardFallback({ 
    category = 'Event',
    height = 'h-48'
}) {
    // Get gradient colors based on category
    const getCategoryGradient = () => {
        switch (category?.toLowerCase()) {
            case 'cultural':
                return 'from-purple-500 via-pink-500 to-purple-600'
            case 'technical':
                return 'from-blue-500 via-indigo-500 to-blue-600'
            case 'sports':
                return 'from-green-500 via-emerald-500 to-green-600'
            default:
                return 'from-indigo-500 via-purple-500 to-indigo-600'
        }
    }

    return (
        <div className={`relative ${height} w-full overflow-hidden bg-gradient-to-br ${getCategoryGradient()} group`}>
            {/* Animated subtle overlay */}
            <div className="absolute inset-0 bg-black/10" />
            
            {/* Diagonal lines pattern */}
            <div className="absolute inset-0 opacity-20"
                 style={{
                     backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255,255,255,.1) 10px, rgba(255,255,255,.1) 20px)'
                 }} />

            {/* Hover overlay effect */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

            {/* Category Badge - Centered */}
            <div className="absolute inset-0 flex items-center justify-center">
                <div className="px-4 py-2 bg-white/25 backdrop-blur-md rounded-full border border-white/30 shadow-lg">
                    <span className="text-white text-sm font-bold tracking-wider uppercase">
                        {category}
                    </span>
                </div>
            </div>
        </div>
    )
}
