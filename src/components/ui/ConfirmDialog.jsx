import { AlertTriangle, CheckCircle, Info, XCircle, X } from 'lucide-react'

/**
 * Unified Confirmation/Alert Dialog Component
 * 
 * @param {Object} props
 * @param {boolean} props.isOpen - Whether dialog is visible
 * @param {function} props.onClose - Called when dialog is closed
 * @param {function} props.onConfirm - Called when confirm button is clicked (optional)
 * @param {string} props.title - Dialog title
 * @param {string} props.message - Dialog message/description
 * @param {string} props.type - Type of dialog: 'warning', 'success', 'error', 'info', 'confirm'
 * @param {string} props.confirmText - Text for confirm button (default: 'Confirm')
 * @param {string} props.cancelText - Text for cancel button (default: 'Cancel')
 * @param {boolean} props.showCancel - Whether to show cancel button (default: true for confirm type)
 */
export default function ConfirmDialog({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    type = 'confirm',
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    showCancel = type === 'confirm' || type === 'warning'
}) {
    if (!isOpen) return null

    const configs = {
        warning: {
            icon: AlertTriangle,
            iconBg: 'bg-yellow-100',
            iconColor: 'text-yellow-600',
            emoji: '⚠️',
            confirmBg: 'bg-yellow-600 hover:bg-yellow-700',
        },
        success: {
            icon: CheckCircle,
            iconBg: 'bg-green-100',
            iconColor: 'text-green-600',
            emoji: '✅',
            confirmBg: 'bg-green-600 hover:bg-green-700',
        },
        error: {
            icon: XCircle,
            iconBg: 'bg-red-100',
            iconColor: 'text-red-600',
            emoji: '❌',
            confirmBg: 'bg-red-600 hover:bg-red-700',
        },
        info: {
            icon: Info,
            iconBg: 'bg-blue-100',
            iconColor: 'text-blue-600',
            emoji: 'ℹ️',
            confirmBg: 'bg-blue-600 hover:bg-blue-700',
        },
        confirm: {
            icon: AlertTriangle,
            iconBg: 'bg-indigo-100',
            iconColor: 'text-indigo-600',
            emoji: '❓',
            confirmBg: 'bg-indigo-600 hover:bg-indigo-700',
        }
    }

    const config = configs[type] || configs.confirm
    const IconComponent = config.icon

    const handleConfirm = () => {
        if (onConfirm) onConfirm()
        onClose()
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4 animate-in zoom-in-95 duration-200">
                {/* Close button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition"
                >
                    <X className="h-5 w-5" />
                </button>

                {/* Icon */}
                <div className="text-center mb-6">
                    <div className={`h-16 w-16 ${config.iconBg} rounded-full flex items-center justify-center mx-auto mb-4`}>
                        <span className="text-4xl">{config.emoji}</span>
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-2">{title}</h3>
                    <p className="text-gray-600 leading-relaxed">{message}</p>
                </div>

                {/* Action Buttons */}
                <div className={`flex gap-3 ${showCancel ? '' : 'justify-center'}`}>
                    {showCancel && (
                        <button
                            onClick={onClose}
                            className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition"
                        >
                            {cancelText}
                        </button>
                    )}
                    <button
                        onClick={handleConfirm}
                        className={`${showCancel ? 'flex-1' : 'min-w-[120px]'} px-4 py-3 ${config.confirmBg} text-white rounded-xl font-semibold transition shadow-lg`}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    )
}
