import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

const ProtectedRoute = ({ allowedRoles, children }) => {
    const { user, profile, loading } = useAuth()

    if (loading) {
        return <div className="flex items-center justify-center min-h-screen">Loading...</div>
    }

    if (!user) {
        return <Navigate to="/login" replace />
    }

    if (allowedRoles && (!profile || !allowedRoles.includes(profile.role))) {
        // Redirect based on role if unauthorized for this route
        if (profile?.role === 'admin') return <Navigate to="/admin/dashboard" replace />
        if (profile?.role === 'coordinator') return <Navigate to="/coordinator/dashboard" replace />
        return <Navigate to="/student/dashboard" replace />
    }

    return children ? children : <Outlet />
}

export default ProtectedRoute
