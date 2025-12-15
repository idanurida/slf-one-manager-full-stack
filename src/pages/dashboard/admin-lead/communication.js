// FILE: src/pages/dashboard/admin-lead/communication.js
import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/router";
import { motion } from "framer-motion";
import { toast } from "sonner";

// Components
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Textarea } from "@/components/ui/textarea";

// Icons
import { MessageCircle, Users, Building, Mail, Search, Filter, RefreshCw, Eye, Clock, CheckCircle2, AlertCircle, ArrowLeft, Phone, Calendar, Send, User } from "lucide-react";

// Utils & Context
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { supabase } from "@/utils/supabaseClient";
import { useAuth } from "@/context/AuthContext";

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
};
const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { duration: 0.5, ease: "easeOut" } }
};

// Helper functions
export const getStatusColor = (status) => {
  const colors = {
    'active': 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
    'completed': 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400',
    'cancelled': 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400',
    'draft': 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400',
    'government_submitted': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400',
  };
  return colors[status] || 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
};

export const getStatusLabel = (status) => {
  const labels = {
    'draft': 'Draft',
    'submitted': 'Submitted',
    'project_lead_review': 'Project Lead Review',
    'inspection_scheduled': 'Inspection Scheduled',
    'inspection_in_progress': 'Inspection In Progress',
    'report_draft': 'Report Draft',
    'head_consultant_review': 'Head Consultant Review',
    'client_review': 'Client Review',
    'government_submitted': 'Government Submitted',
    'slf_issued': 'SLF Issued',
    'completed': 'Completed',
    'cancelled': 'Cancelled'
  };
  return labels[status] || status;
};

