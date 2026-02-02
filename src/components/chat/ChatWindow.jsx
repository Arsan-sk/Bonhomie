import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Send, ArrowLeft, Info, Check, CheckCheck, Shield } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { supabase } from "../../lib/supabase";
import clsx from "clsx";
import MessageBubble from "./MessageBubble";
import ChatInfo from "./ChatInfo";


export default function ChatWindow() {
    const { chatId } = useParams();
    const navigate = useNavigate();
    const { user, profile } = useAuth();

    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState("");
    const [chatInfo, setChatInfo] = useState(null);
    const [loading, setLoading] = useState(true);
    const [loadingMessages, setLoadingMessages] = useState(true);
    const [showInfo, setShowInfo] = useState(false);

    const messagesEndRef = useRef(null);

    // Scroll to bottom
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // Fetch Chat Info
    useEffect(() => {
        if (!chatId) return;

        const fetchChatDetails = async () => {
            setLoading(true);
            const { data, error } = await supabase
                .from("chat_rooms")
                .select(`
                id,
                is_restricted, 
                event:events (
                    id, name, description, category, venue, event_date, faculty_coordinators, student_coordinators
                )
            `)
                .eq("id", chatId)
                .single();

            if (data) setChatInfo(data);
            setLoading(false);
        };

        fetchChatDetails();
    }, [chatId]);

    // Unified Fetch Function (Used for load, refetch, and updates)
    const fetchMessagesWithProfiles = async () => {
        // Fetch raw messages
        const { data: rawMessages, error } = await supabase
            .from("chat_messages")
            .select("*")
            .eq("chat_id", chatId)
            .order("created_at", { ascending: true });

        if (error) {
            console.error('[ChatWindow] Error fetching messages:', error);
            return [];
        }

        if (!rawMessages || rawMessages.length === 0) return [];

        // Fetch sender profiles separately
        const uniqueSenderIds = [...new Set(rawMessages.map(m => m.sender_id))].filter(id => id && id !== 'null' && id !== 'undefined');

        if (uniqueSenderIds.length === 0) return rawMessages;

        const { data: profiles, error: profileError } = await supabase
            .from('profiles')
            .select('id, full_name, roll_number, role')
            .in('id', uniqueSenderIds);

        if (profileError) {
            console.error('[ChatWindow] Error fetching profiles:', profileError);
            return rawMessages;
        }

        // Map profiles to messages
        return rawMessages.map(msg => ({
            ...msg,
            sender: profiles?.find(p => p.id === msg.sender_id) || null
        }));
    };

    // Initial Load & Subscription
    useEffect(() => {
        if (!chatId) return;

        console.log('[ChatWindow] Initializing chat:', chatId);
        setLoadingMessages(true);

        const loadMessages = async () => {
            const msgs = await fetchMessagesWithProfiles();
            setMessages(msgs);
            setLoadingMessages(false);
        };

        loadMessages();

        // Mark as read immediately
        const markRead = async () => {
            await supabase.rpc('mark_chat_read', { p_chat_id: chatId });
        };
        markRead();

        // Real-time Subscription for Messages
        const messageSubscription = supabase
            .channel(`chat:${chatId}`)
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `chat_id=eq.${chatId}` },
                async (payload) => {
                    console.log('[ChatWindow] Real-time insert received:', payload.new);
                    const msgs = await fetchMessagesWithProfiles();
                    if (msgs.length > 0) setMessages(msgs);
                }
            )
            .subscribe();

        // Real-time Subscription for Chat Room Updates (Restriction Toggle)
        // Enable this so when Admin toggles restriction, everyone sees it instantly
        const roomSubscription = supabase
            .channel(`room:${chatId}`)
            .on(
                'postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'chat_rooms', filter: `id=eq.${chatId}` },
                (payload) => {
                    console.log('[ChatWindow] Room update received:', payload.new);
                    if (payload.new) {
                        setChatInfo(prev => ({
                            ...prev,
                            // Merge new data (specifically is_restricted)
                            ...payload.new,
                            // Preserve the nested event object which isn't in the payload
                            event: prev?.event
                        }));
                    }
                }
            )
            .subscribe();

        // 3. Polling Fallback (Robust Auto-Refresh)
        // Ensure messages load even if Realtime connection drops
        const intervalId = setInterval(() => {
            // Quietly fetch updates
            fetchMessagesWithProfiles().then(msgs => {
                if (msgs.length > 0) {
                    setMessages(prev => {
                        // Only update if length changed or last message different (simple equality check)
                        // To avoid re-renders. But for now, simple replacement is safer for ensuring we get new msgs.
                        // Or better: just replace if new count > old count
                        if (msgs.length !== prev.length) return msgs;
                        // Check last message ID
                        if (msgs.length > 0 && prev.length > 0 && msgs[msgs.length - 1].id !== prev[prev.length - 1].id) return msgs;
                        return prev;
                    });
                }
            });
        }, 3000); // Check every 3 seconds

        return () => {
            messageSubscription.unsubscribe();
            roomSubscription.unsubscribe();
            clearInterval(intervalId);
        };

    }, [chatId]);


    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!newMessage.trim() || !profile?.id) return;

        const txt = newMessage.trim();
        setNewMessage(""); // Optimistic clear
        scrollToBottom();

        console.log('[ChatWindow] Sending message:', txt);

        // Send to DB
        const { data, error } = await supabase
            .from("chat_messages")
            .insert({
                chat_id: chatId,
                sender_id: profile.id,
                content: txt
            })
            .select();

        if (error) {
            console.error("[ChatWindow] Failed to send message:", error);
            alert("Failed to send message: " + error.message);
            setNewMessage(txt); // Restore if failed
        } else {
            console.log('[ChatWindow] Message sent successfully. Refetching...');

            // Manual Refetch to ensure it appears immediately with profile info
            const msgs = await fetchMessagesWithProfiles();
            if (msgs.length > 0) setMessages(msgs);
        }
    };

    if (loading) return <div className="h-full flex items-center justify-center bg-gray-50"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>;
    if (!chatInfo) return <div className="h-full flex items-center justify-center text-red-500">Chat not found</div>;

    return (
        <div className="flex h-full relative overflow-hidden">
            {/* Main Chat Area */}
            <div className="flex-1 flex flex-col min-w-0 bg-[#e5ddd5]/30"> {/* Subtle WhatsApp-like bg tone */}

                {/* Header */}
                <div className="h-16 bg-white px-4 flex items-center justify-between border-b border-gray-200 shadow-sm z-10">
                    <div className="flex items-center gap-3">
                        <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-gray-600 hover:bg-gray-100 rounded-full mr-2">
                            <ArrowLeft size={20} />
                        </button>

                        <div
                            className="flex items-center gap-3 cursor-pointer hover:bg-gray-50 p-2 rounded-lg transition"
                            onClick={() => setShowInfo(true)}
                        >
                            <div className="w-10 h-10 bg-primary/10 text-primary rounded-full flex items-center justify-center font-bold border border-primary/20">
                                {chatInfo.event.name.charAt(0)}
                            </div>
                            <div>
                                <h2 className="font-bold text-gray-800 leading-tight truncate max-w-[150px] sm:max-w-md">
                                    {chatInfo.event.name}
                                </h2>
                                <p className="text-xs text-gray-500 truncate">
                                    Tap for group info
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {/* Add actions if needed */}
                    </div>
                </div>

                {/* Messages Area */}
                <div
                    className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/50 custom-scrollbar"
                >
                    {/* Optional: Add a "This is the start of the chat" banner */}
                    <div className="flex justify-center my-4">
                        <div className="bg-yellow-50 text-yellow-700 text-xs px-3 py-1 rounded-full shadow-sm border border-yellow-100 flex items-center gap-2">
                            <Shield size={12} />
                            Messages are encrypted and secure.
                        </div>
                    </div>

                    {loadingMessages ? (
                        <div className="flex justify-center p-4">
                            <span className="loading loading-dots loading-md text-primary"></span>
                        </div>
                    ) : (
                        messages.map((msg, idx) => (
                            <MessageBubble
                                key={msg.id}
                                message={msg}
                                isMe={msg.sender_id === profile?.id}
                                previousMessage={messages[idx - 1]}
                            />
                        ))
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input Area (Restricted Check) */}
                {chatInfo.is_restricted && profile?.role !== 'admin' && profile?.role !== 'faculty' && profile?.role !== 'coordinator' ? (
                    <div className="p-4 bg-gray-50 border-t border-gray-200 text-center text-gray-500 text-sm flex flex-col items-center gap-1">
                        <Shield className="text-red-400" size={24} />
                        <span className="font-medium">Only admins can send messages</span>
                    </div>
                ) : (
                    <form onSubmit={handleSendMessage} className="p-3 bg-white border-t border-gray-100 flex items-center gap-2">
                        <input
                            type="text"
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            placeholder="Type a message..."
                            className="flex-1 py-3 px-4 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 bg-gray-50 transition-all font-medium text-gray-700 placeholder:text-gray-400"
                        />
                        <button
                            type="submit"
                            disabled={!newMessage.trim()}
                            className="p-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform active:scale-95 shadow-md flex items-center justify-center"
                        >
                            <Send size={20} />
                        </button>
                    </form>
                )}
            </div>

            {/* Info Drawer (Slide over) */}
            {showInfo && (
                <div className="absolute inset-y-0 right-0 w-full sm:w-96 bg-white shadow-2xl z-20 border-l border-gray-200 transform transition-transform duration-300 ease-in-out">
                    <ChatInfo
                        chat={chatInfo}
                        onClose={() => setShowInfo(false)}
                        onUpdate={() => {
                            // Refetch chat info to update restriction status in UI
                            const fetchChatDetails = async () => {
                                const { data } = await supabase
                                    .from("chat_rooms")
                                    .select(`
                                    id,
                                    is_restricted, 
                                    event:events (
                                        id, name, description, category, venue, event_date, faculty_coordinators, student_coordinators
                                    )
                                `)
                                    .eq("id", chatId)
                                    .single();

                                if (data) setChatInfo(data);
                            };
                            fetchChatDetails();
                        }}
                    />
                </div>
            )}
        </div>
    );
}
