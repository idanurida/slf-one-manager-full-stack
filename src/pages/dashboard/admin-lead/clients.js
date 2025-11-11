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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { TooltipProvider, Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

// Icons
import { User, Building, Mail, Phone, Calendar, CheckCircle2, Clock, AlertCircle, RefreshCw, Search, Eye, MessageCircle, ArrowLeft, MapPin, Users, Crown, Plus, FolderPlus, Rocket } from "lucide-react";

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
    'cancelled': 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400',
    'active': 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
    'in_progress': 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400'
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
    'cancelled': 'Cancelled',
    'active': 'Active',
    'in_progress': 'In Progress'
  };
  return labels[status] || status;
};

// Component: Empty State
const EmptyClientState = () => (
  <motion.div
    variants={itemVariants}
    className="text-center py-16"
  >
    <div className="max-w-md mx-auto">
      <div className="w-20 h-20 mx-auto mb-6 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
        <Rocket className="w-10 h-10 text-blue-600 dark:text-blue-400" />
      </div>
      <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-3">
        Mulai Perjalanan Anda sebagai Admin Lead
      </h3>
      <p className="text-slate-600 dark:text-slate-400 mb-6 leading-relaxed">
        Sebagai <strong>Admin Lead</strong>, Anda bertanggung jawab membuat projects dan membentuk tim. 
        Buat project pertama Anda untuk mulai mengelola clients dan menugaskan Project Lead.
      </p>
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <Button 
          onClick={() => window.location.href = '/dashboard/admin-lead/projects/create'}
          className="bg-blue-600 hover:bg-blue-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          Buat Project Pertama
        </Button>
        <Button 
          variant="outline"
          onClick={() => window.location.href = '/dashboard/admin-lead'}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Kembali ke Dashboard
        </Button>
      </div>
    </div>
  </motion.div>
);

// Component: Client List Item
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
    return <EmptyClientState />;
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
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-semibold text-slate-900 dark:text-slate-100">{client.name}</h4>
                    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                      <Crown className="w-3 h-3 mr-1" />
                      Admin Lead: Anda
                    </Badge>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center text-sm text-slate-600 dark:text-slate-400 space-y-1 sm:space-y-0 sm:space-x-4 mb-2">
                    <span className="flex items-center gap-1">
                      <Mail className="w-3 h-3" /> 
                      {client.email || 'N/A'}
                    </span>
                    <span className="flex items-center gap-1">
                      <Phone className="w-3 h-3" /> 
                      {client.phone || 'N/A'}
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" /> 
                      {client.city || 'N/A'}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="flex items-center gap-1">
                      <Building className="w-3 h-3" /> 
                      {client.project_count || 0} Proyek
                    </span>
                    {client.latest_project_status && (
                      <Badge className={`h-5 ${getStatusColor(client.latest_project_status)}`}>
                        {getStatusLabel(client.latest_project_status)}
                      </Badge>
                    )}
                    {client.project_lead_name && (
                      <span className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
                        <Users className="w-3 h-3" />
                        Project Lead: {client.project_lead_name}
                      </span>
                    )}
                  </div>
                  {client.latest_project_name && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      Proyek Terbaru: <span className="font-medium">{client.latest_project_name}</span>
                    </p>
                  )}
                </div>
              </div>
              <div className="flex space-x-2">
                <Button variant="outline" size="sm" onClick={() => onViewDetails(client)}>
                  <Eye className="w-4 h-4 mr-2" />
                  Detail
                </Button>
                <Button variant="outline" size="sm" onClick={() => onSendMessage(client)}>
                  <MessageCircle className="w-4 h-4 mr-2" />
                  Pesan
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

