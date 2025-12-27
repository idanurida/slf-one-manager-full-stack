// FILE: src/pages/dashboard/admin/support/index.js
import React, { useState, useEffect, useCallback } from "react";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
    MessageCircle, Mail, ExternalLink, HelpCircle, ShieldCheck,
    Heart, Save, Loader2, Globe, Send, CheckCircle, Clock, RefreshCw
} from "lucide-react";
import { supabase } from "@/utils/supabaseClient";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';

const formatDateSafely = (dateString) => {
    if (!dateString) return "-";
    try {
        return format(new Date(dateString), 'dd MMM yyyy HH:mm', { locale: localeId });
    } catch (e) {
        return dateString;
    }
};

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

const REQUEST_TYPES = [
    { value: 'general', label: 'Pertanyaan Umum' },
    { value: 'technical', label: 'Bantuan Teknis' },
    { value: 'document', label: 'Konsultasi Dokumen' },
    { value: 'schedule', label: 'Jadwal & Timeline' },
    { value: 'payment', label: 'Pembayaran' },
    { value: 'other', label: 'Lainnya' },
];

export default function AdminSupport() {
    const [contactInfo, setContactInfo] = useState({
        whatsapp: "6281575409309",
        email: "supportSLF@puridimensi.id"
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [tickets, setTickets] = useState([]);
    const [loadingTickets, setLoadingTickets] = useState(false);
    const [activeTab, setActiveTab] = useState("contacts");

    // Response state
    const [respondingTo, setRespondingTo] = useState(null);
    const [adminResponse, setAdminResponse] = useState("");
    const [isSubmittingResponse, setIsSubmittingResponse] = useState(false);

    const fetchContactInfo = useCallback(async () => {
        try {
            const { data, error } = await supabase
                .from('system_settings')
                .select('value')
                .eq('key', 'support_contact')
                .single();

            if (data && data.value) {
                setContactInfo(data.value);
            }
        } catch (e) {
            console.error("Error fetching contact info:", e);
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchTickets = useCallback(async () => {
        setLoadingTickets(true);
        try {
            const { data, error } = await supabase
                .from('support_requests')
                .select('*, profiles:profiles!support_requests_user_id_fkey(full_name, email)')
                .order('created_at', { ascending: false });

            if (error) {
                if (error.code === '42P01') {
                    setTickets([]); // Table doesn't exist yet
                } else {
                    throw error;
                }
            } else {
                setTickets(data || []);
            }
        } catch (e) {
            console.error("Error fetching tickets:", e);
        } finally {
            setLoadingTickets(false);
        }
    }, []);

    useEffect(() => {
        fetchContactInfo();
        fetchTickets();
    }, [fetchContactInfo, fetchTickets]);

    const handleSave = async () => {
        setSaving(true);
        try {
            const { error } = await supabase
                .from('system_settings')
                .upsert({
                    key: 'support_contact',
                    value: contactInfo,
                    updated_at: new Date().toISOString()
                });

            if (error) throw error;
            toast.success("Kontak support berhasil diperbarui");
            setIsEditing(false);
        } catch (e) {
            toast.error("Gagal memperbarui kontak: " + e.message);
        } finally {
            setSaving(false);
        }
    };

    const handleSubmitResponse = async () => {
        if (!adminResponse.trim()) {
            toast.error("Tulis balasan terlebih dahulu");
            return;
        }

        setIsSubmittingResponse(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();

            const { error } = await supabase
                .from('support_requests')
                .update({
                    admin_response: adminResponse.trim(),
                    status: 'resolved',
                    responded_at: new Date().toISOString(),
                    responded_by: user.id,
                    updated_at: new Date().toISOString()
                })
                .eq('id', respondingTo.id);

            if (error) throw error;

            toast.success("Balasan terkirim");
            setRespondingTo(null);
            setAdminResponse("");
            fetchTickets();
        } catch (e) {
            toast.error("Gagal mengirim balasan: " + e.message);
        } finally {
            setIsSubmittingResponse(false);
        }
    };

    return (
        <DashboardLayout title="Support Klien & Pengaturan">
            <div className="max-w-5xl mx-auto space-y-8 pb-20">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="space-y-1">
                        <h1 className="text-4xl font-black tracking-tighter text-slate-900 dark:text-white">Pusat Bantuan</h1>
                        <p className="text-muted-foreground font-medium">Kelola informasi kontak dan tiket bantuan untuk seluruh sistem.</p>
                    </div>
                </div>

                <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
                    <TabsList className="bg-slate-100 dark:bg-white/5 p-1 rounded-2xl h-auto flex flex-wrap gap-2">
                        <TabsTrigger value="contacts" className="rounded-xl h-11 px-6 font-bold text-xs uppercase tracking-widest">
                            <Globe className="w-4 h-4 mr-2" />
                            Kontak & Panduan
                        </TabsTrigger>
                        <TabsTrigger value="tickets" className="rounded-xl h-11 px-6 font-bold text-xs uppercase tracking-widest relative">
                            <MessageCircle className="w-4 h-4 mr-2" />
                            Tiket Bantuan
                            {tickets.filter(t => t.status === 'open').length > 0 && (
                                <Badge className="ml-2 bg-red-500 text-white rounded-full px-1.5 py-0.5 text-[10px] min-w-[1.25rem] h-5 flex items-center justify-center">
                                    {tickets.filter(t => t.status === 'open').length}
                                </Badge>
                            )}
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="contacts" className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <div className="flex justify-between items-center">
                            <h2 className="text-xl font-bold tracking-tight">Manajemen Kontak Support</h2>
                            <Button
                                variant={isEditing ? "ghost" : "outline"}
                                onClick={() => setIsEditing(!isEditing)}
                                className="rounded-xl font-bold px-6"
                            >
                                {isEditing ? "Batal" : "Edit Kontak"}
                            </Button>
                        </div>

                        {isEditing ? (
                            <Card className="rounded-[2.5rem] border-primary/20 bg-primary/5 shadow-2xl shadow-primary/10 overflow-hidden">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Save className="size-5 text-primary" />
                                        Edit Informasi Kontak
                                    </CardTitle>
                                    <CardDescription>Perubahan di sini akan otomatis merubah kontak di halaman Support Client.</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-6 pt-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">Nomor WhatsApp</label>
                                            <Input
                                                value={contactInfo.whatsapp}
                                                onChange={(e) => setContactInfo({ ...contactInfo, whatsapp: e.target.value })}
                                                className="h-12 rounded-2xl border-slate-200 dark:border-white/10"
                                                placeholder="Contoh: 6281575409309"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">Email Support</label>
                                            <Input
                                                value={contactInfo.email}
                                                onChange={(e) => setContactInfo({ ...contactInfo, email: e.target.value })}
                                                className="h-12 rounded-2xl border-slate-200 dark:border-white/10"
                                                placeholder="support@domain.com"
                                            />
                                        </div>
                                    </div>
                                    <Button
                                        onClick={handleSave}
                                        disabled={saving}
                                        className="w-full h-14 rounded-2xl font-black text-lg gap-3 shadow-xl shadow-primary/20"
                                    >
                                        {saving ? <Loader2 className="animate-spin" /> : <Save />}
                                        SIMPAN PERUBAHAN
                                    </Button>
                                </CardContent>
                            </Card>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <ContactCard
                                    title="WhatsApp Support"
                                    value={contactInfo.whatsapp}
                                    icon={MessageCircle}
                                    color="bg-green-500"
                                    buttons={[
                                        {
                                            text: "Tes WhatsApp",
                                            href: `https://wa.me/${contactInfo.whatsapp}?text=Halo%20Admin%20SLF%20One%20Manager%2C%20saya%20butuh%20bantuan%20terkait%20aplikasi%2Fproyek%20saya.`,
                                            variant: "default"
                                        }
                                    ]}
                                />
                                <ContactCard
                                    title="Email Support"
                                    value={contactInfo.email}
                                    icon={Mail}
                                    color="bg-blue-500"
                                    buttons={[
                                        {
                                            text: "Tes Email Link",
                                            href: `mailto:${contactInfo.email}`,
                                            variant: "outline"
                                        },
                                        {
                                            text: "Buka Webmail",
                                            href: `https://puridimensi.id/webmail`,
                                            variant: "default",
                                            secondaryIcon: ExternalLink
                                        }
                                    ]}
                                />
                            </div>
                        )}

                        <Card className="rounded-[2.5rem] border-slate-200/60 dark:border-white/5 shadow-2xl shadow-slate-200/40 dark:shadow-none overflow-hidden">
                            <CardHeader className="bg-slate-50 dark:bg-white/5 pb-8">
                                <CardTitle className="flex items-center gap-3">
                                    <HelpCircle className="size-6 text-primary" />
                                    Panduan Umum Admin
                                </CardTitle>
                                <CardDescription>Tips mengoperasikan One Manager</CardDescription>
                            </CardHeader>
                            <CardContent className="pt-8 space-y-6">
                                <div className="grid grid-cols-1 gap-6">
                                    <FaqItem
                                        icon={ShieldCheck}
                                        title="Bagaimana cara verifikasi user?"
                                        desc="Buka menu 'Persetujuan User', periksa email dan role yang didaftarkan, lalu klik tombol 'Setujui' jika data sudah benar."
                                    />
                                    <FaqItem
                                        icon={ExternalLink}
                                        title="Izin Akses Proyek"
                                        desc="Admin memiliki kemampuan untuk melihat seluruh proyek yang berjalan di sistem tanpa perlu ditugaskan secara manual."
                                    />
                                    <FaqItem
                                        icon={Heart}
                                        title="Layanan Bantuan"
                                        desc="Informasi kontak di atas akan digunakan oleh klien untuk menghubungi Anda saat membutuhkan bantuan teknis."
                                    />
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="tickets" className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <Card className="rounded-[2.5rem] border-slate-200/60 dark:border-white/5 shadow-2xl shadow-slate-200/40 dark:shadow-none overflow-hidden">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-7 border-b border-slate-100 dark:border-white/5">
                                <div>
                                    <CardTitle className="text-2xl font-black tracking-tight">Daftar Tiket Bantuan</CardTitle>
                                    <CardDescription>Respon permintaan bantuan dari klien melalui sistem ticketing.</CardDescription>
                                </div>
                                <Button variant="outline" size="sm" onClick={fetchTickets} disabled={loadingTickets} className="rounded-xl h-10 px-4">
                                    <RefreshCw className={`w-4 h-4 mr-2 ${loadingTickets ? 'animate-spin' : ''}`} />
                                    Refresh
                                </Button>
                            </CardHeader>
                            <CardContent className="p-0">
                                {loadingTickets ? (
                                    <div className="flex flex-col items-center justify-center py-20">
                                        <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" />
                                        <p className="font-bold text-xs uppercase tracking-widest text-slate-400">Memuat Tiket...</p>
                                    </div>
                                ) : tickets.length === 0 ? (
                                    <div className="text-center py-20 px-6">
                                        <div className="size-20 bg-slate-100 dark:bg-white/5 rounded-3xl flex items-center justify-center mx-auto mb-6 text-slate-300">
                                            <MessageCircle size={40} />
                                        </div>
                                        <h3 className="font-black text-xl mb-2">Belum Ada Tiket</h3>
                                        <p className="text-muted-foreground text-sm max-w-xs mx-auto">Saat ini belum ada permintaan bantuan dari klien melalui sistem ticketing.</p>
                                    </div>
                                ) : (
                                    <div className="divide-y divide-slate-100 dark:divide-white/5">
                                        {tickets.map(ticket => (
                                            <div key={ticket.id} className="p-8 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors group">
                                                <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
                                                    <div className="space-y-4 flex-1">
                                                        <div className="flex items-center gap-2">
                                                            <ProjectStatusBadge status={ticket.status} />
                                                            <Badge className="bg-primary/10 text-primary border-none rounded-full font-black text-[8px] uppercase tracking-widest px-3 py-1">
                                                                {REQUEST_TYPES.find(t => t.value === ticket.request_type)?.label || ticket.request_type}
                                                            </Badge>
                                                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">ID: #{ticket.id.slice(0, 8)}</span>
                                                        </div>

                                                        <div>
                                                            <h3 className="font-bold text-lg text-slate-900 dark:text-white leading-tight">{ticket.subject}</h3>
                                                            <p className="text-slate-600 dark:text-slate-400 mt-2 text-sm leading-relaxed">{ticket.message}</p>
                                                        </div>

                                                        <div className="flex items-center gap-4 text-xs font-bold text-slate-400">
                                                            <div className="flex items-center gap-1.5">
                                                                <Clock size={12} />
                                                                {formatDateSafely(ticket.created_at)}
                                                            </div>
                                                            <div className="flex items-center gap-1.5">
                                                                <Heart size={12} className="text-red-400" />
                                                                Dari: {ticket.profiles?.full_name || ticket.profiles?.email || 'Unknown'}
                                                            </div>
                                                        </div>

                                                        {ticket.admin_response && (
                                                            <div className="mt-4 p-5 bg-primary/5 border border-primary/10 rounded-2xl space-y-2">
                                                                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-primary">
                                                                    <ShieldCheck size={12} />
                                                                    Respon Admin
                                                                </div>
                                                                <p className="text-sm italic text-slate-700 dark:text-slate-300 leading-relaxed font-medium">"{ticket.admin_response}"</p>
                                                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{formatDateSafely(ticket.responded_at)}</p>
                                                            </div>
                                                        )}
                                                    </div>

                                                    {ticket.status === 'open' && (
                                                        <div className="shrink-0">
                                                            {respondingTo?.id === ticket.id ? (
                                                                <div className="w-full lg:w-80 space-y-3 animate-in fade-in zoom-in-95 duration-200">
                                                                    <Textarea
                                                                        placeholder="Tulis balasan Anda ke klien..."
                                                                        value={adminResponse}
                                                                        onChange={(e) => setAdminResponse(e.target.value)}
                                                                        className="min-h-[100px] rounded-2xl border-slate-200"
                                                                        disabled={isSubmittingResponse}
                                                                    />
                                                                    <div className="flex gap-2">
                                                                        <Button
                                                                            variant="ghost"
                                                                            size="sm"
                                                                            className="flex-1 rounded-xl font-bold"
                                                                            onClick={() => setRespondingTo(null)}
                                                                            disabled={isSubmittingResponse}
                                                                        >
                                                                            Batal
                                                                        </Button>
                                                                        <Button
                                                                            size="sm"
                                                                            className="flex-1 rounded-xl font-bold gap-2"
                                                                            onClick={handleSubmitResponse}
                                                                            disabled={isSubmittingResponse}
                                                                        >
                                                                            {isSubmittingResponse ? <Loader2 className="animate-spin size-4" /> : <Send size={14} />}
                                                                            Kirim
                                                                        </Button>
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                <Button
                                                                    onClick={() => setRespondingTo(ticket)}
                                                                    className="rounded-2xl h-11 px-6 font-bold tracking-widest text-[10px] uppercase shadow-lg shadow-primary/20"
                                                                >
                                                                    Balas Tiket
                                                                </Button>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>
        </DashboardLayout>
    );
}

function ContactCard({ title, value, icon: Icon, color, buttons }) {
    return (
        <Card className="rounded-[2rem] border-slate-200/60 dark:border-white/5 shadow-xl shadow-slate-200/30 dark:shadow-none overflow-hidden group">
            <CardContent className="p-8">
                <div className="flex flex-col items-center text-center space-y-4">
                    <div className={`size-16 rounded-3xl ${color} flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform`}>
                        <Icon size={32} />
                    </div>
                    <div>
                        <h3 className="font-black text-xl">{title}</h3>
                        <p className="text-muted-foreground text-sm mt-1">{value}</p>
                    </div>
                    <div className="flex flex-col gap-2 w-full mt-4">
                        {buttons.map((btn, idx) => (
                            <Button
                                key={idx}
                                asChild
                                variant={btn.variant}
                                className={`w-full rounded-2xl h-12 font-bold tracking-widest text-xs uppercase transition-all ${btn.variant === 'default' && color.includes('green') ? 'bg-green-600 hover:bg-green-700' : ''}`}
                            >
                                <a href={btn.href} target="_blank" rel="noopener noreferrer">
                                    {btn.secondaryIcon && <btn.secondaryIcon className="w-4 h-4 mr-2" />}
                                    {btn.text}
                                </a>
                            </Button>
                        ))}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

function FaqItem({ icon: Icon, title, desc }) {
    return (
        <div className="flex gap-4 group p-4 rounded-3xl hover:bg-slate-50 dark:hover:bg-white/5 transition-all">
            <div className="size-12 rounded-2xl bg-primary/10 flex flex-shrink-0 items-center justify-center text-primary group-hover:scale-110 transition-transform">
                <Icon size={24} />
            </div>
            <div>
                <h4 className="font-black text-slate-900 dark:text-white leading-none mb-2">{title}</h4>
                <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
            </div>
        </div>
    );
}
