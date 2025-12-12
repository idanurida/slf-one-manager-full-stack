// FILE: src/pages/dashboard/client/support/index.js
import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/router";
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { toast } from "sonner";

// Components
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Alert,
  AlertDescription,
} from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Icons
import {
  HelpCircle, MessageCircle, Phone, Mail, Send, RefreshCw,
  Loader2, AlertTriangle, CheckCircle, Clock, FileText,
  Building, ChevronRight, ExternalLink, BookOpen
} from "lucide-react";

// Utils & Context
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { supabase } from "@/utils/supabaseClient";
import { useAuth } from "@/context/AuthContext";

const formatDateSafely = (dateString) => {
  if (!dateString) return "-";
  try {
    return format(new Date(dateString), 'dd MMM yyyy HH:mm', { locale: localeId });
  } catch (e) {
    return dateString;
  }
};

const REQUEST_TYPES = [
  { value: 'general', label: 'Pertanyaan Umum', icon: HelpCircle },
  { value: 'technical', label: 'Bantuan Teknis', icon: Building },
  { value: 'document', label: 'Konsultasi Dokumen', icon: FileText },
  { value: 'schedule', label: 'Jadwal & Timeline', icon: Clock },
  { value: 'payment', label: 'Pembayaran', icon: Mail },
  { value: 'other', label: 'Lainnya', icon: MessageCircle },
];

const FAQ_ITEMS = [
  {
    question: "Berapa lama proses pengurusan SLF?",
    answer: "Proses pengurusan SLF umumnya memakan waktu 30-60 hari kerja, tergantung pada kelengkapan dokumen dan kompleksitas bangunan. Tim kami akan membantu mempercepat proses dengan memastikan semua dokumen lengkap sejak awal."
  },
  {
    question: "Dokumen apa saja yang diperlukan untuk SLF?",
    answer: "Dokumen utama yang diperlukan meliputi: IMB/PBG, gambar as-built drawing, laporan struktur, sertifikat instalasi MEP, dan dokumen administratif lainnya. Detail lengkap akan diberikan oleh tim kami sesuai jenis bangunan Anda."
  },
  {
    question: "Bagaimana cara mengupload dokumen?",
    answer: "Anda dapat mengupload dokumen melalui menu 'Documents' di dashboard. Pilih kategori dokumen yang sesuai, lalu klik tombol upload. Pastikan file dalam format PDF dengan ukuran maksimal 10MB."
  },
  {
    question: "Bagaimana saya mengetahui status proyek saya?",
    answer: "Status proyek dapat dilihat di halaman 'My Projects' atau 'Timeline'. Anda juga akan menerima notifikasi setiap kali ada update status proyek Anda."
  },
  {
    question: "Apakah bisa melakukan inspeksi ulang?",
    answer: "Ya, inspeksi ulang dapat dilakukan jika diperlukan. Silakan hubungi tim kami melalui fitur 'Kirim Pesan' untuk mengajukan jadwal inspeksi ulang."
  },
];

const getStatusBadge = (status) => {
  const statusConfig = {
    'open': { label: 'Menunggu', variant: 'secondary' },
    'in_progress': { label: 'Diproses', variant: 'default' },
    'resolved': { label: 'Selesai', variant: 'outline' },
    'closed': { label: 'Ditutup', variant: 'outline' },
  };
  const config = statusConfig[status] || { label: status, variant: 'secondary' };
  return <Badge variant={config.variant}>{config.label}</Badge>;
};

const getPriorityBadge = (priority) => {
  const priorityConfig = {
    'low': { label: 'Rendah', className: 'bg-gray-100 text-gray-800' },
    'normal': { label: 'Normal', className: 'bg-blue-100 text-blue-800' },
    'high': { label: 'Tinggi', className: 'bg-orange-100 text-orange-800' },
    'urgent': { label: 'Urgent', className: 'bg-red-100 text-red-800' },
  };
  const config = priorityConfig[priority] || priorityConfig['normal'];
  return <Badge className={config.className}>{config.label}</Badge>;
};