// StatCard Component
const StatCard = ({ label, value, icon: Icon, color, helpText, loading, trend, onClick }) => (
  <TooltipProvider>
    <div>
      <Card
        className={`cursor-pointer hover:shadow-md transition-shadow ${onClick ? 'hover:border-primary/50' : ''}`}
        onClick={onClick}
      >
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className={`p-2 rounded-lg ${color} bg-opacity-10`}>
                {Icon && <Icon className="w-4 h-4" />}
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">{label}</p>
                <p className="text-2xl font-bold">
                  {loading ? <Skeleton className="h-8 w-12" /> : value}
                </p>
              </div>
            </div>
            {trend !== undefined && (
              <div className={`text-sm font-medium ${trend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {trend >= 0 ? '↗' : '↘'} {Math.abs(trend)}%
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  </TooltipProvider>
);

// Message Thread Component
// Modern Chat Thread Component
const MessageThread = ({ messages, onSendMessage, loading, currentUser, project, client }) => {
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = React.useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = () => {
    if (newMessage.trim()) {
      onSendMessage(newMessage.trim());
      setNewMessage('');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full bg-slate-50 dark:bg-slate-900/50">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="text-sm text-muted-foreground">Memuat obrolan...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-900/50">
      {/* Chat Header */}
      <div className="bg-white dark:bg-slate-800 p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center shadow-sm z-10">
        <div>
          <h3 className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            {project?.name}
            {project && <Badge className={getStatusColor(project.status)}>{getStatusLabel(project.status)}</Badge>}
          </h3>
          <p className="text-sm text-slate-500 flex items-center gap-1">
            <User className="w-3 h-3" />
            {client?.name || 'Client'}
          </p>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-400">
            <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
              <MessageCircle className="w-8 h-8" />
            </div>
            <p>Belum ada pesan di proyek ini</p>
            <p className="text-sm">Mulai percakapan dengan mengirim pesan pertama.</p>
          </div>
        ) : (
          messages.map((message, index) => {
            const isMe = message.sender_id === currentUser.id;
            const showTime = index === 0 || new Date(message.created_at) - new Date(messages[index - 1].created_at) > 300000;

            return (
              <div key={message.id || index} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                {showTime && (
                  <div className="w-full flex justify-center mb-4">
                    <span className="text-xs text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-full">
                      {new Date(message.created_at).toLocaleDateString('id-ID', { weekday: 'long', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                )}

                <div className={`flex max-w-[80%] ${isMe ? 'flex-row-reverse' : 'flex-row'} items-end gap-2`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium shrink-0 
                     ${isMe ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-600'}`}>
                    {isMe ? 'You' : (client?.name?.[0] || 'C')}
                  </div>

                  <div
                    className={`px-4 py-3 rounded-2xl text-sm shadow-sm
                       ${isMe
                        ? 'bg-blue-600 text-white rounded-tr-none'
                        : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-100 dark:border-slate-700 rounded-tl-none'
                      }`}
                  >
                    {message.message}
                  </div>
                </div>
                <span className="text-[10px] text-slate-400 mt-1 px-12">
                  {new Date(message.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700">
        <div className="flex gap-2 items-end max-w-4xl mx-auto">
          <Textarea
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Ketik pesan anda..."
            className="min-h-[50px] max-h-[150px] resize-none border-slate-200 dark:border-slate-700 focus:ring-blue-500 rounded-xl"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
          />
          <Button
            onClick={handleSend}
            disabled={!newMessage.trim()}
            className="h-[50px] w-[50px] rounded-xl bg-blue-600 hover:bg-blue-700 flex-shrink-0"
          >
            <Send className="w-5 h-5" />
          </Button>
        </div>
        <div className="text-center mt-2">
          <span className="text-xs text-slate-400">Tekan Enter untuk mengirim, Shift + Enter untuk baris baru</span>
        </div>
      </div>
    </div>
  );
};

// Client Communication Card Component
// Chat Sidebar Item
const ChatSidebarItem = ({ project, client, unreadCount, lastMessage, isActive, onClick }) => {
  return (
    <div
      onClick={() => onClick(project.id, project.client_id)}
      className={`
        w-full p-4 flex items-start space-x-3 cursor-pointer transition-all duration-200 border-b border-slate-100 dark:border-slate-800
        ${isActive
          ? 'bg-blue-50 dark:bg-blue-900/20 border-l-4 border-l-blue-600'
          : 'hover:bg-slate-50 dark:hover:bg-slate-800/50 border-l-4 border-l-transparent'
        }
      `}
    >
      <div className={`p-2 rounded-lg shrink-0 ${isActive ? 'bg-blue-200 dark:bg-blue-800' : 'bg-slate-100 dark:bg-slate-800'}`}>
        <Building className={`w-5 h-5 ${isActive ? 'text-blue-700 dark:text-blue-300' : 'text-slate-500'}`} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-start mb-1">
          <h4 className={`font-semibold text-sm truncate pr-2 ${isActive ? 'text-blue-900 dark:text-blue-100' : 'text-slate-900 dark:text-slate-100'}`}>
            {project.name}
          </h4>
          <span className="text-[10px] text-slate-400 shrink-0">
            {lastMessage
              ? new Date(lastMessage.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
              : new Date(project.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
            }
          </span>
        </div>

        <p className="text-xs text-slate-500 mb-1 flex items-center">
          <User className="w-3 h-3 mr-1" />
          {client?.name || 'Client'}
        </p>

        <div className="flex justify-between items-center">
          <p className={`text-xs truncate max-w-[140px] ${unreadCount > 0 ? 'font-bold text-slate-800 dark:text-slate-200' : 'text-slate-500'}`}>
            {lastMessage ? lastMessage.message : 'Belum ada pesan'}
          </p>
          {unreadCount > 0 && (
            <span className="h-5 min-w-[20px] px-1.5 flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold shadow-sm">
              {unreadCount}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

// Main Component
export default function AdminLeadCommunicationPage() {
  const router = useRouter();
  const { user, profile, loading: authLoading, isAdminLead } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({
    totalProjects: 0,
    activeProjects: 0,
    completedProjects: 0,
    clients: 0,
    unreadMessages: 0,
    pendingDocuments: 0,
    upcomingSchedules: 0
  });
  const [projects, setProjects] = useState([]);
  const [clients, setClients] = useState([]);
  const [messages, setMessages] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [clientFilter, setClientFilter] = useState('all');
  const [selectedThread, setSelectedThread] = useState(null);

  // ✅ PERBAIKAN: Fetch data dengan query yang sesuai struktur database
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      console.log('🔄 Fetching communication data...');

      // 1. Fetch semua projects dengan data client
      const { data: projectsData, error: projectsError } = await supabase
        .from('projects')
        .select(`
          *,
          clients (
            id,
            name,
            email,
            phone
          )
        `)
        .eq('created_by', user.id) // ✅ MULTI-TENANCY FILTER
        .order('created_at', { ascending: false });

      if (projectsError) throw projectsError;

      // 2. Fetch clients terpisah untuk filter
      const { data: clientsData, error: clientsError } = await supabase
        .from('clients')
        .select('id, name, email, phone')
        .order('name');

      if (clientsError) console.warn('Error fetching clients:', clientsError);

      // 3. ✅ PERBAIKAN: Fetch messages tanpa join yang bermasalah
      const { data: messagesData, error: messagesError } = await supabase
        .from('messages')
        .select('*')
        .order('created_at', { ascending: false });

      if (messagesError) {
        console.error('Error fetching messages:', messagesError);
        // Continue without messages
      }

      // 4. ✅ PERBAIKAN: Fetch notifications tanpa join yang bermasalah
      const { data: notificationsData, error: notificationsError } = await supabase
        .from('notifications')
        .select('*')
        .eq('recipient_id', user.id)
        .order('created_at', { ascending: false });

      if (notificationsError) {
        console.error('Error fetching notifications:', notificationsError);
        // Continue without notifications
      }

      // 5. Hitung unread messages
      const unreadMessagesCount = messagesData?.filter(msg =>
        msg.recipient_id === user.id && !msg.is_read
      ).length || 0;

      // 6. Hitung unread notifications
      const unreadNotificationsCount = notificationsData?.filter(notif =>
        !notif.is_read
      ).length || 0;

      // 7. Fetch pending documents count
      const { count: pendingDocsCount, error: docsError } = await supabase
        .from('documents')
        .select('*', { count: 'exact', head: true })
        .or('status.eq.pending,compliance_status.eq.pending');

      if (docsError) console.warn('Error fetching pending documents:', docsError);

      // 8. Fetch upcoming schedules count
      const sevenDaysFromNow = new Date();
      sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
      const { count: schedulesCount, error: schedError } = await supabase
        .from('schedules')
        .select('*', { count: 'exact', head: true })
        .gte('schedule_date', new Date().toISOString())
        .lte('schedule_date', sevenDaysFromNow.toISOString());

      if (schedError) console.warn('Error fetching schedules:', schedError);

      // Hitung stats
      const totalProjects = projectsData?.length || 0;
      const activeProjects = projectsData?.filter(p => !['completed', 'cancelled'].includes(p.status)).length || 0;
      const completedProjects = projectsData?.filter(p => p.status === 'completed').length || 0;

      const unreadMsgCount = (messagesData || []).filter(m => !m.read_at && m.sender_id !== user.id).length;

      setStats({
        totalProjects,
        activeProjects,
        completedProjects,
        clients: clientsData?.length || 0,
        unreadMessages: unreadMsgCount + unreadNotificationsCount,
        pendingDocuments: pendingDocsCount || 0,
        upcomingSchedules: schedulesCount || 0
      });

      setProjects(projectsData || []);
      setClients(clientsData || []);
      setMessages(messagesData || []);
      setNotifications(notificationsData || []);

      console.log('✅ Communication data loaded successfully:', {
        projects: projectsData?.length,
        clients: clientsData?.length,
        messages: messagesData?.length,
        notifications: notificationsData?.length
      });

    } catch (err) {
      console.error('❌ Error fetching communication data:', err);
      setError('Gagal memuat data komunikasi');
      toast.error('Gagal memuat data komunikasi');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (router.isReady && !authLoading && user && isAdminLead) {
      fetchData();
    } else if (!authLoading && user && !isAdminLead) {
      router.replace('/dashboard');
    }
  }, [router.isReady, authLoading, user, isAdminLead, fetchData]);

  // ✅ Handler untuk mengirim pesan
  const handleSendMessage = async (content, projectId, recipientId) => {
    try {
      const { error } = await supabase
        .from('messages')
        .insert([{
          message: content,
          project_id: projectId,
          sender_id: user.id,
          message_type: 'message_to_client' // Or dynamic based on sender
        }]);

      if (error) throw error;

      toast.success('Pesan berhasil dikirim');
      fetchData(); // Refresh data
    } catch (err) {
      console.error('Error sending message:', err);
      toast.error('Gagal mengirim pesan');
    }
  };

  // ✅ Handler untuk menandai notifikasi sebagai dibaca
  const handleMarkAsRead = async (notificationId) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId);

      if (error) throw error;

      fetchData(); // Refresh data
    } catch (err) {
      console.error('Error marking notification as read:', err);
    }
  };

  // ✅ Handler untuk kontak client
  const handleContactClient = (method, client, project) => {
    switch (method) {
      case 'email':
        if (client?.email) {
          const subject = `Update Proyek: ${project.name}`;
          const body = `Halo ${client.name || 'Client'},\n\nBerikut update terkini untuk proyek ${project.name}:\n\nStatus: ${getStatusLabel(project.status)}\n\nSalam,\n${profile?.full_name || 'Admin Lead'}`;
          window.open(`mailto:${client.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`, '_blank');
        } else {
          toast.error('Email client tidak tersedia');
        }
        break;

      case 'whatsapp':
        if (client?.phone) {
          const message = `Halo, ini update untuk proyek *${project.name}*. Status saat ini: *${getStatusLabel(project.status)}*. Ada yang bisa saya bantu?`;
          window.open(`https://wa.me/${client.phone.replace('+', '')}?text=${encodeURIComponent(message)}`, '_blank');
        } else {
          toast.error('Nomor WhatsApp client tidak tersedia');
        }
        break;

      case 'meeting':
        router.push(`/dashboard/admin-lead/schedules?project=${project.id}&client=${client.id}`);
        break;

      default:
        break;
    }
  };

  const handleViewThread = (projectId, clientId) => {
    setSelectedThread({ projectId, clientId });
  };

  const handleRefresh = () => {
    fetchData();
    toast.success('Data diperbarui');
  };

  // Filter projects
  const filteredProjects = projects.filter(p => {
    const matchesSearch = p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.clients?.name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
    const matchesClient = clientFilter === 'all' || p.client_id === clientFilter;

    return matchesSearch && matchesStatus && matchesClient;
  });

  // ✅ PERBAIKAN: Group messages by project (Simplified without recipient_id)
  const getProjectMessages = (projectId) => {
    return messages.filter(msg => msg.project_id === projectId);
  };

  // Get unread count for project thread
  const getUnreadCount = (projectId) => {
    return messages.filter(msg =>
      msg.project_id === projectId &&
      !msg.read_at &&
      msg.sender_id !== user.id
    ).length;
  };

  // Get last message for project thread
  const getLastMessage = (projectId) => {
    const threadMessages = getProjectMessages(projectId);
    return threadMessages.length > 0 ? threadMessages[threadMessages.length - 1] : null;
  };

  if (authLoading || (user && !isAdminLead)) {
    return (
      <DashboardLayout title="Komunikasi dengan Client">
        <div className="flex flex-col items-center justify-center min-h-[400px] p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 dark:border-blue-400"></div>
          <p className="mt-4 text-slate-600 dark:text-slate-400">Memuat...</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
  return (
    <DashboardLayout title="Komunikasi & Pesan">
      <div className="h-[calc(100vh-8rem)] bg-white dark:bg-slate-900 rounded-xl shadow-lg border border-slate-200 dark:border-slate-800 overflow-hidden flex">

        {/* Left Sidebar - Chat List */}
        <div className="w-1/3 min-w-[320px] max-w-[400px] border-r border-slate-200 dark:border-slate-800 flex flex-col bg-white dark:bg-slate-900">

          {/* Sidebar Header */}
          <div className="p-4 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">Pesan</h2>
              <Button size="icon" variant="ghost" onClick={handleRefresh} disabled={loading}>
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Cari project atau client..."
                className="pl-9 bg-slate-50 dark:bg-slate-800 border-none"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {/* Filter Tabs - Optional, keep simple for now or use Select */}
            <div className="flex gap-2 mt-3 overflow-x-auto pb-1 no-scrollbar">
              {['all', 'active', 'completed'].map(status => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors
                      ${statusFilter === status
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 hover:bg-slate-200'
                    }`}
                >
                  {status === 'all' ? 'Semua' : (status === 'active' ? 'Aktif' : 'Selesai')}
                </button>
              ))}
            </div>
          </div>

          {/* Chat List */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="p-4 space-y-4">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 w-full rounded-lg" />)}
              </div>
            ) : filteredProjects.length === 0 ? (
              <div className="p-8 text-center text-slate-500">
                <p>Tidak ada proyek ditemukan</p>
              </div>
            ) : (
              filteredProjects.map((project) => (
                <ChatSidebarItem
                  key={project.id}
                  project={project}
                  client={project.clients}
                  unreadCount={getUnreadCount(project.id)}
                  lastMessage={getLastMessage(project.id)}
                  isActive={selectedThread?.projectId === project.id}
                  onClick={handleViewThread}
                />
              ))
            )}
          </div>
        </div>

        {/* Right Content - Chat Window */}
        <div className="flex-1 flex flex-col bg-slate-50 dark:bg-slate-900/50 relative">
          {selectedThread ? (
            <MessageThread
              messages={getProjectMessages(selectedThread.projectId)}
              onSendMessage={(content) => handleSendMessage(content, selectedThread.projectId, selectedThread.clientId)}
              loading={loading}
              currentUser={user}
              project={projects.find(p => p.id === selectedThread.projectId)}
              client={projects.find(p => p.id === selectedThread.projectId)?.clients}
            />
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
              <div className="w-24 h-24 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-6">
                <MessageCircle className="w-12 h-12 text-slate-300 dark:text-slate-600" />
              </div>
              <h3 className="text-xl font-semibold text-slate-700 dark:text-slate-300 mb-2">Selamat Datang di Pesan</h3>
              <p className="text-slate-500 max-w-md text-center">
                Pilih salah satu proyek dari daftar di sebelah kiri untuk mulai berkomunikasi dengan Client.
              </p>
            </div>
          )}
        </div>

      </div>
    </DashboardLayout>
  );
}
