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
  PlusCircle, UserPlus, Globe, FolderOpen, MapPin, Inbox, Paperclip, Smile, Loader2, Sparkles, Settings, BadgeCheck
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
  const [activeCategory, setActiveCategory] = useState('client'); // 'client', 'team', 'head_consultant'
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
        .select(`
          *,
          profiles:sender_id(full_name, avatar_url, role)
        `)
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

      subscriptionRef.current = supabase
        .channel('public:messages')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
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
  }, [messages, selectedThread, activeCategory]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedThread) return;

    try {
      const { error } = await supabase
        .from('messages')
        .insert([{
          message: newMessage.trim(),
          project_id: selectedThread.projectId,
          sender_id: user.id,
          message_type: activeCategory // 'client', 'team', 'head_consultant'
        }]);

      if (error) throw error;
      setNewMessage('');
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

  const getThreadMessages = (projectId) => messages.filter(m =>
    m.project_id === projectId &&
    (m.message_type === activeCategory || (activeCategory === 'client' && m.message_type === 'message_to_client'))
  );

  if (authLoading || (user && !isAdminLead)) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[80vh]">
          <Loader2 className="animate-spin h-10 w-10 text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="flex bg-card/50 md:rounded-[2.5rem] border-t md:border border-border overflow-hidden h-[calc(100vh-64px)] md:h-[calc(100vh-140px)] min-h-[600px] shadow-2xl shadow-slate-200/50 dark:shadow-none -mx-4 -mb-4 md:mx-0 md:mb-0 relative"
      >
        {/* Sidebar */}
        <div className={`
          w-full md:w-[400px] flex flex-col border-r border-border bg-card
          ${selectedThread ? 'hidden md:flex' : 'flex'}
        `}>
          <header className="h-16 md:h-24 flex items-center justify-between px-6 md:px-8 border-b border-border shrink-0">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Badge className="bg-primary/10 text-primary border-none text-[8px] font-bold tracking-wide">
                  KONEKSI LANGSUNG
                </Badge>
                <span className="size-2 bg-emerald-500 rounded-full animate-pulse" />
              </div>
              <h2 className="text-xl md:text-2xl font-bold tracking-tight">Pusat Komunikasi</h2>
            </div>
            <Button
              onClick={() => fetchData()}
              variant="outline"
              size="icon"
              className="size-10 rounded-xl text-muted-foreground hover:text-primary transition-all"
            >
              <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
            </Button>
          </header>

          <div className="p-4 md:p-6 pb-2 shrink-0">
            <div className="relative group">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" size={18} />
              <input
                className="h-12 md:h-14 w-full rounded-2xl bg-muted/50 border border-border pl-14 pr-4 text-sm font-medium focus:ring-4 focus:ring-primary/10 outline-none transition-all placeholder:text-muted-foreground"
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
              <div className="flex flex-col items-center justify-center h-40 text-center text-muted-foreground">
                <Inbox size={32} className="mb-2 opacity-50" />
                <span className="font-medium text-xs">Tidak ada proyek ditemukan</span>
              </div>
            ) : (
              filteredProjects.map(project => {
                const isActive = selectedThread?.projectId === project.id;

                return (
                  <motion.button
                    variants={itemVariants}
                    key={project.id}
                    onClick={() => setSelectedThread({ projectId: project.id, client: project.clients, projectName: project.name })}
                    className={`
                      w-full p-5 rounded-[2rem] flex items-start gap-4 transition-all duration-300 border text-left group touch-target
                      ${isActive
                        ? 'bg-primary border-primary text-primary-foreground shadow-xl shadow-primary/30 ring-4 ring-primary/10'
                        : 'bg-card border-border hover:border-primary/30 hover:shadow-lg'
                      }
                    `}
                  >
                    <div className={`size-12 rounded-2xl flex items-center justify-center shrink-0 shadow-sm transition-colors ${isActive ? 'bg-white/20' : 'bg-muted group-hover:bg-primary/5'}`}>
                      <Building2 size={22} className={isActive ? 'text-white' : 'text-primary'} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start mb-0.5">
                        <span className={`text-sm font-bold tracking-tight truncate pr-2 ${isActive ? 'text-white' : 'text-foreground'}`}>{project.name}</span>
                      </div>
                      <span className={`text-[11px] font-medium block mb-2 truncate ${isActive ? 'text-white/70' : 'text-muted-foreground'}`}>
                        {project.clients?.name || 'Klien Tidak Dikenal'}
                      </span>
                      <div className="flex gap-1.5 overflow-hidden">
                        <Badge variant="outline" className={`text-[9px] px-1.5 py-0 border-none ${isActive ? 'bg-white/10 text-white' : 'bg-primary/5 text-primary'}`}>SLF</Badge>
                        <Badge variant="outline" className={`text-[9px] px-1.5 py-0 border-none ${isActive ? 'bg-white/10 text-white' : 'bg-emerald-500/10 text-emerald-500'}`}>Aktif</Badge>
                      </div>
                    </div>
                  </motion.button>
                );
              })
            )}
          </div>
        </div>

        {/* Chat Area */}
        <div className={`
          flex-1 flex flex-col bg-muted/30 relative w-full
          ${!selectedThread ? 'hidden md:flex' : 'flex fixed inset-0 z-50 md:static'}
        `}>
          {selectedThread ? (
            <>
              {/* Header */}
              <header className="flex flex-col border-b border-border bg-card shrink-0 pt-safe">
                <div className="h-20 md:h-24 flex items-center justify-between px-4 md:px-10">
                  <div className="flex items-center gap-3 md:gap-5">
                    <Button onClick={() => setSelectedThread(null)} variant="ghost" size="icon" className="md:hidden rounded-full -ml-2 text-muted-foreground">
                      <ArrowLeft size={24} />
                    </Button>

                    <div className="size-10 md:size-14 rounded-[1.2rem] bg-gradient-to-br from-primary to-violet-600 flex items-center justify-center text-primary-foreground font-black text-lg md:text-2xl shadow-lg shadow-primary/20">
                      {selectedThread.client?.name?.charAt(0) || 'C'}
                    </div>
                    <div>
                      <h3 className="text-base md:text-xl font-bold tracking-tight leading-none mb-1">{selectedThread.client?.name}</h3>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Building2 size={12} />
                        <span className="text-xs font-medium truncate max-w-[150px] md:max-w-none">{selectedThread.projectName}</span>
                      </div>
                    </div>
                  </div>

                  <div className="hidden md:flex items-center gap-2">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="outline" size="icon" className="size-10 rounded-xl border-border hover:bg-muted">
                            <Users size={18} />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Info Tim</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    <Button variant="outline" size="icon" className="size-10 rounded-xl border-border hover:bg-muted">
                      <Settings size={18} />
                    </Button>
                  </div>
                </div>

                {/* Categories Tabs */}
                <div className="px-4 md:px-10 pb-3">
                  <div className="flex items-center p-1 bg-muted/50 rounded-2xl w-full max-w-sm">
                    <button
                      onClick={() => setActiveCategory('client')}
                      className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-xl transition-all ${activeCategory === 'client' ? 'bg-card text-primary shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                    >
                      <User size={14} />
                      Klien
                    </button>
                    <button
                      onClick={() => setActiveCategory('team')}
                      className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-xl transition-all ${activeCategory === 'team' ? 'bg-card text-primary shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                    >
                      <Users size={14} />
                      Tim
                    </button>
                    <button
                      onClick={() => setActiveCategory('head_consultant')}
                      className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-xl transition-all ${activeCategory === 'head_consultant' ? 'bg-card text-primary shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                    >
                      <BadgeCheck size={14} />
                      HC
                    </button>
                  </div>
                </div>
              </header>

              {/* Feed */}
              <div className="flex-1 overflow-y-auto p-4 md:p-10 space-y-6 md:space-y-8 scrollbar-hide pb-32 md:pb-40">
                <div className="flex flex-col items-center gap-4 mb-8">
                  <Badge variant="outline" className="border-border text-muted-foreground text-[10px] font-medium py-1 px-3 rounded-full">
                    Mulai percakapan dengan {activeCategory === 'client' ? 'Klien' : activeCategory === 'team' ? 'Tim Proyek' : 'Head Consultant'}
                  </Badge>
                  {activeCategory === 'team' && (
                    <p className="text-[10px] text-muted-foreground font-medium bg-muted py-1 px-3 rounded-lg border border-border">
                      Tim Internal: Admin Lead, Project Lead, Inspector, Admin Team
                    </p>
                  )}
                </div>

                <AnimatePresence mode="popLayout">
                  {getThreadMessages(selectedThread.projectId).map((m, i) => {
                    const isMe = m.sender_id === user.id;
                    const senderRole = m.profiles?.role?.replace(/_/g, ' ');

                    return (
                      <motion.div
                        key={m.id || i}
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                      >
                        <div className={`max-w-[85%] md:max-w-[70%] flex flex-col ${isMe ? 'items-end' : 'items-start'} gap-1.5`}>
                          {!isMe && (
                            <span className="text-[10px] font-bold text-muted-foreground ml-2 capitalize">
                              {m.profiles?.full_name} • {senderRole}
                            </span>
                          )}
                          <div className={`
                            px-5 py-3 md:px-6 md:py-4 text-sm font-medium shadow-sm transition-all relative group
                            ${isMe
                              ? 'bg-primary text-primary-foreground rounded-[1.5rem] rounded-tr-sm'
                              : 'bg-card text-foreground rounded-[1.5rem] rounded-tl-sm border border-border'
                            }
                          `}>
                            {m.message}
                            <span className={`
                               block text-[9px] font-medium opacity-60 mt-2
                               ${isMe ? 'text-primary-foreground text-right' : 'text-muted-foreground text-left'}
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
              <div className="absolute bottom-0 left-0 right-0 p-4 md:p-10 md:pt-0 bg-background/80 backdrop-blur-md md:bg-transparent md:backdrop-blur-none border-t border-border md:border-none forced-dark:bg-[#0f172a]/80">
                <div className="bg-card rounded-[2rem] md:rounded-[2.5rem] border border-border shadow-2xl p-2 pl-4 md:p-3 md:pl-6 flex items-end gap-2 md:gap-4 ring-1 ring-border">
                  <Textarea
                    className="flex-1 min-h-[44px] max-h-32 py-3 bg-transparent border-none focus:ring-0 text-sm font-medium placeholder:text-muted-foreground resize-none"
                    placeholder={`Ketik pesan untuk ${activeCategory === 'client' ? 'Klien' : activeCategory === 'team' ? 'Tim Proyek' : 'Head Consultant'}...`}
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
                      className="size-10 md:size-12 rounded-full md:rounded-[1.5rem] bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20 disabled:opacity-50 transition-all touch-target"
                    >
                      <Send size={18} className={!newMessage.trim() ? '' : 'ml-0.5'} />
                    </Button>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-10 text-center relative overflow-hidden">
              <div className="absolute inset-0 bg-grid-slate-200/50 [mask-image:linear-gradient(0deg,white,transparent)] dark:bg-grid-white/5" />
              <div className="relative z-10 flex flex-col items-center">
                <div className="size-32 bg-card rounded-[3rem] shadow-2xl flex items-center justify-center text-primary mb-8 border border-border animate-bounce-slow">
                  <Sparkles size={48} />
                </div>
                <h3 className="text-2xl md:text-4xl font-bold tracking-tight mb-4">Pusat <span className="text-primary">Komunikasi</span></h3>
                <p className="text-muted-foreground font-medium max-w-sm text-sm md:text-lg leading-relaxed">
                  Pilih proyek di sidebar untuk memulai koordinasi kategori dengan Klien, Tim, atau Head Consultant.
                </p>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </DashboardLayout>
  );
}


