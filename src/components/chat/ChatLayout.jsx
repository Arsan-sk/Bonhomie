import { useState, useEffect } from "react";
import { Outlet, useLocation, useNavigate, useParams } from "react-router-dom";
import ChatList from "./ChatList";
import clsx from "clsx";

export default function ChatLayout() {
    const location = useLocation();
    const navigate = useNavigate();
    const { chatId } = useParams();
    
    // If we have a chat ID in the URL, we're in "chat window" mode on mobile
    // URL structure: /chats (list) or /chats/:chatId (conversation)
    const isChatOpen = !!chatId;

    return (
        <div className="flex h-[calc(100vh-64px)] overflow-hidden bg-gray-50">
            {/* Sidebar / Chat List */}
            <div
                className={clsx(
                    "w-full border-r border-gray-200 bg-white flex flex-col transition-all duration-300",
                    isChatOpen ? "hidden" : "flex"
                )}
            >
                <ChatList />
            </div>

            {/* Main Chat Window */}
            <div
                className={clsx(
                    "flex-1 flex flex-col bg-slate-50 relative",
                    !isChatOpen ? "hidden" : "flex"
                )}
            >
                {isChatOpen ? (
                    <Outlet />
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-gray-500 p-4 text-center">
                        <div className="w-24 h-24 bg-gray-200 rounded-full flex items-center justify-center mb-6 animate-pulse">
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                className="w-12 h-12 text-gray-400"
                            >
                                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                            </svg>
                        </div>
                        <h2 className="text-xl font-semibold text-gray-700">Select a chat to start messaging</h2>
                        <p className="mt-2 text-sm text-gray-400 max-w-sm">
                            Communicate with your team and coordinators in real-time.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
