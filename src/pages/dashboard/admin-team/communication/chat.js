
// FILE: src/pages/dashboard/admin-team/communication/chat.js
import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/router";
import { toast } from "sonner";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";

// Components
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

// Icons
import {
    Send, ArrowLeft, MoreVertical, Check, CheckCheck, User
} from "lucide-react";

// Utils & Context
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { supabase } from "@/utils/supabaseClient";
import { useAuth } from "@/context/AuthContext";

export default function AdminTeamChatPage() {
    const router = useRouter();
    const { recipient_id } = router.query;
    const { user, profile, loading: authLoading } = useAuth();

    const [recipient, setRecipient] = useState(null);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState("");
    const [loading, setLoading] = useState(true);
    const scrollRef = useRef(null);

    useEffect(() => {
        if (router.isReady && recipient_id && user) {
            fetchChatData();
            const interval = setInterval(fetchMessages, 5000);
            return () => clearInterval(interval);
        }
    }, [router.isReady, recipient_id, user]);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const fetchChatData = async () => {
        setLoading(true);
        try {
            const { data: recProfile, error: profileError } = await supabase
                .from('profiles')
                .select('id, full_name, role, specialization')
                .eq('id', recipient_id)
                .single();

            if (profileError) throw profileError;
            setRecipient(recProfile);

            await fetchMessages();
        } catch (err) {
            console.error(err);
            toast.error("Gagal memuat chat");
            router.push('/dashboard/admin-team/communication');
        } finally {
            setLoading(false);
        }
    };

    const fetchMessages = async () => {
        if (!user?.id || !recipient_id) return;

        const { data, error } = await supabase
            .from('notifications')
            .select('*')
            .or(`and(sender_id.eq.${user.id},recipient_id.eq.${recipient_id}),and(sender_id.eq.${recipient_id},recipient_id.eq.${user.id})`)
            .order('created_at', { ascending: true });

        if (!error) {
            setMessages(data || []);
            const unreadIds = data?.filter(m => !m.is_read && m.recipient_id === user.id).map(m => m.id) || [];
            if (unreadIds.length > 0) {
                await supabase.from('notifications').update({ is_read: true }).in('id', unreadIds);
            }
        }
    };

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!newMessage.trim() || !user || !recipient) return;

        const msgText = newMessage.trim();
        setNewMessage("");

        try {
            const { error } = await supabase.from('notifications').insert({
                sender_id: user.id,
                recipient_id: recipient.id,
                title: `Pesan dari ${profile?.full_name || 'Admin Team'}`,
                message: msgText,
                type: 'message_internal',
                is_read: false
            });

            if (error) throw error;
            await fetchMessages();

        } catch (err) {
            console.error(err);
            toast.error("Gagal mengirim pesan");
            setNewMessage(msgText);
        }
    };

    if (authLoading || (user && !recipient_id)) return null;

    return (
        <DashboardLayout>
            <div className="max-w-4xl mx-auto h-[calc(100vh-64px)] md:h-[calc(100vh-100px)] flex flex-col bg-card md:rounded-[2rem] shadow-none md:shadow-2xl overflow-hidden border-t md:border border-border -mx-4 -mb-4 md:mx-auto md:my-4 relative">

                {/* Header */}
                <div className="p-4 bg-card border-b border-border flex items-center justify-between z-10">
                    <div className="flex items-center gap-4">
                        <Button variant="ghost" size="icon" onClick={() => router.push('/dashboard/admin-team/communication')} className="rounded-full">
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
                                    {recipient?.role?.replace(/_/g, ' ')}
                                </p>
                            </div>
                        </div>
                    </div>
                    <Button variant="ghost" size="icon" className="rounded-full text-slate-400"><MoreVertical size={20} /></Button>
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
                            const showTime = idx === 0 || new Date(msg.created_at) - new Date(messages[idx - 1].created_at) > 3600000;

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
