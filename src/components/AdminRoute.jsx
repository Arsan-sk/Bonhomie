import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Loader2 } from 'lucide-react'

/**
 * Admin Route Guard
 * Only allows users with 'admin' role
 * Redirects others to their appropriate dashboard
 */
export default function AdminRoute({ children }) {
    const { user, profile, loading } = useAuth()

    // Show loading state while checking
    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center">
                    <Loader2 className="h-12 w-12 animate-spin text-indigo-600 mx-auto mb-4" />
                    <p className="text-gray-600">Verifying permissions...</p>
                </div>
            </div>
        )
    }

    // Not authenticated - redirect to login
    if (!user) {
        console.log('AdminRoute: No user, redirecting to login')
        return <Navigate to="/login" replace />
    }

    // Authenticated but not admin - redirect to appropriate dashboard
    if (profile?.role !== 'admin') {
        console.log('AdminRoute: User is not admin, role:', profile?.role)

        // Redirect based on actual role
        if (profile?.role === 'coordinator') {
            return <Navigate to="/coordinator/dashboard" replace />
        } else {
            return <Navigate to="/student/dashboard" replace />
        }
    }

    // User is admin - allow access
    console.log('AdminRoute: Admin access granted')
    return children
}