// Main Component
export default function AdminLeadClientsPage() {
  const router = useRouter();
  const { user, profile, loading: authLoading, isAdminLead } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [clients, setClients] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch data clients dari projects yang DIBUAT oleh admin_lead ini
  const fetchData = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log('🔄 Fetching clients from projects created by admin_lead:', user.id);

      // Query utama: Ambil projects berdasarkan admin_lead_id
      const { data: projectsData, error: projectsErr } = await supabase
        .from('projects')
        .select(`
          id,
          name,
          status,
          client_id,
          created_at,
          admin_lead_id,
          project_lead_id,
          clients!client_id (
            id,
            name,
            email,
            phone,
            city,
            address
          ),
          project_lead:profiles!project_lead_id (
            id,
            full_name
          )
        `)
        .eq('admin_lead_id', user.id)  // Filter berdasarkan admin_lead_id
        .not('client_id', 'is', null)
        .order('created_at', { ascending: false });

      if (projectsErr) {
        console.error('Error fetching projects:', projectsErr);
        throw projectsErr;
      }

      console.log('📋 Projects created by admin_lead:', projectsData);

      if (!projectsData || projectsData.length === 0) {
        console.log('ℹ️ No projects found for this admin_lead');
        setClients([]);
        setLoading(false);
        return;
      }

      // Process: Group clients dari projects
      const clientsMap = new Map();

      projectsData.forEach(project => {
        if (project.clients && project.clients.id) {
          const clientId = project.clients.id;
          
          if (!clientsMap.has(clientId)) {
            clientsMap.set(clientId, {
              ...project.clients,
              project_count: 0,
              projects: [],
              project_lead_names: new Set()
            });
          }

          const client = clientsMap.get(clientId);
          client.project_count += 1;
          client.projects.push(project);
          
          // Tambahkan project lead names
          if (project.project_lead?.full_name) {
            client.project_lead_names.add(project.project_lead.full_name);
          }
        }
      });

      // Convert Map to Array dan process data
      const processedClients = Array.from(clientsMap.values()).map(client => {
        const projects = client.projects || [];
        
        // Sort projects by created_at to get latest project
        const sortedProjects = [...projects].sort((a, b) => 
          new Date(b.created_at) - new Date(a.created_at)
        );
        
        const latestProject = sortedProjects[0];
        const projectLeadNames = Array.from(client.project_lead_names);

        return {
          ...client,
          project_count: projects.length,
          latest_project_name: latestProject?.name,
          latest_project_status: latestProject?.status,
          project_lead_name: projectLeadNames.length > 0 ? projectLeadNames.join(', ') : null,
          associated_projects: projects
        };
      });

      console.log('🎯 Processed clients for admin_lead:', processedClients);
      setClients(processedClients);

    } catch (err) {
      console.error('❌ Error fetching client data:', err);
      setError('Gagal memuat data client: ' + err.message);
      toast.error('Gagal memuat data client');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    console.log('🔍 Auth state check:', {
      routerReady: router.isReady,
      authLoading,
      user: user?.id,
      isAdminLead,
      profile
    });

    if (router.isReady && !authLoading && user && isAdminLead) {
      fetchData();
    } else if (!authLoading && user && !isAdminLead) {
      console.log('🚫 User is not admin lead, redirecting...');
      router.replace('/dashboard');
    }
  }, [router.isReady, authLoading, user, isAdminLead, fetchData, router, profile]);

  // Filter clients based on search term
  const filteredClients = clients.filter(client =>
    client.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.phone?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.address?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.city?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.latest_project_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.project_lead_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleViewDetails = (client) => {
    router.push(`/dashboard/admin-lead/clients/${client.id}`);
  };

  const handleSendMessage = (client) => {
    router.push(`/dashboard/admin-lead/communication?client=${client.id}`);
  };

  const handleRefresh = () => {
    fetchData();
    toast.success('Data diperbarui');
  };

  if (authLoading) {
    return (
      <DashboardLayout title="Manajemen Client">
        <div className="flex flex-col items-center justify-center min-h-[400px] p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 dark:border-blue-400"></div>
          <p className="mt-4 text-slate-600 dark:text-slate-400">Memuat...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (user && !isAdminLead) {
    return (
      <DashboardLayout title="Manajemen Client">
        <div className="flex flex-col items-center justify-center min-h-[400px] p-8">
          <AlertCircle className="w-16 h-16 text-red-500 mb-4" />
          <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-2">
            Akses Ditolak
          </h3>
          <p className="text-slate-600 dark:text-slate-400 text-center mb-4">
            Anda tidak memiliki akses ke halaman ini. Hanya Admin Lead yang dapat mengakses manajemen client.
          </p>
          <Button onClick={() => router.push('/dashboard')}>
            Kembali ke Dashboard
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout title="Manajemen Client">
        <div className="p-4 md:p-6">
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Terjadi Kesalahan</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          <Button onClick={fetchData}>Coba Muat Ulang</Button>
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
          <motion.div variants={itemVariants} className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-2">
                Manajemen Client
              </h1>
              <p className="text-slate-600 dark:text-slate-400">
                Daftar client dari projects yang Anda buat sebagai <strong>Admin Lead</strong>.
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
                onClick={() => router.push('/dashboard/admin-lead/projects/create')}
                className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Buat Project
              </Button>
            </div>
          </motion.div>

          <Separator className="bg-slate-200 dark:bg-slate-700" />

          {/* Search Bar - hanya tampil jika ada clients */}
          {clients.length > 0 && (
            <motion.section variants={itemVariants}>
              <Card className="border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                <CardContent className="p-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                      placeholder="Cari nama client, email, telepon, alamat, kota, nama proyek, atau project lead..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 border-slate-300 dark:border-slate-600"
                    />
                  </div>
                </CardContent>
              </Card>
            </motion.section>
          )}

          {/* Client List */}
          <motion.section variants={itemVariants}>
            <Card className="border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Crown className="w-5 h-5 text-blue-600" />
                  Daftar Client Anda
                  {clients.length > 0 && (
                    <Badge variant="secondary" className="ml-2">
                      {filteredClients.length} Client
                    </Badge>
                  )}
                </CardTitle>
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