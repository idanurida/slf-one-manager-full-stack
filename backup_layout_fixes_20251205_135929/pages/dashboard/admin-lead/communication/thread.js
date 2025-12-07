// FILE: src/pages/dashboard/admin-lead/communication/thread.js
import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/router";
import { motion } from "framer-motion";
import { toast } from "sonner";

// Components
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { TooltipProvider } from "@/components/ui/tooltip";

// Icons
import { MessageCircle, User, Building, Clock, Send, RefreshCw, ArrowLeft } from "lucide-react";

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

// Message Bubble Component
const MessageBubble = ({ message, isOwn, senderName, timestamp }) => {
  const alignment = isOwn ? 'justify-end' : 'justify-start';
  const bgColor = isOwn ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-slate-100';

  return (
    <div className={`flex ${alignment} mb-4`}>
      <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${bgColor}`}>
        <p className="text-sm">{message}</p>
        <p className="text-xs opacity-70 mt-1">{senderName} • {new Date(timestamp).toLocaleString('id-ID')}</p>
      </div>
    </div>
  );
};

// Main Component
export default function AdminLeadCommunicationThreadPage() {
  const router = useRouter();
  const { user, profile, loading: authLoading, isAdminLead } = useAuth();
  const { project: projectId, client: clientId } = router.query; // Ambil dari query params

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [project, setProject] = useState(null);
  const [client, setClient] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');

  // Fetch project and client details
  const fetchProjectAndClient = useCallback(async () => {
    if (!projectId) return;

    try {
      const { data: projData, error: projErr } = await supabase
        .from('projects')
        .select('*, clients (id, full_name, email)')
        .eq('id', projectId)
        .single();

      if (projErr) throw projErr;

      setProject(projData);
      setClient(projData.clients);

    } catch (err) {
      console.error('Error fetching project/client:', err);
      setError('Gagal memuat detail proyek atau client');
      toast.error('Gagal memuat detail');
    }
  }, [projectId]);

  // Fetch messages for this project/client thread
  const fetchMessages = useCallback(async () => {
    if (!projectId || !clientId) return;

    try {
      // Asumsi tabel messages memiliki struktur: id, project_id, sender_id, recipient_id, message, created_at
      // Atau tabel notifications dengan type 'message_from_client'/'message_to_client'
      // Contoh dengan tabel notifications:
      const { data: msgs, error: msgErr } = await supabase
        .from('notifications') // Ganti dengan 'messages' jika ada tabel messages
        .select(`
          *,
          sender:profiles!sender_id(full_name)
        `)
        .eq('project_id', projectId)
        .or(`sender_id.eq.${clientId},recipient_id.eq.${clientId}`) // Pesan dari client ke admin_lead atau sebaliknya
        .order('created_at', { ascending: true });

      if (msgErr) throw msgErr;

      setMessages(msgs);

    } catch (err) {
      console.error('Error fetching messages:', err);
      setError('Gagal memuat pesan');
      toast.error('Gagal memuat pesan');
    }
  }, [projectId, clientId]);

  useEffect(() => {
    if (router.isReady && !authLoading && user && isAdminLead && projectId && clientId) {
      fetchProjectAndClient();
      fetchMessages();
    } else if (!authLoading && user && !isAdminLead) {
      router.replace('/dashboard');
    } else if (router.isReady && (!projectId || !clientId)) {
      router.replace('/dashboard/admin-lead/communication'); // Redirect jika parameter tidak lengkap
    }
  }, [router.isReady, authLoading, user, isAdminLead, projectId, clientId, fetchProjectAndClient, fetchMessages]);

  // Send new message
  const handleSendMessage = async () => {
    if (!newMessage.trim() || !projectId || !client) return;

    try {
      // Simpan pesan ke tabel messages/notifications
      // Contoh dengan notifications:
      const { error: insertErr } = await supabase
        .from('notifications') // Ganti dengan 'messages' jika ada tabel messages
        .insert({
          project_id: projectId,
          type: 'message_to_client', // atau 'admin_to_client'
          message: newMessage,
          sender_id: user.id,
          recipient_id: client.id, // Kirim ke client
          read: false,
          created_at: new Date().toISOString()
        });

      if (insertErr) throw insertErr;

      toast.success('Pesan berhasil dikirim');
      setNewMessage('');
      // Refresh pesan
      fetchMessages();

    } catch (err) {
      console.error('Error sending message:', err);
      toast.error('Gagal mengirim pesan');
    }
  };

  const handleRefresh = () => {
    fetchMessages();
    toast.success('Pesan diperbarui');
  };

  if (authLoading || (user && !isAdminLead) || loading) {
    return (
      <DashboardLayout title="Detail Komunikasi">
        <div className="flex flex-col items-center justify-center min-h-[400px] p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 dark:border-blue-400"></div>
          <p className="mt-4 text-slate-600 dark:text-slate-400">Memuat...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout title="Detail Komunikasi">
        <div className="p-4 md:p-6">
          <Button variant="outline" onClick={() => router.back()}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Kembali
          </Button>
          <Card className="mt-4 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
            <CardContent className="p-6 text-center">
              <p className="text-slate-600 dark:text-slate-400">{error}</p>
              <Button onClick={fetchMessages} className="mt-4">Coba Lagi</Button>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title={`Komunikasi: ${project?.name || '...'}`}>
      <TooltipProvider>
        <motion.div
          className="p-6 space-y-6 bg-white dark:bg-slate-900 min-h-screen"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* Header */}
          <motion.div variants={itemVariants} className="flex items-center gap-4">
            <Button variant="outline" size="icon" onClick={() => router.back()}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{project?.name}</h1>
              <p className="text-slate-600 dark:text-slate-400">Dengan {client?.full_name || client?.email}</p>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <Badge variant="outline">{project?.status ? getStatusLabel(project.status) : '...'}</Badge>
              <Button variant="outline" onClick={handleRefresh}>
                <RefreshCw className="w-4 h-4" />
              </Button>
            </div>
          </motion.div>

          <Separator className="bg-slate-200 dark:bg-slate-700" />

          {/* Messages Area */}
          <motion.div variants={itemVariants} className="h-[60vh] overflow-y-auto p-4 bg-slate-50 dark:bg-slate-800/30 rounded-lg border border-slate-200 dark:border-slate-700">
            {messages.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-500 dark:text-slate-400">
                Belum ada pesan dalam percakapan ini.
              </div>
            ) : (
              messages.map((msg) => (
                <MessageBubble
                  key={msg.id}
                  message={msg.message}
                  isOwn={msg.sender_id === user.id} // Pesan dari saya
                  senderName={msg.sender?.full_name || 'Unknown Sender'}
                  timestamp={msg.created_at}
                />
              ))
            )}
          </motion.div>

          {/* Input Area */}
          <motion.div variants={itemVariants} className="flex gap-2">
            <Textarea
              placeholder="Tulis pesan untuk client..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              className="flex-1 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 border-slate-300 dark:border-slate-600"
              rows={3}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
            />
            <Button onClick={handleSendMessage} disabled={!newMessage.trim()}>
              <Send className="w-4 h-4" />
            </Button>
          </motion.div>
        </motion.div>
      </TooltipProvider>
    </DashboardLayout>
  );
}