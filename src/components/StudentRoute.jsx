import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Loader2 } from 'lucide-react'

/**
 * Student Route Guard
 * Only allows users with 'student' role
 * Redirects coordinators and admins to their dashboards
 */
export default function StudentRoute({ children }) {
    const { user, profile, loading } = useAuth()

    // Show loading state
    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center">
                    <Loader2 className="h-12 w-12 animate-spin text-indigo-600 mx-auto mb-4" />
                    <p className="text-gray-600">Loading...</p>
                </div>
            </div>
        )
    }

    // Not authenticated
    if (!user) {
        console.log('StudentRoute: No user, redirecting to login')
        return <Navigate to="/login" replace />
    }

    //  Redirect non-students to their appropriate dashboard
    if (profile?.role === 'admin') {
        console.log('StudentRoute: Admin redirected to admin dashboard')
        return <Navigate to="/admin/dashboard" replace />
    }

    if (profile?.role === 'coordinator') {
        console.log('StudentRoute: Coordinator redirected to coordinator dashboard')
        return <Navigate to="/coordinator/dashboard" replace />
    }

    // User is student - allow access
    console.log('StudentRoute: Student access granted')
    return children
}
