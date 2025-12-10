// FILE: src/pages/dashboard/project-lead/projects.js
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Icons
import {
  Building, User, MapPin, Calendar, CheckCircle2, Clock, AlertTriangle, Eye, Search, Filter, RefreshCw, ArrowLeft
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
const getProjectPhase = (status) => {
  const phaseMap = {
    'draft': 1, 'submitted': 1, 'project_lead_review': 1,
    'inspection_scheduled': 2, 'inspection_in_progress': 2,
    'report_draft': 3, 'head_consultant_review': 3,
    'client_review': 4,
    'government_submitted': 5, 'slf_issued': 5, 'completed': 5
  };
  return phaseMap[status] || 1;
};

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
export default function ProjectLeadProjectsPage() {
  const router = useRouter();
  const { user, profile, loading: authLoading, isProjectLead } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [projects, setProjects] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Fetch projects assigned to this project_lead
  const fetchData = useCallback(async () => {
    if (!user?.id) return;

    setLoading(true);
    setError(null);

    try {
      const { data: projectsData, error: projectsErr } = await supabase
        .from('projects')
        .select(`*`)
        .eq('project_lead_id', user.id)
        .order('created_at', { ascending: false });

      if (projectsErr) throw projectsErr;

      // Batch fetch clients
      const clientIds = [...new Set((projectsData || []).map(p => p.client_id).filter(Boolean))];
      let clientsById = {};
      if (clientIds.length > 0) {
        const { data: clients } = await supabase.from('clients').select('id, name').in('id', clientIds);
        clientsById = (clients || []).reduce((acc, c) => ({ ...acc, [c.id]: c }), {});
      }

      const processedProjects = (projectsData || []).map(p => ({
        ...p,
        client_name: clientsById[p.client_id]?.name || 'N/A'
      }));

      setProjects(processedProjects);

    } catch (err) {
      console.error('Error fetching projects for lead:', err);
      setError('Gagal memuat data proyek');
      toast.error('Gagal memuat data proyek');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (router.isReady && !authLoading && user && isProjectLead) {
      fetchData();
    } else if (!authLoading && user && !isProjectLead) {
      router.replace('/dashboard');
    }
  }, [router.isReady, authLoading, user, isProjectLead, fetchData]);

  // Filter projects
  const filteredProjects = projects.filter(p => {
    const matchesSearch = p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         p.location?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         p.client_name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || p.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const handleViewProject = (projectId) => {
    router.push(`/dashboard/project-lead/projects/${projectId}`);
  };

  const handleRefresh = () => {
    fetchData();
    toast.success('Data diperbarui');
  };

  if (authLoading || (user && !isProjectLead)) {
    return (
      <DashboardLayout title="Daftar Proyek Saya">
        <div className="flex flex-col items-center justify-center min-h-[400px] p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 dark:border-blue-400"></div>
          <p className="mt-4 text-slate-600 dark:text-slate-400">Memuat...</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Daftar Proyek Saya">
      <TooltipProvider>
        <motion.div
          className="p-6 space-y-6 bg-white dark:bg-slate-900 min-h-screen"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* Action Buttons */}
          <motion.div variants={itemVariants} className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={handleRefresh} disabled={loading}>
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button size="sm" onClick={() => router.push('/dashboard/project-lead')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Kembali
            </Button>
          </motion.div>

          {/* Filters */}
          <motion.div variants={itemVariants}>
            <Card className="border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
              <CardContent className="p-4">
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                      placeholder="Cari nama proyek, lokasi, atau client..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 border-slate-300 dark:border-slate-600"
                    />
                  </div>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-full md:w-[180px] bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 border-slate-300 dark:border-slate-600">
                      <SelectValue placeholder="Filter Status" />
                    </SelectTrigger>
                    <SelectContent className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                      <SelectItem value="all">Semua Status</SelectItem>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="inspection_scheduled">Inspection Scheduled</SelectItem>
                      <SelectItem value="inspection_in_progress">Inspection In Progress</SelectItem>
                      <SelectItem value="report_draft">Report Draft</SelectItem>
                      <SelectItem value="government_submitted">Government Submitted</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Error Alert */}
          {error && (
            <motion.div variants={itemVariants}>
              <Alert className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            </motion.div>
          )}

          {/* Projects Table */}
          <motion.div variants={itemVariants}>
            <Card className="border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
              <CardHeader>
                <CardTitle>Daftar Proyek ({filteredProjects.length})</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nama Proyek</TableHead>
                        <TableHead>Client</TableHead>
                        <TableHead>Lokasi</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Fase</TableHead>
                        <TableHead>Aksi</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {[1, 2, 3, 4, 5].map(i => (
                        <TableRow key={i}>
                          <TableCell><Skeleton className="h-4 w-3/4" /></TableCell>
                          <TableCell><Skeleton className="h-3 w-1/2" /></TableCell>
                          <TableCell><Skeleton className="h-3 w-1/2" /></TableCell>
                          <TableCell><Skeleton className="h-3 w-1/4" /></TableCell>
                          <TableCell><Skeleton className="h-3 w-1/4" /></TableCell>
                          <TableCell><Skeleton className="h-8 w-20" /></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : filteredProjects.length === 0 ? (
                  <div className="text-center py-12">
                    <Building className="w-16 h-16 mx-auto text-slate-400 dark:text-slate-500 mb-4" />
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">
                      Tidak Ada Proyek
                    </h3>
                    <p className="text-slate-600 dark:text-slate-400">
                      {searchTerm || statusFilter !== 'all'
                        ? 'Tidak ada proyek yang sesuai dengan filter.'
                        : 'Anda belum ditugaskan ke proyek mana pun.'}
                    </p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nama Proyek</TableHead>
                        <TableHead>Client</TableHead>
                        <TableHead>Lokasi</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Fase</TableHead>
                        <TableHead>Aksi</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredProjects.map((project) => (
                        <TableRow key={project.id}>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              <Building className="w-4 h-4 text-blue-500" />
                              <span>{project.name}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <User className="w-3 h-3 text-slate-500" />
                              <span>{project.client_name}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-slate-500" />
                              <span>{project.city || 'N/A'}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={getStatusColor(project.status)}>
                              {getStatusLabel(project.status)}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <span>Fase {getProjectPhase(project.status)}</span>
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleViewProject(project.id)}
                            >
                              <Eye className="w-4 h-4 mr-2" />
                              Lihat Detail
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      </TooltipProvider>
    </DashboardLayout>
  );
}
