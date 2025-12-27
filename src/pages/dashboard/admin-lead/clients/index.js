// FILE: src/pages/dashboard/admin-lead/clients/index.js
// Halaman Manajemen Klien - Mobile First Card View
import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/router";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

// Components
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";

// Icons
import {
    Search, Plus, MoreVertical, Edit, Trash2, Phone, Mail, MapPin, Building2, User
} from "lucide-react";

// Utils
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { supabase } from "@/utils/supabaseClient";
import { useAuth } from "@/context/AuthContext";

const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.05 } }
};

const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1, transition: { duration: 0.4, ease: "circOut" } }
};

export default function ClientListPage() {
    const router = useRouter();
    const { user, loading: authLoading, isAdminLead } = useAuth();

    const [loading, setLoading] = useState(true);
    const [clients, setClients] = useState([]);
    const [filteredClients, setFilteredClients] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');

    const fetchClients = useCallback(async () => {
        if (!user?.id) return;
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('clients')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setClients(data || []);
            setFilteredClients(data || []);
        } catch (err) {
            console.error(err);
            toast.error('Gagal memuat data klien');
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        if (!authLoading && user && isAdminLead) {
            fetchClients();
        }
    }, [authLoading, user, isAdminLead, fetchClients]);

    useEffect(() => {
        const term = searchTerm.toLowerCase();
        setFilteredClients(clients.filter(c =>
            c.name.toLowerCase().includes(term) ||
            c.city?.toLowerCase().includes(term) ||
            c.email?.toLowerCase().includes(term)
        ));
    }, [searchTerm, clients]);

    const handleDelete = async (id) => {
        if (!confirm('Hapus data klien ini? Data proyek terkait mungkin akan terdampak.')) return;
        try {
            const { error } = await supabase.from('clients').delete().eq('id', id);
            if (error) throw error;
            toast.success('Klien dihapus');
            fetchClients();
        } catch (err) {
            toast.error('Gagal menghapus');
        }
    }

    if (authLoading || (user && !isAdminLead)) return null;

    return (
        <DashboardLayout>
            <motion.div
                className="max-w-md mx-auto md:max-w-5xl space-y-6 pb-24 px-4 md:px-0"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
            >
                {/* Header */}
                <div className="flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-black tracking-tight text-foreground">Database Klien</h1>
                            <p className="text-xs font-medium text-muted-foreground">Kelola informasi pemilik proyek</p>
                        </div>
                    </div>

                    {/* Search Bar */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
                        <input
                            className="w-full h-12 rounded-2xl bg-card border border-border pl-9 pr-4 text-sm font-bold focus:ring-2 focus:ring-primary/20 outline-none shadow-sm"
                            placeholder="Cari nama, email, atau kota..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                {/* Client Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {loading ? (
                        Array(6).fill(0).map((_, i) => <Skeleton key={i} className="h-40 w-full rounded-2xl" />)
                    ) : filteredClients.length === 0 ? (
                        <div className="col-span-full py-12 text-center text-muted-foreground text-xs font-medium bg-card rounded-[2rem] border border-dashed border-border">
                            Belum ada data klien
                        </div>
                    ) : (
                        filteredClients.map(client => (
                            <motion.div
                                key={client.id} variants={itemVariants}
                                className="bg-card border border-border rounded-[2rem] p-6 relative group hover:border-primary/50 hover:shadow-lg transition-all"
                                onClick={() => router.push(`/dashboard/admin-lead/clients/${client.id}`)}
                            >
                                <div className="flex justify-between items-start mb-4">
                                    <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-blue-500/20 to-indigo-500/20 text-blue-600 flex items-center justify-center font-black text-lg">
                                        {client.name.charAt(0)}
                                    </div>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 -mr-2 text-muted-foreground" onClick={e => e.stopPropagation()}>
                                                <MoreVertical size={16} />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end" className="rounded-xl">
                                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); router.push(`/dashboard/admin-lead/clients/${client.id}`) }}>
                                                <Edit size={14} className="mr-2" /> Detail
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleDelete(client.id) }} className="text-red-500">
                                                <Trash2 size={14} className="mr-2" /> Hapus
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>

                                <h3 className="font-black text-lg text-foreground line-clamp-1 mb-1">{client.name}</h3>
                                <div className="space-y-2 mt-3">
                                    {client.contact_person && (
                                        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                                            <User size={14} className="text-primary" />
                                            <span className="truncate">{client.contact_person}</span>
                                        </div>
                                    )}
                                    <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                                        <MapPin size={14} className="text-primary" />
                                        <span className="truncate">{client.city || 'Kota belum diset'}</span>
                                    </div>
                                    {client.email && (
                                        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                                            <Mail size={14} className="text-primary" />
                                            <span className="truncate">{client.email}</span>
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        ))
                    )}
                </div>
            </motion.div>

            {/* Floating Action Button */}

        </DashboardLayout>
    );
}
