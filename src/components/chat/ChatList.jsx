import { useState, useEffect } from "react";
import { Link, useParams, useLocation } from "react-router-dom";
import { Search } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import clsx from "clsx";

export default function ChatList() {
    const { chatId } = useParams();
    const location = useLocation();
    const { user, profile, supabase } = useAuth();
    const [chats, setChats] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");

    // Get base path for building chat URLs (e.g., /student/chats, /admin/chats)
    const basePath = location.pathname.split('/').slice(0, -1).join('/') || location.pathname;

    useEffect(() => {
        if (profile?.id) {
            fetchChats();
        }
    }, [profile]);

    // Real-time subscription for auto-refresh when new messages arrive
    useEffect(() => {
        if (!profile?.id || !supabase) return;

        // Subscribe to new messages AND read status updates to refresh the chat list
        const channel = supabase
            .channel('chatlist-updates')
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'chat_messages' },
                () => {
                    // Refetch to update unread counts and reorder by latest message
                    fetchChats();
                }
            )
            .on(
                'postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'chat_members' },
                () => {
                    // Refetch when messages are marked as read
                    fetchChats();
                }
            )
            .subscribe();

        return () => {
            channel.unsubscribe();
        };
    }, [profile?.id]);

    const fetchChats = async () => {
        try {
            setLoading(true);
            console.log('[ChatList] Fetching chat summary for profile:', profile?.id);

            // Use RPC to get sorted chats with unread counts
            const { data, error } = await supabase.rpc('get_my_chats_summary');

            console.log('[ChatList] RPC Response - data:', data, 'error:', error);

            if (error) {
                console.error("[ChatList] RPC Error:", error);
                // Fallback to old method if RPC fails (meaning SQL script wasn't run)
                fetchChatsFallback();
                return;
            }

            console.log('[ChatList] Fetched chats:', data?.length, 'chats');
            if (data && data.length > 0) {
                console.log('[ChatList] First chat sample:', data[0]);
            }
            setChats(data || []);
        } catch (error) {
            console.error("[ChatList] Error fetching chats:", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchChatsFallback = async () => {
        // ... (Keep existing logic as fallback, but for now just log error)
        console.log("Using fallback fetch (RPC missing)");
        // 1. Get chat rooms the user is a member of
        const { data: members, error: memberError } = await supabase
            .from("chat_members")
            .select("chat_id")
            .eq("user_id", profile.id);


        if (memberError) throw memberError;

        const chatIds = members.map(m => m.chat_id);

        if (chatIds.length === 0) {
            setChats([]);
            return;
        }

        // 2. Get chat room details
        const { data: rooms, error: roomError } = await supabase
            .from("chat_rooms")
            .select(`
            id,
            event:events (
                id,
                name,
                category
            )
        `)
            .in("id", chatIds);

        if (roomError) throw roomError;

        // Transform to match RPC structure slightly for compatibility
        const mappedRooms = rooms.map(r => ({
            chat_id: r.id,
            event_name: r.event.name,
            event_category: r.event.category || 'Event',
            unread_count: 0,
            last_message_content: '',
            last_message_time: null
        }));

        setChats(mappedRooms);
    };

    const filteredChats = chats.filter(chat =>
        chat.event_name?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="p-4 border-b border-gray-100 bg-white">
                <h1 className="text-xl font-bold text-gray-800 mb-4">Messages</h1>
                <div className="relative group">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5 group-focus-within:text-primary transition-colors" />
                    <input
                        type="text"
                        placeholder="Search events..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm"
                    />
                </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
                {loading ? (
                    // Skeleton Loading
                    Array(5).fill(0).map((_, i) => (
                        <div key={i} className="flex items-center gap-3 p-3 rounded-xl animate-pulse">
                            <div className="w-12 h-12 bg-gray-200 rounded-full" />
                            <div className="flex-1 space-y-2">
                                <div className="h-4 bg-gray-200 rounded w-2/3" />
                                <div className="h-3 bg-gray-200 rounded w-1/2" />
                            </div>
                        </div>
                    ))
                ) : filteredChats.length === 0 ? (
                    <div className="p-8 text-center text-gray-400 text-sm">
                        No chats found.
                    </div>
                ) : (
                    filteredChats.map((chat) => (
                        <Link
                            key={chat.chat_id}
                            to={chat.chat_id}
                            className={clsx(
                                "flex items-center gap-4 p-3 rounded-xl transition-all duration-200",
                                chatId === chat.chat_id
                                    ? "bg-indigo-50 text-indigo-700"
                                    : "hover:bg-gray-50 text-gray-700 hover:text-gray-900"
                            )}
                        >
                            {/* Event Icon */}
                            <div className="relative">
                                <div className={clsx(
                                    "flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold shadow-sm",
                                    chatId === chat.chat_id ? "bg-indigo-600 text-white" : "bg-white border border-gray-100 text-indigo-600"
                                )}>
                                    {chat.event_name?.charAt(0).toUpperCase()}
                                </div>
                                {/* Unread Bubble */}
                                {chat.unread_count > 0 && (
                                    <div className="absolute -top-1 -right-1 bg-indigo-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full border-2 border-white shadow-sm min-w-[20px] text-center">
                                        {chat.unread_count > 10 ? "10+" : chat.unread_count}
                                    </div>
                                )}
                            </div>

                            <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-start">
                                    <h3 className="font-semibold truncate text-sm">{chat.event_name}</h3>
                                    {chat.last_message_time && (
                                        <span className="text-[10px] text-gray-400 whitespace-nowrap ml-2">
                                            {new Date(chat.last_message_time).toLocaleDateString() === new Date().toLocaleDateString()
                                                ? new Date(chat.last_message_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                                                : new Date(chat.last_message_time).toLocaleDateString()}
                                        </span>
                                    )}
                                </div>
                                <p className={clsx(
                                    "text-xs truncate mt-0.5",
                                    chat.unread_count > 0 ? "font-semibold text-gray-900" : "text-gray-500"
                                )}>
                                    {chat.last_message_content || "Click to start chatting"}
                                </p>
                            </div>
                        </Link>
                    ))
                )}
            </div>
        </div>
    );
}
