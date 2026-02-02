import { X, Search, Calendar, MapPin, User, Shield } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../context/AuthContext";

export default function ChatInfo({ chat, onClose, onUpdate }) {
    // ... existing hooks


    const { profile } = useAuth();
    const [members, setMembers] = useState([]);
    const [regCount, setRegCount] = useState(0);
    const [searchQuery, setSearchQuery] = useState("");
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!chat) return;
        fetchMembers();
    }, [chat]);

    const fetchMembers = async () => {
        setLoading(true);

        // 1. Get accurate registration count (Students only)
        const { count: registrationCount, error: regError } = await supabase
            .from('registrations')
            .select('*', { count: 'exact', head: true })
            .eq('event_id', chat.event.id)
            .eq('status', 'approved'); // Only approved registrations? User said "Registered". Typically approved.

        // 2. Get chat members
        const { data: chatMembers, error } = await supabase
            .from('chat_members')
            .select('user_id, role')
            .eq('chat_id', chat.id);

        if (error) {
            console.error("Error fetching members:", error);
            setLoading(false);
            return;
        }

        const userIds = chatMembers.map(m => m.user_id);

        if (userIds.length > 0) {
            // 3. Get profile details
            const { data: profiles } = await supabase
                .from('profiles')
                .select('*')
                .in('id', userIds);

            setMembers(profiles);
        }

        // Store registration count separately or use it
        setRegCount(registrationCount || 0);
        setLoading(false);
    };

    const filteredMembers = members.filter(m =>
        m.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.roll_number?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Sort: Admins first, then Faculty/Coordinators, then everyone else
    filteredMembers.sort((a, b) => {
        if (a.role === 'admin' && b.role !== 'admin') return -1;
        if (a.role !== 'admin' && b.role === 'admin') return 1;
        const isACoord = a.role === 'faculty' || a.role === 'coordinator';
        const isBCoord = b.role === 'faculty' || b.role === 'coordinator';
        if (isACoord && !isBCoord && b.role !== 'admin') return -1;
        if (!isACoord && isBCoord) return 1;
        return 0;
    });

    return (
        <div className="h-full flex flex-col bg-white">
            {/* Header */}
            <div className="h-16 border-b border-gray-100 flex items-center px-4 bg-gray-50">
                <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full mr-2">
                    <X size={20} />
                </button>
                <h3 className="font-bold text-gray-800">Event Info</h3>
            </div>

            <div className="flex-1 overflow-y-auto">
                {/* Banner / basic info */}
                <div className="p-6 flex flex-col items-center bg-white border-b border-gray-100">
                    <div className="w-24 h-24 bg-primary/10 text-primary rounded-full flex items-center justify-center text-3xl font-bold mb-4 border-4 border-white shadow-lg">
                        {chat.event.name.charAt(0)}
                    </div>
                    <h2 className="text-xl font-bold text-center text-gray-800">{chat.event.name}</h2>
                    <span className="mt-1 px-3 py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full uppercase tracking-wide">
                        {chat.event.category}
                    </span>

                    <div className="w-full mt-6 space-y-3 text-sm text-gray-600">
                        {chat.event.description && (
                            <p className="text-center italic px-4 text-gray-500 mb-4">{chat.event.description}</p>
                        )}
                        <div className="flex items-center gap-3 bg-gray-50 p-3 rounded-lg">
                            <Calendar size={18} className="text-primary" />
                            <span>{new Date(chat.event.event_date).toLocaleDateString()}</span>
                        </div>
                        <div className="flex items-center gap-3 bg-gray-50 p-3 rounded-lg">
                            <MapPin size={18} className="text-primary" />
                            <span>{chat.event.venue || "TBA"}</span>
                        </div>
                    </div>
                </div>

                {/* Restrict Chat Toggle (Admins/Coordinators Only) */}
                {/* Positioned immediately after Venue Info, before Participants */}
                {(profile?.role === 'admin' || profile?.role === 'faculty' || profile?.role === 'coordinator') && (
                    <div className="p-4 bg-white border-b border-gray-100">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-red-100 text-red-600 rounded-lg">
                                    <Shield size={20} />
                                </div>
                                <div>
                                    <h4 className="font-semibold text-gray-800">Restrict Chat</h4>
                                    <p className="text-xs text-gray-500">Only admins/coordinators can send messages</p>
                                </div>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={chat.is_restricted || false}
                                    className="sr-only peer"
                                    onChange={async (e) => {
                                        const newVal = e.target.checked;
                                        const { error } = await supabase
                                            .from('chat_rooms')
                                            .update({ is_restricted: newVal })
                                            .eq('id', chat.id);

                                        if (error) {
                                            console.error("Error updating restriction:", error);
                                            alert("Failed to update restriction");
                                        } else {
                                            if (onUpdate) onUpdate();
                                        }
                                    }}
                                />
                                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
                            </label>
                        </div>
                    </div>
                )}

                {/* Search Members */}
                <div className="p-4 bg-white">
                    <h4 className="font-bold text-gray-800 mb-3 flex items-center justify-between">
                        <span>Participants</span>
                        <span className="text-xs font-normal text-gray-400 bg-gray-100 px-2 py-1 rounded-full">{members.length}</span>
                    </h4>
                    <div className="relative mb-3">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <input
                            type="text"
                            placeholder="Search by name or roll no..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-100 rounded-lg text-sm focus:outline-none focus:border-primary/50"
                        />
                    </div>

                    <div className="space-y-1">
                        {loading ? (
                            <div className="text-center py-4 text-gray-400 text-sm">Loading participants...</div>
                        ) : filteredMembers.length === 0 ? (
                            <div className="text-center py-4 text-gray-400 text-sm">No members found.</div>
                        ) : (
                            filteredMembers.map(member => (
                                <div key={member.id} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg transition group">
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center font-bold text-gray-600 border border-gray-100">
                                        {member.full_name?.charAt(0)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between">
                                            <h5 className="font-semibold text-sm text-gray-900 truncate">{member.full_name}</h5>
                                            {member.role === 'admin' && (
                                                <span className="text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded font-medium border border-red-200">Admin</span>
                                            )}
                                            {(member.role === 'faculty' || member.role === 'coordinator') && (
                                                <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-medium border border-blue-200">Coordinator</span>
                                            )}
                                        </div>
                                        <div className="flex items-center justify-between text-xs text-gray-500 mt-0.5">
                                            <span>{member.roll_number || "No Roll No"}</span>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
