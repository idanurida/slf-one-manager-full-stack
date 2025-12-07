// FILE: src/pages/dashboard/superadmin/index.js
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/router";
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import clsx from "clsx";
import { toast } from "sonner";

// shadcn/ui Components
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

// Lucide Icons
import {
  FileText, Users, CheckSquare, DollarSign, BarChart3, Plus, Edit, Trash2,
  Activity, Bell, Eye, AlertTriangle, Loader2, User, Lock, Shield,
  ArrowRight, X, Search,
  Info 
} from "lucide-react";

// Other Imports
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { supabase } from "@/utils/supabaseClient";
import { useAuth } from "@/context/AuthContext";
import { createUserWithPassword, createUserBasic } from "@/utils/supabaseAPI";

// --- Utility Functions ---
const formatDateSafely = (dateString) => {
  if (!dateString) return "-";
  try {
    return format(new Date(dateString), 'dd MMM yyyy', { locale: localeId });
  } catch (e) {
    return dateString;
  }
};

const getStatusVariant = (status) => {
  const statusMap = {
    'draft': 'secondary',
    'active': 'default',
    'in_progress': 'default',
    'submitted': 'outline',
    'completed': 'default',
    'rejected': 'destructive',
    'cancelled': 'destructive',
  };
  return statusMap[status] || 'outline';
};

const getRoleColor = (role) => {
  const roleMap = {
    'superadmin': 'destructive',
    'head_consultant': 'default',
    'project_lead': 'secondary',
    'admin_lead': 'outline',
    'inspector': 'default',
    'drafter': 'secondary',
    'client': 'outline',
  };
  return roleMap[role?.toLowerCase()] || 'secondary';
};

const getSpecializationTitle = (spec) => {
  const map = {
    'dokumen': 'Dokumen',
    'struktur': 'Struktur',
    'kebakaran': 'Kebakaran',
    'elektrikal': 'Elektrikal',
    'tata_udara': 'Tata Udara',
    'akustik': 'Akustik',
    'arsitektur': 'Arsitektur',
    'lingkungan': 'Lingkungan',
    'mekanikal': 'Mekanikal',
    'material': 'Material',
    'gas_medik': 'Gas Medik',
    'umum': 'Umum'
  };
  return map[spec] || spec?.charAt(0)?.toUpperCase() + spec?.slice(1)?.replace(/_/g, ' ') || 'N/A';
};

// --- Themed Statistic Card Component ---
const StatCard = ({ label, value, icon: IconComponent, colorScheme, helpText, loading }) => {
  // Use consistent theme colors for dark mode
  const colorClasses = {
    primary: 'text-primary dark:text-primary-foreground bg-primary/10 dark:bg-primary/20 border-primary/20 dark:border-primary/30',
    secondary: 'text-secondary dark:text-secondary-foreground bg-secondary/10 dark:bg-secondary/20 border-secondary/20 dark:border-secondary/30',
    success: 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800',
    destructive: 'text-destructive dark:text-destructive-foreground bg-destructive/10 dark:bg-destructive/20 border-destructive/20 dark:border-destructive/30',
    blue: 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800',
    gray: 'text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/20 border-gray-200 dark:border-gray-700',
    green: 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800',
    yellow: 'text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800',
    red: 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800',
    orange: 'text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800',
    purple: 'text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800',
  };

  const baseColorClass = colorClasses[colorScheme] || colorClasses.gray;

  if (loading) {
    return (
      <Card className="p-4 flex flex-col justify-between h-full border border-border bg-card animate-pulse">
        <div className="flex justify-between items-start">
          <div className="h-4 w-24 bg-muted rounded"></div>
          <div className="h-4 w-4 bg-muted rounded-full"></div>
        </div>
        <div className="mt-4 flex items-end justify-between">
          <div className="h-8 w-16 bg-muted rounded"></div>
          <div className="h-6 w-6 bg-muted rounded-full"></div>
        </div>
      </Card>
    );
  }

  return (
    <Card className={`p-4 flex flex-col justify-between h-full transition-all duration-300 border ${baseColorClass} hover:shadow-md dark:hover:shadow-lg dark:hover:shadow-black/20`}>
      <div className="flex justify-between items-start">
        <h3 className="text-sm font-medium text-muted-foreground">{label}</h3>
        {helpText && (
          <Tooltip delayDuration={100}>
            <TooltipTrigger asChild>
              <Info className="w-4 h-4 text-muted-foreground cursor-help hover:text-foreground" />
            </TooltipTrigger>
            <TooltipContent className="bg-popover border-border text-popover-foreground max-w-xs">
              <p className="text-sm">{helpText}</p>
            </TooltipContent>
          </Tooltip>
        )}
      </div>
      <div className="mt-2 flex items-end justify-between">
        <p className={`text-3xl font-bold ${baseColorClass.split(' ')[0]}`}>
          {value.toLocaleString()}
        </p>
        <IconComponent className={`w-6 h-6 opacity-80 ${baseColorClass.split(' ')[0]}`} />
      </div>
    </Card>
  );
};

