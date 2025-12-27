// FILE: src/pages/dashboard/admin-lead/communication.js
// Halaman Komunikasi Admin Lead - Mobile First WhatsApp/Messenger Style
import React, { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/router";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { useTheme } from "next-themes";

// UI Components
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";

// Icons
import {
  Search, ArrowLeft, Send, MoreVertical, Phone, Video,
  Image as ImageIcon, Paperclip, Mic, Smile, Check, CheckCheck,
  Building2, Users, User, Shield, Plus
} from "lucide-react";

// Utils & Context
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { supabase } from "@/utils/supabaseClient";
import { useAuth } from "@/context/AuthContext";
import { fetchProjectMessages, sendMessage as sendMessageService, MESSAGE_TYPES } from "@/utils/messageService";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05 } }
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { duration: 0.4, ease: "circOut" } }
};

export default function AdminLeadCommunicationPage() {
  const router = useRouter();
  const { user, loading: authLoading, isAdminLead } = useAuth();

  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState([]);
  const [messages, setMessages] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');

  // Selection State
  const [selectedThread, setSelectedThread] = useState(null);
  const [activeCategory, setActiveCategory] = useState('client');
  const [newMessage, setNewMessage] = useState('');

  const messagesEndRef = useRef(null);
  const subscriptionRef = useRef(null);

  const fetchData = useCallback(async () => {
    if (!user?.id) return;
    try {
      // 1. Fetch Projects
      const { data: projData, error: projErr } = await supabase
        .from('projects')
        .select('*, clients (id, name)')
        .or(`created_by.eq.${user.id},admin_lead_id.eq.${user.id}`)
        .order('updated_at', { ascending: false });

      if (projErr) throw projErr;
      const myProjects = projData || [];
      setProjects(myProjects);

      if (myProjects.length === 0) {
        setLoading(false);
        return;
      }

      // 2. Fetch Messages
      // For optimization, maybe limit last 50 messages total or per project. 
      // Here we stick to simple logic for now.
      const pIds = myProjects.map(p => p.id);
      let allMsgs = [];
      for (const pid of pIds) {
        const { data } = await fetchProjectMessages(pid, user.id);
        if (data) allMsgs.push(...data);
      }
      setMessages(allMsgs);

    } catch (err) {
      console.error(err);
      toast.error('Gagal memuat pesan');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!authLoading && user && isAdminLead) {
      fetchData();

      subscriptionRef.current = supabase
        .channel('public:messages')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, () => fetchData())
        .subscribe();

      return () => {
        if (subscriptionRef.current) supabase.removeChannel(subscriptionRef.current);
      }
    }
  }, [authLoading, user, isAdminLead, fetchData]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, selectedThread, activeCategory]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedThread) return;
    try {
      // Optimistic update could be added here
      const { error } = await sendMessageService({
        projectId: selectedThread.id,
        senderId: user.id,
        message: newMessage.trim(),
        messageType: activeCategory === 'client' ? MESSAGE_TYPES.TEXT : MESSAGE_TYPES.SYSTEM // Simplify mapping
      });
      if (error) throw error;
      setNewMessage('');
      fetchData();
    } catch (err) {
      toast.error('Gagal kirim pesan');
    }
  };

  const filteredProjects = projects.filter(p =>
    p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.clients?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getThreadMessages = (pid) => {
    return messages.filter(m => {
      if (m.project_id !== pid) return false;
      // Filter logic based on category
      if (activeCategory === 'client') return m.message_type === 'text' || m.message_type === 'message_to_client';
      if (activeCategory === 'team') return m.message_type === 'system' || m.message_type === 'team';
      if (activeCategory === 'head_consultant') return m.message_type === 'head_consultant';
      return false;
    });
  };

  if (authLoading || (user && !isAdminLead)) return null;

  // Mobile View Logic: If selectedThread is active, we show full screen chat. 
  // Else we show the list.
  // On Desktop: We always show split view.

  const isMobileChatOpen = !!selectedThread;

  return (
    <DashboardLayout>
      <div className="h-[calc(100vh-100px)] md:h-[calc(100vh-120px)] bg-card border border-border md:rounded-[2.5rem] overflow-hidden flex relative shadow-2xl">

        {/* Sidebar / List View */}
        <div className={`
              w-full md:w-[380px] flex flex-col border-r border-border bg-card z-10
              ${isMobileChatOpen ? 'hidden md:flex' : 'flex'}
          `}>
          {/* Header List */}
          <div className="p-4 border-b border-border flex items-center justify-between">
            <h1 className="text-xl font-black tracking-tight">Pesan</h1>
            <div className="flex gap-2">
              {/* Maybe add New Chat button here later */}
            </div>
          </div>

          {/* Search */}
          <div className="p-4 pt-0 mt-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                className="pl-9 h-10 rounded-xl bg-muted/50 border-transparent focus:bg-background transition-all"
                placeholder="Cari..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          {/* Thread List */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {loading ? Array(5).fill(0).map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-xl mb-2" />) :
              filteredProjects.map(project => {
                const isActive = selectedThread?.id === project.id;
                return (
                  <motion.div
                    layoutId={`thread-${project.id}`}
                    key={project.id}
                    onClick={() => setSelectedThread(project)}
                    className={`p-3 rounded-2xl flex gap-3 cursor-pointer transition-all ${isActive ? 'bg-primary/10' : 'hover:bg-muted/50'}`}
                  >
                    <div className="h-12 w-12 rounded-full bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center text-white font-bold text-lg shadow-md shrink-0">
                      {project.clients?.name?.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0 flex flex-col justify-center">
                      <div className="flex justify-between items-baseline mb-0.5">
                        <h3 className={`font-bold truncate text-sm ${isActive ? 'text-primary' : 'text-foreground'}`}>{project.clients?.name || 'Unknown'}</h3>
                        <span className="text-[10px] text-muted-foreground font-medium">12:30</span>
                      </div>
                      <p className="text-xs text-muted-foreground truncate font-medium">{project.name}</p>
                    </div>
                  </motion.div>
                )
              })
            }
          </div>
        </div>

        {/* Chat Area - Mobile Overlay & Desktop Main */}
        <div className={`
              absolute inset-0 z-20 bg-background flex flex-col md:static md:flex-1 w-full
              ${isMobileChatOpen ? 'flex' : 'hidden md:flex'}
          `}>
          {selectedThread ? (
            <>
              {/* Chat Header */}
              <div className="h-16 px-4 md:px-6 border-b border-border flex items-center justify-between shrink-0 bg-card/80 backdrop-blur-md sticky top-0 z-30">
                <div className="flex items-center gap-3">
                  <Button variant="ghost" size="icon" className="md:hidden -ml-2" onClick={() => setSelectedThread(null)}>
                    <ArrowLeft size={20} />
                  </Button>
                  <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center text-white font-bold text-sm shadow-sm">
                    {selectedThread.clients?.name?.charAt(0)}
                  </div>
                  <div>
                    <h2 className="font-bold text-sm md:text-base leading-tight">{selectedThread.clients?.name}</h2>
                    <p className="text-[10px] text-muted-foreground font-medium line-clamp-1">{selectedThread.name}</p>
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" className="text-muted-foreground"><Phone size={18} /></Button>
                  <Button variant="ghost" size="icon" className="text-muted-foreground"><Video size={18} /></Button>
                  <Button variant="ghost" size="icon" className="text-muted-foreground"><MoreVertical size={18} /></Button>
                </div>
              </div>

              {/* Category Tabs */}
              <div className="px-4 py-2 border-b border-border/50 bg-background/50 backdrop-blur-sm flex justify-center sticky top-16 md:top-0 z-20">
                <div className="flex p-1 bg-muted/50 rounded-xl">
                  {['client', 'team', 'head_consultant'].map(cat => (
                    <button
                      key={cat}
                      onClick={() => setActiveCategory(cat)}
                      className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${activeCategory === cat ? 'bg-background text-primary shadow-sm' : 'text-muted-foreground hover:text-foreground'
                        }`}
                    >
                      {cat.replace('_', ' ')}
                    </button>
                  ))}
                </div>
              </div>

              {/* Messages Scroll Area */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-muted/20">
                {getThreadMessages(selectedThread.id).length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center opacity-50">
                    <Building2 size={48} className="mb-4 text-muted-foreground" />
                    <p className="text-sm font-medium">Belum ada percakapan di kategori ini.</p>
                  </div>
                ) : (
                  getThreadMessages(selectedThread.id).map(msg => {
                    const isMe = msg.sender_id === user.id;
                    return (
                      <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[75%] md:max-w-[60%] p-3 md:p-4 rounded-2xl text-sm font-medium shadow-sm ${isMe ? 'bg-primary text-primary-foreground rounded-tr-sm' : 'bg-card border border-border rounded-tl-sm'
                          }`}>
                          {msg.message}
                          <div className={`text-[9px] mt-1 flex items-center justify-end gap-1 opacity-70 ${isMe ? 'text-primary-foreground' : 'text-muted-foreground'}`}>
                            {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            {isMe && <CheckCheck size={12} />}
                          </div>
                        </div>
                      </div>
                    )
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input Area */}
              <div className="p-3 md:p-4 bg-card border-t border-border sticky bottom-0 z-30">
                <div className="flex items-end gap-2 max-w-4xl mx-auto">
                  <Button variant="ghost" size="icon" className="text-muted-foreground shrink-0 rounded-full h-10 w-10">
                    <Plus size={20} />
                  </Button>
                  <div className="flex-1 bg-muted/50 rounded-[1.5rem] border border-transparent focus-within:border-primary/30 focus-within:bg-background transition-all flex items-end px-4 py-2">
                    <Textarea
                      className="min-h-[24px] max-h-32 w-full bg-transparent border-none p-0 focus-visible:ring-0 resize-none text-sm leading-6 placeholder:text-muted-foreground/50 py-1"
                      placeholder="Ketik pesan..."
                      value={newMessage}
                      onChange={e => setNewMessage(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage() } }}
                    />
                  </div>
                  <Button
                    onClick={handleSendMessage}
                    disabled={!newMessage.trim()}
                    className="h-12 w-12 rounded-full bg-primary text-primary-foreground shrink-0 shadow-lg shadow-primary/20 hover:scale-105 transition-all"
                  >
                    <Send size={18} className={newMessage.trim() ? 'ml-0.5' : ''} />
                  </Button>
                </div>
              </div>
            </>
          ) : (
            // Desktop Empty State
            <div className="hidden md:flex flex-col items-center justify-center h-full text-muted-foreground bg-muted/10">
              <div className="h-24 w-24 rounded-[2.5rem] bg-muted flex items-center justify-center mb-6">
                <Building2 size={48} className="opacity-20" />
              </div>
              <h3 className="font-bold text-lg text-foreground">Pusat Komunikasi</h3>
              <p className="max-w-xs text-center text-sm mt-2">Pilih percakapan dari daftar di sebelah kiri untuk melihat detail.</p>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
