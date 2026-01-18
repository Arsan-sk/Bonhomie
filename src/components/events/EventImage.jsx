import { useState } from 'react'

/**
 * EventImage Component
 * Handles image loading with proper fallback that displays event name
 * Replaces broken Unsplash Source API
 */
export default function EventImage({
    src,
    alt,
    eventName,
    category = 'Event',
    className = '',
    fallbackClassName = ''
}) {
    const [imageError, setImageError] = useState(false)
    const [isLoading, setIsLoading] = useState(true)

    // Category color schemes
    const categoryColors = {
        'Technical': 'from-blue-500 to-cyan-600',
        'Cultural': 'from-purple-500 to-pink-600',
        'Sports': 'from-green-500 to-teal-600',
        'Gaming': 'from-indigo-500 to-purple-600',
        'Literary': 'from-yellow-500 to-orange-600',
        'Arts': 'from-pink-500 to-rose-600',
        'Music': 'from-violet-500 to-fuchsia-600',
        'Dance': 'from-rose-500 to-pink-600',
        'Drama': 'from-amber-500 to-orange-600',
        'Workshop': 'from-cyan-500 to-blue-600',
        'default': 'from-purple-500 to-indigo-600'
    }

    const gradientClass = categoryColors[category] || categoryColors.default

    const handleImageLoad = () => {
        setIsLoading(false)
        setImageError(false)
    }

    const handleImageError = () => {
        setIsLoading(false)
        setImageError(true)
    }

    // If we have a valid src and no error, show the image
    if (src && !imageError) {
        return (
            <div className={`relative ${className}`}>
                {/* Loading skeleton */}
                {isLoading && (
                    <div className="absolute inset-0 bg-gradient-to-br from-gray-200 to-gray-300 animate-pulse" />
                )}

                {/* Actual image */}
                <img
                    src={src}
                    alt={alt || eventName}
                    className={`${className} ${isLoading ? 'opacity-0' : 'opacity-100'} transition-opacity duration-300`}
                    onLoad={handleImageLoad}
                    onError={handleImageError}
                    loading="lazy"
                />
            </div>
        )
    }

    // Fallback: Show styled event name
    return (
        <div className={`relative ${className} ${fallbackClassName} bg-gradient-to-br ${gradientClass} flex items-center justify-center p-6 overflow-hidden`}>
            {/* Background pattern */}
            <div className="absolute inset-0 opacity-10">
                <div className="absolute inset-0" style={{
                    backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)',
                    backgroundSize: '40px 40px'
                }} />
            </div>

            {/* Event name */}
            <div className="relative z-10 text-center px-4">
                <h3 className="text-white font-bold text-2xl md:text-3xl lg:text-4xl leading-tight drop-shadow-lg line-clamp-3">
                    {eventName || 'Event'}
                </h3>
                {category && (
                    <p className="text-white/90 text-sm md:text-base mt-2 font-medium uppercase tracking-wider">
                        {category}
                    </p>
                )}
            </div>

            {/* Decorative elements */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16" />
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full -ml-12 -mb-12" />
        </div>
    )
}
