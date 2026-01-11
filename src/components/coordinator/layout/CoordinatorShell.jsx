import { useState } from 'react'
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { LayoutDashboard, Calendar, BarChart3, User, LogOut, Menu, X, Bell } from 'lucide-react'
import { useAuth } from '../../../context/AuthContext'

export default function CoordinatorShell() {
    const [sidebarOpen, setSidebarOpen] = useState(false)
    const { signOut, profile } = useAuth()
    const navigate = useNavigate()
    const location = useLocation()

    const handleSignOut = async () => {
        await signOut()
        navigate('/login')
    }

    const navigation = [
        { name: 'Dashboard', href: '/coordinator/dashboard', icon: LayoutDashboard },
        { name: 'My Events', href: '/coordinator/events', icon: Calendar },
        { name: 'Analytics', href: '/coordinator/analytics', icon: BarChart3 },
        { name: 'Profile', href: '/coordinator/profile', icon: User },
    ]

    return (
        <div className="min-h-screen bg-gray-50 flex">
            {/* Mobile Sidebar Backdrop */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 z-40 bg-gray-900/50 backdrop-blur-sm lg:hidden transition-opacity"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside className={`
                fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0
                ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
            `}>
                <div className="flex flex-col h-full">
                    {/* Logo Area */}
                    <div className="h-16 flex items-center px-6 border-b border-gray-100">
                        <span className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                            Bonhomie <span className="text-xs font-medium text-gray-500 ml-1">COORD</span>
                        </span>
                        <button onClick={() => setSidebarOpen(false)} className="ml-auto lg:hidden text-gray-400">
                            <X className="h-6 w-6" />
                        </button>
                    </div>

                    {/* Navigation */}
                    <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
                        {navigation.map((item) => {
                            const isActive = location.pathname.startsWith(item.href)
                            return (
                                <NavLink
                                    key={item.name}
                                    to={item.href}
                                    onClick={() => setSidebarOpen(false)}
                                    className={`
                                        flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200
                                        ${isActive
                                            ? 'bg-indigo-50 text-indigo-700 shadow-sm'
                                            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}
                                    `}
                                >
                                    <item.icon className={`h-5 w-5 mr-3 ${isActive ? 'text-indigo-600' : 'text-gray-400 group-hover:text-gray-500'}`} />
                                    {item.name}
                                </NavLink>
                            )
                        })}
                    </nav>

                    {/* User Profile & Logout */}
                    <div className="p-4 border-t border-gray-100">
                        <div className="flex items-center gap-3 px-4 py-3 mb-2">
                            <div className="h-9 w-9 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-sm">
                                {profile?.full_name?.[0] || 'C'}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900 truncate">{profile?.full_name}</p>
                                <p className="text-xs text-gray-500 truncate">Event Coordinator</p>
                            </div>
                        </div>
                        <button
                            onClick={handleSignOut}
                            className="flex w-full items-center px-4 py-2 text-sm font-medium text-red-600 rounded-xl hover:bg-red-50 transition-colors"
                        >
                            <LogOut className="h-5 w-5 mr-3" />
                            Sign Out
                        </button>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                {/* Mobile Header */}
                <header className="lg:hidden flex items-center justify-between px-4 py-3 bg-white border-b border-gray-200">
                    <button onClick={() => setSidebarOpen(true)} className="p-2 -ml-2 text-gray-500 hover:bg-gray-100 rounded-md">
                        <Menu className="h-6 w-6" />
                    </button>
                    <span className="font-bold text-gray-900">Coordinator Panel</span>
                    <div className="w-8" />
                </header>

                {/* Content Scroll Area */}
                <main className="flex-1 overflow-y-auto bg-gray-50 p-4 lg:p-8">
                    <Outlet />
                </main>
            </div>
        </div>
    )
}
