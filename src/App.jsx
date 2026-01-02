import { Routes, Route } from 'react-router-dom'
import Layout from './components/layout/Layout'
import Landing from './pages/Landing'
import Login from './pages/Login'
import Register from './pages/Register'
import Profile from './pages/Profile'
import Events from './pages/Events'
import EventDetail from './pages/EventDetail'
import EventRegistration from './pages/EventRegistration'
import StudentDashboard from './pages/dashboards/StudentDashboard'
import FacultyDashboard from './pages/dashboards/FacultyDashboard'
import AdminDashboard from './pages/dashboards/AdminDashboard'
import AdminStats from './pages/dashboards/AdminStats'
import { AuthProvider } from './context/AuthContext'

function App() {
  return (
    <AuthProvider>
      <Layout>
        <Routes>
          <Route path="/" element={<Landing />} />
          {/* Placeholders for other routes */}
          <Route path="/events" element={<Events />} />
          <Route path="/events/:id" element={<EventDetail />} />
          <Route path="/events/:id/register" element={<EventRegistration />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/dashboard" element={<StudentDashboard />} />
          <Route path="/faculty/dashboard" element={<FacultyDashboard />} />
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
          <Route path="/admin/stats" element={<AdminStats />} />
        </Routes>
      </Layout>
    </AuthProvider>
  )
}

export default App
