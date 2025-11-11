// FILE: src/pages/dashboard/projects/index.js
"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useToast } from '@/components/ui/use-toast';

// shadcn/ui Components
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

// Lucide Icons
import { Eye, Edit3, Plus, Search, AlertTriangle, Loader2 } from 'lucide-react';

// Other Imports
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { fetchProjects } from '@/utils/projectAPI'; 
import { getUserAndProfile } from '@/utils/auth';
import { supabase } from '@/utils/supabaseClient';

const statusColors = {
  draft: 'secondary',
  quotation_sent: 'default',
  quotation_accepted: 'outline',
  contract_signed: 'default',
  spk_issued: 'default',
  spk_accepted: 'default',
  inspection_scheduled: 'default',
  inspection_in_progress: 'default',
  inspection_done: 'default',
  report_draft: 'secondary',
  report_reviewed: 'default',
  report_sent_to_client: 'default',
  waiting_gov_response: 'default',
  slf_issued: 'default',
  completed: 'default',
  cancelled: 'destructive',
};

const statusOptions = [
    { value: 'all', label: 'All Status' },
    { value: 'draft', label: 'Draft' },
    { value: 'inspection_scheduled', label: 'Inspection Scheduled' },
    { value: 'inspection_in_progress', label: 'Inspection In Progress' },
    { value: 'report_draft', label: 'Report Draft' },
    { value: 'slf_issued', label: 'SLF Issued' },
    { value: 'completed', label: 'Completed' },
    { value: 'cancelled', label: 'Cancelled' },
];

