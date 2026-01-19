import { useState } from 'react'
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { LayoutDashboard, Calendar, BarChart3, User, LogOut, Menu, X, Bell, Activity } from 'lucide-react'
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
        { name: 'Manage Events', href: '/coordinator/events', icon: Calendar },
        { name: 'Analytics', href: '/coordinator/analytics', icon: BarChart3 },
        { name: 'Browse Events', href: '/coordinator/browse-events', icon: Calendar },
        { name: 'Updates', href: '/coordinator/updates', icon: Activity },
        { name: 'My Registrations', href: '/coordinator/my-registrations', icon: User },
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
                fixed inset-y-0 left-0 z-50 w-64 bg-gradient-to-b from-purple-600 to-indigo-700 transform transition-transform duration-300 ease-in-out
                ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
            `}>
                <div className="flex flex-col h-full">
                    {/* Brand */}
                    <div className="flex items-center h-16 px-6 border-b border-purple-500/30">
                        <span className="text-xl font-bold tracking-tight text-white">Bonhomie</span>
                        <button onClick={() => setSidebarOpen(false)} className="ml-auto lg:hidden text-white/80 hover:text-white">
                            <X className="h-6 w-6" />
                        </button>
                    </div>

                    {/* Navigation */}
                    <div className="flex-1 flex flex-col overflow-y-auto px-4 py-4 gap-y-1">
                        <div className="text-xs font-medium text-purple-200 uppercase tracking-wider mb-2 px-2">Main Menu</div>
                        {navigation.map((item) => {
                            const isActive = location.pathname.startsWith(item.href)
                            return (
                                <NavLink
                                    key={item.name}
                                    to={item.href}
                                    onClick={() => setSidebarOpen(false)}
                                    className={`
                                        group flex items-center gap-x-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200
                                        ${isActive
                                            ? 'bg-white text-purple-700 shadow-lg shadow-purple-900/20'
                                            : 'text-purple-100 hover:bg-purple-500/30 hover:text-white'}
                                    `}
                                >
                                    <item.icon className={`h-5 w-5 shrink-0 ${isActive ? 'text-purple-600' : 'text-purple-300 group-hover:text-white'}`} />
                                    {item.name}
                                </NavLink>
                            )
                        })}
                    </div>

                    {/* User Profile (Bottom) */}
                    <div className="p-4 border-t border-purple-600">
                        <div className="flex items-center gap-x-3">
                            <button
                                onClick={() => navigate('/coordinator/profile')}
                                className="h-10 w-10 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-purple-700 font-bold shadow-lg hover:scale-110 transition"
                                title="View Profile"
                            >
                                {profile?.full_name?.[0] || 'C'}
                            </button>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-white truncate">{profile?.full_name || 'Coordinator'}</p>
                                <p className="text-xs text-purple-200 truncate">{profile?.college_email || 'coordinator@bonhomie.com'}</p>
                            </div>
                            <button
                                onClick={handleSignOut}
                                className="text-purple-200 hover:text-red-300 transition-colors"
                                title="Sign Out"
                            >
                                <LogOut className="h-5 w-5" />
                            </button>
                        </div>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden lg:pl-64">
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
