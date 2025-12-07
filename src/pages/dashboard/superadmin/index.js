// FILE: src/pages/dashboard/superadmin/index.js
// Dashboard Superadmin - Clean & User Friendly
import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/router";
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { toast } from "sonner";

// UI Components
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";

// Icons
import {
  Building, Users, Shield, ChevronRight, AlertTriangle,
  UserPlus, Database, Activity
} from "lucide-react";

// Layout & Utils
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { supabase } from "@/utils/supabaseClient";
import { useAuth } from "@/context/AuthContext";

// Helpers
const formatDate = (dateString) => {
  if (!dateString) return '-';
  try {
    return format(new Date(dateString), 'dd MMM yyyy', { locale: localeId });
  } catch (e) {
    return '-';
  }
};

const getRoleBadge = (role) => {
  const config = {
    superadmin: { label: 'Superadmin', variant: 'destructive' },
    head_consultant: { label: 'Head Consultant', variant: 'default' },
    admin_lead: { label: 'Admin Lead', variant: 'default' },
    project_lead: { label: 'Project Lead', variant: 'secondary' },
    admin_team: { label: 'Admin Team', variant: 'secondary' },
    inspector: { label: 'Inspector', variant: 'outline' },
    drafter: { label: 'Drafter', variant: 'outline' },
    client: { label: 'Client', variant: 'outline' },
  };
  const { label, variant } = config[role] || { label: role, variant: 'secondary' };
  return <Badge variant={variant}>{label}</Badge>;
};

