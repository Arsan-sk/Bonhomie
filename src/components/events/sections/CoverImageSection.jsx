import { useState } from 'react'
import { Image, Upload, Link as LinkIcon, Loader2, X } from 'lucide-react'
import { supabase } from '../../../lib/supabase'

export default function CoverImageSection({ formData, setFormData }) {
    const [activeTab, setActiveTab] = useState('upload') // 'upload' or 'url'
    const [imageUrl, setImageUrl] = useState('')
    const [uploading, setUploading] = useState(false)
    const [error, setError] = useState('')

    const handleImageUpload = async (e) => {
        const file = e.target.files?.[0]
        if (!file) return

        setError('')

        // Validate file type
        if (!file.type.startsWith('image/')) {
            setError('Please select an image file')
            return
        }

        // Validate file size (5MB)
        if (file.size > 5 * 1024 * 1024) {
            setError('File size must be less than 5MB')
            return
        }

        setUploading(true)
        try {
            const fileExt = file.name.split('.').pop()
            const fileName = `event-covers/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`

            console.log('Uploading to event-assets bucket:', fileName)

            // Upload file to Supabase Storage
            const { data, error: uploadError } = await supabase.storage
                .from('event-assets')
                .upload(fileName, file, {
                    cacheControl: '3600',
                    upsert: false
                })

            if (uploadError) {
                console.error('Upload error:', uploadError)
                throw new Error(uploadError.message || 'Failed to upload image')
            }

            // Get public URL
            const { data: { publicUrl } } = supabase.storage
                .from('event-assets')
                .getPublicUrl(fileName)

            console.log('Image uploaded successfully:', publicUrl)

            // Store in image_path (primary field)
            setFormData({
                ...formData,
                image_path: publicUrl,
                image_url: publicUrl // Also store in image_url for backward compatibility
            })

            setError('')
        } catch (err) {
            console.error('Error uploading image:', err)
            setError(err.message || 'Failed to upload image. Please ensure the event-assets bucket exists.')
        } finally {
            setUploading(false)
            // Reset file input
            e.target.value = ''
        }
    }

    const handleUrlSubmit = () => {
        setError('')

        if (!imageUrl.trim()) {
            setError('Please enter a valid URL')
            return
        }

        // Basic URL validation
        try {
            new URL(imageUrl)
        } catch {
            setError('Please enter a valid URL starting with https://')
            return
        }

        // Store in both fields
        setFormData({
            ...formData,
            image_path: imageUrl.trim(),
            image_url: imageUrl.trim()
        })

        setImageUrl('')
        setError('')
    }

    const handleRemoveImage = () => {
        setFormData({
            ...formData,
            image_path: '',
            image_url: ''
        })
        setImageUrl('')
        setError('')
    }

    const currentImage = formData.image_path || formData.image_url

    return (
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-purple-50 rounded-lg">
                    <Image className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                    <h3 className="text-lg font-bold text-gray-900">Cover Image</h3>
                    <p className="text-sm text-gray-500">Upload an image or provide a URL</p>
                </div>
            </div>

            {/* Error Message */}
            {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                    <X className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-red-700">{error}</p>
                </div>
            )}

            {/* Tabs */}
            <div className="flex border-b border-gray-200 mb-6">
                <button
                    type="button"
                    onClick={() => {
                        setActiveTab('upload')
                        setError('')
                    }}
                    className={`px-6 py-3 font-semibold text-sm transition-all ${activeTab === 'upload'
                        ? 'border-b-2 border-purple-600 text-purple-600'
                        : 'text-gray-500 hover:text-gray-700'
                        }`}
                >
                    <Upload className="h-4 w-4 inline mr-2" />
                    Upload Image
                </button>
                <button
                    type="button"
                    onClick={() => {
                        setActiveTab('url')
                        setError('')
                    }}
                    className={`px-6 py-3 font-semibold text-sm transition-all ${activeTab === 'url'
                        ? 'border-b-2 border-purple-600 text-purple-600'
                        : 'text-gray-500 hover:text-gray-700'
                        }`}
                >
                    <LinkIcon className="h-4 w-4 inline mr-2" />
                    Image URL
                </button>
            </div>

            {/* Tab Content */}
            <div>
                {activeTab === 'upload' ? (
                    <div className="space-y-4">
                        <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-purple-400 transition-colors">
                            <input
                                type="file"
                                accept="image/png,image/jpeg,image/jpg,image/webp,image/gif"
                                onChange={handleImageUpload}
                                className="hidden"
                                id="cover-image-upload"
                                disabled={uploading}
                            />
                            <label htmlFor="cover-image-upload" className={`cursor-pointer ${uploading ? 'pointer-events-none' : ''}`}>
                                <div className="flex flex-col items-center">
                                    {uploading ? (
                                        <>
                                            <Loader2 className="h-12 w-12 text-purple-600 animate-spin mb-3" />
                                            <p className="text-sm text-gray-600">Uploading...</p>
                                        </>
                                    ) : (
                                        <>
                                            <Upload className="h-12 w-12 text-gray-400 mb-3" />
                                            <p className="text-sm font-semibold text-gray-700 mb-1">
                                                Click to upload event cover image
                                            </p>
                                            <p className="text-xs text-gray-500">
                                                PNG, JPG, WebP up to 5MB
                                            </p>
                                        </>
                                    )}
                                </div>
                            </label>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div className="flex gap-3">
                            <input
                                type="url"
                                value={imageUrl}
                                onChange={(e) => setImageUrl(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && handleUrlSubmit()}
                                placeholder="https://example.com/image.jpg"
                                className="flex-1 px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
                            />
                            <button
                                type="button"
                                onClick={handleUrlSubmit}
                                className="px-6 py-3 bg-purple-600 text-white rounded-xl font-semibold hover:bg-purple-700 transition-all"
                            >
                                Set Image
                            </button>
                        </div>
                        <p className="text-xs text-gray-500">
                            Paste the complete URL of the image (must start with https://)
                        </p>
                    </div>
                )}

                {/* Image Preview */}
                {currentImage && (
                    <div className="mt-6">
                        <p className="text-sm font-semibold text-gray-700 mb-2">Preview:</p>
                        <div className="relative rounded-xl overflow-hidden border border-gray-200">
                            <img
                                src={currentImage}
                                alt="Cover preview"
                                className="w-full h-48 object-cover"
                                onError={(e) => {
                                    e.target.src = 'https://via.placeholder.com/800x300?text=Invalid+Image+URL'
                                }}
                            />
                            <button
                                type="button"
                                onClick={handleRemoveImage}
                                className="absolute top-2 right-2 px-3 py-1 bg-red-500 text-white text-xs rounded-lg hover:bg-red-600 transition-all shadow-lg"
                            >
                                Remove
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
