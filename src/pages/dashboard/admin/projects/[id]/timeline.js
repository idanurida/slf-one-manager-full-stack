import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/router";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { supabase } from "@/utils/supabaseClient";
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Calendar, Clock, CheckCircle2, AlertTriangle, Loader2 } from "lucide-react";
import { motion } from "framer-motion";

export default function AdminProjectTimelinePage() {
    const router = useRouter();
    const { id } = router.query;
    const { user, isAdmin, isSuperadmin, loading: authLoading } = useAuth();
    const [loading, setLoading] = useState(true);
    const [project, setProject] = useState(null);
    const [phases, setPhases] = useState([]);

    const fetchData = useCallback(async () => {
        if (!id) return;
        setLoading(true);
        try {
            const { data: projectData } = await supabase
                .from('projects')
                .select('*')
                .eq('id', id)
                .single();
            setProject(projectData);

            // Fetch phases (simulated or from a table if exists)
            // For now, let's use the static definition but we could fetch from project_phases table if it exists
            const staticPhases = [
                { id: 1, name: "Persiapan & Administrasi", status: "completed", date: projectData?.created_at },
                { id: 2, name: "Inspeksi Lapangan", status: projectData?.status === 'completed' || projectData?.status.includes('inspection_completed') ? "completed" : "in_progress" },
                { id: 3, name: "Pembuatan Laporan teknis", status: "pending" },
                { id: 4, name: "Review & Approval Klien", status: "pending" },
                { id: 5, name: "Penerbitan Sertifikat SLF", status: "pending" }
            ];
            setPhases(staticPhases);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        if (router.isReady && !authLoading) {
            if (!user || (!isAdmin && !isSuperadmin)) {
                router.replace('/dashboard');
                return;
            }
            fetchData();
        }
    }, [router.isReady, authLoading, user, isAdmin, isSuperadmin, fetchData]);

    if (loading || authLoading) {
        return (
            <DashboardLayout title="Timeline Proyek">
                <div className="flex items-center justify-center min-h-[400px]">
                    <Loader2 className="animate-spin text-primary" />
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout title="Timeline Proyek">
            <div className="max-w-4xl mx-auto space-y-8 pb-20">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" onClick={() => router.back()} className="rounded-xl">
                        <ArrowLeft className="mr-2 h-4 w-4" /> Kembali
                    </Button>
                    <div>
                        <h1 className="text-xl font-bold tracking-tight">Timeline <span className="text-primary">Rekap</span></h1>
                        <p className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wider">{project?.name || 'Detail Pengerjaan'}</p>
                    </div>
                </div>

                <div className="relative space-y-12 before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-200 before:to-transparent">
                    {phases.map((phase, idx) => (
                        <motion.div
                            key={phase.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.1 }}
                            className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group"
                        >
                            <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white bg-slate-100 dark:bg-slate-800 dark:border-slate-700 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                                {phase.status === 'completed' ? <CheckCircle2 className="text-emerald-500 w-6 h-6" /> : <Clock className="text-slate-400 w-5 h-5" />}
                            </div>
                            <Card className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-6 rounded-[2rem] border-slate-200/60 shadow-lg shadow-slate-200/20">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-primary">Fase 0{phase.id}</span>
                                    <Badge variant={phase.status === 'completed' ? 'success' : phase.status === 'in_progress' ? 'default' : 'secondary'} className="text-[8px] px-2 py-0.5 rounded-full uppercase font-black">
                                        {phase.status}
                                    </Badge>
                                </div>
                                <h3 className="font-bold text-sm mb-1">{phase.name}</h3>
                                <p className="text-[11px] text-muted-foreground leading-relaxed">Estimasi pengerjaan sesuai dengan standar operasional prosedur SLF.</p>
                                {phase.date && (
                                    <div className="mt-4 pt-4 border-t border-slate-100 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
                                        <Calendar size={12} />
                                        {format(new Date(phase.date), 'dd MMMM yyyy', { locale: localeId })}
                                    </div>
                                )}
                            </Card>
                        </motion.div>
                    ))}
                </div>
            </div>
        </DashboardLayout>
    );
}
