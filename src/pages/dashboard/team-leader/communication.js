// FILE: src/pages/dashboard/team-leader/communication.js
// Note: Database tetap menggunakan 'project_lead', UI menampilkan 'Team Leader'
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";

// Icons
import { MessageCircle, Building, User, Search, Filter, RefreshCw, ArrowLeft, ExternalLink, AlertCircle, Mail, Clock, Eye } from "lucide-react";

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
const getStatusColor = (status) => {
  // Implementasi getStatusColor jika diperlukan
  return status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800';
};

// ProjectLeadCommunicationList Component (reuse dari sebelumnya atau buat baru)
// Pastikan komponen ini tidak menyebabkan error tambahan
const ProjectLeadCommunicationList = ({ conversations, loading, onOpenChat }) => {
  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <Card key={i} className="border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-3 w-32" />
                </div>
              </div>
              <Skeleton className="h-8 w-20" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="text-center py-8">
        <MessageCircle className="w-16 h-16 mx-auto text-slate-400 dark:text-slate-500 mb-4 opacity-50" />
        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">Tidak Ada Percakapan</h3>
        <p className="text-slate-600 dark:text-slate-400">
          Belum ada komunikasi untuk proyek Anda saat ini.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {conversations.map((conv) => (
        <Card 
          key={conv.id} 
          className="border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors cursor-pointer"
          onClick={() => onOpenChat(conv.project_id, conv.client_id)}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-full">
                  <User className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h4 className="font-semibold text-slate-900 dark:text-slate-100">{conv.client_name}</h4>
                  <div className="flex items-center text-sm text-slate-600 dark:text-slate-400 space-x-4 mt-1">
                    <span className="flex items-center gap-1">
                      <Building className="w-3 h-3" />
                      {conv.project_name}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(conv.last_message_at).toLocaleDateString('id-ID')}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={conv.has_unread ? 'default' : 'secondary'}>
                  {conv.has_unread ? 'Baru' : 'Terakhir'}
                </Badge>
                <Button variant="outline" size="sm">
                  <Mail className="w-4 h-4 mr-2" />
                  Buka Chat
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

// Main Component
export default function TeamLeaderCommunicationPage() {
  const router = useRouter();
  const { user, profile, loading: authLoading, isProjectLead, isTeamLeader } = useAuth();
  const hasAccess = isProjectLead || isTeamLeader;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch data percakapan antara client dan admin_lead untuk proyek yang ditangani oleh saya
  const fetchData = useCallback(async () => {
    if (!user?.id) return;

    setLoading(true);
    setError(null);

    try {
      // Ambil proyek yang saya handle sebagai project_lead
      const {  assignments, error: assignErr } = await supabase
        .from('project_teams') // Tabel untuk assignment tim
        .select('project_id')
        .eq('user_id', user.id) // Milik saya
        .eq('role', 'project_lead'); // Sebagai project_lead

      if (assignErr) {
        console.error('[ProjectLeadCommPage] Error fetching assignments:', assignErr);
        throw assignErr; // Lempar error untuk ditangkap oleh blok catch
      }

      // ✅ PERBAIKAN: Pastikan assignments tidak null/undefined sebelum .map()
      const safeAssignments = assignments || []; // Gunakan array kosong jika null/undefined
      const projectIds = safeAssignments.map(a => a.project_id);

      // Ambil client_ids dari proyek-proyek tersebut
      let clientIds = [];
      if (projectIds.length > 0) {
        const {  projClients, error: clientsErr } = await supabase
          .from('projects')
          .select('client_id')
          .in('id', projectIds);

        if (clientsErr) throw clientsErr;

        clientIds = [...new Set(projClients.map(pc => pc.client_id))]; // Hilangkan duplikat
      }

      // Ambil percakapan dari notifications atau messages antara client dan admin_lead
      // Kita asumsikan percakapan dicatat dalam notifications dengan type tertentu
      // Atau gunakan tabel messages jika ada
      let convos = [];
      if (clientIds.length > 0) {
        // Contoh dengan notifications (akan berbeda jika menggunakan tabel messages)
        const {  notifs, error: notifsErr } = await supabase
          .from('notifications')
          .select(`
            *,
            sender:profiles!sender_id(full_name),
            recipient:profiles!recipient_id(full_name),
            projects(name)
          `)
          .or(`sender_id.in.(${clientIds.join(',')})`) // Kiriman dari client saya
          .or(`recipient_id.in.(${clientIds.join(',')})`) // Kiriman ke client saya
          .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`) // Kiriman ke/oleh saya (project_lead)
          .in('type', ['message_from_client', 'message_to_client', 'message_from_admin_lead', 'message_to_admin_lead']) // Filter type
          .order('created_at', { ascending: false });

        if (notifsErr) {
             console.error('[ProjectLeadCommPage] Error fetching notifications:', notifsErr);
             throw notifsErr;
        }

        // Proses untuk membuat daftar percakapan unik
        const groupedConversations = {};
        notifs.forEach(n => {
          // Asumsikan percakapan terjadi antara client dan admin_lead terkait proyek tertentu
          // Kita grup berdasarkan project_id dan client_id
          // Atau jika menggunakan messages, grup berdasarkan thread_id/project_id
          // Untuk saat ini, kita asumsikan satu percakapan per proyek antara client dan admin_lead
          const otherPartyId = n.sender_id === user.id ? n.recipient_id : n.sender_id;
          const projectId = n.project_id;
          const key = `${otherPartyId}-${projectId}`; // Kunci unik untuk percakapan proyek-client

          // Cek apakah otherPartyId adalah client
          if (clientIds.includes(otherPartyId)) {
              if (!groupedConversations[key]) {
                groupedConversations[key] = {
                  id: key,
                  client_id: otherPartyId,
                  project_id: projectId,
                  client_name: n.sender_id === otherPartyId ? n.sender?.full_name : n.recipient?.full_name,
                  project_name: n.projects?.name,
                  last_message_at: n.created_at,
                  last_message: n.message,
                  has_unread: !n.read
                };
              } else {
                // Update jika pesan lebih baru
                if (new Date(n.created_at) > new Date(groupedConversations[key].last_message_at)) {
                  groupedConversations[key].last_message_at = n.created_at;
                  groupedConversations[key].last_message = n.message;
                  groupedConversations[key].has_unread = groupedConversations[key].has_unread || !n.read;
                }
              }
          }
        });

        convos = Object.values(groupedConversations);
      }

      setConversations(convos);

    } catch (err) {
      console.error('[ProjectLeadCommPage] Error fetching communication data:', err);
      const errorMessage = err.message || 'Gagal memuat data komunikasi';
      setError(errorMessage);
      toast.error(`Gagal memuat data komunikasi: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (router.isReady && !authLoading && user && hasAccess) {
      fetchData();
    } else if (!authLoading && user && !hasAccess) {
      router.replace('/dashboard');
    }
  }, [router.isReady, authLoading, user, hasAccess, fetchData]);

  // Filter conversations
  const filteredConversations = conversations.filter(c =>
    c.client_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.project_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleOpenChat = (projectId, clientId) => {
    // Arahkan ke halaman chat detail
    // Contoh URL: /dashboard/team-leader/communication/chat?project=...&client=...
    router.push(`/dashboard/team-leader/communication/chat?project=${projectId}&client=${clientId}`);
  };

  const handleRefresh = () => {
    fetchData();
    toast.success('Data diperbarui');
  };

  if (authLoading || (user && !hasAccess)) {
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
          className="p-6 space-y-6 bg-white dark:bg-slate-900 min-h-screen"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* Action Buttons */}
          <motion.div variants={itemVariants} className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={handleRefresh} disabled={loading}>
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button size="sm" onClick={() => router.push('/dashboard/team-leader')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Kembali
            </Button>
          </motion.div>

          {/* Search & Filters */}
          <motion.div variants={itemVariants}>
            <Card className="border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
              <CardContent className="p-4">
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                      placeholder="Cari nama client atau nama proyek..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 border-slate-300 dark:border-slate-600"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Error Alert */}
          {error && (
            <motion.div variants={itemVariants}>
              <Alert variant="destructive" className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            </motion.div>
          )}

          {/* Conversations List */}
          <motion.div variants={itemVariants}>
            <Card className="border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
              <CardHeader>
                <CardTitle>Percakapan ({filteredConversations.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <ProjectLeadCommunicationList
                  conversations={filteredConversations}
                  loading={loading}
                  onOpenChat={handleOpenChat}
                />
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      </TooltipProvider>
    </DashboardLayout>
  );
}
