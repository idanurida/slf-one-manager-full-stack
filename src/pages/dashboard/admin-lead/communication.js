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
const MessageThread = ({ messages, onSendMessage, loading, currentUser }) => {
  const [newMessage, setNewMessage] = useState('');

  const handleSend = () => {
    if (newMessage.trim()) {
      onSendMessage(newMessage.trim());
      setNewMessage('');
    }
  };

  if (loading) {
    return (
      <Card className="border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
        <CardContent className="p-4">
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex space-x-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-16 w-full" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
      <CardContent className="p-4">
        <div className="h-96 overflow-y-auto space-y-4 mb-4">
          {messages.length === 0 ? (
            <div className="text-center py-8">
              <MessageCircle className="w-12 h-12 mx-auto text-slate-400 mb-3" />
              <p className="text-slate-500">Belum ada pesan</p>
            </div>
          ) : (
            messages.map((message) => (
              <div key={message.id} className={`flex ${message.sender_id === currentUser.id ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${message.sender_id === currentUser.id
                  ? 'bg-blue-500 text-white'
                  : 'bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-slate-100'
                  }`}>
                  <p className="text-sm">{message.message}</p>
                  <p className={`text-xs mt-1 ${message.sender_id === currentUser.id ? 'text-blue-100' : 'text-slate-500'
                    }`}>
                    {new Date(message.created_at).toLocaleTimeString('id-ID', {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="flex space-x-2">
          <Textarea
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Ketik pesan..."
            className="flex-1"
            onKeyPress={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
          />
          <Button onClick={handleSend} disabled={!newMessage.trim()}>
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

// Client Communication Card Component
const ClientCommunicationCard = ({ project, client, unreadCount, lastMessage, onViewThread, onContact, loading }) => {
  if (loading) {
    return (
      <Card className="border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
        <CardContent className="p-4">
          <div className="flex items-center space-x-3">
            <Skeleton className="h-12 w-12 rounded-full" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:shadow-md transition-shadow cursor-pointer">
      <CardContent className="p-4" onClick={() => onViewThread(project.id, project.client_id)}>
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3 flex-1">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <Building className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between">
                <h3 className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                  {project.name}
                </h3>
                {unreadCount > 0 && (
                  <Badge variant="destructive" className="ml-2">
                    {unreadCount}
                  </Badge>
                )}
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 flex items-center">
                <User className="w-3 h-3 mr-1" />
                {client?.name || 'Client'}
              </p>

              {lastMessage && (
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 truncate">
                  {lastMessage.message}
                </p>
              )}

              <div className="flex items-center space-x-2 mt-2">
                <Badge className={getStatusColor(project.status)}>
                  {getStatusLabel(project.status)}
                </Badge>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  {lastMessage
                    ? new Date(lastMessage.created_at).toLocaleDateString('id-ID')
                    : new Date(project.created_at).toLocaleDateString('id-ID')
                  }
                </span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
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

      setStats({
        totalProjects,
        activeProjects,
        completedProjects,
        clients: clientsData?.length || 0,
        unreadMessages: unreadMessagesCount + unreadNotificationsCount,
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

  // ✅ PERBAIKAN: Group messages by project and client
  const getProjectMessages = (projectId, clientId) => {
    return messages.filter(msg =>
      msg.project_id === projectId &&
      (msg.sender_id === user.id || msg.recipient_id === user.id)
    );
  };

  // Get unread count for project-client thread
  const getUnreadCount = (projectId, clientId) => {
    return messages.filter(msg =>
      msg.project_id === projectId &&
      msg.recipient_id === user.id &&
      !msg.is_read
    ).length;
  };

  // Get last message for project-client thread
  const getLastMessage = (projectId, clientId) => {
    const threadMessages = getProjectMessages(projectId, clientId);
    return threadMessages.length > 0 ? threadMessages[0] : null;
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
    <DashboardLayout title="Komunikasi dengan Client">
      <TooltipProvider>
        <motion.div
          className="p-6 space-y-8 bg-white dark:bg-slate-900 min-h-screen"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* Header Actions */}
          <motion.div variants={itemVariants} className="flex justify-between items-center">
            <p className="text-slate-600 dark:text-slate-400">
              Kelola pesan dan notifikasi dari client terkait proyek SLF.
            </p>
            <div className="flex items-center space-x-3">
              <Button
                variant="outline"
                onClick={handleRefresh}
                disabled={loading}
                className="flex items-center gap-2 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button
                onClick={() => router.push('/dashboard/admin-lead')}
                className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Kembali ke Dashboard
              </Button>
            </div>
          </motion.div>

          <Separator className="bg-slate-200 dark:bg-slate-700" />

          {/* Stats Overview */}
          <motion.section variants={itemVariants}>
            <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-4">
              Ringkasan
            </h2>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 lg:grid-cols-6">
              <StatCard
                label="Total Proyek"
                value={stats.totalProjects}
                icon={Building}
                color="text-blue-600 dark:text-blue-400"
                helpText="Jumlah total proyek dalam sistem"
                loading={loading}
                trend={2}
              />
              <StatCard
                label="Proyek Aktif"
                value={stats.activeProjects}
                icon={Clock}
                color="text-orange-600 dark:text-orange-400"
                helpText="Proyek yang sedang dikerjakan"
                loading={loading}
                trend={5}
              />
              <StatCard
                label="Client"
                value={stats.clients}
                icon={Users}
                color="text-cyan-600 dark:text-cyan-400"
                helpText="Jumlah client terdaftar"
                loading={loading}
                trend={1}
              />
              <StatCard
                label="Pesan Belum Dibaca"
                value={stats.unreadMessages}
                icon={Mail}
                color="text-red-600 dark:text-red-400"
                helpText="Pesan dan notifikasi baru"
                loading={loading}
                trend={stats.unreadMessages > 0 ? 20 : 0}
              />
              <StatCard
                label="Dokumen Tertunda"
                value={stats.pendingDocuments}
                icon={AlertCircle}
                color="text-yellow-600 dark:text-yellow-400"
                helpText="Dokumen menunggu verifikasi"
                loading={loading}
                trend={stats.pendingDocuments > 0 ? 15 : 0}
              />
              <StatCard
                label="Jadwal Mendatang"
                value={stats.upcomingSchedules}
                icon={Calendar}
                color="text-purple-600 dark:text-purple-400"
                helpText="Jadwal dalam 7 hari ke depan"
                loading={loading}
                trend={8}
              />
            </div>
          </motion.section>

          <Separator className="bg-slate-200 dark:bg-slate-700" />

          {/* Main Content */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Project List */}
            <div className="lg:col-span-1 space-y-4">
              <Card className="border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building className="w-5 h-5" />
                    Daftar Proyek & Client
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Search & Filter */}
                    <div className="space-y-3">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <Input
                          placeholder="Cari proyek atau client..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="pl-10"
                        />
                      </div>
                      <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="w-full bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md px-3 py-2"
                      >
                        <option value="all">Semua Status</option>
                        <option value="active">Aktif</option>
                        <option value="completed">Selesai</option>
                        <option value="cancelled">Dibatalkan</option>
                      </select>
                    </div>

                    {/* Project List */}
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {filteredProjects.map((project) => (
                        <ClientCommunicationCard
                          key={project.id}
                          project={project}
                          client={project.clients}
                          unreadCount={getUnreadCount(project.id, project.client_id)}
                          lastMessage={getLastMessage(project.id, project.client_id)}
                          onViewThread={handleViewThread}
                          onContact={handleContactClient}
                          loading={loading}
                        />
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Message Thread */}
            <div className="lg:col-span-2">
              <Card className="border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageCircle className="w-5 h-5" />
                    {selectedThread ? 'Percakapan' : 'Pilih Proyek untuk Melihat Percakapan'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {selectedThread ? (
                    <MessageThread
                      messages={getProjectMessages(selectedThread.projectId, selectedThread.clientId)}
                      onSendMessage={(content) => handleSendMessage(content, selectedThread.projectId, selectedThread.clientId)}
                      loading={loading}
                      currentUser={user}
                    />
                  ) : (
                    <div className="text-center py-12">
                      <MessageCircle className="w-16 h-16 mx-auto text-slate-400 mb-4" />
                      <p className="text-slate-500">Pilih proyek untuk memulai percakapan</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </motion.div>
      </TooltipProvider>
    </DashboardLayout>
  );
}
