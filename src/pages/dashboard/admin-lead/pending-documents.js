import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { useTheme } from "next-themes";

// Components
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

// Icons
import {
  Search, FileText, Building, Users, CheckCircle2, Clock,
  AlertTriangle, Eye, RefreshCw, Calendar, User, ArrowRight,
  X, CheckCircle, Loader2, FolderOpen, AlertCircle, Info,
  Plus, Link2, ExternalLink, FileCheck, Mail, Phone, MapPin,
  Download, Trash2, Edit, ArrowLeft, ChevronRight, LayoutDashboard,
  PlusCircle, Menu, Sun, Moon, LogOut, Building2, MoreVertical, Sparkles
} from 'lucide-react';

// Utils & Context
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
  visible: { y: 0, opacity: 1, transition: { duration: 0.4, ease: "circOut" } }
};

// Format date helper
const formatDate = (dateString) => {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
};

// Format file size
const formatFileSize = (bytes) => {
  if (!bytes) return '-';
  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(2)} MB`;
};

export default function PendingDocumentsPage() {
  const router = useRouter();
  const { user, profile, loading: authLoading, isAdminLead, logout } = useAuth();
  const { theme, setTheme } = useTheme();

  // States
  const [loading, setLoading] = useState(true);
  const [documents, setDocuments] = useState([]);
  const [groupedByClient, setGroupedByClient] = useState({});
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDocuments, setSelectedDocuments] = useState([]);

  // Dialog states
  const [selectedClient, setSelectedClient] = useState(null);
  const [createProjectDialog, setCreateProjectDialog] = useState(false);
  const [linkToProjectDialog, setLinkToProjectDialog] = useState(false);
  const [existingProjects, setExistingProjects] = useState([]);
  const [selectedProjectToLink, setSelectedProjectToLink] = useState('');

  // New project form
  const [projectForm, setProjectForm] = useState({
    name: '',
    address: '',
    city: '',
    description: '',
    application_type: 'SLF',
    client_id: ''
  });
  const [creating, setCreating] = useState(false);

  // Fetch documents with strict multi-tenancy
  const fetchPendingDocuments = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      console.log('🔄 Fetching pending documents for Admin Lead:', user.id);

      // 1. Dapatkan daftar client yang dibuat oleh admin lead ini
      const { data: myClients, error: clientsError } = await supabase
        .from('clients')
        .select('id')
        .eq('created_by', user.id);

      if (clientsError) throw clientsError;

      // 2. Dapatkan daftar client dari proyek yang di-assign ke admin lead ini
      const { data: myProjects, error: projectsError } = await supabase
        .from('projects')
        .select('client_id')
        .eq('admin_lead_id', user.id);

      if (projectsError) throw projectsError;

      const myDirectClientIds = myClients?.map(c => c.id) || [];
      const myAssignedClientIds = myProjects?.map(p => p.client_id).filter(Boolean) || [];

      const distinctClientIds = [...new Set([...myDirectClientIds, ...myAssignedClientIds])];

      // Jika tidak ada client, maka tidak ada dokumen yang relevan
      if (distinctClientIds.length === 0) {
        setDocuments([]);
        setGroupedByClient({});
        setLoading(false);
        return;
      }

      // 3. Dapatkan profile users yang tergabung dalam client-client tersebut
      // Asumsi: Table profiles memiliki kolom 'client_id'
      const { data: clientProfiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id')
        .in('client_id', distinctClientIds);

      if (profilesError) throw profilesError;

      const authorizedUploaderIds = clientProfiles.map(p => p.id);

      // Jika tidak ada user profile terkait, return empty
      if (authorizedUploaderIds.length === 0) {
        setDocuments([]);
        setGroupedByClient({});
        setLoading(false);
        return;
      }

      // 3. Fetch documents yang diupload oleh user-user tersebut DAN belum punya project_id
      const { data: docs, error: docsError } = await supabase
        .from('documents')
        .select(`
          *,
          profiles:created_by (id, full_name, email, phone_number, client_id)
        `)
        .is('project_id', null)
        .in('created_by', authorizedUploaderIds) // Filter by authorized uploaders
        .order('created_at', { ascending: false });

      if (docsError) throw docsError;

      setDocuments(docs || []);

      // Grouping logic (tetap sama)
      const grouped = (docs || []).reduce((acc, doc) => {
        // Kita group berdasarkan client_id dari profile si uploader (karena doc.created_by adalah user uuid)
        // Kita butuh ID Client 'Group' nya, bukan user ID nya.
        // Doc -> Profile -> ClientID
        const clientId = doc.profiles?.client_id || 'unknown';

        if (!acc[clientId]) {
          acc[clientId] = {
            clientId: clientId, // Simpan ID Client nya
            clientUser: doc.profiles, // Ini data user uploader (might be one of many) - we use this for display info if needed
            documents: [],
            buildingInfo: doc.metadata?.building_info || null,
            applicationType: doc.metadata?.application_type || null
          };
        }
        acc[clientId].documents.push(doc);
        return acc;
      }, {});

      // Kita butuh fetch data 'Client' (company name, etc) untuk header group
      // karena 'profiles' cuma punya nama user.
      const uniqueClientIds = Object.keys(grouped).filter(id => id !== 'unknown');
      if (uniqueClientIds.length > 0) {
        const { data: clientDetails } = await supabase
          .from('clients')
          .select('id, company_name, name, email')
          .in('id', uniqueClientIds);

        clientDetails?.forEach(client => {
          if (grouped[client.id]) {
            grouped[client.id].clientIdentity = client;
          }
        });
      }

      setGroupedByClient(grouped);

    } catch (error) {
      console.error('Error fetching pending documents:', error);
      toast.error('Gagal memuat dokumen pending');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  const fetchExistingProjects = useCallback(async (clientId) => {
    if (!clientId) return;
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('client_id', clientId)
        .eq('created_by', user.id) // Ensure only my projects
        .neq('status', 'completed')
        .neq('status', 'cancelled')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setExistingProjects(data || []);

    } catch (error) {
      console.error('Error fetching projects:', error);
    }
  }, [user?.id]);

  const handleCreateProject = async () => {
    if (!projectForm.name || !selectedClient) {
      toast.error('Nama proyek harus diisi');
      return;
    }

    setCreating(true);
    try {
      const clientGroup = groupedByClient[selectedClient];

      const { data: newProject, error: projectError } = await supabase
        .from('projects')
        .insert([{
          name: projectForm.name,
          address: projectForm.address || clientGroup?.buildingInfo?.buildingAddress,
          city: projectForm.city || clientGroup?.buildingInfo?.buildingCity,
          description: projectForm.description || clientGroup?.buildingInfo?.notes,
          application_type: projectForm.application_type || clientGroup?.applicationType || 'SLF',
          client_id: selectedClient, // Use the real client ID
          admin_lead_id: user.id,
          created_by: user.id, // Audit trail
          status: 'draft',
          created_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (projectError) throw projectError;

      const docsToLink = selectedDocuments.length > 0
        ? selectedDocuments
        : clientGroup.documents.map(d => d.id);

      const { error: updateError } = await supabase
        .from('documents')
        .update({ project_id: newProject.id })
        .in('id', docsToLink);

      if (updateError) throw updateError;

      // Notify Client (Not the uploader profile necessarily, but the client email/account)
      // For now, notifying the uploader of the first document is a decent proxy if we don't have a dedicated 'client admin' user concept fully mapped yet
      const recipientId = clientGroup.documents[0]?.created_by;

      await supabase.from('notifications').insert([{
        recipient_id: recipientId,
        sender_id: user.id,
        type: 'project_created',
        message: `Proyek "${projectForm.name}" telah dibuat. Dokumen Anda telah ditautkan.`,
        read: false,
        project_id: newProject.id,
        created_at: new Date().toISOString()
      }]);

      toast.success(`Proyek "${projectForm.name}" berhasil dibuat`);
      setCreateProjectDialog(false);
      setSelectedDocuments([]);
      await fetchPendingDocuments();
      router.push(`/dashboard/admin-lead/projects/${newProject.id}`);
    } catch (error) {
      console.error('Error creating project:', error);
      toast.error(`Gagal membuat proyek: ${error.message}`);
    } finally {
      setCreating(false);
    }
  };

  const handleLinkToProject = async () => {
    if (!selectedProjectToLink || selectedDocuments.length === 0) {
      toast.error('Pilih proyek dan dokumen');
      return;
    }

    setCreating(true);
    try {
      const { error } = await supabase
        .from('documents')
        .update({ project_id: selectedProjectToLink })
        .in('id', selectedDocuments);

      if (error) throw error;

      const project = existingProjects.find(p => p.id === selectedProjectToLink);

      if (selectedClient) {
        // Notify the uploader
        const clientGroup = groupedByClient[selectedClient];
        const recipientId = clientGroup.documents[0]?.created_by;

        await supabase.from('notifications').insert([{
          recipient_id: recipientId,
          sender_id: user.id,
          type: 'documents_linked',
          message: `${selectedDocuments.length} dokumen telah ditautkan ke proyek "${project?.name}"`,
          read: false,
          project_id: selectedProjectToLink,
          created_at: new Date().toISOString()
        }]);
      }

      toast.success(`${selectedDocuments.length} dokumen berhasil ditautkan`);
      setLinkToProjectDialog(false);
      setSelectedDocuments([]);
      await fetchPendingDocuments();
    } catch (error) {
      console.error('Error linking documents:', error);
      toast.error(`Gagal menautkan dokumen: ${error.message}`);
    } finally {
      setCreating(false);
    }
  };

  const toggleDocumentSelection = (docId) => {
    setSelectedDocuments(prev =>
      prev.includes(docId) ? prev.filter(id => id !== docId) : [...prev, docId]
    );
  };

  const selectAllFromClient = (clientId) => {
    const clientDocs = groupedByClient[clientId]?.documents || [];
    const allSelected = clientDocs.every(d => selectedDocuments.includes(d.id));

    if (allSelected) {
      setSelectedDocuments(prev => prev.filter(id => !clientDocs.some(d => d.id === id)));
    } else {
      const newSelected = [...selectedDocuments];
      clientDocs.forEach(d => {
        if (!newSelected.includes(d.id)) newSelected.push(d.id);
      });
      setSelectedDocuments(newSelected);
    }
  };

  const openCreateProjectDialog = (clientId) => {
    setSelectedClient(clientId);
    const clientData = groupedByClient[clientId];
    setProjectForm({
      name: clientData?.buildingInfo?.buildingName || '',
      address: clientData?.buildingInfo?.buildingAddress || '',
      city: clientData?.buildingInfo?.buildingCity || '',
      description: clientData?.buildingInfo?.notes || '',
      application_type: clientData?.applicationType || 'SLF',
      client_id: clientId || ''
    });
    setSelectedDocuments(clientData?.documents.map(d => d.id) || []);
    setCreateProjectDialog(true);
  };

  const openLinkToProjectDialog = (clientId) => {
    setSelectedClient(clientId);
    fetchExistingProjects(clientId);
    setSelectedDocuments(groupedByClient[clientId]?.documents.map(d => d.id) || []);
    setLinkToProjectDialog(true);
  };

  const filteredClients = Object.entries(groupedByClient).filter(([_, data]) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    const companyName = data.clientIdentity?.company_name?.toLowerCase() || '';
    const picName = data.clientIdentity?.name?.toLowerCase() || '';
    const buildingName = data.buildingInfo?.buildingName?.toLowerCase() || '';

    return (
      companyName.includes(query) ||
      picName.includes(query) ||
      buildingName.includes(query)
    );
  });

  const handleRefresh = () => {
    fetchPendingDocuments();
    toast.success('Daftar dokumen diperbarui');
  };

  useEffect(() => {
    if (!authLoading && user && isAdminLead) {
      fetchPendingDocuments();
    }
  }, [authLoading, user, isAdminLead, fetchPendingDocuments]);

  if (authLoading || (user && !isAdminLead)) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] p-8">
          <Loader2 className="w-12 h-12 animate-spin text-[#7c3aed]" />
          <p className="mt-6 text-[10px] font-bold tracking-[0.3em] text-slate-400 animate-pulse">Syncing verification hub...</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-[1400px] mx-auto space-y-12 pb-24 p-6 md:p-0">
        {/* Header Hero */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="flex flex-col lg:flex-row lg:items-end justify-between gap-8"
        >
          <motion.div variants={itemVariants} className="flex flex-col items-start">
            <div className="flex items-center gap-3 mb-4">
              <Badge className="bg-[#7c3aed]/10 text-[#7c3aed] border-none text-[8px] font-bold tracking-widest px-2 py-0.5 rounded-md">
                Process management
              </Badge>
              <div className="w-1 h-1 rounded-full bg-slate-300" />
              <span className="text-[10px] font-bold tracking-widest text-slate-400">Incoming files</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-black tracking-tighter leading-none">
              Pending <span className="text-[#7c3aed]">documents</span>
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-4 text-sm md:text-lg font-medium max-w-2xl leading-relaxed">
              Hub sentral untuk meninjau berkas masuk dari partner dan meneruskannya ke proyek aktif.
            </p>
          </motion.div>

          <motion.div variants={itemVariants} className="flex flex-col sm:flex-row gap-4 w-full lg:w-auto items-stretch">
            <div className="relative group flex-1 min-w-full sm:min-w-[400px]">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#7c3aed] transition-colors" size={20} />
              <input
                className="h-14 w-full rounded-2xl bg-card border border-border shadow-xl shadow-slate-200/40 dark:shadow-none pl-14 pr-6 text-sm focus:ring-4 focus:ring-[#7c3aed]/10 outline-none transition-all placeholder-slate-400 font-bold"
                placeholder="Cari client, PIC, atau gedung..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Button className="h-14 px-8 rounded-2xl bg-[#7c3aed] hover:bg-[#6d28d9] text-white font-bold text-[10px] tracking-widest shadow-xl shadow-[#7c3aed]/20 border-none shrink-0 w-auto self-start sm:self-auto">
              Cari berkas
            </Button>
            <Button
              variant="outline"
              onClick={handleRefresh}
              className="h-14 w-14 rounded-2xl border-slate-200 dark:border-white/10 text-slate-500 hover:text-[#7c3aed] flex items-center justify-center bg-white dark:bg-slate-900 shadow-sm shrink-0 w-auto self-start sm:self-auto"
            >
              <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
            </Button>
          </motion.div>
        </motion.div>

        {/* Stats Grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6"
        >
          <StatSimple
            title="Total pending"
            value={documents.length}
            icon={<FileText size={18} />}
            color="text-[#7c3aed]"
            bg="bg-[#7c3aed]/10"
            delay={0.1}
          />
          <StatSimple
            title="Client mengantri"
            value={Object.keys(groupedByClient).length}
            icon={<Building2 size={18} />}
            color="text-blue-500"
            bg="bg-blue-500/10"
            delay={0.2}
          />
          <StatSimple
            title="Terpilih"
            value={selectedDocuments.length}
            icon={<CheckCircle2 size={18} />}
            color="text-emerald-500"
            bg="bg-emerald-500/10"
            delay={0.3}
          />
          <StatSimple
            title="Status sistem"
            value="Siaga"
            icon={<RefreshCw size={18} />}
            color="text-slate-500"
            bg="bg-slate-500/10"
            delay={0.4}
          />
        </motion.div>

        {/* Main Content Area */}
        <motion.div
          variants={itemVariants}
          initial="hidden"
          animate="visible"
          className="space-y-8"
        >
          {loading ? (
            <div className="space-y-6">
              {[1, 2].map(i => <Skeleton key={i} className="h-64 w-full rounded-[2.5rem]" />)}
            </div>
          ) : filteredClients.length === 0 ? (
            <div className="bg-card rounded-[3rem] p-20 text-center border border-border flex flex-col items-center gap-6 shadow-2xl shadow-slate-200/40 dark:shadow-none">
              <div className="size-24 rounded-[2rem] bg-emerald-500/10 text-emerald-500 flex items-center justify-center animate-pulse">
                <CheckCircle2 size={40} />
              </div>
              <div>
                <h3 className="text-3xl font-black tracking-tighter mb-2">Queue clear</h3>
                <p className="text-slate-500 font-medium max-w-md mx-auto">Tidak ada dokumen pending dari client Anda saat ini. Semua dokumen telah diproses atau belum ada upload baru.</p>
              </div>
              <Button
                variant="outline"
                onClick={handleRefresh}
                className="h-12 px-8 rounded-xl border-slate-200 dark:border-white/10 text-slate-500 hover:text-[#7c3aed] font-bold text-[10px] tracking-widest"
              >
                Refresh system
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              {filteredClients.map(([clientId, data], index) => {
                const allSelected = data.documents.every(d => selectedDocuments.includes(d.id));
                return (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    key={clientId}
                    className="bg-card rounded-[2.5rem] border border-border shadow-2xl shadow-slate-200/40 dark:shadow-none overflow-hidden"
                  >
                    <div className="p-8 border-b border-border bg-slate-50/50 dark:bg-white/[0.02]">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div className="flex items-start gap-5">
                          <div className="size-16 rounded-2xl bg-[#7c3aed] text-white flex items-center justify-center shadow-lg shadow-[#7c3aed]/20">
                            <Building2 size={28} />
                          </div>
                          <div>
                            <div className="flex items-center gap-3 mb-1">
                              <h3 className="text-xl font-bold tracking-tight">{data.clientIdentity?.company_name || 'Individual partner'}</h3>
                              <Badge className="bg-[#7c3aed] text-white border-none text-[9px] font-bold tracking-widest">{data.applicationType || 'SLF'}</Badge>
                            </div>
                            <p className="text-xs font-bold text-slate-400 tracking-widest flex items-center gap-2">
                              <User size={12} /> PIC: {data.clientIdentity?.name || data.clientUser?.full_name || 'N/A'}
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-3">
                          <Button onClick={() => openCreateProjectDialog(clientId)} className="h-10 px-6 bg-[#7c3aed] hover:bg-[#6d28d9] text-white rounded-xl font-bold text-[10px] tracking-widest shadow-lg shadow-[#7c3aed]/20">
                            <PlusCircle size={16} className="mr-2" /> Buat proyek
                          </Button>
                          <Button onClick={() => openLinkToProjectDialog(clientId)} variant="outline" className="h-10 px-6 rounded-xl font-bold text-[10px] tracking-widest border-slate-200 dark:border-white/10 hover:bg-slate-100">
                            <Link2 size={16} className="mr-2" /> Tautkan
                          </Button>
                          <Button
                            onClick={() => selectAllFromClient(clientId)}
                            variant="ghost"
                            className="h-10 px-4 rounded-xl text-slate-500 hover:text-[#7c3aed] bg-slate-100 dark:bg-white/5"
                          >
                            <Checkbox checked={allSelected} className="mr-2 rounded-[4px]" />
                            <span className="font-bold text-[10px] tracking-widest">{allSelected ? 'Batal' : 'Pilih semua'}</span>
                          </Button>
                        </div>
                      </div>
                    </div>

                    <div className="p-8">
                      {data.buildingInfo && (
                        <div className="mb-8 p-6 bg-slate-50 dark:bg-card/20 rounded-3xl border border-border grid md:grid-cols-3 gap-8">
                          <div>
                            <p className="text-[9px] font-bold tracking-widest text-slate-400 mb-2">Nama gedung</p>
                            <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{data.buildingInfo.buildingName}</p>
                          </div>
                          <div>
                            <p className="text-[9px] font-bold tracking-widest text-slate-400 mb-2">Lokasi pembangunan</p>
                            <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{data.buildingInfo.buildingCity}, {data.buildingInfo.buildingAddress}</p>
                          </div>
                          <div>
                            <p className="text-[9px] font-bold tracking-widest text-slate-400 mb-2">Catatan tambahan</p>
                            <p className="text-sm font-medium text-slate-500 italic">"{data.buildingInfo.notes || '-'}"</p>
                          </div>
                        </div>
                      )}

                      <div className="border border-border rounded-3xl overflow-hidden transition-all">
                        {/* Mobile Card View */}
                        <div className="md:hidden bg-slate-50/50 dark:bg-white/[0.02]">
                          {data.documents.map(doc => (
                            <div key={doc.id} className="p-4 border-b border-border last:border-0 hover:bg-white dark:hover:bg-white/5 transition-colors">
                              <div className="flex items-start gap-3">
                                <Checkbox
                                  checked={selectedDocuments.includes(doc.id)}
                                  onCheckedChange={() => toggleDocumentSelection(doc.id)}
                                  className="mt-1 data-[state=checked]:bg-[#7c3aed] border-slate-300 rounded-[4px]"
                                />
                                <div className="flex-1 min-w-0 space-y-2">
                                  <div>
                                    <div className="flex items-center gap-2 mb-1">
                                      <Badge variant="outline" className="border-slate-200 dark:border-white/10 text-slate-500 text-[9px] font-bold tracking-widest px-1.5 py-0">
                                        {doc.metadata?.category || 'Umum'}
                                      </Badge>
                                      <span className="text-[10px] font-medium text-slate-400">{formatDate(doc.created_at)}</span>
                                    </div>
                                    <p className="text-sm font-bold text-slate-700 dark:text-slate-200 truncate">{doc.name}</p>
                                    <p className="text-[10px] text-slate-400 truncate">{doc.metadata?.original_name}</p>
                                  </div>

                                  <div className="flex items-center justify-between pt-2 border-t border-border">
                                    <span className="text-[10px] font-bold text-slate-500">{doc.type} &bull; {formatFileSize(doc.metadata?.size)}</span>
                                    <div className="flex gap-2">
                                      <Button
                                        size="sm" variant="ghost"
                                        onClick={() => window.open(doc.url, '_blank')}
                                        className="h-8 w-8 p-0 rounded-lg text-slate-400 hover:text-[#7c3aed] hover:bg-[#7c3aed]/10"
                                      >
                                        <Eye size={14} />
                                      </Button>
                                      <Button
                                        size="sm" variant="ghost"
                                        onClick={() => {
                                          const link = document.createElement('a');
                                          link.href = doc.url;
                                          link.download = doc.metadata?.original_name || doc.name;
                                          link.click();
                                        }}
                                        className="h-8 w-8 p-0 rounded-lg text-slate-400 hover:text-[#7c3aed] hover:bg-[#7c3aed]/10"
                                      >
                                        <Download size={14} />
                                      </Button>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Desktop Table View */}
                        <div className="hidden md:block overflow-x-auto relative scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-800">
                          <Table className="min-w-[800px]">
                            <TableHeader className="bg-slate-50/50 dark:bg-white/5">
                              <TableRow className="border-b border-border">
                                <TableHead className="w-16 text-center">
                                  <span className="sr-only">Select</span>
                                </TableHead>
                                <TableHead className="font-bold text-[10px] tracking-widest text-slate-400 py-5">Identitas dokumen</TableHead>
                                <TableHead className="font-bold text-[10px] tracking-widest text-slate-400 py-5">Kategori & tipe</TableHead>
                                <TableHead className="font-bold text-[10px] tracking-widest text-slate-400 py-5">Metadata</TableHead>
                                <TableHead className="text-right font-bold text-[10px] tracking-widest text-slate-400 py-5 pr-8">Preview</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {data.documents.map(doc => (
                                <TableRow key={doc.id} className="border-b border-border last:border-0 hover:bg-slate-50/80 dark:hover:bg-white/[0.02] transition-colors">
                                  <TableCell className="text-center">
                                    <Checkbox
                                      checked={selectedDocuments.includes(doc.id)}
                                      onCheckedChange={() => toggleDocumentSelection(doc.id)}
                                      className="data-[state=checked]:bg-[#7c3aed] border-slate-300 rounded-[4px]"
                                    />
                                  </TableCell>
                                  <TableCell className="py-2">
                                    <div className="flex flex-col gap-1">
                                      <span className="font-bold text-xs text-slate-700 dark:text-slate-200 truncate max-w-[200px]">{doc.name}</span>
                                      <span className="text-[10px] text-slate-400 truncate max-w-[200px]">{doc.metadata?.original_name}</span>
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    <div className="flex items-center gap-2">
                                      <Badge variant="outline" className="border-slate-200 dark:border-white/10 text-slate-500 text-[9px] font-bold tracking-widest">
                                        {doc.metadata?.category || 'Umum'}
                                      </Badge>
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    <div className="flex flex-col gap-1">
                                      <span className="text-[10px] font-bold text-slate-500">{doc.type} &bull; {formatFileSize(doc.metadata?.size)}</span>
                                      <span className="text-[9px] font-medium text-slate-400">{formatDate(doc.created_at)}</span>
                                    </div>
                                  </TableCell>
                                  <TableCell className="text-right pr-8">
                                    <div className="flex justify-end gap-2">
                                      <Button
                                        size="sm" variant="ghost"
                                        onClick={() => window.open(doc.url, '_blank')}
                                        className="h-8 w-8 p-0 rounded-lg text-slate-400 hover:text-[#7c3aed] hover:bg-[#7c3aed]/10"
                                      >
                                        <Eye size={14} />
                                      </Button>
                                      <Button
                                        size="sm" variant="ghost"
                                        onClick={() => {
                                          const link = document.createElement('a');
                                          link.href = doc.url;
                                          link.download = doc.metadata?.original_name || doc.name;
                                          link.click();
                                        }}
                                        className="h-8 w-8 p-0 rounded-lg text-slate-400 hover:text-[#7c3aed] hover:bg-[#7c3aed]/10"
                                      >
                                        <Download size={14} />
                                      </Button>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </motion.div>
      </div>

      {/* Premium Dialogs */}
      <Dialog open={createProjectDialog} onOpenChange={setCreateProjectDialog}>
        <DialogContent className="sm:max-w-xl bg-card border-none rounded-[3rem] p-0 overflow-hidden shadow-2xl">
          <div className="bg-gradient-to-br from-[#7c3aed] to-purple-600 px-10 py-8 text-white relative">
            <div className="absolute top-0 right-0 p-8 opacity-10">
              <PlusCircle size={120} strokeWidth={1} />
            </div>
            <DialogHeader>
              <Badge className="w-fit bg-white/20 hover:bg-white/20 text-white border-none text-[9px] font-bold tracking-widest mb-4">New workflow</Badge>
              <DialogTitle className="text-3xl font-bold tracking-tighter leading-none">Inisiasi <span className="opacity-70">proyek baru</span></DialogTitle>
              <DialogDescription className="text-white/80 font-medium text-sm mt-2 max-w-sm">
                Membuat environment kerja baru dan secara otomatis menautkan {selectedDocuments.length} dokumen yang dipilih.
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="p-10 space-y-8">
            <div className="grid gap-6">
              <div className="space-y-3">
                <Label className="text-[10px] font-bold tracking-widest text-[#7c3aed] px-1">Nama proyek *</Label>
                <Input
                  className="h-14 bg-slate-50 dark:bg-white/5 border-border rounded-2xl px-6 focus:ring-4 focus:ring-[#7c3aed]/10 transition-all font-bold text-xs tracking-tight placeholder:font-bold"
                  placeholder="Contoh: Gedung Perkantoran ABC"
                  value={projectForm.name}
                  onChange={(e) => setProjectForm({ ...projectForm, name: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <Label className="text-[10px] font-bold tracking-widest text-slate-400 px-1">Jenis layanan</Label>
                  <Select value={projectForm.application_type} onValueChange={(v) => setProjectForm({ ...projectForm, application_type: v })}>
                    <SelectTrigger className="h-14 bg-slate-50 dark:bg-white/5 border-border rounded-2xl px-6 font-bold text-[10px] tracking-widest">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl">
                      <SelectItem value="SLF">SLF (Kelaikan)</SelectItem>
                      <SelectItem value="PBG">PBG (Bangunan)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-3">
                  <Label className="text-[10px] font-bold tracking-widest text-slate-400 px-1">Kota</Label>
                  <Input
                    className="h-14 bg-slate-50 dark:bg-white/5 border-border rounded-2xl px-6 font-bold text-xs tracking-tight"
                    value={projectForm.city}
                    onChange={(e) => setProjectForm({ ...projectForm, city: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-3">
                <Label className="text-[10px] font-bold tracking-widest text-slate-400 px-1">Alamat bangunan</Label>
                <Textarea
                  className="min-h-[100px] bg-slate-50 dark:bg-white/5 border-border rounded-2xl px-6 py-4 focus:ring-4 focus:ring-[#7c3aed]/10 transition-all font-bold text-xs"
                  placeholder="Alamat lengkap..."
                  value={projectForm.address}
                  onChange={(e) => setProjectForm({ ...projectForm, address: e.target.value })}
                />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 pt-4 border-t border-border">
              <Button variant="ghost" onClick={() => setCreateProjectDialog(false)} className="w-full sm:flex-1 h-14 rounded-2xl font-bold text-[10px] tracking-widest text-slate-400 hover:bg-slate-50 hover:text-slate-600">Batal operasi</Button>
              <Button onClick={handleCreateProject} disabled={creating || !projectForm.name} className="w-full sm:flex-[2] h-14 bg-[#7c3aed] hover:bg-[#6d28d9] text-white rounded-2xl font-bold text-[10px] tracking-widest shadow-xl shadow-[#7c3aed]/20 transition-all">
                {creating ? <Loader2 className="animate-spin mr-2" size={16} /> : <Sparkles className="mr-2" size={16} />}
                Create & link data
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={linkToProjectDialog} onOpenChange={setLinkToProjectDialog}>
        <DialogContent className="sm:max-w-xl bg-card border-none rounded-[3rem] p-0 overflow-hidden shadow-2xl">
          <div className="bg-gradient-to-br from-[#7c3aed] to-purple-600 px-10 py-8 text-white relative">
            <div className="absolute top-0 right-0 p-8 opacity-10">
              <Link2 size={120} strokeWidth={1} />
            </div>
            <DialogHeader>
              <Badge className="w-fit bg-white/20 hover:bg-white/20 text-white border-none text-[9px] font-bold tracking-widest mb-4">Extend workflow</Badge>
              <DialogTitle className="text-3xl font-bold tracking-tighter leading-none">Tautkan <span className="opacity-70">satu sistem</span></DialogTitle>
              <DialogDescription className="text-white/80 font-medium text-sm mt-2 max-w-sm">
                Menghubungkan {selectedDocuments.length} dokumen baru ke proyek yang sudah berjalan di database.
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="p-10 space-y-8">
            <div className="space-y-3">
              <Label className="text-[10px] font-bold tracking-widest text-[#7c3aed] px-1 pb-2 block">Pilih proyek aktif</Label>
              {existingProjects.length === 0 ? (
                <div className="p-8 bg-red-50 dark:bg-red-500/10 rounded-2xl border border-red-100 dark:border-red-500/20 flex flex-col items-center gap-4 text-center text-red-600">
                  <AlertCircle size={32} />
                  <div>
                    <span className="text-xs font-black tracking-tight block">Tidak ada proyek aktif</span>
                    <span className="text-[10px] opacity-80">Untuk client ini, anda belum membuat proyek apapun. Silahkan buat proyek baru.</span>
                  </div>
                </div>
              ) : (
                <div className="grid gap-3 max-h-[300px] overflow-y-auto pr-2">
                  {existingProjects.map(p => (
                    <div
                      key={p.id}
                      onClick={() => setSelectedProjectToLink(p.id)}
                      className={`p-4 rounded-2xl border cursor-pointer transition-all flex items-center justify-between group ${selectedProjectToLink === p.id ? 'bg-[#7c3aed]/5 border-[#7c3aed] shadow-lg shadow-[#7c3aed]/10' : 'bg-white dark:bg-white/5 border-border hover:border-[#7c3aed]/30'}`}
                    >
                      <div>
                        <h4 className={`font-bold text-xs tracking-tight mb-1 ${selectedProjectToLink === p.id ? 'text-[#7c3aed]' : 'text-slate-700 dark:text-white'}`}>{p.name}</h4>
                        <p className="text-[9px] font-bold text-slate-400 tracking-widest">{p.city}</p>
                      </div>
                      {selectedProjectToLink === p.id && <CheckCircle2 size={18} className="text-[#7c3aed]" />}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 pt-4 border-t border-border">
              <Button variant="ghost" onClick={() => setLinkToProjectDialog(false)} className="w-full sm:flex-1 h-14 rounded-2xl font-bold text-[10px] tracking-widest text-slate-400 hover:bg-slate-50">Batal</Button>
              <Button onClick={handleLinkToProject} disabled={creating || !selectedProjectToLink || selectedDocuments.length === 0} className="w-full sm:flex-[2] h-14 bg-[#7c3aed] hover:bg-[#6d28d9] text-white rounded-2xl font-bold text-[10px] tracking-widest shadow-xl shadow-[#7c3aed]/20 transition-all">
                {creating ? <Loader2 className="animate-spin mr-2" size={16} /> : <Link2 className="mr-2" size={16} />}
                Confirm Link
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}

// Sub-components
function StatSimple({ title, value, icon, color, bg, delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: delay, duration: 0.4 }}
      className="flex items-center gap-4 bg-card p-5 rounded-[2rem] border border-border shadow-xl shadow-slate-200/30 dark:shadow-none transition-all hover:scale-105 group"
    >
      <div className={`size-12 rounded-2xl flex items-center justify-center ${bg} ${color} group-hover:scale-110 transition-transform`}>
        {icon}
      </div>
      <div className="flex flex-col">
        <span className="text-[9px] font-bold text-slate-400 tracking-widest leading-none mb-1">{title}</span>
        <span className="text-2xl font-black leading-none tracking-tighter text-slate-900 dark:text-white">{value}</span>
      </div>
    </motion.div>
  );
}


