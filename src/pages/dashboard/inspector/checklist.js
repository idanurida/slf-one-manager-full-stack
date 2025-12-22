// FILE: src/pages/dashboard/inspector/checklist.js

import React, { useEffect } from 'react';
import { useRouter } from 'next/router';
import { motion } from 'framer-motion';
import { Loader2, ClipboardList, ArrowRight } from 'lucide-react';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { Button } from '@/components/ui/button';

export default function InspectorChecklistRedirect() {
  const router = useRouter();

  useEffect(() => {
    // Memberikan delay kecil untuk estetika premium sebelum redirect
    const timer = setTimeout(() => {
      router.push('/dashboard/inspector/my-inspections');
    }, 3000);

    return () => clearTimeout(timer);
  }, [router]);

  return (
    <DashboardLayout>
      <div className="min-h-[80vh] flex flex-col items-center justify-center p-6 text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="max-w-md w-full bg-white dark:bg-[#1e293b] p-12 rounded-[3.5rem] shadow-2xl shadow-slate-200/50 dark:shadow-none border border-slate-100 dark:border-white/5 space-y-8"
        >
          <div className="w-24 h-24 bg-gradient-to-br from-[#7c3aed] to-[#4f46e5] rounded-[2.5rem] flex items-center justify-center mx-auto text-white shadow-xl shadow-purple-500/20 ring-8 ring-purple-50">
            <ClipboardList size={40} />
          </div>

          <div className="space-y-4">
            <h1 className="text-3xl font-black uppercase tracking-tighter text-slate-800 dark:text-white leading-none">
              Project <span className="text-[#7c3aed]">Linked</span> Workflow
            </h1>
            <p className="text-slate-500 font-medium leading-relaxed">
              Checklist sekarang terhubung langsung dengan proyek dan jadwal inspeksi aktif Anda.
            </p>
          </div>

          <div className="bg-slate-50 dark:bg-white/5 p-6 rounded-3xl flex items-center gap-4 text-left border border-slate-100 dark:border-white/5">
            <div className="w-10 h-10 rounded-2xl bg-white dark:bg-slate-800 flex items-center justify-center shadow-sm">
              <Loader2 className="animate-spin text-[#7c3aed]" size={20} />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Status</p>
              <p className="text-sm font-black text-slate-700 dark:text-slate-200 uppercase">Menuju My Inspections...</p>
            </div>
          </div>

          <Button
            onClick={() => router.push('/dashboard/inspector/my-inspections')}
            className="w-full bg-[#7c3aed] hover:bg-[#6d28d9] text-white rounded-2xl h-14 font-black uppercase tracking-widest text-xs shadow-xl shadow-purple-500/20 items-center justify-center group transition-all"
          >
            Buka Sekarang
            <ArrowRight size={16} className="ml-2 group-hover:translate-x-1 transition-transform" />
          </Button>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="mt-12 text-[10px] font-black uppercase tracking-[0.3em] text-slate-400"
        >
          SLF ONE MANAGER • INSPECTOR MODULE
        </motion.p>
      </div>
    </DashboardLayout>
  );
}
