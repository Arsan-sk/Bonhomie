import { useState } from 'react'
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
    LayoutDashboard,
    Calendar,
    Users,
    GraduationCap,
    CreditCard,
    BarChart3,
    Award,
    Bell,
    Settings,
    LogOut,
    Menu,
    X,
    Search,
    User,
    ChevronDown
} from 'lucide-react'
import { useAuth } from '../../../context/AuthContext'
import clsx from 'clsx'

const navigation = [
    { name: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
    { name: 'Events', href: '/admin/events', icon: Calendar },
    { name: 'Coordinators', href: '/admin/coordinators', icon: Users },
    { name: 'Users', href: '/admin/users', icon: GraduationCap },
    { name: 'Analytics', href: '/admin/analytics', icon: BarChart3 },
    { name: 'Certificates', href: '/admin/certificates', icon: Award },
    { name: 'Notifications', href: '/admin/notifications', icon: Bell },
    { name: 'Settings', href: '/admin/settings', icon: Settings },
]

export default function AdminShell() {
    const { signOut, user } = useAuth()
    const navigate = useNavigate()
    const location = useLocation()
    const [sidebarOpen, setSidebarOpen] = useState(false)

    const handleSignOut = async () => {
        await signOut()
        navigate('/login')
    }

    const currentPage = navigation.find(item => item.href === location.pathname)?.name || 'Admin'

    return (
        <div className="min-h-screen bg-gray-50 flex">
            {/* 1. Fixed Sidebar (Desktop) */}
            <aside className="hidden lg:flex lg:flex-col lg:w-72 lg:fixed lg:inset-y-0 bg-slate-900 text-white z-50">
                {/* Brand */}
                <div className="flex items-center h-16 px-6 bg-slate-950 border-b border-slate-800">
                    <span className="text-xl font-bold tracking-tight text-white">Bonhomie<span className="text-indigo-500">Admin</span></span>
                </div>

                {/* Navigation */}
                <div className="flex-1 flex flex-col overflow-y-auto px-4 py-4 gap-y-1">
                    <div className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2 px-2">Main Menu</div>
                    {navigation.map((item) => {
                        const isActive = location.pathname === item.href
                        return (
                            <Link
                                key={item.name}
                                to={item.href}
                                className={clsx(
                                    isActive
                                        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30'
                                        : 'text-slate-400 hover:bg-slate-800 hover:text-white',
                                    'group flex items-center gap-x-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200'
                                )}
                            >
                                <item.icon className={clsx("h-5 w-5 shrink-0", isActive ? "text-white" : "text-slate-500 group-hover:text-white")} />
                                {item.name}
                            </Link>
                        )
                    })}
                </div>

                {/* User Profile (Bottom) */}
                <div className="p-4 border-t border-slate-800 bg-slate-950">
                    <div className="flex items-center gap-x-3">
                        <div className="h-9 w-9 rounded-full bg-indigo-500 flex items-center justify-center text-white text-xs font-bold">
                            {user?.email?.[0].toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-white truncate">{user?.email}</p>
                            <p className="text-xs text-slate-500 truncate">Administrator</p>
                        </div>
                        <button onClick={handleSignOut} className="text-slate-400 hover:text-red-400 transition-colors">
                            <LogOut className="h-5 w-5" />
                        </button>
                    </div>
                </div>
            </aside>

            {/* Mobile Sidebar Overlay */}
            {sidebarOpen && (
                <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true">
                    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm transition-opacity" onClick={() => setSidebarOpen(false)}></div>
                    <div className="fixed inset-y-0 left-0 z-50 w-72 overflow-y-auto bg-slate-900 text-white sm:max-w-sm ring-1 ring-white/10">
                        {/* Mobile Sidebar Content (Mirror of Desktop) */}
                        <div className="flex items-center justify-between h-16 px-6 bg-slate-950 border-b border-slate-800">
                            <span className="text-xl font-bold text-white">Bonhomie<span className="text-indigo-500">Admin</span></span>
                            <button onClick={() => setSidebarOpen(false)}><X className="h-6 w-6 text-slate-400" /></button>
                        </div>
                        <div className="flex-1 flex flex-col px-4 py-4 gap-y-1">
                            {navigation.map((item) => (
                                <Link
                                    key={item.name}
                                    to={item.href}
                                    onClick={() => setSidebarOpen(false)}
                                    className={clsx(
                                        location.pathname === item.href
                                            ? 'bg-indigo-600 text-white'
                                            : 'text-slate-400 hover:bg-slate-800',
                                        'group flex items-center gap-x-3 rounded-lg px-3 py-2.5 text-sm font-medium'
                                    )}
                                >
                                    <item.icon className="h-5 w-5" />
                                    {item.name}
                                </Link>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Main Content Wrapper */}
            <div className="flex-1 flex flex-col lg:pl-72 min-h-screen transition-all duration-300">
                {/* 2. Sticky Topbar */}
                <header className="sticky top-0 z-40 flex h-16 shrink-0 items-center justify-between gap-x-4 border-b border-gray-200 bg-white/80 backdrop-blur-md px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:px-8">
                    <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6 items-center">
                        <button type="button" className="-m-2.5 p-2.5 text-gray-700 lg:hidden" onClick={() => setSidebarOpen(true)}>
                            <Menu className="h-6 w-6" aria-hidden="true" />
                        </button>

                        {/* Breadcrumbs / Page Title */}
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                            <span className="hidden sm:inline">Admin</span>
                            <span className="hidden sm:inline">/</span>
                            <span className="font-semibold text-gray-900">{currentPage}</span>
                        </div>

                        {/* Search Bar (Global) */}
                        <div className="flex-1 max-w-md ml-auto sm:ml-8 hidden sm:block">
                            <div className="relative rounded-md shadow-sm">
                                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                    <Search className="h-4 w-4 text-gray-400" aria-hidden="true" />
                                </div>
                                <input
                                    type="text"
                                    className="block w-full rounded-full border-0 py-1.5 pl-10 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6 bg-gray-50 hover:bg-white transition-colors"
                                    placeholder="Search events, students, transactions..."
                                />
                            </div>
                        </div>
                    </div>
                </header>

                {/* 3. Content Area */}
                <main className="py-8">
                    <div className="px-4 sm:px-6 lg:px-8">
                        <Outlet />
                    </div>
                </main>
            </div>
        </div>
    )
}
