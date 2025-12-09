// FILE: src/pages/dashboard/admin-lead/clients.js
import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/router";
import { motion } from "framer-motion";
import { toast } from "sonner";

// Components
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { DataTable } from "@/components/ui/data-table"; // Asumsikan komponen ini ada atau gunakan tabel bawaan shadcn
import { TooltipProvider, Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

// Icons
import { User, Building, Mail, Phone, Calendar, CheckCircle2, Clock, AlertCircle, RefreshCw, Search, Eye, MessageCircle, ArrowLeft } from "lucide-react";

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

// Component: Client List Item (atau gunakan DataTable)
const ClientList = ({ clients, loading, onViewDetails, onSendMessage, searchTerm }) => {
  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <Card key={i} className="border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                </div>
                <div className="flex space-x-2">
                  <Skeleton className="h-8 w-20" />
                  <Skeleton className="h-8 w-20" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (clients.length === 0) {
    return (
      <div className="text-center py-12">
        <User className="w-16 h-16 mx-auto text-slate-400 dark:text-slate-500 mb-4" />
        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">
          Tidak Ada Client
        </h3>
        <p className="text-slate-600 dark:text-slate-400">
          {searchTerm ? 'Tidak ada client yang cocok dengan pencarian.' : 'Belum ada client yang ditugaskan ke Anda.'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {clients.map((client) => (
        <Card key={client.id} className="border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-full">
                  <User className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h4 className="font-semibold text-slate-900 dark:text-slate-100">{client.full_name || client.email}</h4>
                  <div className="flex items-center text-sm text-slate-600 dark:text-slate-400 space-x-4 mt-1">
                    <span className="flex items-center gap-1"><Mail className="w-3 h-3" /> {client.email}</span>
                    {client.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {client.phone}</span>}
                  </div>
                  <div className="flex items-center text-xs mt-1">
                    <span className="flex items-center gap-1"><Building className="w-3 h-3" /> {client.associated_projects.length} Proyek</span>
                    {client.last_project_status && (
                      <Badge className={`ml-2 h-5 ${getStatusColor(client.last_project_status)}`}>
                        {getStatusLabel(client.last_project_status)}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex space-x-2">
                <Button variant="outline" size="sm" onClick={() => onViewDetails(client)}>
                  <Eye className="w-4 h-4 mr-2" />
                  Detail
                </Button>
                <Button variant="outline" size="sm" onClick={() => onSendMessage(client)}>
                  <MessageCircle className="w-4 h-4 mr-2" />
                  Kirim Pesan
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

// Helper functions
const getStatusColor = (status) => {
  const colors = {
    'draft': 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400',
    'submitted': 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400',
    'project_lead_review': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400',
    'inspection_scheduled': 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400',
    'inspection_in_progress': 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400',
    'report_draft': 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400',
    'head_consultant_review': 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/20 dark:text-indigo-400',
    'client_review': 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/20 dark:text-cyan-400',
    'government_submitted': 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
    'slf_issued': 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-400',
    'completed': 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
    'cancelled': 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
  };
  return colors[status] || 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
};

const getStatusLabel = (status) => {
  const labels = {
    'draft': 'Draft',
    'submitted': 'Submitted',
    'project_lead_review': 'Project Lead Review',
    'inspection_scheduled': 'Inspection Scheduled',
    'inspection_in_progress': 'Inspection In Progress',
    'report_draft': 'Report Draft',
    'head_consultant_review': 'Head Consultant Review',
    'client_review': 'Client Review',
    'government_submitted': 'Government Submitted',
    'slf_issued': 'SLF Issued',
    'completed': 'Completed',
    'cancelled': 'Cancelled'
  };
  return labels[status] || status;
};

// Main Component
export default function AdminLeadClientsPage() {
  const router = useRouter();
  const { user, profile, loading: authLoading, isAdminLead } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [clients, setClients] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch data client berdasarkan proyek yang ditangani oleh admin_lead
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Ambil proyek yang ditangani oleh admin_lead ini
      // Asumsikan: project_lead_id adalah user.id admin_lead ini, atau ada tabel project_teams
      // Contoh: Ambil proyek dengan project_lead_id = user.id
      const {  projectsData, error: projectsErr } = await supabase
        .from('projects')
        .select('id, name, status, client_id')
        .eq('project_lead_id', user.id); // Ganti filter ini sesuai kebutuhan (misalnya via project_teams)

      if (projectsErr) throw projectsErr;

      const clientIds = [...new Set(projectsData.map(p => p.client_id))];
      if (clientIds.length === 0) {
        setClients([]);
        setLoading(false);
        return;
      }

      // Ambil data client berdasarkan ID
      const {  clientsData, error: clientsErr } = await supabase
        .from('profiles')
        .select('id, full_name, email, phone') // Tambahkan field lain jika diperlukan
        .eq('role', 'client')
        .in('id', clientIds);

      if (clientsErr) throw clientsErr;

      // Proses data: kaitkan proyek ke client dan tentukan status terakhir
      const processedClients = clientsData.map(client => {
        const associatedProjects = projectsData.filter(p => p.client_id === client.id);
        const lastProject = associatedProjects.reduce((latest, project) => {
          // Urutkan berdasarkan status (prioritaskan status yang belum selesai)
          const statusOrder = {
            'draft': 1, 'submitted': 2, 'project_lead_review': 3, 'inspection_scheduled': 4,
            'inspection_in_progress': 5, 'report_draft': 6, 'head_consultant_review': 7,
            'client_review': 8, 'government_submitted': 9, 'slf_issued': 10, 'completed': 11, 'cancelled': 12
          };
          if (statusOrder[project.status] < statusOrder[latest.status]) return latest;
          return project;
        }, { status: 'draft' }); // Nilai default jika tidak ada proyek

        return {
          ...client,
          associated_projects: associatedProjects,
          last_project_status: lastProject.status
        };
      });

      setClients(processedClients);

    } catch (err) {
      console.error('Error fetching client data:', err);
      setError('Gagal memuat data client');
      toast.error('Gagal memuat data client');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (router.isReady && !authLoading && user && isAdminLead) {
      fetchData();
    } else if (!authLoading && user && !isAdminLead) {
      router.replace('/dashboard');
    }
  }, [router.isReady, authLoading, user, isAdminLead, fetchData]);

  // Filter clients based on search term
  const filteredClients = clients.filter(client =>
    client.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.associated_projects.some(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleViewDetails = (client) => {
    // Bisa ke halaman detail client, atau tampilkan modal
    // router.push(`/dashboard/admin-lead/clients/${client.id}`);
    toast.info(`Detail untuk ${client.full_name || client.email} akan segera tersedia.`);
  };

  const handleSendMessage = (client) => {
    // Arahkan ke halaman komunikasi, pre-fill dengan client
    // Misalnya: /dashboard/admin-lead/communication/thread?client=client.id
    router.push(`/dashboard/admin-lead/communication?client=${client.id}`);
  };

  const handleRefresh = () => {
    fetchData();
    toast.success('Data diperbarui');
  };

  if (authLoading || (user && !isAdminLead)) {
    return (
      <DashboardLayout title="Manajemen Client">
        <div className="flex flex-col items-center justify-center min-h-[400px] p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 dark:border-blue-400"></div>
          <p className="mt-4 text-slate-600 dark:text-slate-400">Memuat...</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Manajemen Client">
      <TooltipProvider>
        <motion.div
          className="p-6 space-y-8 bg-white dark:bg-slate-900 min-h-screen"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* Header */}
          <motion.div variants={itemVariants} className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-2">
                Manajemen Client
              </h1>
              <p className="text-slate-600 dark:text-slate-400">
                Daftar client yang ditangani oleh Anda.
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <Button
                variant="outline"
                onClick={handleRefresh}
                disabled={loading}
                className="flex items-center gap-2 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button
                onClick={() => router.push('/dashboard/admin-lead')}
                className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Kembali ke Dashboard
              </Button>
            </div>
          </motion.div>

          <Separator className="bg-slate-200 dark:bg-slate-700" />

          {/* Search Bar */}
          <motion.section variants={itemVariants}>
            <Card className="border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
              <CardContent className="p-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    placeholder="Cari nama client, email, atau nama proyek..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 border-slate-300 dark:border-slate-600"
                  />
                </div>
              </CardContent>
            </Card>
          </motion.section>

          {/* Client List */}
          <motion.section variants={itemVariants}>
            <Card className="border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
              <CardHeader>
                <CardTitle>Daftar Client</CardTitle>
              </CardHeader>
              <CardContent>
                <ClientList
                  clients={filteredClients}
                  loading={loading}
                  onViewDetails={handleViewDetails}
                  onSendMessage={handleSendMessage}
                  searchTerm={searchTerm}
                />
              </CardContent>
            </Card>
          </motion.section>
        </motion.div>
      </TooltipProvider>
    </DashboardLayout>
  );
}
