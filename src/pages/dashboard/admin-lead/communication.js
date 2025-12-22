import React, { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/router";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { useTheme } from "next-themes";

// Components
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TooltipProvider, Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Textarea } from "@/components/ui/textarea";

// Icons
import {
  MessageCircle, Users, Building, Mail, Search, Filter, RefreshCw, Eye, Clock,
  CheckCircle2, AlertCircle, ArrowLeft, Phone, Calendar, Send, User,
  MoreVertical, Menu, Sun, Moon, LogOut, Building2, LayoutDashboard, ChevronRight,
  PlusCircle, UserPlus, Globe, FolderOpen, MapPin, Inbox, Paperclip, Smile, Loader2, Sparkles
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
  visible: { y: 0, opacity: 1, transition: { duration: 0.4, ease: "circOut" } }
};

export default function AdminLeadCommunicationPage() {
  const router = useRouter();
  const { user, profile, loading: authLoading, isAdminLead, logout } = useAuth();
  const { theme, setTheme } = useTheme();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [projects, setProjects] = useState([]);
  const [messages, setMessages] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedThread, setSelectedThread] = useState(null);
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef(null);

  // Real-time subscription ref
  const subscriptionRef = useRef(null);

  const fetchData = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      // 1. Fetch my created or assigned projects
      const { data: projectsData, error: projectsError } = await supabase
        .from('projects')
        .select('*, clients (id, name, email, phone)')
        .or(`created_by.eq.${user.id},admin_lead_id.eq.${user.id}`)
        .order('updated_at', { ascending: false });

      if (projectsError) throw projectsError;

      const myProjects = projectsData || [];
      setProjects(myProjects);

      if (myProjects.length === 0) {
        setMessages([]);
        setLoading(false);
        return;
      }

      const projectIds = myProjects.map(p => p.id);

      // 2. Fetch messages ONLY for these projects
      const { data: messagesData, error: messagesError } = await supabase
        .from('messages')
        .select('*')
        .in('project_id', projectIds)
        .order('created_at', { ascending: true });

      if (messagesError) throw messagesError;

      setMessages(messagesData || []);
    } catch (err) {
      console.error('Error fetching communication data:', err);
      toast.error('Gagal memuat data komunikasi');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (user && isAdminLead) {
      fetchData();

      // Simple real-time subscription for new messages in my projects
      // Note: This listens to ALL messages, strict RLS on Supabase side is recommended for production security.
      // Here we will just refetch for simplicity on changes.
      subscriptionRef.current = supabase
        .channel('public:messages')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
          // Ideally check if payload.new.project_id is in my projects list, but fetch is safe
          fetchData();
        })
        .subscribe();

      return () => {
        if (subscriptionRef.current) supabase.removeChannel(subscriptionRef.current);
      }
    }
  }, [user, isAdminLead, fetchData]);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, selectedThread]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedThread) return;

    try {
      const { error } = await supabase
        .from('messages')
        .insert([{
          message: newMessage.trim(),
          project_id: selectedThread.projectId,
          sender_id: user.id,
          message_type: 'message_to_client'
        }]);

      if (error) throw error;
      setNewMessage('');
      // Optimistic update or wait for subscription
      fetchData();
    } catch (err) {
      console.error('Error sending message:', err);
      toast.error('Gagal mengirim pesan');
    }
  };

  const filteredProjects = projects.filter(p =>
    p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.clients?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getThreadMessages = (projectId) => messages.filter(m => m.project_id === projectId);

  if (authLoading || (user && !isAdminLead)) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[80vh]">
          <Loader2 className="animate-spin h-10 w-10 text-[#7c3aed]" />
        </div>
      </DashboardLayout>
    );
  }

  // ... (rest of the file content until return)

  return (
    <DashboardLayout>
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="flex bg-card/50 md:rounded-[2.5rem] border-t md:border border-border overflow-hidden h-[calc(100vh-64px)] md:h-[calc(100vh-140px)] min-h-[600px] shadow-2xl shadow-slate-200/50 dark:shadow-none -mx-4 -mb-4 md:mx-0 md:mb-0 relative"
      >
        {/* Sidebar - Hidden on mobile if thread selected */}
        <div className={`
          w-full md:w-[400px] flex flex-col border-r border-border bg-card
          ${selectedThread ? 'hidden md:flex' : 'flex'}
        `}>
          <header className="h-16 md:h-24 flex items-center justify-between px-6 md:px-8 border-b border-border shrink-0">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Badge className="bg-[#7c3aed]/10 text-[#7c3aed] border-none text-[8px] font-bold tracking-wide">
                  Live connect
                </Badge>
                <span className="size-2 bg-emerald-500 rounded-full animate-pulse" />
              </div>
              <h2 className="text-xl md:text-2xl font-bold tracking-tight">Pusat komunikasi</h2>
            </div>
            <Button
              onClick={() => fetchData()}
              variant="outline"
              size="icon"
              className="size-10 rounded-xl text-slate-400 hover:text-[#7c3aed] border-slate-100 dark:border-white/10"
            >
              <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
            </Button>
          </header>

          <div className="p-4 md:p-6 pb-2 shrink-0">
            <div className="relative group">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#7c3aed] transition-colors" size={18} />
              <input
                className="h-12 md:h-14 w-full rounded-2xl bg-slate-50 dark:bg-card/20 border border-border pl-14 pr-4 text-sm font-medium focus:ring-4 focus:ring-[#7c3aed]/10 outline-none transition-all placeholder-slate-400"
                placeholder="Cari proyek..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-4 md:px-6 space-y-3 pb-6 scrollbar-hide">
            {loading ? (
              Array(5).fill(0).map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-[2rem]" />)
            ) : filteredProjects.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 text-center text-slate-400">
                <Inbox size={32} className="mb-2 opacity-50" />
                <span className="font-medium text-xs">Tidak ada proyek ditemukan</span>
              </div>
            ) : (
              filteredProjects.map(project => {
                const threadMsgs = getThreadMessages(project.id);
                const lastMsg = threadMsgs.length > 0 ? threadMsgs[threadMsgs.length - 1] : null;
                const isActive = selectedThread?.projectId === project.id;

                return (
                  <motion.button
                    variants={itemVariants}
                    key={project.id}
                    onClick={() => setSelectedThread({ projectId: project.id, client: project.clients, projectName: project.name })}
                    className={`
                      w-full p-5 rounded-[2rem] flex items-start gap-4 transition-all duration-300 border text-left group touch-target
                      ${isActive
                        ? 'bg-[#7c3aed] border-[#7c3aed] text-white shadow-xl shadow-[#7c3aed]/30 ring-4 ring-[#7c3aed]/10'
                        : 'bg-white dark:bg-white/5 border-border hover:border-[#7c3aed]/30 hover:shadow-lg hover:shadow-slate-200/50 dark:hover:shadow-none'
                      }
                    `}
                  >
                    <div className={`size-12 rounded-2xl flex items-center justify-center shrink-0 shadow-sm transition-colors ${isActive ? 'bg-white/20' : 'bg-slate-50 dark:bg-white/10 group-hover:bg-[#7c3aed]/5'}`}>
                      <Building2 size={22} className={isActive ? 'text-white' : 'text-[#7c3aed]'} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start mb-0.5">
                        <span className={`text-sm font-bold tracking-tight truncate pr-2 ${isActive ? 'text-white' : 'text-slate-900 dark:text-white'}`}>{project.name}</span>
                        {lastMsg && (
                          <span className={`text-[10px] font-medium ${isActive ? 'text-white/60' : 'text-slate-400'}`}>
                            {new Date(lastMsg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        )}
                      </div>
                      <span className={`text-[11px] font-medium block mb-2 truncate ${isActive ? 'text-white/70' : 'text-slate-400'}`}>
                        {project.clients?.name || 'Klien tidak dikenal'}
                      </span>
                      {lastMsg ? (
                        <p className={`text-[11px] font-medium truncate ${isActive ? 'text-white/90' : 'text-slate-500'}`}>
                          {lastMsg.sender_id === user.id && <span className="opacity-70 mr-1">Anda:</span>}
                          {lastMsg.message}
                        </p>
                      ) : (
                        <p className={`text-[10px] italic ${isActive ? 'text-white/50' : 'text-slate-400'}`}>Belum ada pesan</p>
                      )}
                    </div>
                  </motion.button>
                );
              })
            )}
          </div>
        </div>

        {/* Chat Area - Hidden on mobile if NO thread selected */}
        <div className={`
          flex-1 flex flex-col bg-slate-50/50 dark:bg-[#0f172a]/50 relative w-full
          ${!selectedThread ? 'hidden md:flex' : 'flex fixed inset-0 z-50 md:static'}
        `}>
          {selectedThread ? (
            <>
              {/* Header */}
              <header className="h-20 md:h-24 flex items-center justify-between px-4 md:px-10 border-b border-border bg-card shrink-0 pt-safe">
                <div className="flex items-center gap-3 md:gap-5">
                  {/* Mobile Back Button */}
                  <Button onClick={() => setSelectedThread(null)} variant="ghost" size="icon" className="md:hidden rounded-full -ml-2 text-slate-500">
                    <ArrowLeft size={24} />
                  </Button>

                  <div className="size-10 md:size-14 rounded-[1.2rem] bg-gradient-to-br from-[#7c3aed] to-violet-600 flex items-center justify-center text-white font-black text-lg md:text-2xl shadow-lg shadow-[#7c3aed]/20">
                    {selectedThread.client?.name?.charAt(0) || 'C'}
                  </div>
                  <div>
                    <h3 className="text-base md:text-xl font-bold tracking-tight leading-none mb-1">{selectedThread.client?.name}</h3>
                    <div className="flex items-center gap-2 text-slate-500">
                      <Building2 size={12} />
                      <span className="text-xs font-medium truncate max-w-[150px] md:max-w-none">{selectedThread.projectName}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 md:gap-3">
                  <Button variant="ghost" className="size-10 md:size-12 rounded-2xl text-slate-400 hover:text-[#7c3aed] hover:bg-slate-50">
                    <Search size={20} />
                  </Button>
                </div>
              </header>

              {/* Feed */}
              <div className="flex-1 overflow-y-auto p-4 md:p-10 space-y-6 md:space-y-8 scrollbar-hide pb-32 md:pb-40 bg-slate-50 dark:bg-[#0f172a]">
                <div className="flex justify-center">
                  <Badge variant="outline" className="border-slate-200 dark:border-white/10 text-slate-400 text-[10px] font-medium py-1 px-3 rounded-full">
                    Awal percakapan
                  </Badge>
                </div>

                <AnimatePresence mode="popLayout">
                  {getThreadMessages(selectedThread.projectId).map((m, i) => {
                    const isMe = m.sender_id === user.id;
                    return (
                      <motion.div
                        key={m.id || i}
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                      >
                        <div className={`max-w-[85%] md:max-w-[70%] flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                          <div className={`
                            px-5 py-3 md:px-8 md:py-5 text-sm font-medium shadow-sm transition-all relative group
                            ${isMe
                              ? 'bg-[#7c3aed] text-white rounded-[1.5rem] rounded-tr-sm'
                              : 'bg-card text-slate-800 dark:text-slate-200 rounded-[1.5rem] rounded-tl-sm border border-border'
                            }
                          `}>
                            {m.message}
                            <span className={`
                               block text-[10px] font-medium opacity-60 mt-1
                               ${isMe ? 'text-white text-right' : 'text-slate-400 text-left'}
                            `}>
                              {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
                <div ref={messagesEndRef} />
              </div>

              {/* Input Area */}
              <div className="absolute bottom-0 left-0 right-0 p-4 md:p-10 md:pt-0 bg-white/90 dark:bg-[#0f172a]/90 backdrop-blur-md md:bg-transparent md:backdrop-blur-none border-t border-border md:border-none">
                <div className="bg-card rounded-[2rem] md:rounded-[2.5rem] border border-border shadow-2xl p-2 pl-4 md:p-3 md:pl-6 flex items-end gap-2 md:gap-4">
                  <Textarea
                    className="flex-1 min-h-[44px] max-h-24 py-3 bg-transparent border-none focus:ring-0 text-sm font-medium placeholder-slate-400 resize-none"
                    placeholder="Ketik pesan..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                  />
                  <div className="flex items-center gap-2 pb-1 pr-1">
                    <Button
                      onClick={handleSendMessage}
                      disabled={!newMessage.trim()}
                      className="size-10 md:size-12 rounded-full md:rounded-[1.5rem] bg-[#7c3aed] hover:bg-[#6d28d9] text-white shadow-lg shadow-[#7c3aed]/20 disabled:opacity-50 transition-all font-black touch-target"
                    >
                      <Send size={18} className={!newMessage.trim() ? '' : 'ml-1'} />
                    </Button>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-10 text-center relative overflow-hidden">
              {/* Same empty state as before */}
              <div className="absolute inset-0 bg-grid-slate-200/50 [mask-image:linear-gradient(0deg,white,transparent)] dark:bg-grid-white/5" />
              <div className="relative z-10 flex flex-col items-center">
                <div className="size-32 bg-card rounded-[3rem] shadow-2xl shadow-slate-200/50 dark:shadow-none flex items-center justify-center text-[#7c3aed] mb-8 border border-border animate-bounce-slow">
                  <Sparkles size={48} />
                </div>
                <h3 className="text-2xl md:text-4xl font-bold tracking-tight mb-4 text-slate-900 dark:text-white">Pusat <span className="text-[#7c3aed]">komunikasi</span></h3>
                <p className="text-slate-500 font-medium max-w-sm text-sm md:text-lg leading-relaxed">
                  Pilih proyek di sidebar untuk memulai koordinasi real-time.
                </p>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </DashboardLayout>
  );
}