const ProjectsPage = () => {
  const router = useRouter();
  const { toast } = useToast();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Ambil user & role dari Supabase
  const { 
    userData, 
    isLoading: userLoading, 
  } = useQuery({
    queryKey: ['userProfile'],
    queryFn: getUserAndProfile,
    staleTime: 5 * 60 * 1000,
  });

  const user = userData?.user;
  const profile = userData?.profile;
  const userId = user?.id;
  const userRole = profile?.role?.toLowerCase();

  // Fetch projects dari Supabase
  const {
    data: projects = [],
    isLoading: projectsLoading, 
    error,
    refetch,
  } = useQuery({
    queryKey: ['projects', userRole, userId],
    queryFn: async () => {
      if (!userRole || !userId) {
        return [];
      }

      try {
        const data = await fetchProjects(userRole, userId); 
        if (!data) return []; 
        
        return data;
      } catch (err) {
        console.error('[ERROR] Fetch Supabase failed:', err);
        return []; 
      }
    },
    enabled: !!userRole && !!userId,
  });

  // --- PERBAIKAN: Pindahkan Logic Redirect ke useEffect di Top Level ---
  useEffect(() => {
    // Jika loading user selesai DAN userRole tidak ada, lakukan redirect.
    if (!userLoading && !userRole) {
      console.log("Session invalid or expired, redirecting to login.");
      router.push('/login');
    }
  }, [userLoading, userRole, router]); 
  // --- AKHIR PERBAIKAN ---

  // Realtime listener Supabase
  useEffect(() => {
    if (!userRole) return; 

    const channel = supabase
      .channel(`projects_update_for_${userRole}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'projects' }, (payload) => {
        toast({
          title: 'Project Updated',
          description: `Project "${payload.new?.name}" changed to ${payload.new?.status}. Refreshing data...`,
          duration: 3000,
        });
        refetch(); 
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userRole, toast, refetch]);

  // Filter projects (search + status)
  const filteredProjects = useMemo(() => {
    return projects.filter((project) => {
      const nameMatch = project.name?.toLowerCase().includes(searchTerm.toLowerCase());
      const statusMatch = statusFilter === 'all' || project.status === statusFilter;
      return nameMatch && statusMatch;
    });
  }, [projects, searchTerm, statusFilter]);

  const handleViewProject = (id) => router.push(`/dashboard/projects/${id}`);
  const handleEditProject = (id) => router.push(`/dashboard/projects/${id}/edit`);
  const handleCreateNewProject = () => {
    if (userRole === 'project_lead') {
      router.push('/dashboard/project-lead/projects/new'); 
    } else {
      toast({
        title: 'Akses Ditolak',
        description: 'Anda tidak memiliki izin untuk membuat proyek baru.',
        variant: 'destructive',
      });
    }
  };


  // 1. Tampilkan loading untuk User Profile (Autentikasi)
  if (userLoading) {
    return (
      <DashboardLayout title="Projects Management">
        <div className="p-4 md:p-6 space-y-6">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto my-16" />
          <p className="text-center text-muted-foreground">Memuat sesi pengguna...</p>
        </div>
      </DashboardLayout>
    );
  }
  
  // 2. Tampilkan pesan redirect jika sesi tidak valid (jika useEffect di atas belum memicu push)
  if (!userLoading && !userRole) {
    // Komponen ini akan ditampilkan sebentar sebelum useEffect memicu navigasi.
    return (
        <DashboardLayout title="Redirecting...">
            <div className="flex justify-center items-center h-[50vh] p-6">
                <Loader2 className="w-8 h-8 animate-spin text-red-500" />
                <p className="ml-3 text-red-500">Sesi berakhir atau tidak ditemukan. Mengarahkan ke login...</p>
            </div>
        </DashboardLayout>
    );
  }
  
  // 3. Tampilkan loading Projects jika Projects sedang dimuat (Hanya akan berjalan jika userRole ada)
  if (projectsLoading) {
    return (
      <DashboardLayout title="Projects Management">
        <div className="p-4 md:p-6 space-y-6">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto my-16" />
          <p className="text-center text-muted-foreground">Memuat daftar proyek...</p>
        </div>
      </DashboardLayout>
    );
  }
  
  if (error) {
    console.error('[ProjectsPage] Error:', error);
    return (
      <DashboardLayout title="Projects Management">
        <div className="p-4 md:p-6">
          <Alert variant="destructive" className="m-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Error Loading Projects</AlertTitle>
            <AlertDescription>{error.message || "Failed to fetch projects data."}</AlertDescription>
          </Alert>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Projects Management">
      <div className="p-4 md:p-6 space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h1 className="text-xl md:text-2xl font-semibold text-foreground">
            Projects Management ({userRole?.toUpperCase() || 'USER'})
          </h1>
          {userRole === 'project_lead' && (
            <Button className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700" onClick={handleCreateNewProject}>
              <Plus className="w-4 h-4" />
              Create New Project
            </Button>
          )}
        </div>

        {/* Filter bar */}
        <Card className="border-border">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search projects..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full md:w-[200px] bg-background">
                  <SelectValue placeholder="Filter Status" />
                </SelectTrigger>
                <SelectContent className="bg-background"> 
                  {statusOptions.map(option => (
                      <SelectItem key={option.value} value={option.value}>
                          {option.label}
                      </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Projects Table */}
        <Card className="border-border">
          <CardContent className="p-6">
            {filteredProjects.length > 0 ? (
              <div className="w-full overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-foreground">Project Name</TableHead>
                      <TableHead className="text-foreground">Status</TableHead>
                      <TableHead className="text-foreground">Client</TableHead>
                      <TableHead className="text-foreground">Start Date</TableHead>
                      <TableHead className="text-foreground">End Date</TableHead>
                      <TableHead className="text-foreground">Progress</TableHead>
                      <TableHead className="text-center text-foreground">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredProjects.map((project) => (
                      <TableRow key={project.id} className="hover:bg-accent/50">
                        <TableCell className="font-medium">
                          <p className="font-semibold">{project.name}</p>
                        </TableCell>
                        <TableCell>
                          <Badge variant={statusColors[project.status] || 'outline'}>
                            {project.status.replace(/_/g, ' ')}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-foreground">
                          {project.client?.name || project.client_id || '-'} 
                        </TableCell>
                        <TableCell className="text-foreground">
                          {new Date(project.start_date || project.created_at).toLocaleDateString('id-ID')}
                        </TableCell>
                        <TableCell className="text-foreground">
                          {project.end_date ? new Date(project.end_date).toLocaleDateString('id-ID') : '-'}
                        </TableCell>
                        <TableCell className="text-foreground">
                          {project.progress ? `${project.progress}%` : '0%'}
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex justify-center gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="p-1 h-auto text-blue-600 hover:text-white hover:bg-blue-600"
                              onClick={() => handleViewProject(project.id)}
                            >
                              <Eye className="w-4 h-4" />
                              <span className="sr-only">View Project</span>
                            </Button>
                            {(userRole === 'project_lead' || userRole === 'admin_lead') && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="p-1 h-auto text-yellow-600 hover:text-white hover:bg-yellow-600"
                                onClick={() => handleEditProject(project.id)}
                              >
                                <Edit3 className="w-4 h-4" />
                                <span className="sr-only">Edit Project</span>
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <Alert variant="default" className="m-4">
                <AlertTriangle className="h-4 w-4" />
                <div className="ml-4">
                  <AlertTitle>No Projects Found</AlertTitle>
                  <AlertDescription>
                    {searchTerm || statusFilter !== 'all'
                      ? 'No projects match your filters.'
                      : 'No projects available for your role yet.'}
                  </AlertDescription>
                </div>
              </Alert>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default ProjectsPage;