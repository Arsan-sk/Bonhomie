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
import ProfilePage from './components/profile/ProfilePage'
import CoordinatorShell from './components/coordinator/layout/CoordinatorShell'
import ProtectedRoute from './components/auth/ProtectedRoute'

// Role-based Route Guards
import AdminRoute from './components/AdminRoute'
import CoordinatorRoute from './components/CoordinatorRoute'
import StudentRoute from './components/StudentRoute'

// Student Imports
import StudentShell from './components/student/layout/StudentShell'
import StudentDashboard from './pages/student/StudentDashboard'
import StudentEvents from './pages/student/StudentEvents'
import StudentMyEvents from './pages/student/StudentMyEvents'
import StudentLive from './pages/student/StudentLive'

// Admin Pages
import AdminDashboard from './pages/dashboards/AdminDashboard'
import AdminStats from './pages/dashboards/AdminStats'
import AdminShell from './components/admin/layout/AdminShell'
import AdminEvents from './pages/admin/AdminEvents'
import AdminAdvancedSearch from './pages/admin/AdminAdvancedSearch'
import AdminCoordinators from './pages/admin/AdminCoordinators'
import AdminUsers from './pages/admin/AdminUsers'
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
      <div id="top"></div>
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

        {/* Student Dashboard - Protected */}
        <Route path="/student" element={
          <StudentRoute>
            <StudentShell><Outlet /></StudentShell>
          </StudentRoute>
        }>
          <Route path="dashboard" element={<StudentDashboard />} />
          <Route path="events" element={<StudentEvents />} />
          <Route path="myevents" element={<StudentMyEvents />} />
          <Route path="live" element={<StudentLive />} />
          <Route path="profile" element={<ProfilePage />} />
        </Route>

        {/* Admin Dashboard - Protected (Admin Only) */}
        <Route path="/admin" element={
          <AdminRoute>
            <AdminShell><Outlet /></AdminShell>
          </AdminRoute>
        }>
          <Route path="dashboard" element={<AdminDashboard />} />
          <Route path="stats" element={<AdminStats />} />
          <Route path="events" element={<AdminEvents />} />
          <Route path="advanced-search" element={<AdminAdvancedSearch />} />
          <Route path="coordinators" element={<AdminCoordinators />} />
          <Route path="users" element={<AdminUsers />} />
          <Route path="payments" element={<AdminPayments />} />
          <Route path="analytics" element={<AdminAnalytics />} />
          <Route path="notifications" element={<AdminNotifications />} />
          <Route path="settings" element={<AdminSettings />} />
          <Route path="certificates" element={<AdminCertificates />} />
          <Route path="profile" element={<ProfilePage />} />
        </Route>

        {/* Coordinator Dashboard - Protected */}
        <Route path="/coordinator" element={
          <CoordinatorRoute>
            <CoordinatorShell><Outlet /></CoordinatorShell>
          </CoordinatorRoute>
        }>
          <Route path="dashboard" element={<CoordinatorDashboard />} />
          <Route path="events" element={<CoordinatorEvents />} />
          <Route path="events/:id" element={<CoordinatorEventManage />} />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="analytics" element={<CoordinatorAnalytics />} />
          {/* Coordinator as Student Routes */}
          <Route path="browse-events" element={<StudentEvents baseUrl="/coordinator/browse-events" />} />
          <Route path="browse-events/:id" element={<EventDetail />} />
          <Route path="browse-events/:id/register" element={<EventRegistration />} />
          <Route path="live" element={<StudentLive />} />
          <Route path="my-registrations" element={<StudentMyEvents />} />
        </Route>
      </Routes>
    </AuthProvider>
  )
}

export default App
