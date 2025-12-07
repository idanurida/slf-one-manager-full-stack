// FILE: src/components/clients/DashboardClient.jsx
import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { toast } from 'sonner';

// Components
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';

// Icons
import { Building, FileText, Upload, Eye, Clock, AlertCircle, CheckCircle, FolderOpen } from 'lucide-react';

// Services
import { supabase } from '@/utils/supabaseClient';
import { useAuth } from '@/context/AuthContext';

const DashboardClient = () => {
  const router = useRouter();
  const { user, profile } = useAuth();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('semua');

  const fetchClientProjects = useCallback(async () => {
    if (!profile?.client_id) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('projects')
        .select(`
          id,
          name,
          project_type,
          status,
          created_at,
          building_category
        `)
        .eq('client_id', profile.client_id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch document counts for each project
      const projectIds = data?.map(p => p.id) || [];
      
      if (projectIds.length > 0) {
        const { data: docCounts, error: docError } = await supabase
          .from('project_documents')
          .select('project_id, status, template_id')
          .in('project_id', projectIds);

        if (!docError && docCounts) {
          // Calculate document progress for each project
          const projectsWithProgress = data.map(project => {
            const projectDocs = docCounts.filter(d => d.project_id === project.id);
            const totalDocs = projectDocs.length;
            const verifiedDocs = projectDocs.filter(d => d.status === 'verified').length;
            const uploadedDocs = projectDocs.filter(d => ['uploaded', 'verified'].includes(d.status)).length;
            
            return {
              ...project,
              jenis_proyek: project.project_type,
              nama_proyek: project.name,
              tanggal_dibuat: new Date(project.created_at).toLocaleDateString('id-ID'),
              progress_dokumen: totalDocs > 0 ? Math.round((uploadedDocs / Math.max(totalDocs, 10)) * 100) : 0,
              status_dokumen: project.status,
              status_verifikasi: verifiedDocs === totalDocs && totalDocs > 0 ? 'completed' : 'in_progress',
              dokumen_wajib_terupload: uploadedDocs,
              total_dokumen_wajib: Math.max(totalDocs, 10),
              dokumen_diverifikasi: verifiedDocs
            };
          });
          
          setProjects(projectsWithProgress);
        } else {
          setProjects(data?.map(project => ({
            ...project,
            jenis_proyek: project.project_type,
            nama_proyek: project.name,
            tanggal_dibuat: new Date(project.created_at).toLocaleDateString('id-ID'),
            progress_dokumen: 0,
            status_dokumen: project.status,
            status_verifikasi: 'pending',
            dokumen_wajib_terupload: 0,
            total_dokumen_wajib: 10,
            dokumen_diverifikasi: 0
          })) || []);
        }
      } else {
        setProjects([]);
      }
    } catch (error) {
      console.error('Error fetching projects:', error);
      toast.error('Gagal memuat data proyek');
    } finally {
      setLoading(false);
    }
  }, [profile?.client_id]);

  useEffect(() => {
    fetchClientProjects();
  }, [fetchClientProjects]);

  const filteredProjects = projects.filter(project => {
    if (activeTab === 'semua') return true;
    if (activeTab === 'slf') return project.jenis_proyek === 'SLF';
    if (activeTab === 'pbg') return project.jenis_proyek === 'PBG';
    if (activeTab === 'butuh_perhatian') return project.progress_dokumen < 100;
    return true;
  });

  // Loading state
  if (loading) {
    return (
      <div className="container mx-auto p-4">
        <Skeleton className="h-8 w-64 mb-6" />
        <div className="flex gap-2 mb-6">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-10 w-32" />
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-64 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6 text-foreground">Dashboard Proyek Saya</h1>

      {/* Tab Navigation */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
        <TabsList className="grid grid-cols-4 w-full max-w-xl">
          <TabsTrigger value="semua">
            <FolderOpen className="w-4 h-4 mr-2" />
            Semua
          </TabsTrigger>
          <TabsTrigger value="slf">
            <Building className="w-4 h-4 mr-2" />
            SLF
          </TabsTrigger>
          <TabsTrigger value="pbg">
            <FileText className="w-4 h-4 mr-2" />
            PBG
          </TabsTrigger>
          <TabsTrigger value="butuh_perhatian" className="text-destructive data-[state=active]:text-destructive">
            <AlertCircle className="w-4 h-4 mr-2" />
            Perhatian
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Project Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredProjects.map(project => (
          <Card key={project.id} className="overflow-hidden border border-border">
            {/* Project Header */}
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-lg">{project.nama_proyek}</CardTitle>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant={project.jenis_proyek === 'SLF' ? 'default' : 'secondary'}>
                      {project.jenis_proyek}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {project.tanggal_dibuat}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-primary">{project.progress_dokumen}%</div>
                  <div className="text-xs text-muted-foreground">Progress</div>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Progress Bar */}
              <Progress value={project.progress_dokumen} className="h-2" />

              {/* Project Details */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-muted-foreground">Status Dokumen</div>
                  <div className="font-medium text-foreground">{getStatusText(project.status_dokumen)}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Verifikasi</div>
                  <div className="font-medium text-foreground">{getVerifikasiText(project.status_verifikasi)}</div>
                </div>
              </div>

              {/* Dokumen Status */}
              <div className="space-y-2">
                <div className="text-sm text-muted-foreground">Kelengkapan Dokumen</div>
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Dokumen Wajib</span>
                    <span className="font-medium">{project.dokumen_wajib_terupload}/{project.total_dokumen_wajib}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Diverifikasi</span>
                    <span className="font-medium">{project.dokumen_diverifikasi}/{project.dokumen_wajib_terupload}</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-2">
                <Button
                  onClick={() => router.push(`/dashboard/client/projects/${project.id}/upload`)}
                  className="flex-1"
                >
                  {project.progress_dokumen < 100 ? (
                    <>
                      <Upload className="w-4 h-4 mr-2" />
                      Lanjutkan Upload
                    </>
                  ) : (
                    <>
                      <Eye className="w-4 h-4 mr-2" />
                      Lihat Dokumen
                    </>
                  )}
                </Button>
                <Button 
                  variant="outline" 
                  size="icon"
                  onClick={() => router.push(`/dashboard/client/projects/${project.id}`)}
                >
                  <Eye className="w-4 h-4" />
                </Button>
              </div>

              {/* Timeline Status */}
              <div className="pt-3 border-t border-border">
                <div className="flex items-center text-sm text-muted-foreground">
                  <div className={`w-3 h-3 rounded-full mr-2 ${getTimelineDotColor(project.status_dokumen)}`}></div>
                  <span>{getTimelineStatus(project.status_dokumen)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Empty State */}
      {filteredProjects.length === 0 && (
        <Card className="p-12">
          <div className="text-center">
            <FolderOpen className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-bold mb-2 text-foreground">Belum Ada Proyek</h3>
            <p className="text-muted-foreground mb-4">
              {activeTab === 'semua' 
                ? 'Mulai dengan membuat proyek baru' 
                : `Tidak ada proyek ${activeTab === 'slf' ? 'SLF' : activeTab === 'pbg' ? 'PBG' : 'yang butuh perhatian'}`
              }
            </p>
            <Button onClick={() => router.push('/dashboard/client/projects/new')}>
              <Building className="w-4 h-4 mr-2" />
              Buat Proyek Baru
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
};

// Helper functions

const getStatusText = (status) => {
  const statusMap = {
    'draft': 'Draft',
    'uploading': 'Sedang Upload',
    'verifying': 'Sedang Diverifikasi',
    'approved': 'Disetujui',
    'rejected': 'Perlu Revisi'
  };
  return statusMap[status] || status;
};

const getVerifikasiText = (status) => {
  const verifikasiMap = {
    'pending': 'Menunggu Admin Team',
    'in_progress': 'Sedang Diverifikasi',
    'completed': 'Selesai',
    'needs_revision': 'Perlu Revisi'
  };
  return verifikasiMap[status] || status;
};

const getTimelineDotColor = (status) => {
  const colorMap = {
    'draft': 'bg-gray-400',
    'uploading': 'bg-yellow-400',
    'verifying': 'bg-blue-400',
    'approved': 'bg-green-400',
    'rejected': 'bg-red-400'
  };
  return colorMap[status] || 'bg-gray-400';
};

const getTimelineStatus = (status) => {
  const timelineMap = {
    'draft': 'Dokumen belum mulai diupload',
    'uploading': 'Sedang mengupload dokumen',
    'verifying': 'Dokumen sedang diverifikasi admin',
    'approved': 'Semua dokumen telah disetujui',
    'rejected': 'Ada dokumen yang perlu direvisi'
  };
  return timelineMap[status] || status;
};

export default DashboardClient;