import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import {
  Building,
  MapPin,
  Calendar,
  Users,
  Eye,
  ArrowRight,
  Search,
  Filter,
  Clock,
  CheckCircle,
  AlertTriangle,
  Loader2,
  FileText,
  BarChart3
} from 'lucide-react';

import DashboardLayout from '@/components/layouts/DashboardLayout';
import { supabase } from '@/utils/supabaseClient';
import { useAuth } from '@/context/AuthContext';

export default function InspectorProjects() {
  const router = useRouter();
  const { toast } = useToast();
  const { user, profile, loading: authLoading, isInspector } = useAuth();

  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all');

  useEffect(() => {
    const loadProjects = async () => {
      if (!user?.id || !isInspector) return;

      try {
        setLoading(true);

        // Ambil projects yang terkait dengan inspector melalui inspections
        const { data: projectsData, error } = await supabase
          .from('projects')
          .select(`
            *,
            clients (
              name,
              email,
              phone
            ),
            inspections!fk_inspections_projects (
              id,
              inspector_id,
              status,
              scheduled_date
            )
          `)
          .eq('inspections.inspector_id', user.id)
          .order('created_at', { ascending: false });

        if (error) throw error;

        setProjects(projectsData || []);
      } catch (err) {
        console.error('Error loading projects:', err);
        toast({
          title: "Gagal memuat proyek",
          description: err.message,
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    if (user && isInspector) {
      loadProjects();
    }
  }, [user, isInspector, toast]);

  // Filter projects berdasarkan status dan search
  const filteredProjects = projects.filter(project => {
    const matchesSearch = 
      project.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      project.client_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      project.location?.toLowerCase().includes(searchQuery.toLowerCase());

    // Untuk inspector, kita filter berdasarkan status inspections
    const projectInspections = project.inspections || [];
    const hasActiveInspections = projectInspections.some(inspection => 
      inspection.status === 'scheduled' || inspection.status === 'in_progress'
    );
    const hasCompletedInspections = projectInspections.some(inspection => 
      inspection.status === 'completed'
    );

    if (activeTab === 'active') {
      return matchesSearch && hasActiveInspections;
    } else if (activeTab === 'completed') {
      return matchesSearch && hasCompletedInspections && !hasActiveInspections;
    }

    return matchesSearch;
  });

  const getProjectStatus = (project) => {
    const inspections = project.inspections || [];
    const activeInspections = inspections.filter(i => 
      i.status === 'scheduled' || i.status === 'in_progress'
    );
    const completedInspections = inspections.filter(i => i.status === 'completed');

    if (activeInspections.length > 0) {
      return { status: 'active', label: 'Aktif', color: 'bg-green-100 text-green-800' };
    } else if (completedInspections.length > 0) {
      return { status: 'completed', label: 'Selesai', color: 'bg-blue-100 text-blue-800' };
    } else {
      return { status: 'inactive', label: 'Tidak Aktif', color: 'bg-gray-100 text-gray-800' };
    }
  };

  const getNextInspection = (project) => {
    const inspections = project.inspections || [];
    const upcomingInspections = inspections
      .filter(i => i.status === 'scheduled')
      .sort((a, b) => new Date(a.scheduled_date) - new Date(b.scheduled_date));
    
    return upcomingInspections[0];
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const getStats = () => {
    const total = projects.length;
    const active = projects.filter(project => {
      const status = getProjectStatus(project);
      return status.status === 'active';
    }).length;
    const completed = projects.filter(project => {
      const status = getProjectStatus(project);
      return status.status === 'completed';
    }).length;

    return { total, active, completed };
  };

  const stats = getStats();

  if (authLoading) {
    return (
      <DashboardLayout title="Proyek Saya">
        <div className="flex flex-col items-center justify-center min-h-[400px] p-8">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="mt-4 text-muted-foreground">Memuat dashboard...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (!user || !isInspector) {
    return (
      <DashboardLayout title="Proyek Saya">
        <div className="p-4 md:p-6">
          <Alert variant="destructive">
            <AlertTitle>Akses Ditolak</AlertTitle>
            <AlertDescription>
              Hanya inspector yang dapat mengakses halaman ini.
            </AlertDescription>
          </Alert>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Proyek Saya">
      <div className="p-4 md:p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="space-y-1">
            
            <p className="text-muted-foreground">
              Kelola semua proyek yang ditugaskan kepada Anda • {profile?.full_name || 'Inspector'}
            </p>
          </div>
          <Button
            onClick={() => router.push('/dashboard/inspector/schedules')}
            variant="outline"
            className="flex items-center gap-2"
          >
            <Calendar className="h-4 w-4" />
            Lihat Jadwal
          </Button>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-800">Total Proyek</p>
                  <p className="text-3xl font-bold text-blue-900">{stats.total}</p>
                </div>
                <div className="p-3 bg-blue-200 rounded-full">
                  <Building className="h-6 w-6 text-blue-700" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-green-800">Proyek Aktif</p>
                  <p className="text-3xl font-bold text-green-900">{stats.active}</p>
                </div>
                <div className="p-3 bg-green-200 rounded-full">
                  <Clock className="h-6 w-6 text-green-700" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-purple-800">Selesai</p>
                  <p className="text-3xl font-bold text-purple-900">{stats.completed}</p>
                </div>
                <div className="p-3 bg-purple-200 rounded-full">
                  <CheckCircle className="h-6 w-6 text-purple-700" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters & Tabs */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col space-y-4">
              {/* Search */}
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <Label htmlFor="search" className="sr-only">Search</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                    <Input
                      id="search"
                      placeholder="Cari nama proyek, klien, atau lokasi..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
              </div>

              {/* Tabs */}
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="all">
                    Semua Proyek
                    <Badge variant="secondary" className="ml-2">
                      {projects.length}
                    </Badge>
                  </TabsTrigger>
                  <TabsTrigger value="active">
                    Aktif
                    <Badge variant="secondary" className="ml-2">
                      {stats.active}
                    </Badge>
                  </TabsTrigger>
                  <TabsTrigger value="completed">
                    Selesai
                    <Badge variant="secondary" className="ml-2">
                      {stats.completed}
                    </Badge>
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </CardContent>
        </Card>

        {/* Projects List */}
        {loading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <div className="flex items-center space-x-4">
                    <Skeleton className="h-12 w-12 rounded-full" />
                    <div className="space-y-2 flex-1">
                      <Skeleton className="h-4 w-[250px]" />
                      <Skeleton className="h-4 w-[200px]" />
                    </div>
                    <Skeleton className="h-8 w-20" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredProjects.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center">
              <Building className="mx-auto h-12 w-12 text-muted-foreground mb-3" />
              <h3 className="text-lg font-semibold text-foreground">
                {projects.length === 0 ? "Belum ada proyek" : "Tidak ada proyek yang sesuai"}
              </h3>
              <p className="text-muted-foreground mt-1 mb-4">
                {projects.length === 0 
                  ? "Anda belum ditugaskan ke proyek manapun. Hubungi project lead untuk penugasan."
                  : "Coba ubah filter pencarian Anda."
                }
              </p>
              {projects.length === 0 && (
                <Button
                  onClick={() => router.push('/dashboard/inspector/schedules')}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <Calendar className="h-4 w-4" />
                  Lihat Jadwal Inspeksi
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6">
            {filteredProjects.map((project) => {
              const status = getProjectStatus(project);
              const nextInspection = getNextInspection(project);
              const projectInspections = project.inspections || [];
              const completedInspections = projectInspections.filter(i => i.status === 'completed').length;
              const totalInspections = projectInspections.length;

              return (
                <Card key={project.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                      <div className="flex-1 space-y-3">
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold text-lg text-foreground">
                                {project.name}
                              </h3>
                              <Badge variant="outline" className={status.color}>
                                {status.label}
                              </Badge>
                            </div>
                            <p className="text-muted-foreground">
                              Klien: {project.client_name || project.clients?.name || 'Tidak tersedia'}
                            </p>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <MapPin className="h-4 w-4" />
                            <span>{project.location || 'Lokasi tidak tersedia'}</span>
                          </div>
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <FileText className="h-4 w-4" />
                            <span>{completedInspections}/{totalInspections} Inspeksi Selesai</span>
                          </div>
                          {nextInspection && (
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Calendar className="h-4 w-4" />
                              <span>Jadwal: {formatDate(nextInspection.scheduled_date)}</span>
                            </div>
                          )}
                        </div>

                        {project.description && (
                          <div className="bg-muted/50 p-3 rounded-md">
                            <p className="text-sm text-muted-foreground">
                              {project.description}
                            </p>
                          </div>
                        )}
                      </div>

                      <div className="flex flex-col sm:flex-row lg:flex-col gap-2">
                        <Button
                          onClick={() => router.push(`/dashboard/inspector/inspections?projectId=${project.id}`)}
                          variant="outline"
                          size="sm"
                          className="flex items-center gap-2"
                        >
                          <Eye className="h-4 w-4" />
                          Lihat Inspeksi
                        </Button>
                        <Button
                          onClick={() => router.push(`/dashboard/inspector/checklist?projectId=${project.id}`)}
                          size="sm"
                          className="flex items-center gap-2"
                        >
                          Mulai Checklist
                          <ArrowRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Quick Stats */}
        {!loading && projects.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Ringkasan Proyek
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
                  <div className="text-sm text-blue-800">Total Proyek</div>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">{stats.active}</div>
                  <div className="text-sm text-green-800">Aktif</div>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">{stats.completed}</div>
                  <div className="text-sm text-purple-800">Selesai</div>
                </div>
                <div className="text-center p-4 bg-orange-50 rounded-lg">
                  <div className="text-2xl font-bold text-orange-600">
                    {projects.reduce((total, project) => total + (project.inspections?.length || 0), 0)}
                  </div>
                  <div className="text-sm text-orange-800">Total Inspeksi</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Help Section */}
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Butuh Bantuan?</AlertTitle>
          <AlertDescription>
            Jika Anda tidak melihat proyek yang seharusnya tersedia, hubungi project lead atau admin team.
          </AlertDescription>
        </Alert>
      </div>
    </DashboardLayout>
  );
}