export default function SuperadminDashboard() {
  const router = useRouter();
  const { user, profile, loading: authLoading, isSuperadmin } = useAuth();

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalProjects: 0,
    activeProjects: 0,
    completedProjects: 0
  });
  const [recentUsers, setRecentUsers] = useState([]);
  const [recentProjects, setRecentProjects] = useState([]);

  // Fetch dashboard data
  const fetchData = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);

    try {
      // Fetch users
      const { data: users, count: userCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false });

      setRecentUsers((users || []).slice(0, 5));

      // Fetch projects
      const { data: projects, count: projectCount } = await supabase
        .from('projects')
        .select('*, clients(name)', { count: 'exact' })
        .order('created_at', { ascending: false });

      setRecentProjects((projects || []).slice(0, 5));

      // Calculate stats
      const projectsList = projects || [];
      setStats({
        totalUsers: userCount || 0,
        totalProjects: projectCount || 0,
        activeProjects: projectsList.filter(p => 
          p.status !== 'completed' && p.status !== 'cancelled'
        ).length,
        completedProjects: projectsList.filter(p => p.status === 'completed').length
      });

    } catch (error) {
      console.error('Error fetching dashboard:', error);
      toast.error('Gagal memuat data dashboard');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (!authLoading && user && isSuperadmin) {
      fetchData();
    }
  }, [authLoading, user, isSuperadmin, fetchData]);

  // Loading state
  if (authLoading || loading) {
    return (
      <DashboardLayout title="Dashboard">
        <div className="p-6 space-y-6">
          <Skeleton className="h-8 w-64" />
          <div className="grid gap-4 md:grid-cols-4">
            {[1,2,3,4].map(i => <Skeleton key={i} className="h-24" />)}
          </div>
          <Skeleton className="h-64" />
        </div>
      </DashboardLayout>
    );
  }

  // Access denied
  if (!user || !isSuperadmin) {
    return (
      <DashboardLayout title="Dashboard">
        <div className="p-6">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Hanya Superadmin yang dapat mengakses halaman ini.
            </AlertDescription>
          </Alert>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Dashboard">
      <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">

        {/* Welcome Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">
              Selamat Datang, {profile?.full_name?.split(' ')[0] || 'Superadmin'}
            </h1>
            <p className="text-muted-foreground">
              Kelola pengguna dan sistem aplikasi
            </p>
          </div>
          
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => router.push('/dashboard/superadmin/users/new')}>
              <UserPlus className="w-4 h-4 mr-2" />
              Tambah User
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => router.push('/dashboard/superadmin/users')}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Pengguna</p>
                  <p className="text-3xl font-bold">{stats.totalUsers}</p>
                </div>
                <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-full">
                  <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => router.push('/dashboard/superadmin/projects')}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Proyek</p>
                  <p className="text-3xl font-bold">{stats.totalProjects}</p>
                </div>
                <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-full">
                  <Building className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => router.push('/dashboard/superadmin/projects')}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Proyek Aktif</p>
                  <p className="text-3xl font-bold">{stats.activeProjects}</p>
                </div>
                <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-full">
                  <Activity className="w-6 h-6 text-green-600 dark:text-green-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => router.push('/dashboard/superadmin/recovery-center')}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Recovery</p>
                  <p className="text-3xl font-bold">-</p>
                </div>
                <div className="p-3 bg-orange-100 dark:bg-orange-900/30 rounded-full">
                  <Database className="w-6 h-6 text-orange-600 dark:text-orange-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Grid */}
        <div className="grid gap-6 lg:grid-cols-2">
          
          {/* Recent Users */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="w-5 h-5" />
                Pengguna Terbaru
              </CardTitle>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => router.push('/dashboard/superadmin/users')}
              >
                Lihat Semua
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </CardHeader>
            <CardContent>
              {recentUsers.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                  <p className="text-muted-foreground">Belum ada pengguna</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentUsers.map(userItem => (
                    <div 
                      key={userItem.id}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 cursor-pointer transition-colors"
                      onClick={() => router.push(`/dashboard/superadmin/users/${userItem.id}`)}
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-full">
                          <Users className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                          <p className="font-medium line-clamp-1">{userItem.full_name || userItem.email}</p>
                          <p className="text-xs text-muted-foreground">
                            {userItem.email}
                          </p>
                        </div>
                      </div>
                      {getRoleBadge(userItem.role)}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Projects */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Building className="w-5 h-5" />
                Proyek Terbaru
              </CardTitle>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => router.push('/dashboard/superadmin/projects')}
              >
                Lihat Semua
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </CardHeader>
            <CardContent>
              {recentProjects.length === 0 ? (
                <div className="text-center py-8">
                  <Building className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                  <p className="text-muted-foreground">Belum ada proyek</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentProjects.map(project => (
                    <div 
                      key={project.id}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 cursor-pointer transition-colors"
                      onClick={() => router.push(`/dashboard/superadmin/projects/${project.id}`)}
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded">
                          <Building className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                        </div>
                        <div>
                          <p className="font-medium line-clamp-1">{project.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {project.clients?.name || '-'} • {formatDate(project.created_at)}
                          </p>
                        </div>
                      </div>
                      <Badge variant="outline">{project.status || 'draft'}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Aksi Cepat</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-3">
              <Button 
                variant="outline" 
                className="justify-start h-auto py-4"
                onClick={() => router.push('/dashboard/superadmin/users')}
              >
                <Users className="w-5 h-5 mr-3 text-blue-600 dark:text-blue-400" />
                <div className="text-left">
                  <p className="font-medium">Kelola Pengguna</p>
                  <p className="text-xs text-muted-foreground">Tambah, edit, hapus pengguna</p>
                </div>
              </Button>

              <Button 
                variant="outline" 
                className="justify-start h-auto py-4"
                onClick={() => router.push('/dashboard/superadmin/projects')}
              >
                <Building className="w-5 h-5 mr-3 text-purple-600 dark:text-purple-400" />
                <div className="text-left">
                  <p className="font-medium">Semua Proyek</p>
                  <p className="text-xs text-muted-foreground">Lihat dan kelola proyek</p>
                </div>
              </Button>

              <Button 
                variant="outline" 
                className="justify-start h-auto py-4"
                onClick={() => router.push('/dashboard/superadmin/recovery-center')}
              >
                <Database className="w-5 h-5 mr-3 text-orange-600 dark:text-orange-400" />
                <div className="text-left">
                  <p className="font-medium">Recovery Center</p>
                  <p className="text-xs text-muted-foreground">Pulihkan data yang terhapus</p>
                </div>
              </Button>
            </div>
          </CardContent>
        </Card>

      </div>
    </DashboardLayout>
  );
}
