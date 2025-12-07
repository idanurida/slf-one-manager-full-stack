// FILE: src/pages/dashboard/head-consultant/team.js
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

// Icons
import { Users, Building, User, Mail, Phone, MapPin, Calendar, FileText, Clock, CheckCircle2, TrendingUp, RefreshCw, Download, MessageCircle, Search, Filter, ArrowLeft, AlertCircle, ExternalLink, UserCheck, UserRound, UserRoundCheck, MessageSquare, PhoneIcon, Building2, MapPinIcon }
from "lucide-react";

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
    'admin_lead': 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400',
    'head_consultant': 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/20 dark:text-indigo-400',
    'project_lead': 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400',
    'inspector': 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
    'admin_team': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400',
    'drafter': 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/20 dark:text-cyan-400',
    'client': 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400',
    'superadmin': 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400',
  };
  return colors[role] || 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
};

const getRoleLabel = (role) => {
  const labels = {
    'admin_lead': 'Admin Lead',
    'head_consultant': 'Head Consultant',
    'project_lead': 'Project Lead',
    'inspector': 'Inspector',
    'admin_team': 'Admin Team',
    'drafter': 'Drafter',
    'client': 'Client',
    'superadmin': 'Super Admin',
  };
  return labels[role] || role;
};

// Main Component
export default function HeadConsultantTeamPage() {
  const router = useRouter();
  const { user, profile, loading: authLoading, isHeadConsultant } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [teamMembers, setTeamMembers] = useState([]);
  const [projects, setProjects] = useState([]); // Untuk filter
  const [searchTerm, setSearchTerm] = useState('');
  const [projectFilter, setProjectFilter] = useState('all');
  const [roleFilter, setRoleFilter] = useState('all');

  // Fetch data tim dan proyek
  const fetchData = useCallback(async () => {
    if (!user?.id) return;

    setLoading(true);
    setError(null);

    try {
      // Ambil proyek (mungkin semua proyek atau proyek yang terlibat dalam review oleh HC)
      // Untuk saat ini, kita ambil semua proyek agar bisa melihat tim di semua proyek
      const {  projectsData, error: projectsErr } = await supabase
        .from('projects')
        .select(`
          id, name
        `)
        .order('created_at', { ascending: false });

      if (projectsErr) throw projectsErr;

      setProjects(projectsData);

      // Ambil semua anggota tim dari semua proyek
      const {  teamData, error: teamErr } = await supabase
        .from('project_teams')
        .select(`
          *,
          profiles!inner(full_name, email, phone, specialization, role)
        `)
        .order('assigned_at', { ascending: false });

      if (teamErr) throw teamErr;

      // Proses data
      const processedTeam = teamData.map(tm => ({
        ...tm,
        full_name: tm.profiles?.full_name || 'N/A',
        email: tm.profiles?.email,
        phone: tm.profiles?.phone,
        specialization: tm.profiles?.specialization,
        profile_role: tm.profiles?.role, // Role dari profil
        project_name: projectsData.find(p => p.id === tm.project_id)?.name || 'Proyek Tidak Dikenal'
      }));

      setTeamMembers(processedTeam);

    } catch (err) {
      console.error('Error fetching team data for head consultant:', err);
      setError('Gagal memuat data tim');
      toast.error('Gagal memuat data tim');
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

  // Filter team members
  const filteredTeamMembers = teamMembers.filter(member => {
    const matchesSearch = member.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         member.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         member.specialization?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         member.project_name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesProject = projectFilter === 'all' || member.project_id === projectFilter;
    const matchesRole = roleFilter === 'all' || member.role === roleFilter; // Gunakan role dari project_teams

    return matchesSearch && matchesProject && matchesRole;
  });

  const handleSendMessage = (userId) => {
    // Misalnya, arahkan ke halaman chat atau buka modal
    // router.push(`/dashboard/head-consultant/communication/chat?with=${userId}`);
    toast.info('Fitur kirim pesan akan segera tersedia');
  };

  const handleCall = (phoneNumber) => {
    if (phoneNumber) {
      window.open(`tel:${phoneNumber}`, '_self');
    } else {
      toast.error('Nomor telepon tidak tersedia');
    }
  };

  const handleViewProfile = (userId) => {
    // Arahkan ke halaman profil user (jika ada)
    toast.info('Profil pengguna akan segera tersedia');
  };

  const handleRefresh = () => {
    fetchData();
    toast.success('Data diperbarui');
  };

  // Get unique roles and projects for filters
  const availableRoles = [...new Set(teamMembers.map(m => m.role))]; // Gunakan role dari project_teams
  const availableProjects = projects;

  if (authLoading || (user && !isHeadConsultant)) {
    return (
      <DashboardLayout title="Tim Proyek">
        <div className="flex flex-col items-center justify-center min-h-[400px] p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 dark:border-blue-400"></div>
          <p className="mt-4 text-slate-600 dark:text-slate-400">Memuat...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout title="Tim Proyek">
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
    <DashboardLayout title="Tim Proyek">
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
              
              <p className="text-slate-600 dark:text-slate-400">
                Koordinasikan dengan tim yang terlibat dalam proyek-proyek dalam sistem.
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
                Kembali
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
                      placeholder="Cari nama, email, spesialisasi, atau proyek..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 border-slate-300 dark:border-slate-600"
                    />
                  </div>
                  <Select value={projectFilter} onValueChange={setProjectFilter}>
                    <SelectTrigger className="w-full bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 border-slate-300 dark:border-slate-600">
                      <SelectValue placeholder="Filter Proyek" />
                    </SelectTrigger>
                    <SelectContent className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                      <SelectItem value="all" className="text-slate-900 dark:text-slate-100">Semua Proyek</SelectItem>
                      {availableProjects.map(project => (
                        <SelectItem key={project.id} value={project.id} className="text-slate-900 dark:text-slate-100">
                          {project.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={roleFilter} onValueChange={setRoleFilter}>
                    <SelectTrigger className="w-full bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 border-slate-300 dark:border-slate-600">
                      <SelectValue placeholder="Filter Role" />
                    </SelectTrigger>
                    <SelectContent className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                      <SelectItem value="all" className="text-slate-900 dark:text-slate-100">Semua Role</SelectItem>
                      {availableRoles.map(role => (
                        <SelectItem key={role} value={role} className="text-slate-900 dark:text-slate-100">
                          {getRoleLabel(role)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Team Members Table */}
          <motion.div variants={itemVariants}>
            <Card className="border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Users className="w-5 h-5 text-green-500" />
                    Daftar Anggota Tim ({filteredTeamMembers.length})
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nama</TableHead>
                        <TableHead>Role dalam Proyek</TableHead>
                        <TableHead>Proyek</TableHead>
                        <TableHead>Spesialisasi</TableHead>
                        <TableHead>Kontak</TableHead>
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
                ) : filteredTeamMembers.length === 0 ? (
                  <div className="text-center py-12">
                    <Users className="w-16 h-16 mx-auto text-slate-400 dark:text-slate-500 mb-4 opacity-50" />
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">
                      Tidak Ada Anggota Tim
                    </h3>
                    <p className="text-slate-600 dark:text-slate-400">
                      {searchTerm || projectFilter !== 'all' || roleFilter !== 'all'
                        ? 'Tidak ada anggota tim yang cocok dengan filter.'
                        : 'Belum ada tim yang ditugaskan ke proyek dalam sistem.'}
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
                          <TableHead>Role dalam Proyek</TableHead>
                          <TableHead>Proyek</TableHead>
                          <TableHead>Spesialisasi</TableHead>
                          <TableHead>Kontak</TableHead>
                          <TableHead>Aksi</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredTeamMembers.map((member) => (
                          <TableRow key={`${member.project_id}-${member.user_id}`} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 border-slate-200 dark:border-slate-700">
                            <TableCell className="font-medium">
                              <div className="flex items-center gap-3">
                                <div className="p-1.5 bg-blue-100 dark:bg-blue-900/30 rounded-full">
                                  <User className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                                </div>
                                <div>
                                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{member.full_name}</p>
                                  <p className="text-xs text-slate-500 dark:text-slate-400">{member.email}</p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge className={getRoleColor(member.role)}>
                                {getRoleLabel(member.role)}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                <Building className="w-3 h-3 text-slate-500" />
                                <span className="text-xs underline hover:text-slate-700 dark:hover:text-slate-300 cursor-pointer"
                                      onClick={() => router.push(`/dashboard/head-consultant/projects/${member.project_id}`)}>
                                  {member.project_name}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              {member.specialization ? (
                                <Badge variant="outline" className="text-xs capitalize">
                                  {member.specialization}
                                </Badge>
                              ) : (
                                <span className="text-xs text-slate-500 dark:text-slate-400">-</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col gap-1">
                                <div className="flex items-center gap-1 text-xs">
                                  <Mail className="w-3 h-3 text-slate-500" />
                                  <span className="truncate max-w-[100px]">{member.email}</span>
                                </div>
                                {member.phone && (
                                  <div className="flex items-center gap-1 text-xs text-slate-500">
                                    <Phone className="w-3 h-3" />
                                    <span>{member.phone}</span>
                                  </div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Button variant="outline" size="sm" onClick={() => handleSendMessage(member.user_id)}>
                                  <MessageSquare className="w-4 h-4 mr-1" />
                                  Pesan
                                </Button>
                                {member.phone && (
                                  <Button variant="outline" size="sm" onClick={() => handleCall(member.phone)}>
                                    <PhoneIcon className="w-4 h-4 mr-1" />
                                    Telepon
                                  </Button>
                                )}
                              </div>
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
                      Halaman ini menampilkan daftar semua anggota tim yang ditugaskan ke proyek-proyek dalam sistem.
                      Anda dapat menghubungi mereka langsung untuk koordinasi terkait proyek yang sedang ditinjau.
                      Penugasan tim secara keseluruhan dilakukan oleh <code className="bg-white dark:bg-slate-800 px-1 rounded">admin_lead</code>.
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