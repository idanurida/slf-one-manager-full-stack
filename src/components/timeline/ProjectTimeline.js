// FILE: src/components/timeline/ProjectTimeline.js
import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/utils/supabaseClient";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  FileText, 
  Building,
  User,
  Calendar,
  MapPin,
  ArrowRight
} from "lucide-react";

const ProjectTimeline = ({ 
  projectId, 
  viewMode = "client_view", 
  showActions = false 
}) => {
  const { user, profile } = useAuth();
  const currentRole = profile?.role;
  const [currentProject, setCurrentProject] = useState(null);
  const [timelineData, setTimelineData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch project details dan timeline data
  useEffect(() => {
    const fetchProjectData = async () => {
      if (!projectId) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        // Fetch project details
        const { data: projectData, error: projectError } = await supabase
          .from('projects')
          .select(`
            *,
            clients (*),
            project_teams (
              profiles (
                full_name,
                role
              )
            )
          `)
          .eq('id', projectId)
          .single();

        if (projectError) throw projectError;
        setCurrentProject(projectData);

        // Generate timeline data dari status project dan created events
        const generatedTimeline = generateTimelineFromProject(projectData);
        setTimelineData(generatedTimeline);

      } catch (err) {
        console.error('Error fetching project data:', err);
        setError('Gagal memuat data project');
        toast.error('Gagal memuat data project');
      } finally {
        setLoading(false);
      }
    };

    fetchProjectData();
  }, [projectId]);

  // Generate timeline dari data project (fallback jika tidak ada tabel timeline)
  const generateTimelineFromProject = (project) => {
    if (!project) return [];

    const timeline = [];
    const statusHistory = {
      'draft': 'Project dibuat',
      'submitted': 'Project diajukan',
      'project_lead_review': 'Dalam review Project Lead',
      'inspection_scheduled': 'Inspeksi dijadwalkan',
      'inspection_in_progress': 'Inspeksi berlangsung',
      'report_draft': 'Draft laporan dibuat',
      'head_consultant_review': 'Dalam review Head Consultant',
      'client_review': 'Menunggu review client',
      'government_submitted': 'Diajukan ke pemerintah',
      'slf_issued': 'SLF diterbitkan',
      'completed': 'Project selesai',
      'cancelled': 'Project dibatalkan'
    };

    // Add project creation
    timeline.push({
      id: 'creation',
      title: 'Project Dibuat',
      description: `Project ${project.name} berhasil dibuat`,
      status: 'completed',
      created_at: project.created_at,
      type: 'project_creation'
    });

    // Add current status
    if (project.status && project.status !== 'draft') {
      timeline.push({
        id: 'current_status',
        title: statusHistory[project.status] || `Status: ${project.status}`,
        description: getStatusDescription(project.status),
        status: getTimelineStatus(project.status),
        created_at: project.updated_at || project.created_at,
        type: 'status_update'
      });
    }

    // Add team assignment if exists
    if (project.project_teams && project.project_teams.length > 0) {
      timeline.push({
        id: 'team_assignment',
        title: 'Tim Ditugaskan',
        description: `Tim beranggotakan ${project.project_teams.length} orang telah ditugaskan`,
        status: 'completed',
        created_at: project.updated_at || project.created_at,
        type: 'team_assignment'
      });
    }

    return timeline.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  };

  const getStatusDescription = (status) => {
    const descriptions = {
      'draft': 'Project dalam tahap persiapan',
      'submitted': 'Menunggu penugasan tim',
      'project_lead_review': 'Project Lead sedang meninjau dokumen',
      'inspection_scheduled': 'Jadwal inspeksi telah ditetapkan',
      'inspection_in_progress': 'Tim sedang melakukan inspeksi lapangan',
      'report_draft': 'Laporan inspeksi sedang disusun',
      'head_consultant_review': 'Head Consultant meninjau laporan',
      'client_review': 'Menunggu persetujuan client',
      'government_submitted': 'Dokumen telah diajukan ke instansi pemerintah',
      'slf_issued': 'SLF telah diterbitkan oleh pemerintah',
      'completed': 'Project telah selesai sepenuhnya',
      'cancelled': 'Project telah dibatalkan'
    };
    return descriptions[status] || 'Update status project';
  };

  const getTimelineStatus = (projectStatus) => {
    const statusMap = {
      'draft': 'completed',
      'submitted': 'completed',
      'project_lead_review': 'in_progress',
      'inspection_scheduled': 'completed',
      'inspection_in_progress': 'in_progress',
      'report_draft': 'in_progress',
      'head_consultant_review': 'in_progress',
      'client_review': 'pending',
      'government_submitted': 'completed',
      'slf_issued': 'completed',
      'completed': 'completed',
      'cancelled': 'cancelled'
    };
    return statusMap[projectStatus] || 'pending';
  };

  // Status color mapping
  const getStatusColor = (status) => {
    const colors = {
      'pending': 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400',
      'in_progress': 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400',
      'completed': 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-400',
      'cancelled': 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/20 dark:text-red-400'
    };
    return colors[status] || 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-900/20 dark:text-gray-400';
  };

  // Status icon
  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="w-4 h-4 text-green-600" />;
      case 'in_progress':
        return <Clock className="w-4 h-4 text-blue-600" />;
      case 'cancelled':
        return <AlertCircle className="w-4 h-4 text-red-600" />;
      default:
        return <Clock className="w-4 h-4 text-yellow-600" />;
    }
  };

  // Get project status color
  const getProjectStatusColor = (status) => {
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

  if (loading) {
    return (
      <Card className="border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
        <CardContent className="p-6">
          <div className="space-y-4">
            <Skeleton className="h-6 w-1/2 bg-slate-300 dark:bg-slate-600" />
            <Skeleton className="h-4 w-full bg-slate-300 dark:bg-slate-600" />
            <Skeleton className="h-4 w-3/4 bg-slate-300 dark:bg-slate-600" />
            <div className="space-y-3 mt-6">
              {[1, 2, 3, 4].map(i => (
                <Skeleton key={i} className="h-16 w-full bg-slate-300 dark:bg-slate-600" />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
        <CardContent className="p-6">
          <div className="text-center py-8">
            <AlertCircle className="w-12 h-12 mx-auto text-red-500 mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">
              Terjadi Kesalahan
            </h3>
            <p className="text-slate-600 dark:text-slate-400 mb-4">{error}</p>
            <Button onClick={() => window.location.reload()}>
              Coba Lagi
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!currentProject) {
    return (
      <Card className="border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
        <CardContent className="p-6">
          <div className="text-center py-8">
            <FileText className="w-12 h-12 mx-auto text-slate-400 dark:text-slate-500 mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">
              Project Tidak Ditemukan
            </h3>
            <p className="text-slate-600 dark:text-slate-400">
              Data project tidak dapat dimuat
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Project Header */}
      <Card className="border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
        <CardContent className="p-6">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-3">
                <Building className="w-5 h-5 text-blue-600" />
                <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                  {currentProject.name}
                </h2>
                <Badge className={getProjectStatusColor(currentProject.status)}>
                  {currentProject.status?.replace(/_/g, ' ') || 'draft'}
                </Badge>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-slate-500" />
                  <span className="text-slate-700 dark:text-slate-300">
                    Client: {currentProject.clients?.name || 'Tidak tersedia'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-slate-500" />
                  <span className="text-slate-700 dark:text-slate-300">
                    Tipe: {currentProject.application_type || 'Tidak ditentukan'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-slate-500" />
                  <span className="text-slate-700 dark:text-slate-300">
                    Dibuat: {new Date(currentProject.created_at).toLocaleDateString('id-ID')}
                  </span>
                </div>
              </div>

              {currentProject.location && (
                <div className="flex items-center gap-2 mt-3">
                  <MapPin className="w-4 h-4 text-slate-500" />
                  <span className="text-slate-600 dark:text-slate-400 text-sm">
                    {currentProject.location}
                  </span>
                </div>
              )}
            </div>

            {showActions && (
              <div className="flex gap-2">
                <Button variant="outline" size="sm">
                  Update Status
                </Button>
                <Button size="sm">
                  Tambah Aktivitas
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Timeline */}
      <Card className="border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-6 flex items-center gap-2">
            <Clock className="w-5 h-5 text-blue-600" />
            Timeline Progress
          </h3>

          {timelineData.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="w-12 h-12 mx-auto text-slate-400 dark:text-slate-500 mb-4" />
              <h4 className="text-md font-semibold text-slate-900 dark:text-slate-100 mb-2">
                Belum Ada Aktivitas
              </h4>
              <p className="text-slate-600 dark:text-slate-400">
                Timeline aktivitas project akan muncul di sini
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {timelineData.map((item, index) => (
                <div key={item.id} className="flex gap-4">
                  {/* Timeline line */}
                  <div className="flex flex-col items-center">
                    <div className={`w-3 h-3 rounded-full border-2 ${
                      item.status === 'completed' ? 'bg-green-500 border-green-500' :
                      item.status === 'in_progress' ? 'bg-blue-500 border-blue-500' :
                      item.status === 'cancelled' ? 'bg-red-500 border-red-500' :
                      'bg-yellow-500 border-yellow-500'
                    }`} />
                    {index < timelineData.length - 1 && (
                      <div className="w-0.5 h-full bg-slate-300 dark:bg-slate-600 mt-1" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 pb-6">
                    <Card className="border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/50">
                      <CardContent className="p-4">
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-3">
                          <div className="flex items-center gap-2">
                            {getStatusIcon(item.status)}
                            <h4 className="font-semibold text-slate-900 dark:text-slate-100">
                              {item.title}
                            </h4>
                          </div>
                          <Badge 
                            variant="outline" 
                            className={getStatusColor(item.status)}
                          >
                            {item.status?.replace(/_/g, ' ') || 'pending'}
                          </Badge>
                        </div>

                        <p className="text-slate-600 dark:text-slate-400 text-sm mb-3">
                          {item.description}
                        </p>

                        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                          <span>
                            {new Date(item.created_at).toLocaleDateString('id-ID', {
                              weekday: 'long',
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                          
                          {item.type === 'status_update' && (
                            <span className="flex items-center gap-1 text-blue-600">
                              Update Status <ArrowRight className="w-3 h-3" />
                            </span>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ProjectTimeline;
