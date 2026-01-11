import { useState } from 'react'
import { Search, Image, Loader2, Check } from 'lucide-react'

export default function UnsplashPicker({ onSelect }) {
    const [query, setQuery] = useState('')
    const [images, setImages] = useState([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    const searchImages = async () => {
        if (!query) return
        setLoading(true)
        setError('')
        try {
            const clientKey = import.meta.env.VITE_UNSPLASH_ACCESS_KEY
            if (!clientKey) {
                throw new Error('VITE_UNSPLASH_ACCESS_KEY is missing in .env')
            }

            const res = await fetch(`https://api.unsplash.com/search/photos?query=${query}&client_id=${clientKey}&per_page=9`)
            const data = await res.json()
            if (data.errors) throw new Error(data.errors[0])
            setImages(data.results || [])
        } catch (err) {
            console.error('Unsplash Error:', err)
            setError(err.message || 'Failed to fetch images')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="space-y-4">
            <div className="flex gap-2">
                <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search Unsplash (e.g. 'coding', 'concert')..."
                    className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm border p-2"
                    onKeyDown={(e) => e.key === 'Enter' && searchImages()}
                />
                <button
                    type="button"
                    onClick={searchImages}
                    disabled={loading || !query}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-black hover:bg-gray-800 disabled:opacity-50"
                >
                    {loading ? <Loader2 className="animate-spin h-4 w-4" /> : <Search className="h-4 w-4" />}
                </button>
            </div>

            {error && <p className="text-red-500 text-xs">{error}</p>}

            {images.length > 0 && (
                <div className="grid grid-cols-3 gap-2 max-h-60 overflow-y-auto">
                    {images.map((img) => (
                        <div
                            key={img.id}
                            onClick={() => onSelect(img.urls.regular)}
                            className="relative cursor-pointer group aspect-video"
                        >
                            <img
                                src={img.urls.thumb}
                                alt={img.alt_description}
                                className="w-full h-full object-cover rounded-md group-hover:opacity-75"
                            />
                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 rounded-md">
                                <Check className="text-white h-6 w-6" />
                            </div>
                        </div>
                    ))}
                </div>
            )}
            <div className="text-xs text-gray-400 text-center">
                Photos by <a href="https://unsplash.com?utm_source=bonhomie&utm_medium=referral" target="_blank" rel="noopener noreferrer" className="underline">Unsplash</a>
            </div>
        </div>
    )
}
