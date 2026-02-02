import clsx from "clsx";
import { Check, CheckCheck } from "lucide-react";

export default function MessageBubble({ message, isMe, previousMessage }) {
    // Determine sender label
    // Rules: 
    // - If Admin -> Label "Admin"
    // - If Coordinator/Faculty -> Label "Coordinator"
    // - If Student -> Label Roll Number
    // - Note: message.sender contains profile info due to our join in ChatWindow

    const getSenderLabel = () => {
        if (isMe) return "You";
        if (!message.sender) return "Unknown";

        const { full_name, role } = message.sender || {};

        // Return valid name or fallback
        return full_name || "Unknown Member";
    };

    const isSameSender = previousMessage && previousMessage.sender_id === message.sender_id;
    const time = new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // Role colors
    const getRoleColor = () => {
        const role = message.sender?.role;
        if (role === 'admin') return "text-red-500";
        if (role === 'faculty' || role === 'coordinator') return "text-indigo-600"; // Indigo for coordinators
        return "text-teal-600"; // Students
    };

    return (
        <div className={clsx(
            "flex flex-col mb-1",
            isMe ? "items-end" : "items-start",
            !isSameSender && "mt-2"
        )}>
            {/* Sender Name */}
            {!isMe && !isSameSender && (
                <span className={clsx(
                    "text-[13px] font-bold mb-0.5 ml-2 px-1",
                    getRoleColor()
                )}>
                    {getSenderLabel()}
                </span>
            )}

            <div className={clsx(
                "max-w-[80%] sm:max-w-[60%] rounded-2xl px-4 py-2 text-sm shadow-sm relative group transition-all",
                isMe
                    ? "bg-indigo-600 text-white rounded-tr-sm" // Indigo/Purple theme
                    : "bg-white text-gray-800 rounded-tl-sm"
            )}>
                <p className="whitespace-pre-wrap break-words leading-relaxed">
                    {message.content}
                </p>

                <div className={clsx(
                    "flex items-center justify-end gap-1 mt-1 select-none text-[10px]",
                    isMe ? "text-indigo-100" : "text-gray-400"
                )}>
                    <span>{time}</span>
                    {isMe && (
                        <div>
                            <CheckCheck size={14} className={clsx(
                                "opacity-70"
                            )} />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
