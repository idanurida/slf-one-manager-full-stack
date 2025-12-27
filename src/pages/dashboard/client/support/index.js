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

function ProjectStatusBadge({ status }) {
  const styles = {
    open: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
    resolved: "bg-blue-500/10 text-blue-500 border-blue-500/20",
    closed: "bg-slate-500/10 text-slate-500 border-slate-500/20",
    in_progress: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20"
  };
  return (
    <Badge className={`${styles[status] || "bg-slate-500/10 text-slate-500 border-slate-500/20"} capitalize font-black text-[8px] tracking-widest px-3 py-1 rounded-full border shadow-sm`}>
      {status || "Unknown"}
    </Badge>
  );
}

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

  const [contactInfo, setContactInfo] = useState({
    whatsapp: "6281575409309",
    email: "supportSLF@puridimensi.id"
  });

  useEffect(() => {
    const fetchSystemSettings = async () => {
      try {
        const { data } = await supabase
          .from('system_settings')
          .select('value')
          .eq('key', 'support_contact')
          .single();
        if (data?.value) setContactInfo(data.value);
      } catch (e) {
        console.error("Error fetching system settings:", e);
      }
    };
    fetchSystemSettings();
  }, []);

  // Fetch support requests
  const fetchSupportRequests = useCallback(async () => {
    if (!user) return;

    try {
      // Try to fetch from support_requests table
      const { data, error } = await supabase
        .from('support_requests')
        .select(`
          *,
          responder:profiles!support_requests_responded_by_fkey(full_name)
        `)
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
            status: n.is_read ? 'resolved' : 'open',
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
        is_read: false,
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
          is_read: false,
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="rounded-[2rem] border-slate-200/60 dark:border-white/5 shadow-xl shadow-slate-200/30 dark:shadow-none overflow-hidden group bg-slate-50 dark:bg-white/5">
            <CardContent className="p-8">
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="size-16 rounded-3xl bg-blue-500 flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform">
                  <Mail size={32} />
                </div>
                <div>
                  <h3 className="font-black text-xl">Email Support</h3>
                  <p className="text-muted-foreground text-sm mt-1">{contactInfo?.email || 'supportSLF@puridimensi.id'}</p>
                </div>
                <Button variant="default" className="w-full rounded-2xl h-12 font-bold tracking-widest text-xs uppercase" asChild>
                  <a href={`mailto:${contactInfo?.email || 'supportSLF@puridimensi.id'}`}>
                    Kirim Email
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-[2rem] border-slate-200/60 dark:border-white/5 shadow-xl shadow-slate-200/30 dark:shadow-none overflow-hidden group bg-slate-50 dark:bg-white/5">
            <CardContent className="p-8">
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="size-16 rounded-3xl bg-green-500 flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform">
                  <MessageCircle size={32} />
                </div>
                <div>
                  <h3 className="font-black text-xl">WhatsApp</h3>
                  <p className="text-muted-foreground text-sm mt-1">Fast Respond via WA</p>
                </div>
                <Button variant="default" className="w-full rounded-2xl h-12 font-bold bg-green-600 hover:bg-green-700 tracking-widest text-xs uppercase" asChild>
                  <a
                    href={`https://wa.me/${contactInfo?.whatsapp || '6281575409309'}?text=Halo%20Admin%20SLF%20One%20Manager%2C%20saya%20butuh%20bantuan%20terkait%20aplikasi%2Fproyek%20saya.`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Hubungi WhatsApp
                  </a>
                </Button>
              </div>
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
                      <Card key={request.id} className="rounded-[2rem] border-slate-200/60 dark:border-white/5 shadow-lg shadow-slate-200/20 dark:shadow-none overflow-hidden hover:scale-[1.01] transition-transform">
                        <CardContent className="p-6">
                          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                            <div className="flex-1 space-y-4">
                              <div className="flex items-center gap-2">
                                <Badge className="bg-primary/10 text-primary border-none rounded-full font-black text-[8px] uppercase tracking-widest px-3 py-1">
                                  {REQUEST_TYPES.find(t => t.value === request.request_type)?.label || request.request_type}
                                </Badge>
                                <ProjectStatusBadge status={request.status} />
                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">ID: #{request.id.slice(0, 8)}</span>
                              </div>

                              <div>
                                <h4 className="font-bold text-slate-900 dark:text-white">{request.subject}</h4>
                                <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">{request.message}</p>
                              </div>

                              <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-slate-400">
                                <Clock size={12} />
                                {formatDateSafely(request.created_at)}
                              </div>

                              {request.admin_response && (
                                <div className="mt-4 p-5 bg-primary/5 border border-primary/10 rounded-2xl space-y-2 animate-in fade-in slide-in-from-top-2 duration-500">
                                  <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-primary">
                                    <CheckCircle size={12} />
                                    Respon Admin
                                  </div>
                                  <p className="text-sm italic text-slate-700 dark:text-slate-300 leading-relaxed font-medium">"{request.admin_response}"</p>
                                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Dibalas oleh {request.responder?.full_name || 'Admin'} pada {formatDateSafely(request.responded_at)}</p>
                                </div>
                              )}
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
