import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react'
import { useEffect, useState } from 'react'

const Toast = ({ message, type = 'success', onClose, duration = 3000 }) => {
    const [isVisible, setIsVisible] = useState(true)

    useEffect(() => {
        const timer = setTimeout(() => {
            setIsVisible(false)
            setTimeout(onClose, 300)
        }, duration)

        return () => clearTimeout(timer)
    }, [duration, onClose])

    const icons = {
        success: <CheckCircle className="h-5 w-5" />,
        error: <AlertCircle className="h-5 w-5" />,
        warning: <AlertTriangle className="h-5 w-5" />,
        info: <Info className="h-5 w-5" />
    }

    const colors = {
        success: 'bg-green-50 text-green-800 border-green-200',
        error: 'bg-red-50 text-red-800 border-red-200',
        warning: 'bg-yellow-50 text-yellow-800 border-yellow-200',
        info: 'bg-blue-50 text-blue-800 border-blue-200'
    }

    return (
        <div className={`fixed top-4 right-4 z-[100] transition-all duration-300 ${isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}`}>
            <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 ${colors[type]} shadow-lg min-w-[300px] max-w-md`}>
                <div className="flex-shrink-0">
                    {icons[type]}
                </div>
                <p className="flex-1 text-sm font-medium">{message}</p>
                <button
                    onClick={() => {
                        setIsVisible(false)
                        setTimeout(onClose, 300)
                    }}
                    className="flex-shrink-0 hover:opacity-70 transition-opacity"
                >
                    <X className="h-4 w-4" />
                </button>
            </div>
        </div>
    )
}

// Toast Container Component
let toastId = 0

export const showToast = (() => {
    let toastContainer = null
    const toasts = new Map()

    return (message, type = 'success', duration = 3000) => {
        if (!toastContainer) {
            toastContainer = document.createElement('div')
            toastContainer.id = 'toast-container'
            document.body.appendChild(toastContainer)
        }

        const id = ++toastId
        const toastElement = document.createElement('div')
        toastElement.id = `toast-${id}`
        toastContainer.appendChild(toastElement)

        const handleClose = () => {
            toasts.delete(id)
            if (toastElement.parentNode) {
                toastElement.parentNode.removeChild(toastElement)
            }
            if (toasts.size === 0 && toastContainer?.parentNode) {
                toastContainer.parentNode.removeChild(toastContainer)
                toastContainer = null
            }
        }

        toasts.set(id, toastElement)

        // Use React to render the toast
        import('react-dom/client').then(({ createRoot }) => {
            const root = createRoot(toastElement)
            root.render(<Toast message={message} type={type} onClose={handleClose} duration={duration} />)
        })
    }
})()

export default Toast
