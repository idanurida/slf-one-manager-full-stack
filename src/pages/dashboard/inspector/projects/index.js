// FILE: src/pages/dashboard/inspector/projects/index.js
// Halaman Proyek Inspector - Clean tanpa statistik
import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { toast } from 'sonner';

// UI Components
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger
} from '@/components/ui/tooltip';

// Icons
import {
  Building, MapPin, Calendar, Eye, Search, X,
  AlertTriangle, Loader2, ClipboardList, RefreshCw
} from 'lucide-react';

// Layout & Utils
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { supabase } from '@/utils/supabaseClient';
import { useAuth } from '@/context/AuthContext';

// Helpers
const formatDate = (dateString) => {
  if (!dateString) return '-';
  try {
    return format(new Date(dateString), 'dd MMM yyyy', { locale: localeId });
  } catch (e) {
    return '-';
  }
};

const getStatusBadge = (status) => {
  const config = {
    active: { label: 'Aktif', variant: 'default' },
    draft: { label: 'Draft', variant: 'secondary' },
    completed: { label: 'Selesai', variant: 'default' },
    cancelled: { label: 'Dibatalkan', variant: 'destructive' },
  };
  const { label, variant } = config[status] || { label: status, variant: 'secondary' };
  return <Badge variant={variant}>{label}</Badge>;
};

export default function InspectorProjects() {
  const router = useRouter();
  const { user, profile, loading: authLoading, isInspector } = useAuth();

  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Fetch projects
  const fetchProjects = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);

    try {
      // Get projects through project_teams or inspections
      const { data: projectTeams } = await supabase
        .from('project_teams')
        .select(`
          project_id,
          project_id
        `)
        .eq('user_id', user.id)
        .eq('role', 'inspector');

      // Also get from inspections
      const { data: inspections } = await supabase
        .from('vw_inspections_fixed')
        .select(`
          project_id,
          project_id
        `)
        .eq('assigned_to', user.id);

      // Combine and deduplicate
      const projectsMap = new Map();
      
      (projectTeams || []).forEach(pt => {
        if (pt.projects) projectsMap.set(pt.projects.id, pt.projects);
      });
      
      (inspections || []).forEach(i => {
        if (i.projects) projectsMap.set(i.projects.id, i.projects);
      });

      // Enrich projects with client names
      const allProjects = Array.from(projectsMap.values());
      const clientIds = [...new Set(allProjects.map(p => p.client_id).filter(Boolean))];
      let clientsMap = {};
      if (clientIds.length > 0) {
        const { data: clientsData } = await supabase
          .from('clients')
          .select('id, name')
          .in('id', clientIds);
        (clientsData || []).forEach(c => clientsMap[c.id] = c);
      }

      const enriched = allProjects.map(p => ({
        ...p,
        clients: p.client_id ? (clientsMap[p.client_id] || null) : null
      }));

      // setproject_id; // FIXED: Commented out invalid code

    } catch (err) {
      console.error('Error loading projects:', err);
      toast.error('Gagal memuat proyek');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (!authLoading && user && isInspector) {
      fetchProjects();
    }
  }, [authLoading, user, isInspector, fetchProjects]);

  // Filter projects
  const filteredProjects = projects.filter(project => {
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      if (!project.name?.toLowerCase().includes(term) &&
          !project.clients?.name?.toLowerCase().includes(term) &&
          !project.city?.toLowerCase().includes(term)) {
        return false;
      }
    }
    if (statusFilter !== 'all' && project.status !== statusFilter) return false;
    return true;
  });

  if (authLoading || loading) {
    return (
      <DashboardLayout title="Proyek Saya">
        <div className="p-6 space-y-4">
          <Skeleton className="h-10 w-full max-w-md" />
          <Skeleton className="h-64 w-full" />
        </div>
      </DashboardLayout>
    );
  }

  if (!user || !isInspector) {
    return (
      <DashboardLayout title="Proyek Saya">
        <div className="p-6">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
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
      <TooltipProvider>
        <div className="p-4 md:p-6 space-y-6">

          {/* Filters */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Cari nama proyek, klien, atau kota..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full md:w-[180px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Status</SelectItem>
                    <SelectItem value="active">Aktif</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="completed">Selesai</SelectItem>
                  </SelectContent>
                </Select>
                {(searchTerm || statusFilter !== 'all') && (
                  <Button variant="ghost" size="icon" onClick={() => { setSearchTerm(''); setStatusFilter('all'); }}>
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Projects List */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Building className="w-5 h-5" />
                Proyek Ditugaskan ({filteredProjects.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {filteredProjects.length === 0 ? (
                <div className="text-center py-12">
                  <Building className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">
                    {projects.length === 0 ? 'Belum Ada Proyek' : 'Tidak Ditemukan'}
                  </h3>
                  <p className="text-muted-foreground">
                    {projects.length === 0 
                      ? 'Menunggu penugasan dari Project Lead'
                      : 'Tidak ada proyek yang sesuai dengan filter'
                    }
                  </p>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {filteredProjects.map((project) => (
                    <Card 
                      key={project.id} 
                      className="hover:shadow-md cursor-pointer transition-shadow"
                      onClick={() => router.push(`/dashboard/inspector/projects/${project.id}`)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="p-2 bg-primary/10 rounded">
                            <Building className="w-4 h-4 text-primary" />
                          </div>
                          {getStatusBadge(project.status)}
                        </div>
                        
                        <h3 className="font-semibold line-clamp-1 mb-1">{project.name}</h3>
                        <p className="text-sm text-muted-foreground mb-3">
                          {project.clients?.name || '-'}
                        </p>
                        
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {project.city || '-'}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {formatDate(project.created_at)}
                          </span>
                        </div>

                        <div className="flex gap-2 mt-4">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="flex-1"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  router.push(`/dashboard/inspector/checklist?project=${project.id}`);
                                }}
                              >
                                <ClipboardList className="w-3 h-3 mr-1" />
                                Checklist
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Isi checklist inspeksi</TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  router.push(`/dashboard/inspector/projects/${project.id}`);
                                }}
                              >
                                <Eye className="w-3 h-3" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Lihat detail</TooltipContent>
                          </Tooltip>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

        </div>
      </TooltipProvider>
    </DashboardLayout>
  );
}