// --- Quick Action Card Component ---
const QuickActionCard = ({ title, description, icon: IconComponent, action, buttonText, color }) => {
  const colorClasses = {
    blue: 'border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-900/10 hover:bg-blue-100/70 dark:hover:bg-blue-900/20',
    purple: 'border-purple-200 dark:border-purple-800 bg-purple-50/50 dark:bg-purple-900/10 hover:bg-purple-100/70 dark:hover:bg-purple-900/20',
    green: 'border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-900/10 hover:bg-green-100/70 dark:hover:bg-green-900/20',
    yellow: 'border-yellow-200 dark:border-yellow-800 bg-yellow-50/50 dark:bg-yellow-900/10 hover:bg-yellow-100/70 dark:hover:bg-yellow-900/20',
    red: 'border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-900/10 hover:bg-red-100/70 dark:hover:bg-red-900/20',
  };
  const baseColorClass = colorClasses[color] || 'border-border bg-card hover:bg-accent';

  return (
    <Card 
      className={`p-5 transition-all duration-300 border ${baseColorClass} cursor-pointer hover:shadow-md dark:hover:shadow-lg dark:hover:shadow-black/20`} 
      onClick={action}
    >
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-lg bg-background border border-border">
          <IconComponent className="w-5 h-5 text-foreground" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-foreground">{title}</h3>
          <p className="text-sm text-muted-foreground mt-1">{description}</p>
          <Button variant="link" size="sm" className="mt-2 p-0 h-auto font-medium group text-foreground hover:text-primary">
            {buttonText}
            <ArrowRight className="w-4 h-4 ml-1 transition-transform group-hover:translate-x-1" />
          </Button>
        </div>
      </div>
    </Card>
  );
};

