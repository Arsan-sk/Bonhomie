import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Loader2 } from 'lucide-react'

/**
 * Coordinator Route Guard
 * Allows users with 'coordinator' or 'admin' role
 * Redirects students to student dashboard
 */
export default function CoordinatorRoute({ children }) {
    const { user, profile, loading } = useAuth()

    // Show loading state
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

    // Not authenticated
    if (!user) {
        console.log('CoordinatorRoute: No user, redirecting to login')
        return <Navigate to="/login" replace />
    }

    // Check if user is coordinator or admin
    const isAuthorized = profile?.role === 'coordinator' || profile?.role === 'admin'

    if (!isAuthorized) {
        console.log('CoordinatorRoute: User is not coordinator/admin, role:', profile?.role)
        return <Navigate to="/student/dashboard" replace />
    }

    // User is authorized
    console.log('CoordinatorRoute: Access granted for role:', profile?.role)
    return children
}
