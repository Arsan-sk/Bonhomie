import { Routes, Route, Outlet, Navigate } from 'react-router-dom'
import Layout from './components/layout/Layout'
import Landing from './pages/Landing'
import Login from './pages/Login'
import Register from './pages/Register'
import Profile from './pages/Profile'
import Events from './pages/Events'
import EventDetail from './pages/EventDetail'
import EventRegistration from './pages/EventRegistration'
import Forbidden from './pages/Forbidden'

// Coordinator Pages
import CoordinatorDashboard from './pages/coordinator/CoordinatorDashboard'
import CoordinatorEvents from './pages/coordinator/CoordinatorEvents'
import CoordinatorEventManage from './pages/coordinator/CoordinatorEventManage'
import CoordinatorAnalytics from './pages/coordinator/CoordinatorAnalytics'
import CoordinatorProfile from './pages/coordinator/CoordinatorProfile'
import CoordinatorShell from './components/coordinator/layout/CoordinatorShell'
import ProtectedRoute from './components/auth/ProtectedRoute'

// Student Imports
import StudentShell from './components/student/layout/StudentShell'
import StudentDashboard from './pages/student/StudentDashboard'
import StudentEvents from './pages/student/StudentEvents'
import StudentMyEvents from './pages/student/StudentMyEvents'
import StudentLive from './pages/student/StudentLive'
import StudentProfile from './pages/student/StudentProfile'

// Admin Pages
import AdminDashboard from './pages/dashboards/AdminDashboard'
import AdminStats from './pages/dashboards/AdminStats'
import AdminShell from './components/admin/layout/AdminShell'
import AdminEvents from './pages/admin/AdminEvents'
import AdminCoordinators from './pages/admin/AdminCoordinators'
import AdminStudents from './pages/admin/AdminStudents'
import AdminPayments from './pages/admin/AdminPayments'
import AdminAnalytics from './pages/admin/AdminAnalytics'
import AdminNotifications from './pages/admin/AdminNotifications'
import AdminSettings from './pages/admin/AdminSettings'
import AdminCertificates from './pages/admin/AdminCertificates'
import CertificateVerify from './pages/CertificateVerify'
import { AuthProvider } from './context/AuthContext'

function App() {
  return (
    <AuthProvider>
      <Routes>
        {/* Public & Student Routes wrapped in Main Layout */}
        <Route element={<Layout><Outlet /></Layout>}>
          <Route path="/" element={<Landing />} />
          <Route path="/verify" element={<CertificateVerify />} />
          <Route path="/events" element={<Events />} />
          <Route path="/events/:id" element={<EventDetail />} />
          <Route path="/events/:id/register" element={<EventRegistration />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/profile" element={<Profile />} />
          {/* Redirect old dashboard path to new namespace */}
          <Route path="/dashboard" element={<Navigate to="/student/dashboard" replace />} />
          <Route path="/403" element={<Forbidden />} />
        </Route>

        {/* Student Routes (New Namespace with Sidebar) */}
        <Route path="/student" element={<ProtectedRoute allowedRoles={['student']}><StudentShell /></ProtectedRoute>}>
          <Route path="dashboard" element={<StudentDashboard />} />
          <Route path="events" element={<StudentEvents />} />
          <Route path="live" element={<StudentLive />} />
          <Route path="my-events" element={<StudentMyEvents />} />
          <Route path="profile" element={<StudentProfile />} />
        </Route>

        {/* Admin Routes with Sidebar (No Top Layout) */}
        <Route path="/admin" element={<AdminShell />}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<AdminDashboard />} />
          <Route path="events" element={<AdminEvents />} />
          <Route path="coordinators" element={<AdminCoordinators />} />
          <Route path="students" element={<AdminStudents />} />
          <Route path="payments" element={<AdminPayments />} />
          <Route path="analytics" element={<AdminAnalytics />} />
          <Route path="notifications" element={<AdminNotifications />} />
          <Route path="settings" element={<AdminSettings />} />
          <Route path="certificates" element={<AdminCertificates />} />
        </Route>

        {/* Coordinator Routes - Role Normalized */}
        <Route path="/coordinator" element={<ProtectedRoute allowedRoles={['coordinator']}><CoordinatorShell /></ProtectedRoute>}>
          <Route path="dashboard" element={<CoordinatorDashboard />} />
          <Route path="events" element={<CoordinatorEvents />} />
          <Route path="events/:id" element={<CoordinatorEventManage />} />
          <Route path="analytics" element={<CoordinatorAnalytics />} />
          <Route path="profile" element={<CoordinatorProfile />} />
        </Route>
      </Routes>
    </AuthProvider>
  )
}

export default App
