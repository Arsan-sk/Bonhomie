import { Navigate } from 'react-router-dom'
import { XCircle, Home, ArrowLeft } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Forbidden() {
    const { isAdmin, isCoordinator } = useAuth()

    // Determine user's home route
    const homeRoute = isAdmin ? '/admin/dashboard' : isCoordinator ? '/coordinator/dashboard' : '/dashboard'

    return (
        <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center px-4">
            <div className="max-w-md w-full text-center">
                <div className="mb-8 flex justify-center">
                    <div className="relative">
                        <XCircle className="h-24 w-24 text-red-500" strokeWidth={1.5} />
                        <div className="absolute inset-0 bg-red-500/20 blur-xl rounded-full" />
                    </div>
                </div>

                <h1 className="text-6xl font-bold text-gray-900 mb-4">403</h1>
                <h2 className="text-2xl font-semibold text-gray-800 mb-4">Access Forbidden</h2>
                <p className="text-gray-600 mb-8">
                    You don't have permission to access this resource. This could mean you're trying to view data that belongs to another user.
                </p>

                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <Link
                        to={homeRoute}
                        className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-colors"
                    >
                        <Home className="h-5 w-5" />
                        Go to Dashboard
                    </Link>
                    <button
                        onClick={() => window.history.back()}
                        className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white text-gray-700 border border-gray-300 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
                    >
                        <ArrowLeft className="h-5 w-5" />
                        Go Back
                    </button>
                </div>
            </div>
        </div>
    )
}
