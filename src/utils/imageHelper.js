/**
 * Image API Helper - Uses Pexels (free, reliable)
 * Fallback to styled event name display when image unavailable
 */

const PEXELS_API_KEY = import.meta.env.VITE_PEXELS_API_KEY || 'YOUR_PEXELS_API_KEY'

// Cache for storing fetched image URLs
const imageCache = new Map()

/**
 * Fetch image from Pexels API based on event name
 * @param {string} query - Event name to search for
 * @param {number} width - Desired width
 * @param {number} height - Desired height
 * @returns {Promise<string|null>} Image URL or null
 */
export async function fetchEventImage(query, width = 800, height = 400) {
    if (!query) return null

    // Check cache first
    const cacheKey = `${query}_${width}x${height}`
    if (imageCache.has(cacheKey)) {
        return imageCache.get(cacheKey)
    }

    // If no API key, return null (will use fallback)
    if (!PEXELS_API_KEY || PEXELS_API_KEY === 'YOUR_PEXELS_API_KEY') {
        console.warn('Pexels API key not configured. Set VITE_PEXELS_API_KEY in .env')
        return null
    }

    try {
        const searchQuery = encodeURIComponent(query)
        const response = await fetch(
            `https://api.pexels.com/v1/search?query=${searchQuery}&per_page=1&orientation=landscape`,
            {
                headers: {
                    Authorization: PEXELS_API_KEY
                }
            }
        )

        if (!response.ok) {
            console.warn('Pexels API request failed:', response.status)
            return null
        }

        const data = await response.json()

        if (data.photos && data.photos.length > 0) {
            // Use the large or original image
            const imageUrl = data.photos[0].src.large || data.photos[0].src.original

            // Cache the result
            imageCache.set(cacheKey, imageUrl)

            return imageUrl
        }

        return null
    } catch (error) {
        console.error('Error fetching image from Pexels:', error)
        return null
    }
}

/**
 * Alternative: Use Lorem Picsum for random images (no API key needed)
 * @param {number} width 
 * @param {number} height 
 * @returns {string} Image URL
 */
export function getPlaceholderImage(width = 800, height = 400) {
    // Lorem Picsum - reliable, free, no API key
    return `https://picsum.photos/${width}/${height}?random=${Math.floor(Math.random() * 1000)}`
}

/**
 * Get image URL with smart fallback
 * 1. Use provided image_path if available
 * 2. Try to fetch from Pexels
 * 3. Return null (component will show styled fallback)
 */
export async function getEventImageUrl(imagePath, eventName, width = 800, height = 400) {
    // If we have image_path, use it
    if (imagePath && imagePath.trim() !== '') {
        return imagePath
    }

    // Try to fetch from Pexels
    const pexelsImage = await fetchEventImage(eventName, width, height)
    if (pexelsImage) {
        return pexelsImage
    }

    // Return null - component will show styled event name fallback
    return null
}

// Clear cache utility
export function clearImageCache() {
    imageCache.clear()
}
