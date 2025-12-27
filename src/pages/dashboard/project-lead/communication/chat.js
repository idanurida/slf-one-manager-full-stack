
// FILE: src/pages/dashboard/project-lead/communication/chat.js
import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/router";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";

// Components
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

// Icons
import {
    Send, ArrowLeft, MoreVertical, Phone, Video, User, Check, CheckCheck
} from "lucide-react";

// Utils & Context
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { supabase } from "@/utils/supabaseClient";
import { useAuth } from "@/context/AuthContext";
import { fetchProjectMessages, sendMessage as sendMessageService, markMessagesAsRead } from "@/utils/messageService";

export default function ChatPage() {
    const router = useRouter();
    const { recipient_id } = router.query;
    const { user, profile, loading: authLoading } = useAuth();

    const [recipient, setRecipient] = useState(null);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState("");
    const [loading, setLoading] = useState(true);
    const scrollRef = useRef(null);

    // sound effect
    // const playSendSound = () => new Audio('/sounds/sent.mp3').play().catch(() => {});

    useEffect(() => {
        if (router.isReady && recipient_id && user) {
            fetchChatData();
            const interval = setInterval(fetchMessages, 5000); // Poll every 5s
            return () => clearInterval(interval);
        }
    }, [router.isReady, recipient_id, user]);

    useEffect(() => {
        // Scroll to bottom when messages change
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const fetchChatData = async () => {
        setLoading(true);
        try {
            // Fetch Recipient
            const { data: recProfile, error: profileError } = await supabase
                .from('profiles')
                .select('id, full_name, email, role, specialization')
                .eq('id', recipient_id)
                .single();

            if (profileError) throw profileError;
            setRecipient(recProfile);

            await fetchMessages();
        } catch (err) {
            console.error(err);
            toast.error("Gagal memuat chat");
            router.push('/dashboard/project-lead/communication');
        } finally {
            setLoading(false);
        }
    };

    const fetchMessages = async () => {
        if (!user?.id || !recipient_id) return;

        // Note: For simplicity in this view, we're using recipient_id to find common project messages
        const { data, error } = await fetchProjectMessages(null, user.id, recipient_id);

        if (!error) {
            setMessages(data || []);
            await markMessagesAsRead(user.id, recipient_id);
        }
    };

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!newMessage.trim() || !user || !recipient) return;

        const msgText = newMessage.trim();
        setNewMessage(""); // Optimistic clear

        try {
            const { error } = await sendMessageService({
                senderId: user.id,
                recipientId: recipient.id,
                message: msgText
            });

            if (error) throw error;
            await fetchMessages();
            // playSendSound();

        } catch (err) {
            console.error(err);
            toast.error("Gagal mengirim pesan");
            setNewMessage(msgText); // Restore on fail
        }
    };

    if (authLoading || (user && !recipient_id)) return null;

    return (
        <DashboardLayout>
            <div className="max-w-4xl mx-auto h-[calc(100vh-64px)] md:h-[calc(100vh-100px)] flex flex-col bg-white dark:bg-[#0f172a] md:rounded-[2rem] shadow-none md:shadow-2xl overflow-hidden border-t md:border border-border -mx-4 -mb-4 md:mx-auto md:my-4 relative">

                {/* Chat Header */}
                <div className="p-4 bg-card border-b border-border flex items-center justify-between z-10">
                    <div className="flex items-center gap-4">
                        <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-full">
                            <ArrowLeft size={20} />
                        </Button>
                        <div className="flex items-center gap-3">
                            <Avatar>
                                <AvatarImage src={`https://ui-avatars.com/api/?name=${recipient?.full_name}&background=random`} />
                                <AvatarFallback>{recipient?.full_name?.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div>
                                <h2 className="text-lg font-bold text-slate-900 dark:text-white leading-tight">
                                    {loading && !recipient ? <Skeleton className="h-5 w-32" /> : recipient?.full_name}
                                </h2>
                                <p className="text-xs text-slate-500 font-medium">
                                    {recipient?.role?.replace(/_/g, ' ')} {recipient?.specialization ? `• ${recipient.specialization}` : ''}
                                </p>
                            </div>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        {/* Placeholder actions */}
                        {/* <Button variant="ghost" size="icon" className="rounded-full text-slate-400"><Phone size={20} /></Button>
                    <Button variant="ghost" size="icon" className="rounded-full text-slate-400"><Video size={20} /></Button> */}
                        <Button variant="ghost" size="icon" className="rounded-full text-slate-400"><MoreVertical size={20} /></Button>
                    </div>
                </div>

                {/* Chat Area */}
                <div
                    ref={scrollRef}
                    className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50 dark:bg-[#020617]/50 scroll-smooth"
                >
                    {loading && messages.length === 0 ? (
                        <div className="space-y-4">
                            {[1, 2, 3].map(i => <div key={i} className={`flex ${i % 2 === 0 ? 'justify-end' : ''} items-center`}><Skeleton className="h-12 w-1/3 rounded-2xl" /></div>)}
                        </div>
                    ) : messages.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-slate-400 opacity-50">
                            <User size={48} className="mb-2" />
                            <p>Mulai percakapan dengan {recipient?.full_name}</p>
                        </div>
                    ) : (
                        messages.map((msg, idx) => {
                            const isMe = msg.sender_id === user.id;
                            const showTime = idx === 0 || new Date(msg.created_at) - new Date(messages[idx - 1].created_at) > 3600000; // 1 hour gap

                            return (
                                <div key={msg.id}>
                                    {showTime && (
                                        <div className="text-center text-[10px] text-slate-400 font-medium my-4">
                                            {format(new Date(msg.created_at), 'dd MMM HH:mm', { locale: localeId })}
                                        </div>
                                    )}
                                    <div className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                        <div
                                            className={`
                                            max-w-[70%] p-4 rounded-2xl shadow-sm relative
                                            ${isMe
                                                    ? 'bg-[#7c3aed] text-white rounded-br-none'
                                                    : 'bg-card text-slate-700 dark:text-slate-200 rounded-bl-none'}
                                        `}
                                        >
                                            <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.message}</p>
                                            <div className={`flex items-center gap-1 mt-1 text-[10px] font-medium justify-end opacity-70`}>
                                                {format(new Date(msg.created_at), 'HH:mm')}
                                                {isMe && (
                                                    msg.is_read ? <CheckCheck size={12} /> : <Check size={12} />
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>

                {/* Input Area */}
                <form onSubmit={handleSendMessage} className="p-4 bg-card border-t border-border flex gap-3 items-center">
                    <Input
                        value={newMessage}
                        onChange={e => setNewMessage(e.target.value)}
                        placeholder="Tulis pesan..."
                        className="flex-1 bg-slate-50 dark:bg-slate-900 border-none h-12 rounded-xl focus:ring-2 focus:ring-[#7c3aed]/20"
                    />
                    <Button
                        type="submit"
                        size="icon"
                        disabled={!newMessage.trim()}
                        className="h-12 w-12 rounded-xl bg-[#7c3aed] hover:bg-[#6d28d9] text-white shadow-lg shadow-[#7c3aed]/25 transition-all"
                    >
                        <Send size={20} />
                    </Button>
                </form>
            </div>
        </DashboardLayout>
    );
}

