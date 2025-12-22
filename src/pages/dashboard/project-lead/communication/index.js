
// FILE: src/pages/dashboard/project-lead/communication/index.js
import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/router";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";

// Components
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

// Icons
import {
    MessageCircle, Building, User, Search, RefreshCw, ArrowLeft, Mail, Clock, Send, ChevronRight, MoreHorizontal, Users
} from "lucide-react";

// Utils & Context
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { supabase } from "@/utils/supabaseClient";
import { useAuth } from "@/context/AuthContext";

// Animation variants
const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.05 } }
};
const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1, transition: { duration: 0.4, ease: "easeOut" } }
};

export default function CommunicationInbox() {
    const router = useRouter();
    const { user, loading: authLoading, isProjectLead, isTeamLeader } = useAuth();
    const hasAccess = isProjectLead || isTeamLeader;

    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState("team"); // Default to team as per user request
    const [conversations, setConversations] = useState([]);
    const [teamContacts, setTeamContacts] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');

    // Fetch data
    const fetchData = useCallback(async () => {
        if (!user?.id) return;
        setLoading(true);

        try {
            // 1. Get Project IDs
            const [teamRes, legacyRes] = await Promise.all([
                supabase.from('project_teams').select('project_id').eq('user_id', user.id).eq('role', 'project_lead'),
                supabase.from('projects').select('id').eq('project_lead_id', user.id)
            ]);

            const projectIds = [
                ...new Set([
                    ...(teamRes.data || []).map(a => a.project_id),
                    ...(legacyRes.data || []).map(p => p.id)
                ])
            ];

            if (projectIds.length === 0) {
                setLoading(false);
                return;
            }

            // 2. Fetch Team Contacts (Unique users in these projects)
            const { data: teamMembers, error: teamErr } = await supabase
                .from('project_teams')
                .select(`
          user_id,
          project_id,
          role,
          profiles!inner(id, full_name, email, specialization),
          projects(name)
        `)
                .in('project_id', projectIds);

            if (teamErr) throw teamErr;

            // Group by User to create unique contacts list, but keep track of projects
            const contactsMap = {};
            teamMembers.forEach(tm => {
                if (tm.user_id === user.id) return; // Skip self

                if (!contactsMap[tm.user_id]) {
                    contactsMap[tm.user_id] = {
                        id: tm.profiles.id,
                        full_name: tm.profiles.full_name,
                        email: tm.profiles.email,
                        specialization: tm.profiles.specialization,
                        role: tm.role,
                        projects: [], // Distinct projects shared
                        latest_message: null
                    };
                }
                if (!contactsMap[tm.user_id].projects.find(p => p.id === tm.project_id)) {
                    contactsMap[tm.user_id].projects.push({ id: tm.project_id, name: tm.projects?.name });
                }
            });

            // 3. Fetch Recent Messages (Notifications table used as messages)
            // Find messages between user and ANY of these contacts
            const contactIds = Object.keys(contactsMap);
            if (contactIds.length > 0) {
                const { data: messages } = await supabase
                    .from('notifications')
                    .select('*')
                    .or(`sender_id.in.(${contactIds.join(',')}),recipient_id.in.(${contactIds.join(',')})`)
                    .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
                    .order('created_at', { ascending: false });

                // Attach latest message to contacts
                messages?.forEach(msg => {
                    const otherId = msg.sender_id === user.id ? msg.recipient_id : msg.sender_id;
                    if (contactsMap[otherId] && !contactsMap[otherId].latest_message) {
                        contactsMap[otherId].latest_message = {
                            text: msg.message,
                            time: msg.created_at,
                            unread: !msg.is_read && msg.recipient_id === user.id
                        };
                    }
                });
            }

            setTeamContacts(Object.values(contactsMap).sort((a, b) => {
                // Sort by latest message first, then name
                const timeA = a.latest_message?.time ? new Date(a.latest_message.time) : new Date(0);
                const timeB = b.latest_message?.time ? new Date(b.latest_message.time) : new Date(0);
                return timeB - timeA;
            }));


            // 4. Fetch Client Conversations (Existing Logic but simpler)
            // Getting clients for these projects
            const { data: projClients } = await supabase.from('projects').select('id, client_id, name').in('id', projectIds);
            const clientIds = [...new Set((projClients || []).map(p => p.client_id).filter(id => id))];

            let clientConvos = [];
            if (clientIds.length > 0) {
                const { data: clientMsgs } = await supabase
                    .from('notifications')
                    .select(`*, sender:profiles!sender_id(full_name), recipient:profiles!recipient_id(full_name)`)
                    .or(`sender_id.in.(${clientIds.join(',')}),recipient_id.in.(${clientIds.join(',')})`)
                    .order('created_at', { ascending: false });

                // Group by Client-Project
                const convMap = {};
                clientMsgs?.forEach(msg => {
                    const otherId = msg.sender_id === user.id ? msg.recipient_id : msg.sender_id;
                    if (!clientIds.includes(otherId)) return;

                    // Try to infer project from message data if possible, or just group by client user
                    // For simplicity, we stick to Client User grouping
                    if (!convMap[otherId]) {
                        convMap[otherId] = {
                            id: otherId,
                            name: msg.sender_id === otherId ? msg.sender?.full_name : msg.recipient?.full_name,
                            type: 'client',
                            last_message: msg.message,
                            time: msg.created_at,
                            unread: !msg.is_read && msg.recipient_id === user.id
                        };
                    }
                });
                clientConvos = Object.values(convMap);
            }
            setConversations(clientConvos);

        } catch (err) {
            console.error('Error fetching data:', err);
            toast.error('Gagal memuat kontak');
        } finally {
            setLoading(false);
        }
    }, [user?.id]);

    useEffect(() => {
        if (user && hasAccess) fetchData();
    }, [user, hasAccess, fetchData]);

    // Filter
    const filteredContacts = teamContacts.filter(c =>
        c.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.projects.some(p => p.name?.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const filteredConversations = conversations.filter(c =>
        c.name?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (authLoading || (user && !hasAccess)) return null;

    return (
        <DashboardLayout>
            <motion.div
                className="max-w-[1200px] mx-auto p-6 md:p-8 space-y-8"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
            >
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <motion.div variants={itemVariants}>
                        <h1 className="text-3xl md:text-4xl font-black uppercase tracking-tighter text-slate-900 dark:text-white">
                            Pusat <span className="text-[#7c3aed]">Komunikasi</span>
                        </h1>
                        <p className="text-slate-500 font-medium">Hubungkan tim lintas proyek dan klien Anda.</p>
                    </motion.div>
                    <motion.div variants={itemVariants}>
                        <Button variant="outline" size="sm" onClick={fetchData} className="rounded-xl h-10 px-4">
                            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} /> Refresh
                        </Button>
                    </motion.div>
                </div>

                {/* Search */}
                <motion.div variants={itemVariants} className="relative z-10">
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                        <Input
                            placeholder="Cari nama atau proyek..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-12 h-14 rounded-[2rem] bg-white dark:bg-[#1e293b] border-slate-100 dark:border-white/5 shadow-xl shadow-slate-200/50 dark:shadow-none text-base"
                        />
                    </div>
                </motion.div>

                {/* Tabs */}
                <Tabs defaultValue="team" value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <TabsList className="w-full max-w-md mx-auto grid grid-cols-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-full mb-8">
                        <TabsTrigger value="team" className="rounded-full data-[state=active]:bg-white dark:data-[state=active]:bg-[#7c3aed] data-[state=active]:text-[#7c3aed] dark:data-[state=active]:text-white font-bold transition-all">Tim Internal</TabsTrigger>
                        <TabsTrigger value="client" className="rounded-full data-[state=active]:bg-white dark:data-[state=active]:bg-[#7c3aed] data-[state=active]:text-[#7c3aed] dark:data-[state=active]:text-white font-bold transition-all">Klien</TabsTrigger>
                    </TabsList>

                    <TabsContent value="team">
                        <div className="space-y-4">
                            <AnimatePresence>
                                {loading ? (
                                    [1, 2, 3].map(i => <Skeleton key={i} className="h-24 rounded-[2rem] w-full" />)
                                ) : filteredContacts.length === 0 ? (
                                    <div className="py-12 text-center text-slate-400">Tidak ada kontak tim ditemukan</div>
                                ) : (
                                    filteredContacts.map(contact => (
                                        <motion.div
                                            key={contact.id}
                                            variants={itemVariants}
                                            onClick={() => router.push(`/dashboard/project-lead/communication/chat?recipient_id=${contact.id}`)}
                                            className="group bg-white dark:bg-[#1e293b] rounded-[2rem] p-6 border border-slate-100 dark:border-white/5 shadow-md hover:shadow-xl hover:border-[#7c3aed]/30 transition-all cursor-pointer relative overflow-hidden"
                                        >
                                            <div className="flex items-center gap-5 relative z-10">
                                                <div className="size-14 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 font-black text-xl">
                                                    {contact.full_name.charAt(0)}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex justify-between items-start mb-1">
                                                        <h3 className="font-bold text-slate-900 dark:text-white truncate">{contact.full_name}</h3>
                                                        {contact.latest_message?.time && (
                                                            <span className="text-xs text-slate-400 font-medium shrink-0 ml-2">
                                                                {format(new Date(contact.latest_message.time), 'dd MMM HH:mm', { locale: localeId })}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <Badge variant="outline" className="text-[10px] py-0 h-5 px-2 bg-slate-50 dark:bg-slate-900 border-none text-slate-500 uppercase tracking-wider">{contact.role.replace(/_/g, ' ')}</Badge>
                                                        <span className="text-xs text-slate-400 truncate max-w-[200px]">
                                                            {contact.projects.map(p => p.name).join(', ')}
                                                        </span>
                                                    </div>
                                                    <p className={`text-sm truncate ${contact.latest_message?.unread ? 'font-bold text-slate-800 dark:text-white' : 'text-slate-500'}`}>
                                                        {contact.latest_message ? contact.latest_message.text : 'Mulai percakapan...'}
                                                    </p>
                                                </div>
                                            </div>
                                        </motion.div>
                                    ))
                                )}
                            </AnimatePresence>
                        </div>
                    </TabsContent>

                    <TabsContent value="client">
                        <div className="space-y-4">
                            {/* Similar structure for Clients */}
                            {filteredConversations.length === 0 ? (
                                <div className="py-12 text-center text-slate-400">Tidak ada percakapan klien</div>
                            ) : (
                                filteredConversations.map(conv => (
                                    <motion.div
                                        key={conv.id}
                                        variants={itemVariants}
                                        onClick={() => router.push(`/dashboard/project-lead/communication/chat?recipient_id=${conv.id}`)}
                                        className="group bg-white dark:bg-[#1e293b] rounded-[2rem] p-6 border border-slate-100 dark:border-white/5 shadow-md hover:shadow-xl hover:border-[#7c3aed]/30 transition-all cursor-pointer"
                                    >
                                        <div className="flex items-center gap-5">
                                            <div className="size-14 rounded-2xl bg-blue-50 dark:bg-slate-800 text-blue-600 flex items-center justify-center">
                                                <User />
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex justify-between">
                                                    <h3 className="font-bold text-slate-900 dark:text-white">{conv.name}</h3>
                                                    <span className="text-xs text-slate-400">{format(new Date(conv.time), 'dd MMM HH:mm', { locale: localeId })}</span>
                                                </div>
                                                <p className={`text-sm mt-1 ${conv.unread ? 'font-bold' : 'text-slate-500'}`}>{conv.last_message}</p>
                                            </div>
                                        </div>
                                    </motion.div>
                                ))
                            )}
                        </div>
                    </TabsContent>
                </Tabs>

            </motion.div>
        </DashboardLayout>
    );
}
