import { useState } from 'react'
import { CreditCard, Upload, Loader2, Shield } from 'lucide-react'
import { supabase } from '../../../lib/supabase'

export default function PaymentModeSection({ formData, setFormData }) {
    const [uploadingQR, setUploadingQR] = useState(false)

    const paymentModes = [
        { value: 'cash', label: 'Cash Only', icon: '💵', description: 'Offline payment only' },
        { value: 'hybrid', label: 'Cash + Online', icon: '📱', description: 'Both payment methods' },
        { value: 'online', label: 'Online Only', icon: '🌐', description: 'Digital payment only' }
    ]

    const handleQRUpload = async (e) => {
        const file = e.target.files?.[0]
        if (!file) return

        if (file.size > 5 * 1024 * 1024) {
            alert('File size must be less than 5MB')
            return
        }

        setUploadingQR(true)
        try {
            const fileExt = file.name.split('.').pop()
            const fileName = `event-qr/${Date.now()}.${fileExt}`

            const { data, error } = await supabase.storage
                .from('event-assets')
                .upload(fileName, file)

            if (error) throw error

            const { data: { publicUrl } } = supabase.storage
                .from('event-assets')
                .getPublicUrl(fileName)

            setFormData({ ...formData, qr_code_path: publicUrl })
        } catch (error) {
            console.error('Error uploading QR code:', error)
            alert('Failed to upload QR code. Please try again.')
        } finally {
            setUploadingQR(false)
        }
    }

    const selectedMode = paymentModes.find(m => m.value === formData.payment_mode)

    return (
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-green-50 rounded-lg">
                    <CreditCard className="h-5 w-5 text-green-600" />
                </div>
                <div>
                    <h3 className="text-lg font-bold text-gray-900">Payment Mode</h3>
                    <p className="text-sm text-gray-500">Configure how participants will pay</p>
                </div>
            </div>

            {/* Payment Mode Selection */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                {paymentModes.map(mode => (
                    <button
                        key={mode.value}
                        type="button"
                        onClick={() => setFormData({ ...formData, payment_mode: mode.value })}
                        className={`p-4 rounded-xl border-2 transition-all text-left ${formData.payment_mode === mode.value
                                ? 'border-green-600 bg-green-50'
                                : 'border-gray-200 hover:border-green-300'
                            }`}
                    >
                        <div className="flex items-start gap-3">
                            <span className="text-2xl">{mode.icon}</span>
                            <div className="flex-1">
                                <p className="font-semibold text-gray-900">{mode.label}</p>
                                <p className="text-xs text-gray-500 mt-1">{mode.description}</p>
                            </div>
                            {formData.payment_mode === mode.value && (
                                <div className="h-5 w-5 rounded-full bg-green-600 flex items-center justify-center">
                                    <svg className="h-3 w-3 text-white" fill="currentColor" viewBox="0 0 12 12">
                                        <path d="M10 3L4.5 8.5L2 6" stroke="currentColor" strokeWidth="2" fill="none" />
                                    </svg>
                                </div>
                            )}
                        </div>
                    </button>
                ))}
            </div>

            {/* Conditional Fields for Hybrid/Online */}
            {(formData.payment_mode === 'hybrid' || formData.payment_mode === 'online') && (
                <div className="space-y-5 p-5 bg-gray-50 rounded-xl">
                    {/* UPI ID */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                            UPI ID {formData.payment_mode === 'online' && <span className="text-red-500">*</span>}
                            {formData.payment_mode === 'hybrid' && <span className="text-gray-500 text-xs font-normal">(Optional)</span>}
                        </label>
                        <div className="relative">
                            <Shield className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                            <input
                                type="text"
                                value={formData.upi_id || ''}
                                onChange={(e) => setFormData({ ...formData, upi_id: e.target.value })}
                                placeholder="example@oksbi"
                                className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all"
                                required={formData.payment_mode === 'online'}
                            />
                        </div>
                    </div>

                    {/* QR Code Upload */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Payment QR Code <span className="text-red-500">*</span>
                        </label>
                        <div className="border-2 border-dashed border-gray-300 rounded-xl p-6">
                            <input
                                type="file"
                                accept="image/*"
                                onChange={handleQRUpload}
                                className="hidden"
                                id="qr-code-upload"
                                disabled={uploadingQR}
                            />
                            {formData.qr_code_path ? (
                                <div className="flex items-start gap-4">
                                    <img
                                        src={formData.qr_code_path}
                                        alt="QR Code"
                                        className="h-32 w-32 object-contain border rounded-lg"
                                    />
                                    <div className="flex-1">
                                        <p className="text-sm font-medium text-green-600 mb-2">✓ QR Code uploaded</p>
                                        <button
                                            type="button"
                                            onClick={() => setFormData({ ...formData, qr_code_path: '' })}
                                            className="text-xs text-red-600 hover:text-red-700 font-medium"
                                        >
                                            Remove QR Code
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <label htmlFor="qr-code-upload" className="cursor-pointer">
                                    <div className="flex flex-col items-center">
                                        {uploadingQR ? (
                                            <>
                                                <Loader2 className="h-10 w-10 text-green-600 animate-spin mb-2" />
                                                <p className="text-sm text-gray-600">Uploading QR Code...</p>
                                            </>
                                        ) : (
                                            <>
                                                <Upload className="h-10 w-10 text-gray-400 mb-2" />
                                                <p className="text-sm font-semibold text-gray-700 mb-1">
                                                    Click to upload QR code
                                                </p>
                                                <p className="text-xs text-gray-500">
                                                    PNG, JPG up to 5MB
                                                </p>
                                            </>
                                        )}
                                    </div>
                                </label>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Info Message for Cash Only */}
            {formData.payment_mode === 'cash' && (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
                    <p className="text-sm text-blue-800">
                        <strong>Cash Only:</strong> Participants will pay in cash during registration. No UPI or QR code needed.
                    </p>
                </div>
            )}
        </div>
    )
}
