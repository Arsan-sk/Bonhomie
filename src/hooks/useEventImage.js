import { useState, useEffect, useRef } from 'react'
import { getUnsplashImageUrl, getCategoryImage, preloadImage, ImageCacheManager } from '../utils/unsplashHelper'

/**
 * Custom hook for lazy loading event images with caching and timeout
 * @param {string} imagePath - Original image path from database
 * @param {string} eventName - Event name for Unsplash search
 * @param {string} category - Event category for fallback
 * @param {number} width - Image width
 * @param {number} height - Image height
 * @param {boolean} eager - Whether to load immediately or wait for visibility
 * @returns {Object} { src, isLoading, error, isFromCache }
 */
export function useEventImage(imagePath, eventName, category, width = 800, height = 400, eager = false) {
    const [src, setSrc] = useState(null)
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState(null)
    const [isFromCache, setIsFromCache] = useState(false)
    const hasAttempted = useRef(false)

    useEffect(() => {
        // Reset if inputs change
        if (!hasAttempted.current || eager) {
            loadImage()
        }
    }, [imagePath, eventName, category, width, height])

    const loadImage = async () => {
        // If custom image path exists, use it directly
        if (imagePath && imagePath.trim() !== '') {
            setSrc(imagePath)
            setIsLoading(false)
            setIsFromCache(false)
            hasAttempted.current = true
            return
        }

        setIsLoading(true)
        hasAttempted.current = true

        try {
            // Check cache first
            const cacheKey = `${eventName}_${width}x${height}`.toLowerCase().replace(/[^a-z0-9_]/g, '_')
            const cachedUrl = ImageCacheManager.get(cacheKey)
            
            if (cachedUrl) {
                setSrc(cachedUrl)
                setIsFromCache(true)
                setIsLoading(false)
                return
            }

            // Generate Unsplash URL
            const unsplashUrl = getUnsplashImageUrl(eventName, width, height)
            
            // Try to preload with timeout (4 seconds)
            const loaded = await preloadImage(unsplashUrl, 4000)
            
            if (loaded) {
                setSrc(unsplashUrl)
                setIsFromCache(false)
                setError(null)
            } else {
                // Timeout or error - use category fallback
                const fallbackUrl = getCategoryImage(category)
                setSrc(fallbackUrl)
                setIsFromCache(false)
                setError('timeout')
            }
        } catch (err) {
            console.error('Error loading event image:', err)
            // Use category fallback on error
            setSrc(getCategoryImage(category))
            setError(err.message)
        } finally {
            setIsLoading(false)
        }
    }

    return { src, isLoading, error, isFromCache, reload: loadImage }
}

/**
 * Hook for lazy loading with Intersection Observer
 * Only loads image when element is near viewport
 * @param {string} imagePath - Original image path
 * @param {string} eventName - Event name
 * @param {string} category - Event category
 * @param {number} width - Image width
 * @param {number} height - Image height
 * @returns {Object} { src, isLoading, error, ref }
 */
export function useLazyEventImage(imagePath, eventName, category, width = 800, height = 400) {
    const [isVisible, setIsVisible] = useState(false)
    const elementRef = useRef(null)
    const imageData = useEventImage(imagePath, eventName, category, width, height, isVisible)

    useEffect(() => {
        if (!elementRef.current) return

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting && !isVisible) {
                        setIsVisible(true)
                        observer.disconnect()
                    }
                })
            },
            {
                rootMargin: '50px', // Start loading 50px before entering viewport
                threshold: 0.01
            }
        )

        observer.observe(elementRef.current)

        return () => observer.disconnect()
    }, [isVisible])

    return { ...imageData, ref: elementRef }
}

/**
 * Hook for batch loading multiple event images
 * Loads images in chunks to avoid overwhelming the browser
 * @param {Array<Object>} events - Array of event objects
 * @param {number} chunkSize - Number of images to load at once
 * @returns {Object} { imageMap, isLoading, loadedCount }
 */
export function useBatchEventImages(events, chunkSize = 3) {
    const [imageMap, setImageMap] = useState(new Map())
    const [isLoading, setIsLoading] = useState(true)
    const [loadedCount, setLoadedCount] = useState(0)
    const hasLoaded = useRef(false)

    useEffect(() => {
        if (!events || events.length === 0 || hasLoaded.current) return

        loadImagesInChunks()
        hasLoaded.current = true
    }, [events, chunkSize])

    const loadImagesInChunks = async () => {
        setIsLoading(true)
        const newImageMap = new Map()
        let loaded = 0

        // Process events in chunks
        for (let i = 0; i < events.length; i += chunkSize) {
            const chunk = events.slice(i, i + chunkSize)
            
            // Load chunk in parallel
            await Promise.all(
                chunk.map(async (event) => {
                    // If event has image_path, use it
                    if (event.image_path && event.image_path.trim() !== '') {
                        newImageMap.set(event.id, event.image_path)
                        loaded++
                        setLoadedCount(loaded)
                        return
                    }

                    // Check cache
                    const cacheKey = `${event.name}_800x400`.toLowerCase().replace(/[^a-z0-9_]/g, '_')
                    const cachedUrl = ImageCacheManager.get(cacheKey)
                    
                    if (cachedUrl) {
                        newImageMap.set(event.id, cachedUrl)
                        loaded++
                        setLoadedCount(loaded)
                        return
                    }

                    // Generate and preload
                    const unsplashUrl = getUnsplashImageUrl(event.name, 800, 400)
                    const preloaded = await preloadImage(unsplashUrl, 4000)
                    
                    if (preloaded) {
                        newImageMap.set(event.id, unsplashUrl)
                    } else {
                        // Use category fallback
                        newImageMap.set(event.id, getCategoryImage(event.category))
                    }
                    
                    loaded++
                    setLoadedCount(loaded)
                })
            )

            // Update map after each chunk
            setImageMap(new Map(newImageMap))
        }

        setIsLoading(false)
    }

    return { imageMap, isLoading, loadedCount, totalCount: events.length }
}
