import { useState, useEffect } from 'react'
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
    X,
    MessageCircle
} from 'lucide-react'

export default function StudentShell() {
    const location = useLocation()
    const navigate = useNavigate()
    const { user, profile, signOut, supabase } = useAuth()
    const [sidebarOpen, setSidebarOpen] = useState(false)
    const [totalUnread, setTotalUnread] = useState(0)

    // Fetch unread count for sidebar bubble
    useEffect(() => {
        if (!profile || !supabase) {
            console.log('[StudentShell] Skipping unread fetch - profile:', !!profile, 'supabase:', !!supabase);
            return;
        }

        const fetchUnread = async () => {
            try {
                console.log('[StudentShell] Fetching unread for profile:', profile.id, profile.full_name);
                const { data, error } = await supabase.rpc('get_my_chats_summary');
                
                console.log('[StudentShell] RPC Response - data:', data, 'error:', error);
                
                if (error) {
                    console.error('[StudentShell] Error fetching unread:', error);
                    return;
                }
                if (data && Array.isArray(data)) {
                    const total = data.reduce((acc, chat) => acc + (Number(chat.unread_count) || 0), 0);
                    console.log('[StudentShell] Total unread calculated:', total, 'from chats:', data.length);
                    setTotalUnread(total);
                } else {
                    console.log('[StudentShell] No data or not an array:', data);
                    setTotalUnread(0);
                }
            } catch (err) {
                console.error('[StudentShell] Fetch unread error:', err);
            }
        };

        // Initial fetch
        fetchUnread();

        // Poll every 15 seconds for updates
        const interval = setInterval(fetchUnread, 15000);

        // Real-time subscription for instant updates when messages arrive OR are read
        const channel = supabase
            .channel('student-chat-notifications')
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'chat_messages' },
                () => {
                    // Refetch unread counts when any new message arrives
                    fetchUnread();
                }
            )
            .on(
                'postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'chat_members' },
                () => {
                    // Refetch when messages are marked as read (last_read_at updated)
                    fetchUnread();
                }
            )
            .subscribe();

        return () => {
            clearInterval(interval);
            channel.unsubscribe();
        };
    }, [profile, supabase]);

    const handleSignOut = async () => {
        try {
            await signOut()
        } catch (err) {
            console.warn('Logout error (ignored):', err)
        }
        // Always navigate to login, even if signOut had issues
        navigate('/login')
    }

    const navigation = [
        { name: 'Dashboard', href: '/student/dashboard', icon: LayoutDashboard },
        { name: 'Events', href: '/student/events', icon: Calendar },
        { name: 'Updates', href: '/student/updates', icon: Activity },
        { name: 'My Events', href: '/student/my-events', icon: Trophy },
        { name: 'Chats', href: '/student/chats', icon: MessageCircle },
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
                    {/* Brand */}
                    <div className="flex items-center h-16 px-6 bg-gradient-to-r from-purple-700 to-indigo-700 border-b border-purple-600">
                        <span className="text-xl font-bold tracking-tight text-white">Bonhomie</span>
                        <button
                            onClick={() => setSidebarOpen(false)}
                            className="ml-auto lg:hidden text-white/80 hover:text-white"
                        >
                            <X className="h-6 w-6" />
                        </button>
                    </div>

                    {/* Navigation */}
                    <div className="flex-1 flex flex-col overflow-y-auto px-4 py-4 gap-y-1">
                        <div className="text-xs font-medium text-purple-200 uppercase tracking-wider mb-2 px-2">Main Menu</div>
                        {navigation.map((item) => {
                            const Icon = item.icon
                            const active = isActive(item.href)
                            return (
                                <Link
                                    key={item.name}
                                    to={item.href}
                                    onClick={() => setSidebarOpen(false)}
                                    className={`group flex items-center gap-x-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 ${active
                                        ? 'bg-white text-purple-700 shadow-lg shadow-purple-900/20'
                                        : 'text-purple-100 hover:bg-purple-500/30 hover:text-white'
                                        }`}
                                >
                                    <Icon className={`h-5 w-5 shrink-0 ${active ? 'text-purple-600' : 'text-purple-300 group-hover:text-white'}`} />
                                    {item.name}
                                    {/* Unread Bubble for Chats */}
                                    {item.name === 'Chats' && totalUnread > 0 && (
                                        <span className="ml-auto bg-indigo-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full border-2 border-white shadow-sm min-w-[20px] text-center">
                                            {totalUnread > 99 ? '99+' : totalUnread}
                                        </span>
                                    )}
                                </Link>
                            )
                        })}
                    </div>

                    {/* User Profile (Bottom) */}
                    <div className="p-4 border-t border-purple-600">
                        <div className="flex items-center gap-x-3">
                            <button
                                onClick={() => navigate('/student/profile')}
                                className="h-10 w-10 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-purple-700 font-bold shadow-lg hover:scale-110 transition"
                                title="View Profile"
                            >
                                {profile?.full_name?.charAt(0) || 'S'}
                            </button>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-white truncate">{profile?.full_name || 'Student'}</p>
                                <p className="text-xs text-purple-200 truncate">{profile?.college_email || user?.email || 'No email'}</p>
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
