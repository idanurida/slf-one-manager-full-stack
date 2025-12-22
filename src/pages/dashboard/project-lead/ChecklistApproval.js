// FILE: src/pages/dashboard/project-lead/ChecklistApproval.js
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';

// Components
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';

// Icons
import {
  CheckCircle2, XCircle, Search, Filter, RefreshCw, Eye, ArrowLeft,
  FileCheck, Clock, User, Building, AlertCircle
} from 'lucide-react';

// Utils
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { supabase } from '@/utils/supabaseClient';
import { useAuth } from '@/context/AuthContext';

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05 } }
};
const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { duration: 0.4, ease: "easeOut" } }
};

const ChecklistApproval = ({ projectId }) => { // projectId props for embedded usage
  const router = useRouter();
  const { user, profile, loading: authLoading, isProjectLead, isTeamLeader } = useAuth();
  const hasAccess = isProjectLead || isTeamLeader;

  const [loading, setLoading] = useState(true);
  const [checklists, setChecklists] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('submitted');
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [rejectionNotes, setRejectionNotes] = useState('');
  const [stats, setStats] = useState({ submitted: 0, approved: 0, rejected: 0 });

  useEffect(() => {
    if (!authLoading && !hasAccess) router.replace('/dashboard');
    else if (user) fetchData();
  }, [user, hasAccess, authLoading, projectId]);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch projects first
      const teamQuery = supabase.from('project_teams').select('project_id').eq('user_id', user.id).eq('role', 'project_lead');
      const legacyQuery = supabase.from('projects').select('id').eq('project_lead_id', user.id);

      const [teamRes, legacyRes] = await Promise.all([teamQuery, legacyQuery]);
      const projectIds = [...new Set([...(teamRes.data?.map(a => a.project_id) || []), ...(legacyRes.data?.map(p => p.id) || [])])];

      if (projectIds.length === 0) {
        setChecklists([]);
        return;
      }

      let query = supabase
        .from('checklist_responses')
        .select(`
          id,
          inspection_id,
          item_id,
          response,
          notes,
          responded_at,
          status,
          inspections!inner(
            id,
            project_id,
            assigned_to,
            date,
            projects!project_id(id, name, client_id),
            profiles!assigned_to(full_name, email)
          )
        `)
        .in('inspections.project_id', projectId ? [projectId] : projectIds)
        .order('responded_at', { ascending: false });

      const { data, error } = await query;
      if (error) throw error;

      const items = data.map(item => ({
        ...item,
        project_name: item.inspections?.projects?.name || 'Unknown Project',
        inspector_name: item.inspections?.profiles?.full_name || 'Tim'
      }));

      setChecklists(items);

      setStats({
        submitted: items.filter(c => c.status === 'submitted').length,
        approved: items.filter(c => c.status === 'project_lead_approved').length,
        rejected: items.filter(c => c.status === 'rejected').length
      });

    } catch (err) {
      console.error('[ChecklistApproval] Fetch Error:', err);
      toast.error('Gagal memuat data checklist');
    } finally {
      setLoading(false);
    }
  };

  const filteredChecklists = checklists.filter(item => {
    const term = searchTerm.toLowerCase();
    const matchesSearch = item.project_name?.toLowerCase().includes(term) ||
      item.inspector_name?.toLowerCase().includes(term) ||
      item.notes?.toLowerCase().includes(term);
    const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleApprove = async () => {
    try {
      const { error } = await supabase
        .from('checklist_responses')
        .update({ status: 'project_lead_approved' })
        .eq('id', selectedItem.id);

      if (error) throw error;

      toast.success('Checklist disetujui');
      setApproveDialogOpen(false);
      setSelectedItem(null);
      fetchData();
    } catch (err) {
      toast.error('Gagal menyetujui checklist');
    }
  };

  const handleReject = async () => {
    if (!rejectionNotes.trim()) return toast.error('Alasan wajib diisi');
    try {
      const { error } = await supabase
        .from('checklist_responses')
        .update({ status: 'rejected', notes: rejectionNotes }) // Update notes with rejection reason
        .eq('id', selectedItem.id);

      if (error) throw error;

      toast.success('Checklist ditolak');
      setRejectDialogOpen(false);
      setSelectedItem(null);
      setRejectionNotes('');
      fetchData();
    } catch (err) {
      toast.error('Gagal menolak checklist');
    }
  };

  if (authLoading || (user && !hasAccess)) return null;

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6">

      {/* Stats Cards */}
      {!projectId && (
        <div className="grid grid-cols-3 gap-6 mb-8">
          <div className="bg-card p-6 rounded-[2rem] shadow-xl shadow-slate-200/50 dark:shadow-none border border-border flex items-center justify-between group hover:border-yellow-200 transition-colors">
            <div>
              <p className="text-[10px] font-bold text-slate-400 tracking-widest mb-1">Perlu review</p>
              <h3 className="text-3xl font-black text-slate-900 dark:text-white">{stats.submitted}</h3>
            </div>
            <div className="size-12 rounded-xl bg-yellow-100 text-yellow-600 flex items-center justify-center group-hover:scale-110 transition-transform"><Clock size={24} /></div>
          </div>
          <div className="bg-card p-6 rounded-[2rem] shadow-xl shadow-slate-200/50 dark:shadow-none border border-border flex items-center justify-between group hover:border-green-200 transition-colors">
            <div>
              <p className="text-[10px] font-bold text-slate-400 tracking-widest mb-1">Disetujui</p>
              <h3 className="text-3xl font-black text-slate-900 dark:text-white">{stats.approved}</h3>
            </div>
            <div className="size-12 rounded-xl bg-green-100 text-green-600 flex items-center justify-center group-hover:scale-110 transition-transform"><CheckCircle2 size={24} /></div>
          </div>
          <div className="bg-card p-6 rounded-[2rem] shadow-xl shadow-slate-200/50 dark:shadow-none border border-border flex items-center justify-between group hover:border-red-200 transition-colors">
            <div>
              <p className="text-[10px] font-bold text-slate-400 tracking-widest mb-1">Ditolak</p>
              <h3 className="text-3xl font-black text-slate-900 dark:text-white">{stats.rejected}</h3>
            </div>
            <div className="size-12 rounded-xl bg-red-100 text-red-600 flex items-center justify-center group-hover:scale-110 transition-transform"><XCircle size={24} /></div>
          </div>
        </div>
      )}

      {/* Filters */}
      <motion.div variants={itemVariants} className="bg-card p-4 rounded-[2rem] shadow-xl shadow-slate-200/50 dark:shadow-none border border-border flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            placeholder="Cari item checklist, catatan, atau inspector..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-12 h-12 bg-muted/50 border-transparent focus:border-primary rounded-xl"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full md:w-[200px] h-12 bg-muted/50 border-transparent focus:border-primary rounded-xl"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent className="rounded-xl">
            <SelectItem value="all">Semua</SelectItem>
            <SelectItem value="submitted">Perlu Review</SelectItem>
            <SelectItem value="project_lead_approved">Disetujui</SelectItem>
            <SelectItem value="rejected">Ditolak</SelectItem>
          </SelectContent>
        </Select>
      </motion.div>

      {/* Checklist Grid */}
      <div className="space-y-4">
        <AnimatePresence mode="wait">
          {loading ? (
            [1, 2, 3].map(i => <Skeleton key={i} className="h-32 rounded-[2rem] w-full" />)
          ) : filteredChecklists.length === 0 ? (
            <div className="py-20 text-center">
              <div className="size-24 rounded-full bg-slate-50 dark:bg-slate-900 flex items-center justify-center mx-auto mb-6">
                <FileCheck className="size-12 text-slate-300" />
              </div>
              <h3 className="text-xl font-black tracking-tight text-slate-900 dark:text-white mb-2">Tidak ada data</h3>
              <p className="text-slate-400">Tidak ada checklist yang sesuai.</p>
            </div>
          ) : (
            filteredChecklists.map((item) => (
              <motion.div
                key={item.id}
                variants={itemVariants}
                className="group bg-card rounded-[2rem] p-6 border border-border shadow-sm hover:shadow-md hover:border-primary/30 transition-all duration-300 relative overflow-hidden"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
                  <div className="flex items-start gap-4">
                    <div className={`p-4 rounded-2xl shrink-0 ${getStatusColor(item.status)}`}>
                      <FileCheck size={24} />
                    </div>
                    <div>
                      <div className="flex items-center gap-3 mb-1">
                        <Badge className="bg-slate-100 dark:bg-slate-900 text-slate-500 dark:text-slate-300 border-none px-2 py-0.5 rounded-md text-[10px] font-bold tracking-wider">
                          {item.project_name}
                        </Badge>
                        <span className="text-[10px] text-slate-400 font-bold tracking-widest">{format(new Date(item.responded_at), 'dd MMM HH:mm', { locale: localeId })}</span>
                      </div>
                      <h3 className="text-lg font-black text-slate-900 dark:text-white mb-2 capitalize">{item.item_id.replace(/_/g, ' ')}</h3>
                      <p className="text-slate-500 text-sm mb-2">{item.notes || 'Tidak ada catatan khusus.'}</p>
                      <div className="flex items-center gap-4 text-xs font-bold text-slate-500 dark:text-slate-400 tracking-wide">
                        <span className="flex items-center gap-1"><User size={12} /> {item.inspector_name}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 self-end md:self-center">
                    {item.status === 'submitted' && (
                      <>
                        <Button
                          size="sm"
                          className="bg-green-600 hover:bg-green-700 text-white rounded-xl h-10 px-6 font-bold"
                          onClick={() => { setSelectedItem(item); setApproveDialogOpen(true); }}
                        >
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          className="bg-red-600 hover:bg-red-700 text-white rounded-xl h-10 px-6 font-bold"
                          onClick={() => { setSelectedItem(item); setRejectDialogOpen(true); }}
                        >
                          Reject
                        </Button>
                      </>
                    )}
                    {item.status === 'project_lead_approved' && (
                      <Badge className="bg-green-100 text-green-700 h-10 px-4 rounded-xl text-xs font-bold tracking-wider border-none">
                        <CheckCircle2 size={16} className="mr-2" /> Disetujui
                      </Badge>
                    )}
                    {item.status === 'rejected' && (
                      <Badge className="bg-red-100 text-red-700 h-10 px-4 rounded-xl text-xs font-bold tracking-wider border-none">
                        <XCircle size={16} className="mr-2" /> Ditolak
                      </Badge>
                    )}
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>

      {/* Dialogs */}
      <Dialog open={approveDialogOpen} onOpenChange={setApproveDialogOpen}>
        <DialogContent className="rounded-[2rem] border-none bg-card">
          <DialogHeader><DialogTitle className="text-2xl font-black tracking-tight">Konfirmasi persetujuan</DialogTitle></DialogHeader>
          <p className="text-slate-500">Anda yakin ingin menyetujui item checklist ini?</p>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setApproveDialogOpen(false)} className="rounded-xl font-bold">Batal</Button>
            <Button onClick={handleApprove} className="bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold">Ya, Setujui</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent className="rounded-[2rem] border-none bg-card">
          <DialogHeader><DialogTitle className="text-2xl font-black tracking-tight text-red-600">Konfirmasi penolakan</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <p className="text-slate-500">Berikan alasan penolakan untuk inspector:</p>
            <Textarea value={rejectionNotes} onChange={e => setRejectionNotes(e.target.value)} placeholder="Alasan penolakan..." className="min-h-[100px] rounded-xl bg-slate-50 dark:bg-slate-900 border-none" />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRejectDialogOpen(false)} className="rounded-xl font-bold">Batal</Button>
            <Button onClick={handleReject} className="bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold">Tolak Item</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </motion.div>
  );
};

const getStatusColor = (status) => {
  switch (status) {
    case 'submitted': return 'bg-yellow-100 text-yellow-600';
    case 'project_lead_review': return 'bg-blue-100 text-blue-600';
    case 'project_lead_approved': return 'bg-green-100 text-green-600';
    case 'rejected': return 'bg-red-100 text-red-600';
    default: return 'bg-slate-100 text-slate-600';
  }
};

export default ChecklistApproval;

