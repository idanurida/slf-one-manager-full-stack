// FILE: src/pages/dashboard/team-leader/team.js
// Note: Database tetap menggunakan 'project_lead', UI menampilkan 'Team Leader'
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

// Icons
import {
  Users, Building, User, Mail, Phone, MapPin, Calendar, FileText, Clock, CheckCircle2, TrendingUp,
  RefreshCw, Download, MessageSquare, Eye, Search, Filter, ArrowLeft, AlertCircle, ExternalLink,
  Info // ← TAMBAHKAN IMPORT INI
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
const getRoleLabel = (role) => {
  const labels = {
    admin_lead: 'Admin Lead',
    project_lead: 'Team Leader', // Meskipun ini adalah halaman TL, mereka bisa melihat TL lain di proyek lain
    inspector: 'Inspector',
    head_consultant: 'Head Consultant',
    drafter: 'Drafter',
    admin_team: 'Admin Team',
    client: 'Client', // Kemungkinan besar tidak muncul di sini
    superadmin: 'Super Admin',
  };
  return labels[role] || role;
};

const getRoleColor = (role) => {
  const colors = {
    admin_lead: 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400',
    project_lead: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400',
    inspector: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
    head_consultant: 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400',
    drafter: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/20 dark:text-cyan-400',
    admin_team: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400',
    client: 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400',
    superadmin: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400',
  };
  return colors[role] || 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
};

// Team Member Card Component (Alternative View - bisa digunakan jika tidak pakai tabel)
const TeamMemberCard = ({ member, onSendMessage, onCall }) => (
  <Card className="border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
    <CardContent className="p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
            <User className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="min-w-0">
            <p className="font-medium text-slate-900 dark:text-slate-100 truncate">{member.full_name}</p>
            <p className="text-sm text-slate-600 dark:text-slate-400 truncate">{member.specialization || 'Umum'}</p>
            <div className="flex items-center text-xs text-slate-500 dark:text-slate-400 mt-1">
              <Mail className="w-3 h-3 mr-1" />
              <span className="truncate">{member.email}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge className={getRoleColor(member.role)}>
            {getRoleLabel(member.role)}
          </Badge>
        </div>
      </div>
      <div className="flex mt-3 space-x-2">
        <Button variant="outline" size="sm" onClick={() => onSendMessage(member.id)}>
          <MessageSquare className="w-4 h-4 mr-1" />
          Pesan
        </Button>
        {member.phone && (
          <Button variant="outline" size="sm" onClick={() => onCall(member.phone)}>
            <Phone className="w-4 h-4 mr-1" />
            Telepon
          </Button>
        )}
      </div>
    </CardContent>
  </Card>
);

// Main Component
export default function TeamLeaderTeamPage() {
  const router = useRouter();
  const { user, profile, loading: authLoading, isProjectLead, isTeamLeader } = useAuth();
  const hasAccess = isProjectLead || isTeamLeader;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [teamMembers, setTeamMembers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [projectFilter, setProjectFilter] = useState('all');

  // Fetch data tim proyek yang ditangani oleh saya (project_lead)
  const fetchData = useCallback(async () => {
    if (!user?.id) return;

    setLoading(true);
    setError(null);

    try {
      // 1. Ambil proyek yang saya handle sebagai project_lead
      const { data: assignments, error: assignErr } = await supabase
        .from('project_teams')
        .select(`
          project_id,
          projects!inner(id, name, status)
        `)
        .eq('user_id', user.id)
        .eq('role', 'project_lead');

      if (assignErr) throw assignErr;

      const projectList = (assignments || []).map(a => ({
        ...a.projects
      }));

      setProjects(projectList);

      // 2. Ambil semua anggota tim dari proyek-proyek tersebut
      const projectIds = projectList.map(p => p.id);
      let allTeamMembers = [];
      if (projectIds.length > 0) {
        const { data: members, error: membersErr } = await supabase
          .from('project_teams')
          .select(`
            id,
            project_id,
            user_id,
            role,
            assigned_at,
            profiles!inner(full_name, email, phone, specialization)
          `)
          .in('project_id', projectIds)
          .order('assigned_at', { ascending: false });

        if (membersErr) throw membersErr;

        allTeamMembers = members.map(m => ({
          ...m,
          full_name: m.profiles?.full_name,
          email: m.profiles?.email,
          phone: m.profiles?.phone,
          specialization: m.profiles?.specialization,
          project_name: projectList.find(p => p.id === m.project_id)?.name || 'Proyek Tidak Diketahui'
        }));
      }

      setTeamMembers(allTeamMembers);

    } catch (err) {
      console.error('Error fetching team data for lead:', err);
      setError('Gagal memuat data tim');
      toast.error('Gagal memuat data tim');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (router.isReady && !authLoading && user && hasAccess) {
      fetchData();
    } else if (!authLoading && user && !hasAccess) {
      router.replace('/dashboard');
    }
  }, [router.isReady, authLoading, user, hasAccess, fetchData]);

  // Filter team members
  const filteredTeamMembers = teamMembers.filter(member => {
    const matchesSearch = member.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         member.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         member.specialization?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         member.project_name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesRole = roleFilter === 'all' || member.role === roleFilter;
    const matchesProject = projectFilter === 'all' || member.project_id === projectFilter;

    return matchesSearch && matchesRole && matchesProject;
  });

  const handleSendMessage = (userId) => {
    // Misalnya, arahkan ke halaman chat atau buka modal
    // router.push(`/dashboard/team-leader/communication/chat?with=${userId}`);
    toast.info('Fitur kirim pesan akan segera tersedia');
  };

  const handleCall = (phoneNumber) => {
    if (phoneNumber) {
      window.open(`tel:${phoneNumber}`, '_self');
    } else {
      toast.error('Nomor telepon tidak tersedia');
    }
  };

  const handleViewProject = (projectId) => {
    router.push(`/dashboard/team-leader/projects/${projectId}`);
  };

  const handleRefresh = () => {
    fetchData();
    toast.success('Data diperbarui');
  };

  // Get unique roles and projects for filters
  const availableRoles = [...new Set(teamMembers.map(m => m.role))];
  const availableProjects = projects; // Sudah di-fetch sebelumnya

  if (authLoading || (user && !hasAccess)) {
    return (
      <DashboardLayout title="Tim Proyek Saya">
        <div className="flex flex-col items-center justify-center min-h-[400px] p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 dark:border-blue-400"></div>
          <p className="mt-4 text-slate-600 dark:text-slate-400">Memuat...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout title="Tim Proyek Saya">
        <div className="p-4 md:p-6">
          <Alert className="mb-4 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle className="text-slate-900 dark:text-slate-100">Terjadi Kesalahan</AlertTitle>
            <AlertDescription className="text-slate-600 dark:text-slate-400">{error}</AlertDescription>
          </Alert>
          <Button onClick={fetchData}>Coba Muat Ulang</Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Tim Proyek Saya">
      <TooltipProvider>
        <motion.div
          className="p-6 space-y-8 bg-white dark:bg-slate-900 min-h-screen"
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
            <Button size="sm" onClick={() => router.push('/dashboard/team-leader')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Kembali
            </Button>
          </motion.div>

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
                  <Select value={roleFilter} onValueChange={setRoleFilter}>
                    <SelectTrigger className="w-full bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 border-slate-300 dark:border-slate-600">
                      <SelectValue placeholder="Filter Role" />
                    </SelectTrigger>
                    <SelectContent className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                      <SelectItem value="all">Semua Role</SelectItem>
                      {availableRoles.map(role => (
                        <SelectItem key={role} value={role} className="text-slate-900 dark:text-slate-100">
                          {getRoleLabel(role)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={projectFilter} onValueChange={setProjectFilter}>
                    <SelectTrigger className="w-full bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 border-slate-300 dark:border-slate-600">
                      <SelectValue placeholder="Filter Proyek" />
                    </SelectTrigger>
                    <SelectContent className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                      <SelectItem value="all">Semua Proyek</SelectItem>
                      {availableProjects.map(project => (
                        <SelectItem key={project.id} value={project.id} className="text-slate-900 dark:text-slate-100">
                          {project.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Team Members List */}
          <motion.div variants={itemVariants}>
            <Card className="border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Users className="w-5 h-5 text-green-500" />
                    Anggota Tim ({filteredTeamMembers.length})
                  </span>
                  <Badge variant="outline">
                    Ditugaskan ke {projects.length} proyek
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="space-y-4">
                    {[1, 2, 3, 4, 5].map(i => (
                      <div key={i} className="flex items-center justify-between p-4 border border-slate-200 dark:border-slate-700 rounded-lg">
                        <div className="flex items-center space-x-4">
                          <Skeleton className="h-10 w-10 rounded-full" />
                          <div className="space-y-2">
                            <Skeleton className="h-4 w-40" />
                            <Skeleton className="h-3 w-32" />
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Skeleton className="h-8 w-20" />
                          <Skeleton className="h-8 w-20" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : filteredTeamMembers.length === 0 ? (
                  <div className="text-center py-12">
                    <Users className="w-16 h-16 mx-auto text-slate-400 dark:text-slate-500 mb-4 opacity-50" />
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">
                      Tidak Ada Anggota Tim
                    </h3>
                    <p className="text-slate-600 dark:text-slate-400">
                      {searchTerm || roleFilter !== 'all' || projectFilter !== 'all'
                        ? 'Tidak ada anggota tim yang cocok dengan filter.'
                        : 'Belum ada tim yang ditugaskan ke proyek Anda saat ini.'}
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
                          <TableHead>Role</TableHead>
                          <TableHead>Proyek</TableHead>
                          <TableHead>Spesialisasi</TableHead>
                          <TableHead>Kontak</TableHead>
                          <TableHead>Aksi</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredTeamMembers.map((member) => (
                          <TableRow key={member.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 border-slate-200 dark:border-slate-700">
                            <TableCell className="font-medium">
                              <div className="flex items-center gap-3">
                                <div className="p-1.5 bg-blue-100 dark:bg-blue-900/30 rounded-full">
                                  <User className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                                </div>
                                <span>{member.full_name}</span>
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
                                      onClick={() => handleViewProject(member.project_id)}>
                                  {member.project_name}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-xs capitalize">
                                {member.specialization || 'Umum'}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col">
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
                              <div className="flex gap-2">
                                <Button variant="outline" size="sm" onClick={() => handleSendMessage(member.user_id)}>
                                  <MessageSquare className="w-4 h-4 mr-1" />
                                  Pesan
                                </Button>
                                {member.phone && (
                                  <Button variant="outline" size="sm" onClick={() => handleCall(member.phone)}>
                                    <Phone className="w-4 h-4 mr-1" />
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
                      Halaman ini menampilkan daftar tim yang ditugaskan ke proyek-proyek yang Anda tangani.
                      Anda dapat menghubungi mereka langsung untuk koordinasi pelaksanaan proyek.
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