// FILE: src/pages/dashboard/admin/projects/index.js
import React, { useEffect, useState } from "react";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { supabase } from "@/utils/supabaseClient";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search, Building, ArrowRight, Loader2, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useRouter } from "next/router";

export default function AdminProjects() {
    const router = useRouter();
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");

    const fetchProjects = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('projects')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setProjects(data || []);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProjects();
    }, []);

    const filteredProjects = projects.filter(p =>
        p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.city?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <DashboardLayout title="Monitoring Seluruh Proyek">
            <div className="space-y-6">
                <div className="flex flex-col md:flex-row justify-between gap-4">
                    <div className="relative flex-1 max-w-md group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-slate-400 group-focus-within:text-primary transition-colors" />
                        <Input
                            placeholder="Cari proyek atau kota..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-12 h-12 rounded-2xl bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 shadow-sm transition-all focus:ring-primary/20"
                        />
                    </div>
                    <Button variant="outline" className="h-12 px-6 rounded-2xl gap-2 font-bold tracking-widest text-[10px]">
                        <Filter size={14} />
                        FILTER LANJUTAN
                    </Button>
                </div>

                <Card className="rounded-[2.5rem] border-slate-200/60 dark:border-white/5 shadow-2xl shadow-slate-200/40 dark:shadow-none overflow-hidden">
                    <CardContent className="p-0">
                        {loading ? (
                            <div className="flex justify-center py-20"><Loader2 className="animate-spin text-primary size-10" /></div>
                        ) : filteredProjects.length === 0 ? (
                            <div className="text-center py-20">
                                <Building className="size-16 text-slate-200 mx-auto mb-4" />
                                <p className="font-bold text-muted-foreground uppercase tracking-widest text-[10px]">PROYEK TIDAK DITEMUKAN</p>
                            </div>
                        ) : (
                            <Table>
                                <TableHeader className="bg-slate-50/50 dark:bg-white/5">
                                    <TableRow>
                                        <TableHead className="font-black text-[10px] tracking-widest uppercase px-8 py-5">Identitas Proyek</TableHead>
                                        <TableHead className="font-black text-[10px] tracking-widest uppercase px-8">Lokasi</TableHead>
                                        <TableHead className="font-black text-[10px] tracking-widest uppercase px-8">Tipe</TableHead>
                                        <TableHead className="font-black text-[10px] tracking-widest uppercase px-8">Status</TableHead>
                                        <TableHead className="font-black text-[10px] tracking-widest uppercase px-8 text-right">Detil</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredProjects.map((p) => (
                                        <TableRow
                                            key={p.id}
                                            className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors group cursor-pointer"
                                            onClick={() => router.push(`/dashboard/admin/projects/${p.id}`)}
                                        >
                                            <TableCell className="px-8 py-6">
                                                <div className="flex items-center gap-4">
                                                    <div className="size-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary font-black shadow-sm group-hover:scale-110 transition-transform">
                                                        {p.name?.charAt(0) || 'P'}
                                                    </div>
                                                    <div>
                                                        <span className="font-bold text-slate-900 dark:text-white block group-hover:text-primary transition-colors">{p.name}</span>
                                                        <span className="text-[10px] font-bold text-slate-400 tracking-widest uppercase">ID: {p.id.slice(0, 8)}</span>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell className="px-8 font-bold text-slate-600 dark:text-slate-400 text-sm">
                                                {p.city || "-"}
                                            </TableCell>
                                            <TableCell className="px-8">
                                                <Badge variant="outline" className="bg-slate-100 dark:bg-white/5 border-slate-200/60 dark:border-white/10 font-bold text-[10px] px-3 py-1 tracking-wider uppercase">
                                                    {p.application_type || "SLF"}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="px-8">
                                                <ProjectStatusBadge status={p.status} />
                                            </TableCell>
                                            <TableCell className="px-8 text-right">
                                                <button className="size-10 rounded-xl bg-slate-100 dark:bg-white/5 text-slate-400 group-hover:bg-primary group-hover:text-white transition-all flex items-center justify-center ml-auto">
                                                    <ArrowRight size={18} />
                                                </button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                    </CardContent>
                </Card>
            </div>
        </DashboardLayout>
    );
}

function ProjectStatusBadge({ status }) {
    const styles = {
        active: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
        pending: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
        completed: "bg-blue-500/10 text-blue-500 border-blue-500/20",
        cancelled: "bg-red-500/10 text-red-500 border-red-500/20"
    };
    return (
        <Badge className={`${styles[status] || "bg-slate-500/10 text-slate-500 border-slate-500/20"} capitalize font-black text-[9px] tracking-widest px-3 py-1.5 rounded-full border shadow-sm`}>
            {status || "Unknown"}
        </Badge>
    );
}
