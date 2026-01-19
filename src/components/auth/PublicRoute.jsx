import { Navigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

// Redirects logged-in users to their respective dashboard
export default function PublicRoute({ children }) {
    const { user, profile } = useAuth()

    // If user is logged in, redirect to their dashboard based on role
    if (user && profile) {
        switch (profile.role) {
            case 'admin':
                return <Navigate to="/admin/dashboard" replace />
            case 'coordinator':
                return <Navigate to="/coordinator/dashboard" replace />
            case 'student':
                return <Navigate to="/student/dashboard" replace />
            default:
                return <Navigate to="/student/dashboard" replace />
        }
    }

    // If not logged in, render the public route
    return children
}
