import { useState } from 'react'
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../../context/AuthContext'
import {
    LayoutDashboard,
    Calendar,
    Activity,
    Trophy,
    User,
    LogOut,
    Menu,
    X
} from 'lucide-react'

export default function StudentShell() {
    const location = useLocation()
    const navigate = useNavigate()
    const { user, profile, signOut } = useAuth()
    const [sidebarOpen, setSidebarOpen] = useState(false)

    const handleSignOut = async () => {
        await signOut()
        navigate('/login')
    }

    const navigation = [
        { name: 'Dashboard', href: '/student/dashboard', icon: LayoutDashboard },
        { name: 'Events', href: '/student/events', icon: Calendar },
        { name: 'Live Events', href: '/student/live', icon: Activity },
        { name: 'My Events', href: '/student/my-events', icon: Trophy },
        { name: 'Profile', href: '/student/profile', icon: User },
    ]

    const isActive = (path) => location.pathname === path

    return (
        <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50">
            {/* Mobile sidebar backdrop */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 z-40 bg-gray-600 bg-opacity-75 lg:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <div
                className={`fixed inset-y-0 left-0 z-50 w-64 bg-gradient-to-b from-purple-600 to-indigo-700 transform transition-transform duration-300 ease-in-out lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'
                    }`}
            >
                <div className="flex flex-col h-full">
                    {/* Header */}
                    <div className="flex items-center justify-between px-6 py-5 border-b border-purple-500/30">
                        <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center">
                                <span className="text-white font-bold text-lg">B</span>
                            </div>
                            <div>
                                <h1 className="text-xl font-bold text-white tracking-tight">Bonhomie</h1>
                                <p className="text-xs text-purple-200">Student Portal</p>
                            </div>
                        </div>
                        <button
                            onClick={() => setSidebarOpen(false)}
                            className="lg:hidden text-white hover:text-purple-200"
                        >
                            <X className="h-6 w-6" />
                        </button>
                    </div>

                    {/* Navigation */}
                    <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
                        {navigation.map((item) => {
                            const Icon = item.icon
                            const active = isActive(item.href)
                            return (
                                <Link
                                    key={item.name}
                                    to={item.href}
                                    onClick={() => setSidebarOpen(false)}
                                    className={`flex items-center px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 ${active
                                            ? 'bg-white text-purple-700 shadow-lg shadow-purple-900/20'
                                            : 'text-purple-100 hover:bg-purple-500/30 hover:text-white'
                                        }`}
                                >
                                    <Icon className={`h-5 w-5 mr-3 ${active ? 'text-purple-600' : 'text-purple-300'}`} />
                                    {item.name}
                                </Link>
                            )
                        })}
                    </nav>

                    {/* User Profile */}
                    <div className="px-4 py-4 border-t border-purple-500/30">
                        <div className="flex items-center px-4 py-3 bg-purple-500/20 rounded-xl">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-300 to-pink-300 flex items-center justify-center">
                                <span className="text-purple-700 font-bold text-sm">
                                    {profile?.full_name?.charAt(0) || 'S'}
                                </span>
                            </div>
                            <div className="ml-3 flex-1 min-w-0">
                                <p className="text-sm font-semibold text-white truncate">
                                    {profile?.full_name || 'Student'}
                                </p>
                                <p className="text-xs text-purple-200 truncate">Participant</p>
                            </div>
                        </div>
                        <button
                            onClick={handleSignOut}
                            className="w-full mt-3 flex items-center justify-center px-4 py-2.5 bg-red-500/90 hover:bg-red-600 text-white rounded-xl text-sm font-semibold transition-all duration-200 shadow-md hover:shadow-lg"
                        >
                            <LogOut className="h-4 w-4 mr-2" />
                            Logout
                        </button>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="lg:pl-64">
                {/* Mobile header */}
                <div className="sticky top-0 z-30 lg:hidden flex items-center justify-between px-4 py-3 bg-white border-b border-gray-200 shadow-sm">
                    <button
                        onClick={() => setSidebarOpen(true)}
                        className="text-gray-600 hover:text-gray-900"
                    >
                        <Menu className="h-6 w-6" />
                    </button>
                    <h1 className="text-lg font-bold text-gray-900">Bonhomie</h1>
                    <div className="w-6" /> {/* Spacer for centering */}
                </div>

                {/* Page Content */}
                <main className="min-h-screen">
                    <Outlet />
                </main>
            </div>
        </div>
    )
}
