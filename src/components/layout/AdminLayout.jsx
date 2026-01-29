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
    X
} from 'lucide-react'
import { useState } from 'react'
import clsx from 'clsx'
import { useAuth } from '../../context/AuthContext'

const navigation = [
    { name: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
    { name: 'Events', href: '/admin/events', icon: Calendar },
    { name: 'Coordinators', href: '/admin/coordinators', icon: Users },
    { name: 'Students', href: '/admin/students', icon: GraduationCap },
    { name: 'Payments', href: '/admin/payments', icon: CreditCard },
    { name: 'Analytics', href: '/admin/analytics', icon: BarChart3 },
    { name: 'Certificates', href: '/admin/certificates', icon: Award },
    { name: 'Notifications', href: '/admin/notifications', icon: Bell },
    { name: 'Settings', href: '/admin/settings', icon: Settings },
]

export default function AdminLayout() {
    const { signOut, user } = useAuth()
    const navigate = useNavigate()
    const location = useLocation()
    const [sidebarOpen, setSidebarOpen] = useState(false)

    const handleSignOut = async () => {
        try {
            await signOut()
        } catch (err) {
            console.warn('Logout error (ignored):', err)
        }
        // Always navigate to login
        navigate('/login')
    }

    return (
        <div className="min-h-screen bg-gray-100">
            {/* Mobile sidebar toggle */}
            <div className="lg:hidden sticky top-0 z-40 flex items-center gap-x-6 bg-white px-4 py-4 shadow-sm sm:px-6">
                <button type="button" className="-m-2.5 p-2.5 text-gray-700 lg:hidden" onClick={() => setSidebarOpen(true)}>
                    <Menu className="h-6 w-6" aria-hidden="true" />
                </button>
                <div className="flex-1 text-sm font-semibold leading-6 text-gray-900">Admin Command Center</div>
            </div>

            {/* Sidebar */}
            <div className={clsx(
                "fixed inset-y-0 z-50 flex w-72 flex-col transition-transform duration-300 transform lg:translate-x-0 lg:static lg:inset-auto lg:flex",
                sidebarOpen ? "translate-x-0" : "-translate-x-full"
            )}>
                <div className="flex grow flex-col gap-y-5 overflow-y-auto border-r border-gray-200 bg-white px-6 pb-4">
                    <div className="flex h-16 shrink-0 items-center justify-between">
                        <span className="text-2xl font-bold text-primary">Bonhomie Admin</span>
                        <button className="lg:hidden" onClick={() => setSidebarOpen(false)}>
                            <X className="h-6 w-6 text-gray-500" />
                        </button>
                    </div>
                    <nav className="flex flex-1 flex-col">
                        <ul role="list" className="flex flex-1 flex-col gap-y-7">
                            <li>
                                <ul role="list" className="-mx-2 space-y-1">
                                    {navigation.map((item) => {
                                        const isActive = location.pathname === item.href
                                        return (
                                            <li key={item.name}>
                                                <Link
                                                    to={item.href}
                                                    onClick={() => setSidebarOpen(false)}
                                                    className={clsx(
                                                        isActive
                                                            ? 'bg-gray-50 text-primary'
                                                            : 'text-gray-700 hover:text-primary hover:bg-gray-50',
                                                        'group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold'
                                                    )}
                                                >
                                                    <item.icon
                                                        className={clsx(
                                                            isActive ? 'text-primary' : 'text-gray-400 group-hover:text-primary',
                                                            'h-6 w-6 shrink-0'
                                                        )}
                                                        aria-hidden="true"
                                                    />
                                                    {item.name}
                                                </Link>
                                            </li>
                                        )
                                    })}
                                </ul>
                            </li>
                            <li className="mt-auto">
                                <Link
                                    to="/profile"
                                    className="group -mx-2 flex gap-x-3 rounded-md p-2 text-sm font-semibold leading-6 text-gray-700 hover:bg-gray-50 hover:text-primary"
                                >
                                    <Settings className="h-6 w-6 shrink-0 text-gray-400 group-hover:text-primary" aria-hidden="true" />
                                    Profile ({user?.email})
                                </Link>
                                <button
                                    onClick={handleSignOut}
                                    className="w-full text-left group -mx-2 flex gap-x-3 rounded-md p-2 text-sm font-semibold leading-6 text-red-600 hover:bg-red-50"
                                >
                                    <LogOut className="h-6 w-6 shrink-0 text-red-400 group-hover:text-red-600" aria-hidden="true" />
                                    Sign out
                                </button>
                            </li>
                        </ul>
                    </nav>
                </div>
            </div>

            {/* Main Content */}
            <main className={clsx("lg:pl-72", sidebarOpen && "fixed inset-0 overflow-hidden lg:static lg:overflow-visible")}>
                <div className="px-4 py-10 sm:px-6 lg:px-8 lg:py-6">
                    <Outlet />
                </div>
            </main>
        </div>
    )
}
