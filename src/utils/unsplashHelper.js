/**
 * Utility for fetching Unsplash images as fallback for events
 * Uses event name/title to find relevant images with smart caching and lazy loading
 */

const UNSPLASH_ACCESS_KEY = import.meta.env.VITE_UNSPLASH_ACCESS_KEY
const CACHE_KEY_PREFIX = 'unsplash_img_'
const CACHE_EXPIRY_DAYS = 7
const IMAGE_LOAD_TIMEOUT = 4000 // 4 seconds timeout

/**
 * Image cache manager using localStorage
 */
class ImageCache {
    static set(key, url) {
        try {
            const data = {
                url,
                timestamp: Date.now(),
                expiry: Date.now() + (CACHE_EXPIRY_DAYS * 24 * 60 * 60 * 1000)
            }
            localStorage.setItem(CACHE_KEY_PREFIX + key, JSON.stringify(data))
        } catch (error) {
            console.warn('Failed to cache image:', error)
        }
    }

    static get(key) {
        try {
            const item = localStorage.getItem(CACHE_KEY_PREFIX + key)
            if (!item) return null

            const data = JSON.parse(item)
            
            // Check if expired
            if (Date.now() > data.expiry) {
                localStorage.removeItem(CACHE_KEY_PREFIX + key)
                return null
            }

            return data.url
        } catch (error) {
            console.warn('Failed to get cached image:', error)
            return null
        }
    }

    static has(key) {
        return this.get(key) !== null
    }

    static clear() {
        try {
            const keys = Object.keys(localStorage)
            keys.forEach(key => {
                if (key.startsWith(CACHE_KEY_PREFIX)) {
                    localStorage.removeItem(key)
                }
            })
        } catch (error) {
            console.warn('Failed to clear cache:', error)
        }
    }

    static getCacheSize() {
        try {
            const keys = Object.keys(localStorage)
            return keys.filter(key => key.startsWith(CACHE_KEY_PREFIX)).length
        } catch (error) {
            return 0
        }
    }
}

/**
 * Generate cache key from event data
 */
function getCacheKey(eventName, width, height) {
    return `${eventName}_${width}x${height}`.toLowerCase().replace(/[^a-z0-9_]/g, '_')
}

/**
 * Generate Unsplash URL for event based on event name
 * @param {string} eventName - The name/title of the event
 * @param {number} width - Image width (default: 800)
 * @param {number} height - Image height (default: 400)
 * @returns {string} Unsplash image URL
 */
export function getUnsplashImageUrl(eventName, width = 800, height = 400) {
    if (!eventName) {
        return `https://source.unsplash.com/featured/${width}x${height}/?event,festival`
    }

    // Check cache first
    const cacheKey = getCacheKey(eventName, width, height)
    const cachedUrl = ImageCache.get(cacheKey)
    if (cachedUrl) {
        return cachedUrl
    }

    // Clean and format event name for search
    const searchQuery = encodeURIComponent(eventName.toLowerCase())
    
    // Use Unsplash Source API for simplicity (no API key needed)
    const url = `https://source.unsplash.com/featured/${width}x${height}/?${searchQuery},event`
    
    // Cache the URL for future use
    ImageCache.set(cacheKey, url)
    
    return url
}

/**
 * Fetch random Unsplash image based on search query
 * Requires VITE_UNSPLASH_ACCESS_KEY in .env
 * @param {string} query - Search query (event name)
 * @returns {Promise<string|null>} Image URL or null if failed
 */
export async function fetchUnsplashImage(query) {
    const cacheKey = getCacheKey(query, 800, 400)
    const cachedUrl = ImageCache.get(cacheKey)
    if (cachedUrl) {
        return cachedUrl
    }

    if (!UNSPLASH_ACCESS_KEY) {
        console.warn('VITE_UNSPLASH_ACCESS_KEY not configured, using fallback')
        const fallbackUrl = getUnsplashImageUrl(query)
        ImageCache.set(cacheKey, fallbackUrl)
        return fallbackUrl
    }

    try {
        const searchQuery = encodeURIComponent(query)
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), IMAGE_LOAD_TIMEOUT)

        const response = await fetch(
            `https://api.unsplash.com/search/photos?query=${searchQuery}&per_page=1&orientation=landscape`,
            {
                headers: {
                    'Authorization': `Client-ID ${UNSPLASH_ACCESS_KEY}`
                },
                signal: controller.signal
            }
        )

        clearTimeout(timeoutId)

        if (!response.ok) {
            throw new Error('Failed to fetch from Unsplash API')
        }

        const data = await response.json()
        
        if (data.results && data.results.length > 0) {
            const imageUrl = data.results[0].urls.regular
            ImageCache.set(cacheKey, imageUrl)
            return imageUrl
        }

        // Fallback to source API
        const fallbackUrl = getUnsplashImageUrl(query)
        ImageCache.set(cacheKey, fallbackUrl)
        return fallbackUrl
    } catch (error) {
        if (error.name === 'AbortError') {
            console.warn('Image fetch timeout, using fallback')
        } else {
            console.error('Error fetching Unsplash image:', error)
        }
        const fallbackUrl = getUnsplashImageUrl(query)
        ImageCache.set(cacheKey, fallbackUrl)
        return fallbackUrl
    }
}