export default function ClientSupportPage() {
  const router = useRouter();
  const { user, profile, loading: authLoading, isClient } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [supportRequests, setSupportRequests] = useState([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState('requests');

  // Form state
  const [requestType, setRequestType] = useState('general');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');

  // Fetch support requests
  const fetchSupportRequests = useCallback(async () => {
    if (!user) return;

    try {
      // Try to fetch from support_requests table
      const { data, error } = await supabase
        .from('support_requests')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        // If table doesn't exist, fetch from notifications as fallback
        if (error.code === '42P01') {
          const { data: notifData, error: notifError } = await supabase
            .from('notifications')
            .select('*')
            .eq('sender_id', user.id)
            .eq('type', 'support_request')
            .order('created_at', { ascending: false });

          if (notifError) throw notifError;

          // Transform notifications to support request format
          const transformedData = (notifData || []).map(n => ({
            id: n.id,
            request_type: n.metadata?.request_type || 'general',
            message: n.message,
            status: n.read ? 'resolved' : 'open',
            priority: n.metadata?.priority || 'normal',
            created_at: n.created_at,
          }));

          setSupportRequests(transformedData);
          return;
        }
        throw error;
      }

      setSupportRequests(data || []);
    } catch (err) {
      console.error('Error fetching support requests:', err);
      setSupportRequests([]);
    }
  }, [user]);

  // Submit support request
  const handleSubmitRequest = async () => {
    if (!message.trim()) {
      toast.error('Harap isi pesan terlebih dahulu');
      return;
    }

    setSubmitting(true);
    try {
      // Try to insert into support_requests table
      const { data, error } = await supabase
        .from('support_requests')
        .insert({
          user_id: user.id,
          request_type: requestType,
          subject: subject.trim() || `${REQUEST_TYPES.find(t => t.value === requestType)?.label}`,
          message: message.trim(),
          status: 'open',
          priority: requestType === 'technical' ? 'high' : 'normal'
        })
        .select()
        .single();

      if (error) {
        // If table doesn't exist, create notification instead
        if (error.code === '42P01') {
          await createSupportNotification();
        } else {
          throw error;
        }
      } else {
        // Create notification for admin_lead
        await notifyAdminLead(data.id);
      }

      toast.success('Permintaan bantuan telah dikirim. Tim SLF akan menghubungi Anda dalam 1x24 jam.');
      setDialogOpen(false);
      resetForm();
      await fetchSupportRequests();
    } catch (err) {
      console.error('Error submitting support request:', err);
      toast.error('Gagal mengirim permintaan. Silakan coba lagi.');
    } finally {
      setSubmitting(false);
    }
  };

  // Create notification as fallback
  const createSupportNotification = async () => {
    const { data: adminLeads } = await supabase
      .from('profiles')
      .select('id')
      .eq('role', 'admin_lead');

    if (adminLeads && adminLeads.length > 0) {
      const notifications = adminLeads.map(admin => ({
        project_id: null,
        type: 'support_request',
        message: `[${REQUEST_TYPES.find(t => t.value === requestType)?.label}] ${subject || ''}: ${message.trim()}`,
        sender_id: user.id,
        recipient_id: admin.id,
        read: false,
        metadata: { request_type: requestType, subject },
        created_at: new Date().toISOString()
      }));

      await supabase.from('notifications').insert(notifications);
    }
  };

  // Notify admin lead about new support request
  const notifyAdminLead = async (requestId) => {
    try {
      const { data: adminLeads } = await supabase
        .from('profiles')
        .select('id')
        .eq('role', 'admin_lead');

      if (adminLeads && adminLeads.length > 0) {
        const notifications = adminLeads.map(admin => ({
          project_id: null,
          type: 'support_request',
          message: `Support Request #${requestId}: ${subject || REQUEST_TYPES.find(t => t.value === requestType)?.label}`,
          sender_id: user.id,
          recipient_id: admin.id,
          read: false,
          metadata: { support_request_id: requestId, request_type: requestType },
          created_at: new Date().toISOString()
        }));

        await supabase.from('notifications').insert(notifications);
      }
    } catch (err) {
      console.error('Error notifying admin:', err);
    }
  };

  const resetForm = () => {
    setRequestType('general');
    setSubject('');
    setMessage('');
  };

  // Initial fetch
  useEffect(() => {
    const loadData = async () => {
      if (!user || authLoading) return;

      setLoading(true);
      try {
        await fetchSupportRequests();
      } catch (err) {
        setError('Gagal memuat data');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [user, authLoading, fetchSupportRequests]);

  // Auth check
  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/login');
    } else if (!authLoading && user && !isClient) {
      router.replace('/dashboard');
    }
  }, [authLoading, user, isClient, router]);

  const handleRefresh = async () => {
    setLoading(true);
    await fetchSupportRequests();
    setLoading(false);
    toast.success('Data diperbarui');
  };

  if (authLoading) {
    return (
      <DashboardLayout title="Support">
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Support" user={user} profile={profile}>
      <div className="p-4 md:p-6 space-y-6">
        {/* Action Buttons */}
        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button size="sm" onClick={() => setDialogOpen(true)}>
            <Send className="w-4 h-4 mr-2" />
            Kirim Permintaan
          </Button>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Contact Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-6 text-center">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <MessageCircle className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="font-semibold mb-1">Kirim Pesan</h3>
              <p className="text-sm text-muted-foreground mb-3">Support Ticket</p>
              <Button variant="outline" size="sm" onClick={() => setDialogOpen(true)}>
                Buat Tiket
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-6 text-center">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Mail className="w-6 h-6 text-green-600" />
              </div>
              <h3 className="font-semibold mb-1">Email</h3>
              <p className="text-sm text-muted-foreground mb-3">supportSLF@puridimensi.id</p>
              <Button variant="outline" size="sm" asChild>
                <a href="mailto:supportSLF@puridimensi.id">
                  Kirim Email
                </a>
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-6 text-center">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Phone className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="font-semibold mb-1">Telepon</h3>
              <p className="text-sm text-muted-foreground mb-3">+62 815-7540-9309</p>
              <Button variant="outline" size="sm" asChild>
                <a href="https://wa.me/6281575409309" target="_blank" rel="noopener noreferrer">
                  WhatsApp
                </a>
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="requests">
              Permintaan Saya
              {supportRequests.filter(r => r.status === 'open').length > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {supportRequests.filter(r => r.status === 'open').length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="faq">FAQ</TabsTrigger>
          </TabsList>

          <TabsContent value="requests" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Riwayat Permintaan Bantuan</CardTitle>
                <CardDescription>Lihat status permintaan bantuan Anda</CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map(i => (
                      <Skeleton key={i} className="h-20 w-full" />
                    ))}
                  </div>
                ) : supportRequests.length === 0 ? (
                  <div className="text-center py-8">
                    <HelpCircle className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                    <p className="text-muted-foreground">Belum ada permintaan bantuan</p>
                    <Button className="mt-4" onClick={() => setDialogOpen(true)}>
                      <Send className="w-4 h-4 mr-2" />
                      Buat Permintaan Pertama
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {supportRequests.map(request => (
                      <Card key={request.id} className="border">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <Badge variant="outline">
                                  {REQUEST_TYPES.find(t => t.value === request.request_type)?.label || request.request_type}
                                </Badge>
                                {getStatusBadge(request.status)}
                                {getPriorityBadge(request.priority)}
                              </div>
                              <p className="text-sm">{request.message}</p>
                              <p className="text-xs text-muted-foreground mt-2">
                                <Clock className="w-3 h-3 inline mr-1" />
                                {formatDateSafely(request.created_at)}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="faq" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <BookOpen className="w-5 h-5" />
                  Pertanyaan yang Sering Diajukan
                </CardTitle>
                <CardDescription>Temukan jawaban untuk pertanyaan umum</CardDescription>
              </CardHeader>
              <CardContent>
                <Accordion type="single" collapsible className="w-full">
                  {FAQ_ITEMS.map((item, index) => (
                    <AccordionItem key={index} value={`item-${index}`}>
                      <AccordionTrigger className="text-left">
                        {item.question}
                      </AccordionTrigger>
                      <AccordionContent className="text-muted-foreground">
                        {item.answer}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Submit Request Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <HelpCircle className="w-5 h-5" />
                Kirim Permintaan Bantuan
              </DialogTitle>
              <DialogDescription>
                Jelaskan masalah atau pertanyaan Anda. Tim kami akan merespons dalam 1x24 jam.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Jenis Permintaan</Label>
                <Select value={requestType} onValueChange={setRequestType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {REQUEST_TYPES.map(type => (
                      <SelectItem key={type.value} value={type.value}>
                        <div className="flex items-center gap-2">
                          <type.icon className="w-4 h-4" />
                          {type.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Subjek (Opsional)</Label>
                <Input
                  placeholder="Ringkasan singkat masalah Anda"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  disabled={submitting}
                />
              </div>

              <div className="space-y-2">
                <Label>Pesan *</Label>
                <Textarea
                  placeholder="Jelaskan detail masalah atau pertanyaan Anda..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={5}
                  disabled={submitting}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={submitting}>
                Batal
              </Button>
              <Button onClick={handleSubmitRequest} disabled={submitting || !message.trim()}>
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Mengirim...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Kirim
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
