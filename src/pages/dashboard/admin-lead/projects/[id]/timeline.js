import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/router";
import { format, parseISO, addDays } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { toast } from "sonner";

// Components
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Icons
import {
  ArrowLeft, Calendar, Clock, CheckCircle2, AlertTriangle,
  PlayCircle, PauseCircle, Edit, Users, Bell, Download,
  BarChart3, Eye, RefreshCw, ArrowRight, Settings,
  FileText, Building, User, MapPin, Send
} from "lucide-react";

// Utils & Context
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { supabase } from "@/utils/supabaseClient";
import { useAuth } from "@/context/AuthContext";

// Fallback untuk PROJECT_PHASES
const PROJECT_PHASES = {
  PHASE_1: {
    id: 'preparation',
    name: 'Persiapan',
    number: 1,
    description: 'Persiapan dokumen dan administrasi proyek SLF',
    color: 'blue',
    activities: [
      {
        id: '1.1',
        name: 'Input permohonan SLF',
        role: 'client',
        duration: 1,
        status: 'pending',
        dependencies: [],
        description: 'Client mengisi form permohonan SLF'
      }
    ]
  },
  PHASE_2: {
    id: 'inspection',
    name: 'Inspeksi Lapangan',
    number: 2,
    description: 'Pelaksanaan inspeksi fisik dan teknis bangunan',
    color: 'green',
    activities: [
      {
        id: '2.1',
        name: 'Jadwal inspeksi',
        role: 'project_lead',
        duration: 1,
        status: 'pending',
        dependencies: ['1.4'],
        description: 'Menjadwalkan waktu inspeksi lapangan'
      }
    ]
  },
  PHASE_3: {
    id: 'reporting',
    name: 'Pembuatan Laporan',
    number: 3,
    description: 'Penyusunan dan review laporan teknis',
    color: 'yellow',
    activities: [
      {
        id: '3.1',
        name: 'Pembuatan draft laporan',
        role: 'drafter',
        duration: '2-3',
        status: 'pending',
        dependencies: ['2.5'],
        description: 'Menyusun draft laporan hasil inspeksi'
      }
    ]
  },
  PHASE_4: {
    id: 'client_approval',
    name: 'Approval Klien',
    number: 4,
    description: 'Proses persetujuan dan pembayaran dari klien',
    color: 'purple',
    activities: [
      {
        id: '4.1',
        name: 'Review laporan oleh klien',
        role: 'client',
        duration: '3-7',
        status: 'pending',
        dependencies: ['3.4'],
        description: 'Client mereview laporan yang diterima'
      }
    ]
  },
  PHASE_5: {
    id: 'government_submission',
    name: 'Pengiriman ke Pemerintah',
    number: 5,
    description: 'Proses pengajuan dan penerbitan SLF',
    color: 'indigo',
    activities: [
      {
        id: '5.1',
        name: 'Kirim ke instansi pemerintah',
        role: 'project_lead',
        duration: 1,
        status: 'pending',
        dependencies: ['4.3'],
        description: 'Mengajukan permohonan SLF ke instansi terkait'
      }
    ]
  }
};

// Fitur khusus Admin Lead
const adminLeadFeatures = [
  "👀 View complete timeline",
  "⚡ Approve phase transitions", 
  "📅 Adjust schedules & durations",
  "👥 Re-assign resources",
  "🔔 Send notifications to teams",
  "📊 Monitor progress across phases",
  "⚠️ Resolve bottlenecks"
];

