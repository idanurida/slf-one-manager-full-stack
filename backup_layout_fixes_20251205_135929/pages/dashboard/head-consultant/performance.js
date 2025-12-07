// FILE: src/pages/dashboard/head-consultant/performance.js
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";

// Icons
import { 
  Users, User, BarChart3, TrendingUp, TrendingDown, FileText, 
  CheckCircle2, XCircle, Clock, Calendar, Building, AlertCircle, 
  RefreshCw, ArrowLeft, Eye, Filter, Search, Info 
} from "lucide-react";

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
const getRoleColor = (role) => {
  const colors = {
    'inspector': 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
    'project_lead': 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400',
    'admin_team': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400',
    'admin_lead': 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400',
    'head_consultant': 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400',
    'drafter': 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/20 dark:text-cyan-400',
    'client': 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400',
  };
  return colors[role] || 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
};

const getRoleLabel = (role) => {
  const labels = {
    'inspector': 'Inspector',
    'project_lead': 'Project Lead',
    'admin_team': 'Admin Team',
    'admin_lead': 'Admin Lead',
    'head_consultant': 'Head Consultant',
    'drafter': 'Drafter',
    'client': 'Client',
  };
  return labels[role] || role;
};

// Main Component
export default function HeadConsultantPerformancePage() {
  const router = useRouter();
  const { user, profile, loading: authLoading, isHeadConsultant } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [performanceData, setPerformanceData] = useState({
    inspectors: [],
    projectLeads: [],
    adminTeams: [],
    adminLeads: [], // ✅ Ditambahkan
    overall: {}
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('inspector');
  const [periodFilter, setPeriodFilter] = useState('this_month');

  // Fetch performance data
  const fetchData = useCallback(async () => {
    if (!user?.id) return;

    setLoading(true);
    setError(null);

    try {
      // Ambil semua user dengan role yang relevan - ✅ PERBAIKAN: tambah admin_lead
      const { data: profiles, error: profilesErr } = await supabase
        .from('profiles')
        .select('id, full_name, role, specialization')
        .in('role', ['inspector', 'project_lead', 'admin_team', 'admin_lead']); // ✅ Tambah admin_lead

      if (profilesErr) throw profilesErr;

      // Ambil semua dokumen untuk menghitung kinerja
      const { data: docs, error: docsErr } = await supabase
        .from('documents')
        .select('*')
        .eq('document_type', 'REPORT');

      if (docsErr) throw docsErr;

      // Ambil semua project untuk menghitung kinerja PL dan Admin Lead
      const { data: projects, error: projErr } = await supabase
        .from('projects')
        .select('id, project_lead_id, admin_lead_id, created_at, status'); // ✅ Tambah admin_lead_id

      if (projErr) throw projErr;

      // Proses data berdasarkan role
      const processInspectorData = (profiles, documents) => {
        return profiles
          .filter(p => p.role === 'inspector')
          .map(inspector => {
            const reports = documents.filter(d => d.created_by === inspector.id);
            const approved = reports.filter(r => r.status === 'approved').length;
            const rejected = reports.filter(r => r.status === 'rejected').length;
            const total = reports.length;
            const completionRate = total > 0 ? (approved / total) * 100 : 0;

            return {
              id: inspector.id,
              full_name: inspector.full_name,
              role: inspector.role,
              specialization: inspector.specialization,
              total_reports: total,
              approved_reports: approved,
              rejected_reports: rejected,
              completion_rate: completionRate,
              avg_processing_time: null
            };
          });
      };

      const processProjectLeadData = (profiles, projects) => {
        return profiles
          .filter(p => p.role === 'project_lead')
          .map(pl => {
            const assignedProjects = projects.filter(p => p.project_lead_id === pl.id);
            const completedProjects = assignedProjects.filter(p => p.status === 'completed' || p.status === 'slf_issued').length;
            const total = assignedProjects.length;
            const successRate = total > 0 ? (completedProjects / total) * 100 : 0;

            return {
              id: pl.id,
              full_name: pl.full_name,
              role: pl.role,
              total_projects: total,
              completed_projects: completedProjects,
              success_rate: successRate
            };
          });
      };

      const processAdminTeamData = (profiles, documents) => {
        return profiles
          .filter(p => p.role === 'admin_team')
          .map(at => {
            const verifiedByMe = documents.filter(d => d.verified_by_admin_team === at.id);
            const approvedByPLAfterMe = verifiedByMe.filter(d => d.status === 'approved_by_pl').length;
            const rejectedByPLAfterMe = verifiedByMe.filter(d => d.status === 'revision_requested' || d.status === 'rejected').length;
            const total = verifiedByMe.length;
            const accuracy = total > 0 ? (approvedByPLAfterMe / total) * 100 : 0;

            return {
              id: at.id,
              full_name: at.full_name,
              role: at.role,
              documents_verified: total,
              approved_after_verification: approvedByPLAfterMe,
              rejected_after_verification: rejectedByPLAfterMe,
              accuracy_rate: accuracy
            };
          });
      };

      // ✅ PERBAIKAN: Tambah fungsi untuk Admin Lead
      const processAdminLeadData = (profiles, projects) => {
        return profiles
          .filter(p => p.role === 'admin_lead')
          .map(al => {
            const managedProjects = projects.filter(p => p.admin_lead_id === al.id);
            const completedProjects = managedProjects.filter(p => p.status === 'completed' || p.status === 'slf_issued').length;
            const total = managedProjects.length;
            const successRate = total > 0 ? (completedProjects / total) * 100 : 0;

            return {
              id: al.id,
              full_name: al.full_name,
              role: al.role,
              total_projects: total,
              completed_projects: completedProjects,
              success_rate: successRate,
              // Tambahan metric untuk Admin Lead
              active_projects: managedProjects.filter(p => !['completed', 'cancelled', 'slf_issued'].includes(p.status)).length
            };
          });
      };

      const inspectorsData = processInspectorData(profiles, docs);
      const projectLeadsData = processProjectLeadData(profiles, projects);
      const adminTeamsData = processAdminTeamData(profiles, docs);
      const adminLeadsData = processAdminLeadData(profiles, projects); // ✅ Ditambahkan

      setPerformanceData({
        inspectors: inspectorsData,
        projectLeads: projectLeadsData,
        adminTeams: adminTeamsData,
        adminLeads: adminLeadsData, // ✅ Ditambahkan
        overall: {
          total_reports: docs.length,
          total_projects: projects.length,
        }
      });

    } catch (err) {
      console.error('Error fetching performance data:', err);
      setError('Gagal memuat data kinerja tim');
      toast.error('Gagal memuat data kinerja');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (router.isReady && !authLoading && user && isHeadConsultant) {
      fetchData();
    } else if (!authLoading && user && !isHeadConsultant) {
      router.replace('/dashboard');
    }
  }, [router.isReady, authLoading, user, isHeadConsultant, fetchData]);

  // Get data based on filter
  const getDataForRole = (role) => {
    switch (role) {
      case 'inspector':
        return performanceData.inspectors;
      case 'project_lead':
        return performanceData.projectLeads;
      case 'admin_team':
        return performanceData.adminTeams;
      case 'admin_lead': // ✅ Ditambahkan
        return performanceData.adminLeads;
      default:
        return [];
    }
  };

  const filteredData = getDataForRole(roleFilter).filter(item =>
    item.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.specialization?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleRefresh = () => {
    fetchData();
    toast.success('Data diperbarui');
  };

  if (authLoading || (user && !isHeadConsultant)) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center min-h-[400px] p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 dark:border-blue-400"></div>
          <p className="mt-4 text-slate-600 dark:text-slate-400">Memuat...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout>
        <div className="p-4 md:p-6">
          <Alert variant="destructive" className="mb-4 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          <Button onClick={fetchData}>Coba Muat Ulang</Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
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
              <p className="text-slate-600 dark:text-slate-400 text-lg">
                Pantau dan analisis kinerja tim inspeksi, admin, dan project lead.
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
                onClick={() => router.push('/dashboard/head-consultant')}
                className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Kembali ke Dashboard
              </Button>
            </div>
          </motion.div>

          <Separator className="bg-slate-200 dark:bg-slate-700" />

          {/* Filters */}
          <motion.div variants={itemVariants}>
            <Card className="border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Filter className="w-5 h-5 text-slate-500" />
                  Filter & Cari
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="relative md:col-span-2">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                      placeholder="Cari nama atau spesialisasi..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 border-slate-300 dark:border-slate-600"
                    />
                  </div>
                  <Select value={roleFilter} onValueChange={setRoleFilter}>
                    <SelectTrigger className="w-full bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 border-slate-300 dark:border-slate-600">
                      <SelectValue placeholder="Filter Role" />
                    </SelectTrigger>
                    <SelectContent className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                      <SelectItem value="inspector" className="text-slate-900 dark:text-slate-100">Inspector</SelectItem>
                      <SelectItem value="project_lead" className="text-slate-900 dark:text-slate-100">Project Lead</SelectItem>
                      <SelectItem value="admin_team" className="text-slate-900 dark:text-slate-100">Admin Team</SelectItem>
                      <SelectItem value="admin_lead" className="text-slate-900 dark:text-slate-100">Admin Lead</SelectItem> {/* ✅ Ditambahkan */}
                    </SelectContent>
                  </Select>
                  <Select value={periodFilter} onValueChange={setPeriodFilter}>
                    <SelectTrigger className="w-full bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 border-slate-300 dark:border-slate-600">
                      <SelectValue placeholder="Periode" />
                    </SelectTrigger>
                    <SelectContent className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                      <SelectItem value="this_month" className="text-slate-900 dark:text-slate-100">Bulan Ini</SelectItem>
                      <SelectItem value="last_month" className="text-slate-900 dark:text-slate-100">Bulan Lalu</SelectItem>
                      <SelectItem value="this_year" className="text-slate-900 dark:text-slate-100">Tahun Ini</SelectItem>
                      <SelectItem value="all_time" className="text-slate-900 dark:text-slate-100">Semua Waktu</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Performance Table */}
          <motion.div variants={itemVariants}>
            <Card className="border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-blue-500" />
                    {getRoleLabel(roleFilter)} Performance
                  </span>
                  <Badge variant="outline" className="text-slate-700 dark:text-slate-300">
                    {filteredData.length} Orang
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nama</TableHead>
                        {roleFilter === 'inspector' && <TableHead>Spesialisasi</TableHead>}
                        {roleFilter === 'admin_lead' && <TableHead>Proyek Aktif</TableHead>} {/* ✅ Ditambahkan */}
                        <TableHead>Total Tugas</TableHead>
                        <TableHead>Keberhasilan</TableHead>
                        <TableHead>Detail</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {[1, 2, 3, 4, 5].map(i => (
                        <TableRow key={i}>
                          <TableCell><Skeleton className="h-4 w-3/4" /></TableCell>
                          {roleFilter === 'inspector' && <TableCell><Skeleton className="h-3 w-1/2" /></TableCell>}
                          {roleFilter === 'admin_lead' && <TableCell><Skeleton className="h-3 w-8" /></TableCell>} {/* ✅ Ditambahkan */}
                          <TableCell><Skeleton className="h-3 w-8" /></TableCell>
                          <TableCell><Skeleton className="h-3 w-1/4" /></TableCell>
                          <TableCell><Skeleton className="h-8 w-20" /></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : filteredData.length === 0 ? (
                  <div className="text-center py-12">
                    <TrendingUp className="w-16 h-16 mx-auto text-slate-400 dark:text-slate-500 mb-4 opacity-50" />
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">
                      Tidak Ada Data
                    </h3>
                    <p className="text-slate-600 dark:text-slate-400">
                      {searchTerm
                        ? 'Tidak ada anggota tim yang cocok dengan pencarian.'
                        : 'Belum ada data kinerja untuk role ini dalam periode yang dipilih.'}
                    </p>
                    <Button onClick={handleRefresh} className="mt-4">
                      Refresh Data
                    </Button>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-slate-100 dark:bg-slate-800">
                          <TableHead>Nama</TableHead>
                          {roleFilter === 'inspector' && <TableHead>Spesialisasi</TableHead>}
                          {roleFilter === 'admin_lead' && <TableHead>Proyek Aktif</TableHead>} {/* ✅ Ditambahkan */}
                          <TableHead>Total Tugas</TableHead>
                          <TableHead>Keberhasilan (%)</TableHead>
                          <TableHead>Detail</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredData.map((member) => (
                          <TableRow key={member.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 border-slate-200 dark:border-slate-700">
                            <TableCell className="font-medium">
                              <div className="flex items-center gap-3">
                                <div className="p-1.5 bg-blue-100 dark:bg-blue-900/30 rounded-full">
                                  <User className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                                </div>
                                <div>
                                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{member.full_name}</p>
                                  <Badge variant="outline" className="mt-1 text-xs capitalize">
                                    {getRoleLabel(member.role)}
                                  </Badge>
                                </div>
                              </div>
                            </TableCell>
                            {roleFilter === 'inspector' && (
                              <TableCell>
                                <Badge variant="secondary" className="capitalize">
                                  {member.specialization || 'Umum'}
                                </Badge>
                              </TableCell>
                            )}
                            {roleFilter === 'admin_lead' && ( // ✅ Ditambahkan
                              <TableCell>
                                <Badge variant="outline" className="bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300">
                                  {member.active_projects || 0} Proyek
                                </Badge>
                              </TableCell>
                            )}
                            <TableCell>
                              {roleFilter === 'inspector' ? member.total_reports : 
                               roleFilter === 'admin_lead' ? member.total_projects : 
                               member.total_projects || member.documents_verified}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Progress value={member.completion_rate || member.success_rate || member.accuracy_rate} className="w-24 h-2" />
                                <span className="text-sm font-medium">
                                  {Math.round(member.completion_rate || member.success_rate || member.accuracy_rate || 0)}%
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Button variant="outline" size="sm" onClick={() => router.push(`/dashboard/head-consultant/team/${member.id}/performance`)}>
                                <Eye className="w-4 h-4 mr-1" />
                                Detail
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Info Card */}
          <motion.div variants={itemVariants}>
            <Card className="border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20">
              <CardContent className="p-4">
                <div className="flex">
                  <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 mr-3 flex-shrink-0" />
                  <div>
                    <h3 className="font-medium text-blue-800 dark:text-blue-200">Catatan:</h3>
                    <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                      Metrik kinerja dihitung berdasarkan data aktivitas dalam sistem SLF One.
                      Data ini membantu <code className="bg-white dark:bg-slate-800 px-1 rounded">Head Consultant</code> dalam mengevaluasi efektivitas tim.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      </TooltipProvider>
    </DashboardLayout>
  );
}