/**
 * Preload images with timeout
 * @param {string} url - Image URL to preload
 * @param {number} timeout - Timeout in milliseconds
 * @returns {Promise<boolean>} True if loaded successfully
 */
export function preloadImage(url, timeout = IMAGE_LOAD_TIMEOUT) {
    return new Promise((resolve) => {
        const img = new Image()
        const timeoutId = setTimeout(() => {
            img.src = ''
            resolve(false)
        }, timeout)

        img.onload = () => {
            clearTimeout(timeoutId)
            resolve(true)
        }

        img.onerror = () => {
            clearTimeout(timeoutId)
            resolve(false)
        }

        img.src = url
    })
}

/**
 * Batch preload images with chunk processing
 * @param {Array<{eventName: string, width: number, height: number}>} imageRequests
 * @param {number} chunkSize - Number of images to load at once (default: 3)
 * @returns {Promise<Map<string, string>>} Map of eventName to loaded URL
 */
export async function batchPreloadImages(imageRequests, chunkSize = 3) {
    const results = new Map()
    
    // Process in chunks
    for (let i = 0; i < imageRequests.length; i += chunkSize) {
        const chunk = imageRequests.slice(i, i + chunkSize)
        
        // Load chunk in parallel
        await Promise.all(
            chunk.map(async ({ eventName, width = 800, height = 400 }) => {
                const cacheKey = getCacheKey(eventName, width, height)
                
                // Check cache first
                let url = ImageCache.get(cacheKey)
                if (url) {
                    results.set(eventName, url)
                    return
                }

                // Generate URL
                url = getUnsplashImageUrl(eventName, width, height)
                
                // Try to preload with timeout
                const loaded = await preloadImage(url, IMAGE_LOAD_TIMEOUT)
                
                if (loaded) {
                    ImageCache.set(cacheKey, url)
                    results.set(eventName, url)
                } else {
                    // Use category fallback if timeout
                    results.set(eventName, null)
                }
            })
        )
    }
    
    return results
}

// Export cache utilities for manual management
export const ImageCacheManager = ImageCache

/**
 * Get optimized Unsplash image URL with custom parameters
 * @param {string} baseUrl - Base Unsplash image URL
 * @param {object} options - Options for image optimization
 * @returns {string} Optimized image URL
 */
export function optimizeUnsplashUrl(baseUrl, options = {}) {
    const {
        width = 800,
        height = 400,
        quality = 80,
        fit = 'crop'
    } = options

    if (!baseUrl || !baseUrl.includes('unsplash.com')) {
        return baseUrl
    }

    const url = new URL(baseUrl)
    url.searchParams.set('w', width)
    url.searchParams.set('h', height)
    url.searchParams.set('q', quality)
    url.searchParams.set('fit', fit)
    url.searchParams.set('auto', 'format')

    return url.toString()
}

/**
 * React hook for event image with Unsplash fallback
 * @param {string} imagePath - Original image path from database
 * @param {string} eventName - Event name for Unsplash search
 * @returns {string} Image URL to use
 */
export function useEventImage(imagePath, eventName) {
    // If image path exists and is valid, use it
    if (imagePath && imagePath.trim() !== '') {
        return imagePath
    }

    // Otherwise, generate Unsplash URL based on event name
    return getUnsplashImageUrl(eventName)
}

// Default fallback image for events (generic)
export const DEFAULT_EVENT_IMAGE = 'https://source.unsplash.com/featured/800x400/?event,festival,celebration'

// Category-specific fallback images
export const CATEGORY_IMAGES = {
    'Technical': 'https://source.unsplash.com/featured/800x400/?technology,coding,tech',
    'Cultural': 'https://source.unsplash.com/featured/800x400/?culture,art,performance',
    'Sports': 'https://source.unsplash.com/featured/800x400/?sports,game,competition',
    'Gaming': 'https://source.unsplash.com/featured/800x400/?gaming,esports,game',
    'Literary': 'https://source.unsplash.com/featured/800x400/?books,literature,writing',
    'Arts': 'https://source.unsplash.com/featured/800x400/?art,creative,design',
    'Music': 'https://source.unsplash.com/featured/800x400/?music,concert,performance',
    'Dance': 'https://source.unsplash.com/featured/800x400/?dance,performance,stage',
    'Drama': 'https://source.unsplash.com/featured/800x400/?theater,drama,stage',
    'Workshop': 'https://source.unsplash.com/featured/800x400/?workshop,learning,education'
}

/**
 * Get fallback image based on event category
 * @param {string} category - Event category
 * @returns {string} Category-specific image URL
 */
export function getCategoryImage(category) {
    return CATEGORY_IMAGES[category] || DEFAULT_EVENT_IMAGE
}