// Phase Timeline Component
const PhaseTimeline = ({ phases = [], project, onPhaseAction, loading }) => {
  const [selectedPhase, setSelectedPhase] = useState(null);

  const safePhases = Array.isArray(phases) ? phases : [];

  const getPhaseStatus = (phase) => {
    if (!phase) return 'pending';
    if (phase.status === 'completed') return 'completed';
    if (phase.status === 'in_progress') return 'active';
    if (phase.status === 'approved') return 'approved';
    return 'pending';
  };

  const getPhaseIcon = (phase) => {
    switch (getPhaseStatus(phase)) {
      case 'completed': return <CheckCircle2 className="w-5 h-5 text-green-500" />;
      case 'active': return <PlayCircle className="w-5 h-5 text-blue-500" />;
      case 'approved': return <CheckCircle2 className="w-5 h-5 text-purple-500" />;
      default: return <Clock className="w-5 h-5 text-slate-400" />;
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        {[1, 2, 3, 4, 5].map(i => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    );
  }

  if (safePhases.length === 0) {
    return (
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Tidak ada fase timeline</AlertTitle>
        <AlertDescription>
          Belum ada fase timeline yang tersedia untuk project ini.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      {safePhases.map((phase, index) => (
        <div key={phase?.id || index}>
          <Card className={`border-l-4 ${
            getPhaseStatus(phase) === 'completed' ? 'border-l-green-500' :
            getPhaseStatus(phase) === 'active' ? 'border-l-blue-500' :
            getPhaseStatus(phase) === 'approved' ? 'border-l-purple-500' :
            'border-l-slate-300'
          }`}>
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4 flex-1">
                  <div className="flex flex-col items-center">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      getPhaseStatus(phase) === 'completed' ? 'bg-green-100' :
                      getPhaseStatus(phase) === 'active' ? 'bg-blue-100' :
                      getPhaseStatus(phase) === 'approved' ? 'bg-purple-100' :
                      'bg-slate-100'
                    }`}>
                      {getPhaseIcon(phase)}
                    </div>
                    {index < safePhases.length - 1 && (
                      <div className={`w-0.5 h-8 mt-2 ${
                        getPhaseStatus(phase) === 'completed' ? 'bg-green-300' : 'bg-slate-200'
                      }`} />
                    )}
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-lg">Fase {phase?.phase || index + 1}: {phase?.phase_name || `Fase ${index + 1}`}</h3>
                      <Badge variant={
                        getPhaseStatus(phase) === 'completed' ? 'success' :
                        getPhaseStatus(phase) === 'active' ? 'default' :
                        getPhaseStatus(phase) === 'approved' ? 'secondary' :
                        'outline'
                      }>
                        {phase?.status === 'completed' ? 'Selesai' :
                         phase?.status === 'in_progress' ? 'Berjalan' :
                         phase?.status === 'approved' ? 'Disetujui' :
                         'Menunggu'}
                      </Badge>
                    </div>

                    <p className="text-slate-600 dark:text-slate-400 mb-3">
                      {phase?.description || `Fase ${phase?.phase || index + 1} dalam proses pengerjaan`}
                    </p>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-slate-500">Durasi:</span>
                        <p className="font-medium">{phase?.estimated_duration || 7} hari</p>
                      </div>
                      <div>
                        <span className="text-slate-500">Mulai:</span>
                        <p className="font-medium">
                          {phase?.start_date ? format(parseISO(phase.start_date), 'dd MMM yyyy', { locale: localeId }) : '-'}
                        </p>
                      </div>
                      <div>
                        <span className="text-slate-500">Selesai:</span>
                        <p className="font-medium">
                          {phase?.end_date ? format(parseISO(phase.end_date), 'dd MMM yyyy', { locale: localeId }) : '-'}
                        </p>
                      </div>
                      <div>
                        <span className="text-slate-500">Progress:</span>
                        <div className="flex items-center gap-2">
                          <Progress value={phase?.progress || 0} className="h-2 flex-1" />
                          <span className="font-medium w-10">{phase?.progress || 0}%</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-2 ml-4">
                  {getPhaseStatus(phase) === 'active' && (
                    <>
                      <Button
                        size="sm"
                        onClick={() => onPhaseAction('approve', phase)}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <CheckCircle2 className="w-4 h-4 mr-1" />
                        Setujui
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSelectedPhase(phase)}
                      >
                        <Edit className="w-4 h-4 mr-1" />
                        Edit
                      </Button>
                    </>
                  )}
                  {getPhaseStatus(phase) === 'pending' && (
                    <Button
                      size="sm"
                      onClick={() => onPhaseAction('start', phase)}
                    >
                      <PlayCircle className="w-4 h-4 mr-1" />
                      Mulai
                    </Button>
                  )}
                  {getPhaseStatus(phase) === 'completed' && (
                    <Badge variant="outline" className="bg-green-50 text-green-700">
                      Selesai
                    </Badge>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      ))}

      {/* Edit Phase Dialog */}
      <Dialog open={!!selectedPhase} onOpenChange={() => setSelectedPhase(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Fase {selectedPhase?.phase}</DialogTitle>
            <DialogDescription>
              Ubah jadwal dan durasi fase {selectedPhase?.phase_name}
            </DialogDescription>
          </DialogHeader>
          
          {selectedPhase && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Durasi (hari)</Label>
                  <Input
                    type="number"
                    defaultValue={selectedPhase.estimated_duration || 7}
                    min={1}
                    max={30}
                  />
                </div>
                <div>
                  <Label>Tanggal Mulai</Label>
                  <Input
                    type="date"
                    defaultValue={selectedPhase.start_date?.split('T')[0]}
                  />
                </div>
              </div>
              
              <div>
                <Label>Catatan</Label>
                <Textarea
                  placeholder="Tambahkan catatan untuk fase ini..."
                  defaultValue={selectedPhase.notes || ''}
                />
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedPhase(null)}>
              Batal
            </Button>
            <Button onClick={() => {
              toast.success('Perubahan fase disimpan');
              setSelectedPhase(null);
            }}>
              Simpan Perubahan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Timeline Overview Component
const TimelineOverview = ({ project, phases = [] }) => {
  const safePhases = Array.isArray(phases) ? phases : [];
  
  const completedPhases = safePhases.filter(p => p?.status === 'completed').length;
  const totalPhases = safePhases.length || 5;
  const progress = totalPhases > 0 ? (completedPhases / totalPhases) * 100 : 0;
  
  const currentPhase = safePhases.find(p => p?.status === 'in_progress') || 
                      safePhases.find(p => p?.status === 'pending');

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <BarChart3 className="w-5 h-5 mr-2" />
          Timeline Overview
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{totalPhases}</div>
            <div className="text-sm text-slate-600">Total Fase</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{completedPhases}</div>
            <div className="text-sm text-slate-600">Selesai</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">
              {safePhases.filter(p => p?.status === 'in_progress').length}
            </div>
            <div className="text-sm text-slate-600">Berjalan</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-slate-600">
              {safePhases.filter(p => p?.status === 'pending').length}
            </div>
            <div className="text-sm text-slate-600">Menunggu</div>
          </div>
        </div>

        <div>
          <div className="flex justify-between text-sm mb-1">
            <span>Progress Keseluruhan</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {currentPhase && (
          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <div className="flex items-center gap-2">
              <PlayCircle className="w-4 h-4 text-blue-600" />
              <span className="font-medium">Fase Saat Ini:</span>
              <span>Fase {currentPhase.phase} - {currentPhase.phase_name}</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// Notification Panel Component
const NotificationPanel = ({ project, onSendNotification }) => {
  const [message, setMessage] = useState('');
  const [recipients, setRecipients] = useState(['team']);

  const handleSend = () => {
    if (!message.trim()) return;
    
    onSendNotification({
      message,
      recipients,
      projectId: project?.id,
      projectName: project?.name || 'Project'
    });
    
    setMessage('');
    toast.success('Notifikasi terkirim ke tim');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Bell className="w-5 h-5 mr-2" />
          Kirim Notifikasi
        </CardTitle>
        <CardDescription>
          Kirim update kepada tim project
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label>Penerima</Label>
          <Select value={recipients[0]} onValueChange={(value) => setRecipients([value])}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="team">Seluruh Tim</SelectItem>
              <SelectItem value="project_lead">Project Lead Saja</SelectItem>
              <SelectItem value="inspectors">Inspectors Saja</SelectItem>
              <SelectItem value="client">Client</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Pesan</Label>
          <Textarea
            placeholder="Tulis pesan notifikasi untuk tim..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="min-h-[100px]"
          />
        </div>

        <Button 
          onClick={handleSend}
          disabled={!message.trim()}
          className="w-full"
        >
          <Send className="w-4 h-4 mr-2" />
          Kirim Notifikasi
        </Button>
      </CardContent>
    </Card>
  );
};

// Main Component
export default function ProjectTimelinePage() {
  const router = useRouter();
  const { id } = router.query;
  const { user, profile, loading: authLoading, isAdminLead } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [project, setProject] = useState(null);
  const [phases, setPhases] = useState([]);
  const [activeTab, setActiveTab] = useState("timeline");

  // Fetch project data
  const fetchProjectData = useCallback(async () => {
    if (!id) return;

    setLoading(true);
    try {
      // Fetch project details
      const { data: projectData, error: projectError } = await supabase
        .from('projects')
        .select('*')
        .eq('id', id)
        .single();

      if (projectError) throw projectError;

      // Fetch project phases atau buat default phases
      const { data: phasesData } = await supabase
        .from('project_phases')
        .select('*')
        .eq('project_id', id)
        .order('phase', { ascending: true });

      // Jika tidak ada phases, buat default phases
      let projectPhases = phasesData || [];
      if (!phasesData || phasesData.length === 0) {
        projectPhases = Object.values(PROJECT_PHASES).map(phase => ({
          id: `phase-${phase.number}-${id}`,
          project_id: id,
          phase: phase.number,
          phase_name: phase.name,
          description: phase.description,
          status: 'pending',
          estimated_duration: 7,
          progress: 0,
          start_date: null,
          end_date: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }));
      }

      setProject(projectData);
      setPhases(projectPhases);

    } catch (err) {
      console.error('Error fetching project:', err);
      setError('Gagal memuat data project');
    } finally {
      setLoading(false);
    }
  }, [id]);

  // Handle phase actions
  const handlePhaseAction = async (action, phase) => {
    try {
      let updateData = {};
      
      switch (action) {
        case 'start':
          updateData = {
            status: 'in_progress',
            start_date: new Date().toISOString(),
            end_date: addDays(new Date(), phase.estimated_duration || 7).toISOString()
          };
          break;
        case 'approve':
          updateData = {
            status: 'completed',
            end_date: new Date().toISOString(),
            progress: 100
          };
          break;
      }

      // Update local state
      setPhases(prev => 
        prev.map(p => 
          p.phase === phase.phase 
            ? { ...p, ...updateData }
            : p
        )
      );

      toast.success(`Fase ${phase.phase} berhasil di${action === 'start' ? 'mulai' : 'setujui'}`);

    } catch (err) {
      console.error('Error updating phase:', err);
      toast.error('Gagal memperbarui fase');
    }
  };

  // Handle notification
  const handleSendNotification = async (notification) => {
    toast.info(`Notifikasi dikirim ke ${notification.recipients[0]}`);
  };

  // Initial load
  useEffect(() => {
    if (router.isReady && !authLoading) {
      if (!user) {
        router.replace('/login');
        return;
      }
      
      if (!isAdminLead) {
        router.replace('/dashboard');
        return;
      }
      
      fetchProjectData();
    }
  }, [router.isReady, authLoading, user, isAdminLead, router, fetchProjectData]);

  if (loading) {
    return (
      <DashboardLayout title="Project Timeline">
        <div className="flex flex-col items-center justify-center min-h-[400px] p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-slate-600 dark:text-slate-400">Memuat timeline...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (error || !project) {
    return (
      <DashboardLayout title="Project Timeline">
        <div className="p-4 md:p-6">
          <Alert variant="destructive" className="mb-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error || 'Project tidak ditemukan'}</AlertDescription>
          </Alert>
          <Button onClick={() => router.push('/dashboard/admin-lead/projects')}>
            Kembali ke Daftar Project
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title={`Timeline - ${project.name}`}>
      <TooltipProvider>
        <div className="p-6 space-y-6 bg-slate-50 dark:bg-slate-900 min-h-screen">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => router.push('/dashboard/admin-lead/projects')}
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                  {project.name}
                </h1>
                <p className="text-slate-600 dark:text-slate-400">
                  Kelola timeline dan progress project
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <Button variant="outline" className="flex items-center gap-2">
                <Download className="w-4 h-4" />
                Export
              </Button>
              <Button 
                onClick={() => router.push(`/dashboard/admin-lead/projects/${id}/team`)}
                className="flex items-center gap-2"
              >
                <Users className="w-4 h-4" />
                Kelola Tim
              </Button>
            </div>
          </div>

          <Separator />

          {/* Features Overview */}
          <div>
            <Card className="border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20">
              <CardContent className="p-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {adminLeadFeatures.map((feature, index) => (
                    <div key={index} className="flex items-center gap-2 text-sm">
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Left Sidebar */}
            <div className="lg:col-span-1 space-y-6">
              <TimelineOverview project={project} phases={phases} />
              <NotificationPanel 
                project={project} 
                onSendNotification={handleSendNotification}
              />
            </div>

            {/* Main Content - TABS YANG BENAR */}
            <div className="lg:col-span-3">
              <Card>
                <CardHeader>
                  <CardTitle>Project Timeline</CardTitle>
                </CardHeader>
                <CardContent>
                  <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <TabsList className="grid w-full grid-cols-3 mb-6">
                      <TabsTrigger value="timeline">
                        <Calendar className="w-4 h-4 mr-2" />
                        Timeline
                      </TabsTrigger>
                      <TabsTrigger value="progress">
                        <BarChart3 className="w-4 h-4 mr-2" />
                        Progress
                      </TabsTrigger>
                      <TabsTrigger value="bottlenecks">
                        <AlertTriangle className="w-4 h-4 mr-2" />
                        Bottlenecks
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="timeline" className="space-y-6">
                      <PhaseTimeline
                        phases={phases}
                        project={project}
                        onPhaseAction={handlePhaseAction}
                        loading={loading}
                      />
                    </TabsContent>

                    <TabsContent value="progress">
                      <div className="text-center py-12">
                        <BarChart3 className="w-16 h-16 mx-auto text-slate-400 mb-4" />
                        <h3 className="text-lg font-semibold mb-2">Progress Analytics</h3>
                        <p className="text-slate-600">Fitur progress analytics akan segera hadir</p>
                      </div>
                    </TabsContent>

                    <TabsContent value="bottlenecks">
                      <div className="text-center py-12">
                        <AlertTriangle className="w-16 h-16 mx-auto text-orange-400 mb-4" />
                        <h3 className="text-lg font-semibold mb-2">Bottleneck Detection</h3>
                        <p className="text-slate-600">Fitur bottleneck detection akan segera hadir</p>
                      </div>
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </TooltipProvider>
    </DashboardLayout>
  );
}