// --- Main Component ---
export default function SuperadminDashboard() {
  const router = useRouter();
  const { user, profile, loading: authLoading, isSuperAdmin } = useAuth();

  // State Declarations
  const [dataLoading, setDataLoading] = useState(true);
  const [error, setError] = useState(null);
  const [projectStats, setProjectStats] = useState({
    total: 0, draft: 0, active: 0, in_progress: 0, submitted: 0,
    project_lead_review: 0, head_consultant_review: 0, client_review: 0,
    government_submitted: 0, slf_issued: 0, completed: 0, rejected: 0, cancelled: 0
  });
  const [userStats, setUserStats] = useState({ total: 0 });
  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState([]);

  // Dialog & Form States
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);
  const [newUser, setNewUser] = useState({ 
    email: '', 
    password: '', 
    role: 'inspector', 
    specialization: '',
    full_name: ''
  });
  const [userToEdit, setUserToEdit] = useState(null);
  const [editingUser, setEditingUser] = useState({ role: '', specialization: '', full_name: '' });
  const [actionLoading, setActionLoading] = useState({});
  const [formErrors, setFormErrors] = useState({});

  // Filter States
  const [searchTerm, setSearchTerm] = useState('');

  // --- DATA FETCHING ---
  const fetchData = useCallback(async () => {
    if (!isSuperAdmin) return;
    setDataLoading(true);
    setError(null);
    
    try {
      console.log('[SuperadminDashboard] Starting data fetch...');

      // Fetch projects for statistics
      const { data: allProjects, error: projectsError } = await supabase
        .from('projects')
        .select('id, name, status, client_id, created_at')
        .order('created_at', { ascending: false });

      if (projectsError) {
        console.error('[SuperadminDashboard] Projects fetch error:', projectsError);
        throw projectsError;
      }

      console.log('[SuperadminDashboard] Projects fetched:', allProjects?.length);

      // Calculate project statistics
      const counts = {
        total: allProjects?.length || 0,
        draft: 0, active: 0, in_progress: 0, submitted: 0,
        project_lead_review: 0, head_consultant_review: 0, client_review: 0,
        government_submitted: 0, slf_issued: 0, completed: 0, rejected: 0, cancelled: 0
      };

      allProjects?.forEach(p => {
        const status = p.status?.toLowerCase().trim();
        if (status && counts.hasOwnProperty(status)) {
          counts[status] += 1;
        } else {
          counts.draft += 1;
        }
      });

      setProjectStats(counts);
      console.log('[SuperadminDashboard] Project stats calculated:', counts);

      // Fetch user statistics and list
      const { data: usersData, error: usersError } = await supabase
        .from('profiles')
        .select('id, full_name, email, role, specialization, created_at')
        .order('created_at', { ascending: false });
      
      if (usersError) {
        console.error('[SuperadminDashboard] Users fetch error:', usersError);
        throw usersError;
      }
      
      console.log('[SuperadminDashboard] Users fetched:', usersData?.length);
      
      setUserStats({ total: usersData?.length || 0 });
      setUsers(usersData || []);

      // Fetch recent projects with client names
      const recentProjects = allProjects?.slice(0, 5) || [];
      console.log('[SuperadminDashboard] Recent projects to enrich:', recentProjects.length);

      const enrichedProjects = await Promise.all(
        recentProjects.map(async (project) => {
          let clientName = "-";
          if (project.client_id) {
            try {
              const { data: client, error: clientError } = await supabase
                .from('profiles')
                .select('full_name')
                .eq('id', project.client_id)
                .single();
              
              if (!clientError && client) {
                clientName = client.full_name || "-";
              }
            } catch (clientErr) {
              console.warn(`[SuperadminDashboard] Error fetching client for project ${project.id}:`, clientErr);
            }
          }
          return { 
            ...project, 
            clientName,
            name: project.name || `Proyek ${project.id.substring(0, 8)}`
          };
        })
      );

      console.log('[SuperadminDashboard] Enriched projects:', enrichedProjects);
      setProjects(enrichedProjects);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error("[SuperadminDashboard] Fetch data error:", err);
      setError(`Gagal memuat data dashboard: ${errorMessage}`);
      toast.error(`Gagal memuat data: ${errorMessage}`);
    } finally {
      setDataLoading(false);
      console.log('[SuperadminDashboard] Data loading completed');
    }
  }, [isSuperAdmin]);

  // Authentication & Data Fetching Logic
  useEffect(() => {
    if (router.isReady && !authLoading) {
      if (!user) {
        router.replace('/login');
        return;
      }
      if (!isSuperAdmin) {
        router.replace('/dashboard');
        return;
      }
      console.log('[SuperadminDashboard] Starting data fetch...');
      fetchData();
    }
  }, [router.isReady, authLoading, user, isSuperAdmin, router, fetchData]);

  // --- Form Validation ---
  const validateUserForm = (userData, isEdit = false) => {
    const errors = {};
    
    if (!isEdit && !userData.email) {
      errors.email = 'Email wajib diisi';
    } else if (!isEdit && !/\S+@\S+\.\S+/.test(userData.email)) {
      errors.email = 'Format email tidak valid';
    }
    
    if (!isEdit && (!userData.password || userData.password.length < 6)) {
      errors.password = 'Password minimal 6 karakter';
    }
    
    if (!userData.role) {
      errors.role = 'Role wajib dipilih';
    }
    
    if (userData.role === 'inspector' && !userData.specialization) {
      errors.specialization = 'Spesialisasi wajib dipilih untuk inspector';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // --- Handlers ---
  const handleViewProject = (projectId) => {
    router.push(`/dashboard/superadmin/projects/${projectId}`);
  };

  const handleViewAllProjects = () => {
    router.push('/dashboard/superadmin/projects');
  };

  const handleViewAllUsers = () => {
    // Scroll to users section
    const usersSection = document.getElementById('users-section');
    if (usersSection) {
      usersSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleDeleteUser = async () => {
    if (!userToDelete) return;
    
    // Prevent deleting own account
    if (userToDelete.id === user?.id) {
      toast.error('Tidak dapat menghapus akun sendiri');
      return;
    }

    setActionLoading(prev => ({ ...prev, [`delete-${userToDelete.id}`]: true }));
    try {
      const { error: profileError } = await supabase
        .from('profiles')
        .delete()
        .eq('id', userToDelete.id);

      if (profileError) throw profileError;

      toast.success(`Pengguna ${userToDelete.email || userToDelete.full_name} telah dihapus.`);
      fetchData();
      setDeleteDialogOpen(false);
      setUserToDelete(null);
    } catch (err) {
      console.error('[SuperadminDashboard] Delete user error:', err);
      toast.error(`Gagal menghapus pengguna: ${err.message}`);
    } finally {
      setActionLoading(prev => ({ ...prev, [`delete-${userToDelete?.id}`]: false }));
    }
  };

  const handleCreateUser = async () => {
    if (!validateUserForm(newUser, false)) {
      toast.error('Harap perbaiki error pada form');
      return;
    }

    setActionLoading(prev => ({ ...prev, createUser: true }));
    try {
      console.log('[SuperadminDashboard] Creating user:', newUser.email);
      
      // Try the main method first
      let result;
      try {
        result = await createUserWithPassword(newUser);
      } catch (primaryError) {
        console.warn('[SuperadminDashboard] Primary method failed, trying fallback:', primaryError.message);
        // If primary method fails, try fallback
        result = await createUserBasic(newUser);
      }

      if (result && (result.profile || result.user)) {
        toast.success(`✅ Akun untuk ${newUser.email} telah berhasil dibuat! User dapat langsung login.`);
      } else {
        toast.success(`Akun untuk ${newUser.email} telah dibuat.`);
      }

      fetchData();
      setCreateDialogOpen(false);
      setNewUser({ email: '', password: '', role: 'inspector', specialization: '', full_name: '' });
      setFormErrors({});
    } catch (err) {
      console.error('[SuperadminDashboard] Create user error:', err);
      
      // User-friendly error messages
      let errorMessage = err.message;
      if (err.message.includes('already registered') || err.message.includes('already exists')) {
        errorMessage = '📧 Email sudah terdaftar. Gunakan alamat email lain.';
      } else if (err.message.includes('password')) {
        errorMessage = '🔒 Password tidak memenuhi kriteria keamanan. Minimal 6 karakter.';
      } else if (err.message.includes('izin') || err.message.includes('permission')) {
        errorMessage = '⛔ Tidak memiliki izin untuk membuat pengguna. Pastikan Anda superadmin.';
      } else if (err.message.includes('Database error') || err.message.includes('database')) {
        errorMessage = '🗄️ Error database. Periksa koneksi atau hubungi administrator.';
      }
      
      toast.error(`Gagal membuat pengguna: ${errorMessage}`);
    } finally {
      setActionLoading(prev => ({ ...prev, createUser: false }));
    }
  };

  const handleEditUser = async () => {
    if (!userToEdit) return;
    
    if (!validateUserForm(editingUser, true)) {
      toast.error('Harap perbaiki error pada form');
      return;
    }

    setActionLoading(prev => ({ ...prev, [`edit-${userToEdit.id}`]: true }));
    try {
      const updates = {
        role: editingUser.role,
        specialization: editingUser.role === 'inspector' ? editingUser.specialization : null,
        full_name: editingUser.full_name || userToEdit.full_name,
      };

      const { error: profileError } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', userToEdit.id);

      if (profileError) throw profileError;

      toast.success(`Data untuk ${userToEdit.email} telah diperbarui.`);
      fetchData();
      setEditDialogOpen(false);
      setUserToEdit(null);
      setEditingUser({ role: '', specialization: '', full_name: '' });
      setFormErrors({});
    } catch (err) {
      console.error('[SuperadminDashboard] Edit user error:', err);
      toast.error(`Gagal memperbarui pengguna: ${err.message}`);
    } finally {
      setActionLoading(prev => ({ ...prev, [`edit-${userToEdit?.id}`]: false }));
    }
  };

  const openDeleteDialog = (user) => {
    setUserToDelete(user);
    setDeleteDialogOpen(true);
  };

  const openEditDialog = (user) => {
    setUserToEdit(user);
    setEditingUser({ 
      role: user.role, 
      specialization: user.specialization || '',
      full_name: user.full_name || ''
    });
    setEditDialogOpen(true);
    setFormErrors({});
  };

  // Reset form when dialog closes
  const handleCreateDialogClose = () => {
    setCreateDialogOpen(false);
    setNewUser({ email: '', password: '', role: 'inspector', specialization: '', full_name: '' });
    setFormErrors({});
  };

  const handleEditDialogClose = () => {
    setEditDialogOpen(false);
    setUserToEdit(null);
    setEditingUser({ role: '', specialization: '', full_name: '' });
    setFormErrors({});
  };

  // --- Filtered Users ---
  const filteredUsers = useMemo(() => {
    if (!users || users.length === 0) return [];
    
    return users.filter(user =>
      (user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.role?.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [searchTerm, users]);

  // Debug: Log data states
  useEffect(() => {
    console.log('[SuperadminDashboard] Data state:', {
      projectsCount: projects.length,
      usersCount: users.length,
      filteredUsersCount: filteredUsers.length,
      dataLoading,
      error
    });
  }, [projects, users, filteredUsers, dataLoading, error]);

  // --- Render Logic ---
  if (authLoading || (user && !isSuperAdmin) || dataLoading) {
    return (
      <DashboardLayout title="Dashboard Superadmin">
        <div className="flex flex-col items-center justify-center min-h-[400px] p-8">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="mt-4 text-muted-foreground">Memverifikasi sesi dan memuat data...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout title="Dashboard Superadmin">
        <div className="p-4 md:p-6">
          <Alert variant="destructive" className="mb-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Terjadi Kesalahan</AlertTitle>
            <AlertDescription>
              {error}
            </AlertDescription>
          </Alert>
          <div className="flex justify-center">
            <Button onClick={fetchData} className="flex items-center gap-2">
              <Loader2 className="w-4 h-4" /> Coba Muat Ulang Data
            </Button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Dashboard Superadmin">
      <TooltipProvider>
        <div className="p-4 md:p-6 space-y-6">
          {/* Header */}
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Shield className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="text-muted-foreground">Selamat datang, {profile?.full_name || 'Super Admin'}! Akses penuh sistem tersedia.</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant="secondary" className="bg-primary/10 text-primary px-3 py-1">
                <Shield className="w-3 h-3 mr-1" /> Super Admin
              </Badge>
              <Button
                onClick={() => router.push('/dashboard/notifications')}
                variant="outline"
                className="flex items-center gap-2 border-border"
                size="sm"
              >
                <Bell className="w-4 h-4" /> Notifikasi
              </Button>
            </div>
          </div>

          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 bg-muted p-1 rounded-lg">
              <TabsTrigger
                value="overview"
                className="data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
              >
                Gambaran Umum
              </TabsTrigger>
              <TabsTrigger
                value="projects"
                className="data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
              >
                Proyek Terbaru
              </TabsTrigger>
              <TabsTrigger
                value="users"
                className="data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
              >
                Kelola Pengguna
              </TabsTrigger>
              <TabsTrigger
                value="logs"
                className="data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
              >
                Log Aktivitas
              </TabsTrigger>
            </TabsList>

            {/* 📊 Tab: Gambaran Umum */}
            <TabsContent value="overview" className="space-y-6">
              {/* Statistik Cards */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard
                  label="Total Proyek"
                  value={projectStats.total}
                  icon={FileText}
                  colorScheme="primary"
                  helpText="Total semua proyek dalam sistem"
                  loading={dataLoading}
                />
                <StatCard
                  label="Total Pengguna"
                  value={userStats.total}
                  icon={Users}
                  colorScheme="secondary"
                  helpText="Total semua pengguna terdaftar"
                  loading={dataLoading}
                />
                <StatCard
                  label="Proyek Aktif"
                  value={projectStats.active + projectStats.in_progress}
                  icon={Activity}
                  colorScheme="success"
                  helpText="Proyek yang sedang aktif dan berjalan"
                  loading={dataLoading}
                />
                <StatCard
                  label="Proyek Draft"
                  value={projectStats.draft}
                  icon={FileText}
                  colorScheme="destructive"
                  helpText="Proyek dalam draft"
                  loading={dataLoading}
                />
              </div>

              {/* Detailed Project Statistics */}
              <Card className="border-border bg-card">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2 text-lg text-foreground">
                    <BarChart3 className="w-5 h-5" /> Statistik Detail Proyek
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
                    <StatCard label="Draft" value={projectStats.draft} icon={FileText} colorScheme="gray" loading={dataLoading} helpText="Proyek dalam draft" />
                    <StatCard label="Active" value={projectStats.active} icon={CheckSquare} colorScheme="green" loading={dataLoading} helpText="Proyek aktif" />
                    <StatCard label="In Progress" value={projectStats.in_progress} icon={Activity} colorScheme="yellow" loading={dataLoading} helpText="Proyek sedang berjalan" />
                    <StatCard label="Submitted" value={projectStats.submitted} icon={CheckSquare} colorScheme="blue" loading={dataLoading} helpText="Proyek submitted" />
                    <StatCard label="Completed" value={projectStats.completed} icon={CheckSquare} colorScheme="green" loading={dataLoading} helpText="Proyek selesai" />
                    <StatCard label="Rejected" value={projectStats.rejected} icon={Trash2} colorScheme="red" loading={dataLoading} helpText="Proyek ditolak" />
                  </div>
                </CardContent>
              </Card>

              {/* Quick Actions & Recent Projects */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Quick Actions */}
                <div className="space-y-6">
                  <QuickActionCard
                    title="Kelola Proyek"
                    description="Lihat dan kelola semua proyek dalam sistem"
                    icon={FileText}
                    action={handleViewAllProjects}
                    buttonText="Kelola Proyek"
                    color="blue"
                  />
                  <QuickActionCard
                    title="Kelola Pengguna"
                    description="Kelola pengguna dan permissions"
                    icon={Users}
                    action={handleViewAllUsers}
                    buttonText="Kelola Pengguna"
                    color="purple"
                  />
                </div>

                {/* Recent Projects */}
                <div className="lg:col-span-2">
                  <Card className="border-border bg-card">
                    <CardHeader className="pb-4 flex flex-row items-center justify-between">
                      <CardTitle className="flex items-center gap-2 text-lg text-foreground">
                        <Activity className="w-5 h-5" /> Proyek Terbaru
                      </CardTitle>
                      <Button
                        onClick={handleViewAllProjects}
                        variant="outline"
                        size="sm"
                        className="border-border"
                      >
                        Lihat Semua
                      </Button>
                    </CardHeader>
                    <CardContent>
                      {projects.length > 0 ? (
                        <div className="rounded-md border border-border">
                          <Table>
                            <TableHeader>
                              <TableRow className="border-border hover:bg-transparent">
                                <TableHead className="text-foreground border-border">Nama Proyek</TableHead>
                                <TableHead className="text-foreground border-border">Klien</TableHead>
                                <TableHead className="text-foreground border-border">Status</TableHead>
                                <TableHead className="text-foreground border-border">Dibuat</TableHead>
                                <TableHead className="text-center text-foreground border-border">Aksi</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {projects.map((project) => (
                                <TableRow key={project.id} className="border-border hover:bg-accent/50">
                                  <TableCell className="font-medium text-foreground">
                                    {project.name}
                                  </TableCell>
                                  <TableCell className="text-foreground">
                                    {project.clientName}
                                  </TableCell>
                                  <TableCell>
                                    <Badge variant={getStatusVariant(project.status)} className="capitalize">
                                      {project.status?.replace(/_/g, ' ') || 'N/A'}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="text-foreground">
                                    {formatDateSafely(project.created_at)}
                                  </TableCell>
                                  <TableCell className="text-center">
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button
                                          onClick={() => handleViewProject(project.id)}
                                          variant="ghost"
                                          size="icon"
                                          className="hover:bg-accent"
                                        >
                                          <Eye className="w-4 h-4" />
                                          <span className="sr-only">Detail</span>
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent className="bg-popover border-border text-popover-foreground">
                                        <p>Lihat Detail Proyek</p>
                                      </TooltipContent>
                                    </Tooltip>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      ) : (
                        <Alert className="border-border bg-muted/50">
                          <AlertTitle className="text-foreground">Tidak ada proyek</AlertTitle>
                          <AlertDescription className="text-muted-foreground">
                            {dataLoading ? 'Memuat data proyek...' : 'Belum ada proyek yang terdaftar.'}
                          </AlertDescription>
                        </Alert>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </div>
            </TabsContent>

            {/* 📁 Tab: Proyek Terbaru */}
            <TabsContent value="projects" className="space-y-6">
              <Card className="border-border bg-card">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2 text-lg text-foreground">
                    <FileText className="w-5 h-5" /> Daftar Semua Proyek
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {projects.length > 0 ? (
                    <div className="rounded-md border border-border">
                      <Table>
                        <TableHeader>
                          <TableRow className="border-border hover:bg-transparent">
                            <TableHead className="text-foreground border-border">Nama Proyek</TableHead>
                            <TableHead className="text-foreground border-border">Klien</TableHead>
                            <TableHead className="text-foreground border-border">Status</TableHead>
                            <TableHead className="text-foreground border-border">Dibuat</TableHead>
                            <TableHead className="text-center text-foreground border-border">Aksi</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {projects.map((project) => (
                            <TableRow key={project.id} className="border-border hover:bg-accent/50">
                              <TableCell className="font-medium text-foreground">
                                {project.name}
                              </TableCell>
                              <TableCell className="text-foreground">
                                {project.clientName}
                              </TableCell>
                              <TableCell>
                                <Badge variant={getStatusVariant(project.status)} className="capitalize">
                                  {project.status?.replace(/_/g, ' ') || 'N/A'}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-foreground">
                                {formatDateSafely(project.created_at)}
                              </TableCell>
                              <TableCell className="text-center">
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      onClick={() => handleViewProject(project.id)}
                                      variant="ghost"
                                      size="icon"
                                      className="hover:bg-accent"
                                    >
                                      <Eye className="w-4 h-4" />
                                      <span className="sr-only">Detail</span>
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent className="bg-popover border-border text-popover-foreground">
                                    <p>Lihat Detail Proyek</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <Alert className="border-border bg-muted/50">
                      <AlertTitle className="text-foreground">Tidak ada proyek</AlertTitle>
                      <AlertDescription className="text-muted-foreground">
                        {dataLoading ? 'Memuat data proyek...' : 'Belum ada proyek yang terdaftar.'}
                      </AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* 👥 Tab: Kelola Pengguna */}
            <TabsContent value="users" className="space-y-6" id="users-section">
              <Card className="border-border bg-card">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2 text-lg text-foreground">
                    <Users className="w-5 h-5" /> Daftar Pengguna
                  </CardTitle>
                  <CardDescription className="text-muted-foreground">
                    Kelola semua pengguna dalam sistem. Superadmin tidak dapat dihapus atau diubah.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {/* Action Bar */}
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                    <Button
                      onClick={() => setCreateDialogOpen(true)}
                      className="bg-primary text-primary-foreground hover:bg-primary/90 flex items-center gap-2"
                    >
                      <Plus className="w-4 h-4" /> Buat Pengguna Baru
                    </Button>

                    {/* Search */}
                    <div className="relative w-full sm:w-auto">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        placeholder="Cari email, nama, atau role..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 w-full sm:w-64 bg-background text-foreground border-border"
                      />
                    </div>
                  </div>

                  {/* User Table */}
                  {filteredUsers.length > 0 ? (
                    <div className="rounded-md border border-border overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow className="border-border hover:bg-transparent">
                            <TableHead className="text-foreground border-border">Nama</TableHead>
                            <TableHead className="text-foreground border-border">Email</TableHead>
                            <TableHead className="text-foreground border-border">Role</TableHead>
                            <TableHead className="text-foreground border-border">Spesialisasi</TableHead>
                            <TableHead className="text-foreground border-border">Dibuat</TableHead>
                            <TableHead className="text-center text-foreground border-border">Aksi</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredUsers.map((u) => (
                            <TableRow key={u.id} className="border-border hover:bg-accent/50">
                              <TableCell className="font-medium text-foreground">
                                {u.full_name || '-'}
                              </TableCell>
                              <TableCell className="text-foreground">
                                {u.email}
                              </TableCell>
                              <TableCell>
                                <Badge variant={getRoleColor(u.role)} className="capitalize">
                                  {u.role?.replace(/_/g, ' ') || 'N/A'}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-foreground">
                                {u.specialization ? getSpecializationTitle(u.specialization) : '-'}
                              </TableCell>
                              <TableCell className="text-foreground">
                                {formatDateSafely(u.created_at)}
                              </TableCell>
                              <TableCell className="text-center">
                                <div className="flex items-center justify-center gap-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => openEditDialog(u)}
                                    disabled={u.role === 'superadmin'}
                                    className="h-8 border-border hover:bg-accent"
                                  >
                                    <Edit className="w-3 h-3 mr-1" /> Edit
                                  </Button>
                                  <Button
                                    variant="destructive"
                                    size="sm"
                                    onClick={() => openDeleteDialog(u)}
                                    disabled={u.role === 'superadmin' || u.id === user?.id}
                                    className="h-8"
                                  >
                                    {actionLoading[`delete-${u.id}`] ? (
                                      <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                      <Trash2 className="w-3 h-3 mr-1" />
                                    )}
                                    Hapus
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <Alert className="border-border bg-muted/50">
                      <AlertTitle className="text-foreground">Tidak ada pengguna</AlertTitle>
                      <AlertDescription className="text-muted-foreground">
                        {users.length === 0 
                          ? "Belum ada pengguna yang terdaftar." 
                          : "Tidak ada pengguna yang sesuai dengan filter pencarian."}
                      </AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* 📜 Tab: Log Aktivitas */}
            <TabsContent value="logs" className="space-y-6">
              <Card className="border-border bg-card">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2 text-lg text-foreground">
                    <Activity className="w-5 h-5" /> Log Aktivitas Sistem
                  </CardTitle>
                  <CardDescription className="text-muted-foreground">
                    Riwayat aktivitas sistem (fitur dalam pengembangan)
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 p-3 border border-border rounded-lg bg-muted/50">
                      <Activity className="w-4 h-4 text-green-500" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-foreground">User Login</p>
                        <p className="text-xs text-muted-foreground">[2025-10-17] User 'superadmin@mail.com' logged in.</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 border border-border rounded-lg bg-muted/50">
                      <Activity className="w-4 h-4 text-yellow-500" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-foreground">Status Update</p>
                        <p className="text-xs text-muted-foreground">[2025-10-17] Project status changed to 'In Review'.</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 border border-border rounded-lg bg-muted/50">
                      <Activity className="w-4 h-4 text-blue-500" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-foreground">Document Uploaded</p>
                        <p className="text-xs text-muted-foreground">[2025-10-16] New document uploaded for Project XYZ.</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* === Dialogs === */}

        {/* Create User Dialog */}
        <Dialog open={createDialogOpen} onOpenChange={handleCreateDialogClose}>
          <DialogContent className="sm:max-w-[425px] bg-background border-border">
            <DialogHeader>
              <DialogTitle className="text-foreground">Buat Pengguna Baru</DialogTitle>
              <DialogDescription className="text-muted-foreground">
                Masukkan detail untuk membuat akun pengguna baru.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-foreground">Alamat Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  placeholder="nama@perusahaan.com"
                  className="bg-background text-foreground border-border"
                  required
                />
                {formErrors.email && (
                  <p className="text-sm text-destructive">{formErrors.email}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="full_name" className="text-foreground">Nama Lengkap</Label>
                <Input
                  id="full_name"
                  type="text"
                  value={newUser.full_name}
                  onChange={(e) => setNewUser({ ...newUser, full_name: e.target.value })}
                  placeholder="Nama lengkap pengguna"
                  className="bg-background text-foreground border-border"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-foreground">Password (Sementara) *</Label>
                <Input
                  id="password"
                  type="password"
                  value={newUser.password}
                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                  placeholder="Minimal 6 karakter"
                  className="bg-background text-foreground border-border"
                  minLength={6}
                  required
                />
                {formErrors.password && (
                  <p className="text-sm text-destructive">{formErrors.password}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="role" className="text-foreground">Role *</Label>
                <Select
                  value={newUser.role}
                  onValueChange={(value) => setNewUser({
                    ...newUser,
                    role: value,
                    specialization: value !== 'inspector' ? '' : newUser.specialization
                  })}
                >
                  <SelectTrigger className="bg-background text-foreground border-border">
                    <SelectValue placeholder="Pilih Role" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover text-popover-foreground border-border">
                    <SelectItem value="inspector">Inspector</SelectItem>
                    <SelectItem value="project_lead">Project Lead</SelectItem>
                    <SelectItem value="head_consultant">Head Consultant</SelectItem>
                    <SelectItem value="admin_lead">Admin Lead</SelectItem>
                    <SelectItem value="drafter">Drafter</SelectItem>
                    <SelectItem value="client">Client</SelectItem>
                    <SelectItem value="superadmin">Superadmin</SelectItem>
                  </SelectContent>
                </Select>
                {formErrors.role && (
                  <p className="text-sm text-destructive">{formErrors.role}</p>
                )}
              </div>
              {newUser.role === 'inspector' && (
                <div className="space-y-2">
                  <Label htmlFor="specialization" className="text-foreground">Spesialisasi (Inspector) *</Label>
                  <Select
                    value={newUser.specialization}
                    onValueChange={(value) => setNewUser({ ...newUser, specialization: value })}
                  >
                    <SelectTrigger className="bg-background text-foreground border-border">
                      <SelectValue placeholder="Pilih Spesialisasi" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover text-popover-foreground border-border">
                      <SelectItem value="dokumen">Dokumen</SelectItem>
                      <SelectItem value="struktur">Struktur</SelectItem>
                      <SelectItem value="kebakaran">Kebakaran</SelectItem>
                      <SelectItem value="elektrikal">Elektrikal</SelectItem>
                      <SelectItem value="tata_udara">Tata Udara</SelectItem>
                      <SelectItem value="akustik">Akustik</SelectItem>
                      <SelectItem value="arsitektur">Arsitektur</SelectItem>
                      <SelectItem value="lingkungan">Lingkungan</SelectItem>
                      <SelectItem value="mekanikal">Mekanikal</SelectItem>
                      <SelectItem value="material">Material</SelectItem>
                      <SelectItem value="gas_medik">Gas Medik</SelectItem>
                      <SelectItem value="umum">Umum</SelectItem>
                    </SelectContent>
                  </Select>
                  {formErrors.specialization && (
                    <p className="text-sm text-destructive">{formErrors.specialization}</p>
                  )}
                </div>
              )}
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={handleCreateDialogClose}
                className="border-border text-foreground hover:bg-accent"
              >
                Batal
              </Button>
              <Button
                onClick={handleCreateUser}
                disabled={actionLoading.createUser}
                className="bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {actionLoading.createUser ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Membuat...
                  </>
                ) : (
                  'Buat Pengguna'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit User Dialog */}
        <Dialog open={editDialogOpen} onOpenChange={handleEditDialogClose}>
          <DialogContent className="sm:max-w-[425px] bg-background border-border">
            <DialogHeader>
              <DialogTitle className="text-foreground">Edit Pengguna</DialogTitle>
              <DialogDescription className="text-muted-foreground">
                Ubah data pengguna.
              </DialogDescription>
            </DialogHeader>
            {userToEdit && (
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label className="text-foreground">Email</Label>
                  <p className="text-sm text-foreground font-medium">{userToEdit.email}</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-full_name" className="text-foreground">Nama Lengkap</Label>
                  <Input
                    id="edit-full_name"
                    type="text"
                    value={editingUser.full_name}
                    onChange={(e) => setEditingUser({ ...editingUser, full_name: e.target.value })}
                    placeholder="Nama lengkap pengguna"
                    className="bg-background text-foreground border-border"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-role" className="text-foreground">Role *</Label>
                  <Select
                    value={editingUser.role}
                    onValueChange={(value) => setEditingUser({
                      ...editingUser,
                      role: value,
                      specialization: value !== 'inspector' ? '' : editingUser.specialization
                    })}
                  >
                    <SelectTrigger className="bg-background text-foreground border-border">
                      <SelectValue placeholder="Pilih Role" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover text-popover-foreground border-border">
                      <SelectItem value="inspector">Inspector</SelectItem>
                      <SelectItem value="project_lead">Project Lead</SelectItem>
                      <SelectItem value="head_consultant">Head Consultant</SelectItem>
                      <SelectItem value="admin_lead">Admin Lead</SelectItem>
                      <SelectItem value="drafter">Drafter</SelectItem>
                      <SelectItem value="client">Client</SelectItem>
                      <SelectItem value="superadmin">Superadmin</SelectItem>
                    </SelectContent>
                  </Select>
                  {formErrors.role && (
                    <p className="text-sm text-destructive">{formErrors.role}</p>
                  )}
                </div>
                {editingUser.role === 'inspector' && (
                  <div className="space-y-2">
                    <Label htmlFor="edit-specialization" className="text-foreground">Spesialisasi (Inspector) *</Label>
                    <Select
                      value={editingUser.specialization}
                      onValueChange={(value) => setEditingUser({ ...editingUser, specialization: value })}
                    >
                      <SelectTrigger className="bg-background text-foreground border-border">
                        <SelectValue placeholder="Pilih Spesialisasi" />
                      </SelectTrigger>
                      <SelectContent className="bg-popover text-popover-foreground border-border">
                        <SelectItem value="dokumen">Dokumen</SelectItem>
                        <SelectItem value="struktur">Struktur</SelectItem>
                        <SelectItem value="kebakaran">Kebakaran</SelectItem>
                        <SelectItem value="elektrikal">Elektrikal</SelectItem>
                        <SelectItem value="tata_udara">Tata Udara</SelectItem>
                        <SelectItem value="akustik">Akustik</SelectItem>
                        <SelectItem value="arsitektur">Arsitektur</SelectItem>
                        <SelectItem value="lingkungan">Lingkungan</SelectItem>
                        <SelectItem value="mekanikal">Mekanikal</SelectItem>
                        <SelectItem value="material">Material</SelectItem>
                        <SelectItem value="gas_medik">Gas Medik</SelectItem>
                        <SelectItem value="umum">Umum</SelectItem>
                      </SelectContent>
                    </Select>
                    {formErrors.specialization && (
                      <p className="text-sm text-destructive">{formErrors.specialization}</p>
                    )}
                  </div>
                )}
              </div>
            )}
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={handleEditDialogClose}
                className="border-border text-foreground hover:bg-accent"
              >
                Batal
              </Button>
              <Button
                onClick={handleEditUser}
                disabled={actionLoading[`edit-${userToEdit?.id}`]}
                className="bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {actionLoading[`edit-${userToEdit?.id}`] ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Menyimpan...
                  </>
                ) : (
                  'Simpan Perubahan'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogContent className="sm:max-w-[425px] bg-background border-destructive">
            <DialogHeader>
              <DialogTitle className="text-foreground flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-destructive" /> Konfirmasi Hapus
              </DialogTitle>
              <DialogDescription className="text-destructive">
                Apakah Anda yakin ingin menghapus pengguna ini? Tindakan ini tidak dapat dibatalkan.
              </DialogDescription>
            </DialogHeader>
            {userToDelete && (
              <div className="py-4">
                <p className="text-sm text-foreground">
                  Menghapus <span className="font-semibold">{userToDelete.email || userToDelete.full_name}</span>.
                </p>
                {userToDelete.id === user?.id && (
                  <p className="text-sm text-destructive mt-2">
                    ⚠️ Anda tidak dapat menghapus akun sendiri.
                  </p>
                )}
              </div>
            )}
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDeleteDialogOpen(false)}
                className="border-border text-foreground hover:bg-accent"
              >
                Batal
              </Button>
              <Button
                onClick={handleDeleteUser}
                disabled={actionLoading[`delete-${userToDelete?.id}`] || userToDelete?.id === user?.id}
                variant="destructive"
              >
                {actionLoading[`delete-${userToDelete?.id}`] ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Menghapus...
                  </>
                ) : (
                  'Hapus Pengguna'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      </TooltipProvider>
    </DashboardLayout>
  );
}