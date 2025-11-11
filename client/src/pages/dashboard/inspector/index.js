// FILE: src/pages/dashboard/inspector/index.js

"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from 'next/router';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { useToast } from "@/components/ui/use-toast";

// shadcn/ui Components
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Lucide Icons
import {
  FileText, Clock, Activity, CheckCircle, XCircle, Eye,
  CheckSquare, AlertTriangle, Loader2, Info, Calendar, UserCheck, Camera, 
  Plus, MapPin, TrendingUp, ClipboardList, ListChecks,
  Building, Users, MessageSquare, Bell, Upload, Send
} from "lucide-react";

// Other Imports
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { supabase } from "@/utils/supabaseClient";
import { useAuth } from "@/context/AuthContext";
import { itemRequiresPhotogeotag } from "@/utils/checklistTemplates";

// Utility function untuk class names
const cn = (...classes) => classes.filter(Boolean).join(' ');

// --- Utility Functions ---
const getStatusBadge = (status) => {
  const statusClasses = {
    scheduled: "bg-yellow-100 text-yellow-800 border border-yellow-300",
    in_progress: "bg-orange-100 text-orange-800 border border-orange-300",
    completed: "bg-green-100 text-green-800 border border-green-300",
    cancelled: "bg-red-100 text-red-800 border border-red-300",
    rejected: "bg-red-100 text-red-800 border border-red-300",
    draft: "bg-gray-100 text-gray-800 border border-gray-300",
    submitted: "bg-blue-100 text-blue-800 border border-blue-300",
    verified_by_admin_team: "bg-purple-100 text-purple-800 border border-purple-300",
    approved_by_pl: "bg-green-100 text-green-800 border border-green-300"
  };

  const statusText = status?.replace(/_/g, ' ') || 'unknown';

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize",
        statusClasses[status] || "bg-gray-100 text-gray-800 border border-gray-300"
      )}
    >
      {statusText}
    </span>
  );
};

const formatDateSafely = (dateString) => {
  if (!dateString) return '-';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '-';
    return format(date, 'dd MMM yyyy', { locale: localeId });
  } catch (e) {
    console.error("Date formatting error:", e);
    return dateString;
  }
};

// Flatten checklist items function
const flattenChecklistItems = (templates) => {
  const items = [];
  templates?.forEach(template => {
    if (template.subsections) {
      template.subsections.forEach(subsection => {
        subsection.items?.forEach(item => {
          items.push({
            ...item,
            template_id: template.id,
            template_title: template.title,
            subsection_title: subsection.title,
            category: template.category || 'general'
          });
        });
      });
    } else if (template.items) {
      template.items?.forEach(item => {
        items.push({
          ...item,
          template_id: template.id,
          template_title: template.title,
          subsection_title: null,
          category: template.category || 'general'
        });
      });
    }
  });
  return items;
};

// Fungsi lokal untuk mendapatkan checklist berdasarkan spesialisasi
const getChecklistsBySpecialization = (specialization, type = 'all') => {
  // Data dummy checklist - sesuaikan dengan data aktual Anda
  const allChecklists = [
    // Structural
    { id: 'm60', title: 'Struktur Bangunan', category: 'keandalan' },
    { id: 'structural_assessment', title: 'Penilaian Struktur', category: 'keandalan' },
    
    // Architectural
    { id: 'm51', title: 'Fasilitas Penunjang', category: 'tata_bangunan' },
    { id: 'm52', title: 'Sistem Air Kotor', category: 'tata_bangunan' },
    { id: 'm53', title: 'Toilet & Penyimpanan', category: 'tata_bangunan' },
    
    // Electrical
    { id: 'm55', title: 'Sistem Pencahayaan', category: 'utilitas' },
    { id: 'm58', title: 'Sistem Kelistrikan', category: 'utilitas' },
    
    // Mechanical
    { id: 'm56', title: 'Sistem Ventilasi', category: 'utilitas' },
    { id: 'm57', title: 'Transportasi Vertikal', category: 'utilitas' },
    
    // Safety
    { id: 'm54', title: 'Proteksi Kebakaran', category: 'keselamatan' },
    
    // Environmental
    { id: 'kesehatan', title: 'Kesehatan Bangunan', category: 'kesehatan' },
    { id: 'kenyamanan', title: 'Kenyamanan Bangunan', category: 'kenyamanan' },
    
    // Administrative (bisa diakses semua)
    { id: 'administrative', title: 'Administratif', category: 'administrative' }
  ];

  // Mapping spesialisasi ke template checklist
  const specializationMapping = {
    structural_engineering: ['m60', 'structural_assessment', 'keandalan'],
    architectural_design: ['m51', 'm52', 'm53', 'tata_bangunan'],
    electrical_systems: ['m55', 'm58'],
    mechanical_systems: ['m56', 'm57'],
    plumbing_systems: ['m52', 'm53'],
    fire_safety: ['m54', 'keselamatan'],
    environmental_health: ['kesehatan', 'kenyamanan'],
    building_inspection: ['all'] // Bisa akses semua
  };

  const allowedTemplates = specializationMapping[specialization] || [];
  
  if (allowedTemplates.includes('all')) {
    return allChecklists;
  }

  return allChecklists.filter(checklist => 
    allowedTemplates.includes(checklist.id) || 
    allowedTemplates.includes(checklist.category)
  );
};

// --- Main Component ---
export default function InspectorDashboard() {
  const router = useRouter();
  const { toast } = useToast();
  const { user, profile, loading: authLoading, isInspector } = useAuth();

  const [inspections, setInspections] = useState([]);
  const [recentInspections, setRecentInspections] = useState([]);
  const [upcomingInspections, setUpcomingInspections] = useState([]);
  const [myProjects, setMyProjects] = useState([]);
  const [reports, setReports] = useState([]);
  const [pendingReports, setPendingReports] = useState([]);
  const [checklistStats, setChecklistStats] = useState({
    totalItems: 0,
    completedItems: 0,
    pendingItems: 0,
    applicableTemplates: 0
  });
  const [simakStats, setSimakStats] = useState({
    totalItems: 0,
    completedItems: 0,
    pendingItems: 0
  });
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    scheduled: 0,
    in_progress: 0,
    completed: 0,
    cancelled: 0,
    rejected: 0
  });

  const [photogeotagStats, setPhotogeotagStats] = useState({
    required: 0,
    completed: 0,
    pending: 0
  });

  const [reportStats, setReportStats] = useState({
    total: 0,
    draft: 0,
    submitted: 0,
    verified: 0,
    approved: 0
  });

  const quickActions = [
    {
      id: 1,
      title: "Jadwal Saya",
      description: "Lihat jadwal dari project lead",
      icon: Calendar,
      action: () => router.push('/dashboard/inspector/schedules'),
      color: "bg-blue-500",
      enabled: true,
      badge: "project_lead"
    },
    {
      id: 2,
      title: "Checklist SLF",
      description: "Kelola checklist dengan photogeotag",
      icon: ListChecks,
      action: () => router.push('/dashboard/inspector/checklist'),
      color: "bg-purple-500",
      enabled: true,
      badge: "📸 Photo+GPS"
    },
    {
      id: 3,
      title: "Buat Laporan",
      description: "Buat laporan untuk admin team",
      icon: FileText,
      action: () => router.push('/dashboard/inspector/reports/new'),
      color: "bg-green-500",
      enabled: true,
      badge: "admin_team"
    },
    {
      id: 4,
      title: "Proyek Saya",
      description: "Lihat proyek yang ditugaskan",
      icon: Building,
      action: () => router.push('/dashboard/inspector/projects'),
      color: "bg-orange-500",
      enabled: true
    }
  ];

  // Data spesialisasi langsung
  const specializationInfo = profile?.specialization ? {
    structural_engineering: { 
      name: 'Teknik Struktur', 
      normalized: 'Teknik Struktur',
      color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
      checklistIds: ['m60', 'structural_assessment', 'keandalan']
    },
    architectural_design: { 
      name: 'Desain Arsitektur', 
      normalized: 'Desain Arsitektur',
      color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
      checklistIds: ['m51', 'm52', 'm53', 'tata_bangunan']
    },
    electrical_systems: { 
      name: 'Sistem Kelistrikan', 
      normalized: 'Sistem Kelistrikan',
      color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
      checklistIds: ['m55', 'm58']
    },
    mechanical_systems: { 
      name: 'Sistem Mekanikal', 
      normalized: 'Sistem Mekanikal',
      color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
      checklistIds: ['m56', 'm57']
    },
    plumbing_systems: { 
      name: 'Sistem Plumbing', 
      normalized: 'Sistem Plumbing',
      color: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-300',
      checklistIds: ['m52', 'm53']
    },
    fire_safety: { 
      name: 'Keselamatan Kebakaran', 
      normalized: 'Keselamatan Kebakaran',
      color: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
      checklistIds: ['m54', 'keselamatan']
    },
    environmental_health: { 
      name: 'Kesehatan Lingkungan', 
      normalized: 'Kesehatan Lingkungan',
      color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300',
      checklistIds: ['kesehatan', 'kenyamanan']
    },
    building_inspection: { 
      name: 'Inspektur Bangunan', 
      normalized: 'Inspektur Bangunan',
      color: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
      checklistIds: ['all']
    }
  }[profile.specialization] : null;

  // Fetch semua data dari Supabase
  useEffect(() => {
    if (!user?.id || !isInspector) return;

    const fetchDashboardData = async () => {
      setLoading(true);
      try {
        // 1. Fetch semua inspeksi (untuk stats & recent)
        const { data: allInspections, error: allError } = await supabase
          .from("inspections")
          .select(`
            id,
            project_id,
            inspector_id,
            scheduled_date,
            start_time,
            end_time,
            status,
            created_at,
            updated_at,
            projects(
              name, 
              address, 
              city, 
              client_id,
              clients(name)
            ),
            profiles!inspector_id(full_name, email, specialization)
          `)
          .eq("inspector_id", user.id)
          .order("scheduled_date", { ascending: false });

        if (allError) throw allError;

        const safeAll = Array.isArray(allInspections) ? allInspections : [];
        setInspections(safeAll);

        // Hitung stats dari semua inspeksi
        const statsData = {
          total: safeAll.length,
          scheduled: safeAll.filter(i => i.status === "scheduled").length,
          in_progress: safeAll.filter(i => i.status === "in_progress").length,
          completed: safeAll.filter(i => i.status === "completed").length,
          cancelled: safeAll.filter(i => i.status === "cancelled").length,
          rejected: safeAll.filter(i => i.status === "rejected").length,
        };
        setStats(statsData);

        // Ambil 5 inspeksi terbaru
        setRecentInspections(safeAll.slice(0, 5));

        // 2. Fetch upcoming inspeksi secara terpisah (server-side filter)
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const { data: upcomingData, error: upcomingError } = await supabase
          .from("inspections")
          .select(`
            id,
            project_id,
            inspector_id,
            scheduled_date,
            start_time,
            end_time,
            status,
            created_at,
            updated_at,
            projects(
              name, 
              address, 
              city, 
              client_id,
              clients(name)
            ),
            profiles!inspector_id(full_name, email, specialization)
          `)
          .eq("inspector_id", user.id)
          .eq("status", "scheduled")
          .gte("scheduled_date", todayStart.toISOString())
          .order("scheduled_date", { ascending: true })
          .limit(5);

        if (!upcomingError) {
          setUpcomingInspections(upcomingData || []);
        }

        // 3. Fetch proyek yang ditugaskan ke inspector
        const { data: projectsData, error: projectsError } = await supabase
          .from("project_teams")
          .select(`
            project_id,
            projects(
              id,
              name,
              status,
              address,
              city,
              clients(name),
              project_lead_id,
              profiles!project_lead_id(full_name)
            )
          `)
          .eq("user_id", user.id)
          .eq("role", "inspector");

        if (!projectsError) {
          setMyProjects(projectsData?.map(p => p.projects) || []);
        }

        // 4. Fetch laporan yang dibuat oleh inspector
        const { data: reportsData, error: reportsError } = await supabase
          .from("documents")
          .select(`
            id,
            name,
            status,
            document_type,
            created_at,
            updated_at,
            projects(name, clients(name))
          `)
          .eq("created_by", user.id)
          .eq("document_type", "REPORT")
          .order("created_at", { ascending: false });

        if (!reportsError) {
          setReports(reportsData || []);
          
          // Hitung statistik laporan
          const reportStatsData = {
            total: reportsData?.length || 0,
            draft: reportsData?.filter(r => r.status === 'draft').length || 0,
            submitted: reportsData?.filter(r => r.status === 'submitted').length || 0,
            verified: reportsData?.filter(r => r.status === 'verified_by_admin_team').length || 0,
            approved: reportsData?.filter(r => r.status === 'approved_by_pl').length || 0
          };
          setReportStats(reportStatsData);

          // Laporan yang masih pending (draft atau submitted)
          setPendingReports(reportsData?.filter(r => 
            r.status === 'draft' || r.status === 'submitted'
          ) || []);
        }

        // 5. Checklist & Photogeotag Stats
        const userSpecialization = profile?.specialization || 'building_inspection';
        const applicableChecklists = getChecklistsBySpecialization(userSpecialization, 'baru');
        const applicableItems = flattenChecklistItems(applicableChecklists);

        // Fetch checklist responses
        const { data: checklistResponses = [], error: checklistError } = await supabase
          .from('checklist_responses')
          .select('*')
          .eq('responded_by', user.id);

        if (!checklistError) {
          // Filter hanya respons yang sesuai dengan template/item yang masih berlaku
          const validResponses = checklistResponses.filter(response =>
            applicableItems.some(item =>
              item.template_id === response.template_id &&
              item.id === response.item_id
            )
          );

          // Filter item yang benar-benar butuh photogeotag
          const photogeotagRequiredItems = applicableItems.filter(item =>
            itemRequiresPhotogeotag(item.template_id, item.id)
          );

          const photogeotagCompleted = validResponses.filter(response => {
            const item = applicableItems.find(
              i => i.template_id === response.template_id && i.id === response.item_id
            );
            return item && itemRequiresPhotogeotag(item.template_id, item.id) && response.photogeotag_data;
          }).length;

          setChecklistStats({
            totalItems: applicableItems.length,
            completedItems: validResponses.length,
            pendingItems: applicableItems.length - validResponses.length,
            applicableTemplates: applicableChecklists.length
          });

          setPhotogeotagStats({
            required: photogeotagRequiredItems.length,
            completed: photogeotagCompleted,
            pending: photogeotagRequiredItems.length - photogeotagCompleted
          });
        }

        // 6. Simak Stats
        const { data: simakResponses = [], error: simakError } = await supabase
          .from('simak_responses')
          .select('*')
          .eq('inspector_id', user.id);

        const { data: simakItems = [], error: simakItemsError } = await supabase
          .from('simak_items')
          .select('*');

        if (!simakError && !simakItemsError) {
          setSimakStats({
            totalItems: simakItems.length,
            completedItems: simakResponses.length,
            pendingItems: simakItems.length - simakResponses.length
          });
        }

      } catch (error) {
        console.error('[InspectorDashboard] Fetch data error:', error);
        toast({
          title: "Gagal memuat data dashboard",
          description: error.message,
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [user?.id, isInspector, profile?.specialization, toast]);

  const handleViewInspection = (inspectionId) => {
    router.push(`/dashboard/inspector/inspections/${inspectionId}`);
  };

  const handleViewReport = (reportId) => {
    router.push(`/dashboard/inspector/reports/${reportId}`);
  };

  const handleQuickAction = (action) => {
    if (action.enabled) {
      action.action();
    } else {
      toast({
        title: "Fitur belum tersedia",
        description: "Fitur ini sedang dalam pengembangan.",
        variant: "default",
      });
    }
  };

  const completionRate = useMemo(() => {
    if (stats.total === 0) return 0;
    return Math.round((stats.completed / stats.total) * 100);
  }, [stats]);

  const checklistCompletionRate = useMemo(() => {
    if (checklistStats.totalItems === 0) return 0;
    return Math.round((checklistStats.completedItems / checklistStats.totalItems) * 100);
  }, [checklistStats]);

  const simakCompletionRate = useMemo(() => {
    if (simakStats.totalItems === 0) return 0;
    return Math.round((simakStats.completedItems / simakStats.totalItems) * 100);
  }, [simakStats]);

  const photogeotagCompletionRate = useMemo(() => {
    if (photogeotagStats.required === 0) return 0;
    return Math.round((photogeotagStats.completed / photogeotagStats.required) * 100);
  }, [photogeotagStats]);

  const reportCompletionRate = useMemo(() => {
    if (reportStats.total === 0) return 0;
    return Math.round((reportStats.approved / reportStats.total) * 100);
  }, [reportStats]);

  if (authLoading) {
    return (
      <DashboardLayout title="Inspector Dashboard">
        <div className="flex flex-col items-center justify-center min-h-[400px] p-8">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="mt-4 text-muted-foreground">Memuat dashboard...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (!user || !isInspector) {
    return (
      <DashboardLayout title="Inspector Dashboard">
        <div className="p-4 md:p-6">
          <Alert variant="destructive" className="m-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Akses Ditolak</AlertTitle>
            <AlertDescription>
              Hanya inspector yang dapat mengakses halaman ini.
            </AlertDescription>
          </Alert>
          <Button 
            onClick={() => router.push('/dashboard')}
            className="mt-4"
          >
            Kembali ke Dashboard
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Inspector Dashboard">
      <div className="p-4 md:p-6 space-y-6">
        {/* Header - Updated dengan workflow context */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="space-y-1">
            <h1 className="text-xl md:text-2xl font-bold text-foreground">
              Selamat datang, {profile?.full_name || user?.email}
            </h1>
            <p className="text-sm text-muted-foreground">
              {specializationInfo?.normalized || 'Inspector'} • 
              {myProjects.length > 0 ? ` ${myProjects.length} Proyek Aktif` : ' Menunggu Penugasan'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="secondary" className="capitalize text-xs">
              {specializationInfo?.normalized || profile?.specialization?.replace(/_/g, ' ') || 'Inspector'}
            </Badge>
            <Button
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
              onClick={() => router.push('/dashboard/inspector/schedules')}
            >
              <Calendar className="w-4 h-4" />
              Jadwal Saya
            </Button>
            {pendingReports.length > 0 && (
              <Button
                size="sm"
                className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600"
                onClick={() => router.push('/dashboard/inspector/reports')}
              >
                <FileText className="w-4 h-4" />
                Laporan Tertunda ({pendingReports.length})
              </Button>
            )}
          </div>
        </div>

        {/* Quick Actions - Updated untuk workflow */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickActions.map((action) => (
            <Card 
              key={action.id} 
              className={`border-border transition-all hover:shadow-md cursor-pointer ${
                !action.enabled ? 'opacity-60' : 'hover:scale-105'
              }`}
              onClick={() => handleQuickAction(action)}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <h3 className="font-semibold text-foreground text-sm leading-tight">
                      {action.title}
                    </h3>
                    <p className="text-xs text-muted-foreground leading-tight">
                      {action.description}
                    </p>
                  </div>
                  <div className={`p-2 rounded-full ${action.color} text-white`}>
                    <action.icon className="w-4 h-4" />
                  </div>
                </div>
                {action.badge && (
                  <Badge variant="secondary" className="mt-2 text-xs flex items-center gap-1">
                    {action.badge}
                  </Badge>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Stats Overview - Updated dengan report stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-border">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Inspeksi</p>
                  <p className="text-xl font-bold text-foreground">{stats.total}</p>
                </div>
                <div className="p-2 bg-blue-100 rounded-full">
                  <Calendar className="w-5 h-5 text-blue-600" />
                </div>
              </div>
              <div className="mt-3">
                <Progress value={100} className="h-1" />
                <p className="text-xs text-muted-foreground mt-1">Semua inspeksi</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Laporan Disetujui</p>
                  <p className="text-xl font-bold text-foreground">
                    {reportStats.approved}/{reportStats.total}
                  </p>
                </div>
                <div className="p-2 bg-green-100 rounded-full">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                </div>
              </div>
              <div className="mt-3">
                <Progress 
                  value={reportCompletionRate} 
                  className="h-1" 
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {reportCompletionRate}% disetujui project_lead
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Checklist Selesai</p>
                  <p className="text-xl font-bold text-foreground">
                    {checklistStats.completedItems}/{checklistStats.totalItems}
                  </p>
                </div>
                <div className="p-2 bg-purple-100 rounded-full">
                  <ClipboardList className="w-5 h-5 text-purple-600" />
                </div>
              </div>
              <div className="mt-3">
                <Progress 
                  value={checklistCompletionRate} 
                  className="h-1" 
                />
                <p className="text-xs text-muted-foreground mt-1">{checklistCompletionRate}% checklist</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Photogeotag</p>
                  <p className="text-xl font-bold text-foreground">
                    {photogeotagStats.completed}/{photogeotagStats.required}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">Foto dengan GPS</p>
                </div>
                <div className="p-2 bg-red-100 rounded-full">
                  <Camera className="w-5 h-5 text-red-600" />
                </div>
              </div>
              <div className="mt-3">
                <Progress 
                  value={photogeotagCompletionRate} 
                  className="h-1" 
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {photogeotagCompletionRate}% wajib foto
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs - Updated dengan workflow context */}
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3 bg-muted/50 p-1">
            <TabsTrigger 
              value="overview" 
              className="text-sm data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
            >
              Overview
            </TabsTrigger>
            <TabsTrigger 
              value="reports" 
              className="text-sm data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
            >
              Laporan & Status
            </TabsTrigger>
            <TabsTrigger 
              value="progress" 
              className="text-sm data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
            >
              Progress
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Jadwal Mendatang */}
              <Card className="border-border">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Jadwal Mendatang dari Project Lead
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="space-y-3">
                      {[...Array(3)].map((_, i) => (
                        <Skeleton key={i} className="h-12 w-full" />
                      ))}
                    </div>
                  ) : upcomingInspections.length > 0 ? (
                    <div className="space-y-3">
                      {upcomingInspections.map((inspection) => (
                        <div key={inspection.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors">
                          <div className="flex items-center space-x-3 min-w-0 flex-1">
                            <div className="p-2 rounded-full bg-blue-100 text-blue-600 flex-shrink-0">
                              <Calendar className="w-3 h-3" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="font-medium text-sm truncate">{inspection.projects?.name}</p>
                              <p className="text-xs text-muted-foreground truncate">
                                {formatDateSafely(inspection.scheduled_date)}
                              </p>
                            </div>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleViewInspection(inspection.id)}
                          >
                            <Eye className="w-3 h-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <Alert>
                      <Info className="h-4 w-4" />
                      <AlertTitle>Tidak ada jadwal mendatang</AlertTitle>
                      <AlertDescription>
                        Menunggu penugasan dari project lead.
                      </AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>

              {/* Proyek Aktif */}
              <Card className="border-border">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Building className="w-4 h-4" />
                    Proyek Ditugaskan
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="space-y-3">
                      {[...Array(3)].map((_, i) => (
                        <Skeleton key={i} className="h-12 w-full" />
                      ))}
                    </div>
                  ) : myProjects.length > 0 ? (
                    <div className="space-y-3">
                      {myProjects.slice(0, 3).map((project) => (
                        <div key={project.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors">
                          <div className="flex items-center space-x-3 min-w-0 flex-1">
                            <div className="p-2 rounded-full bg-green-100 text-green-600 flex-shrink-0">
                              <Building className="w-3 h-3" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="font-medium text-sm truncate">{project.name}</p>
                              <p className="text-xs text-muted-foreground truncate">
                                {project.clients?.name} • {project.address}
                              </p>
                            </div>
                          </div>
                          <Badge variant="outline" className="capitalize text-xs">
                            {project.status}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <Alert>
                      <Info className="h-4 w-4" />
                      <AlertTitle>Belum ada proyek</AlertTitle>
                      <AlertDescription>
                        Menunggu penugasan proyek dari project lead.
                      </AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="reports" className="space-y-4">
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="flex items-center justify-between text-base">
                  <span className="flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    Status Laporan ke Admin Team
                  </span>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{reports.length} Total</Badge>
                    <Button
                      size="sm"
                      onClick={() => router.push('/dashboard/inspector/reports/new')}
                      className="flex items-center gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      Buat Laporan
                    </Button>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="space-y-3">
                    {[...Array(5)].map((_, i) => (
                      <Skeleton key={i} className="h-12 w-full" />
                    ))}
                  </div>
                ) : reports.length > 0 ? (
                  <div className="w-full overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-sm">Nama Laporan</TableHead>
                          <TableHead className="text-sm">Proyek</TableHead>
                          <TableHead className="text-sm">Tanggal</TableHead>
                          <TableHead className="text-sm">Status</TableHead>
                          <TableHead className="text-sm text-center">Aksi</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {reports.slice(0, 5).map((report) => (
                          <TableRow key={report.id} className="hover:bg-accent/50">
                            <TableCell className="font-medium">
                              <p className="text-sm text-foreground truncate max-w-[150px]">{report.name}</p>
                            </TableCell>
                            <TableCell className="text-sm">
                              <span className="truncate max-w-[120px] inline-block">
                                {report.projects?.name || "-"}
                              </span>
                            </TableCell>
                            <TableCell className="text-sm">
                              {formatDateSafely(report.created_at)}
                            </TableCell>
                            <TableCell>
                              {getStatusBadge(report.status)}
                            </TableCell>
                            <TableCell className="text-center">
                              <Button
                                size="sm"
                                variant="outline"
                                className="flex items-center gap-1"
                                onClick={() => handleViewReport(report.id)}
                              >
                                <Eye className="h-3 w-3" />
                                Lihat
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertTitle>Belum ada laporan</AlertTitle>
                    <AlertDescription>
                      Buat laporan pertama Anda untuk diserahkan ke admin team.
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>

            {/* Workflow Information */}
            <Alert className="bg-blue-50 border-blue-200">
              <Info className="h-4 w-4 text-blue-600" />
              <AlertTitle className="text-blue-800">Alur Laporan ke Admin Team</AlertTitle>
              <AlertDescription className="text-blue-700">
                <ul className="list-disc list-inside space-y-1 text-sm">
                  <li>Anda buat laporan → status: <strong>draft</strong></li>
                  <li>Anda submit ke admin team → status: <strong>submitted</strong></li>
                  <li>Admin team verifikasi → status: <strong>verified_by_admin_team</strong></li>
                  <li>Project lead approve → status: <strong>approved_by_pl</strong></li>
                  <li>Admin lead final approve → status: <strong>approved</strong></li>
                </ul>
              </AlertDescription>
            </Alert>
          </TabsContent>

          <TabsContent value="progress" className="space-y-4">
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="flex items-center justify-between text-base">
                  <span className="flex items-center gap-2">
                    <ListChecks className="w-4 h-4" />
                    Progress Checklist & Photogeotag
                  </span>
                  <Button
                    size="sm"
                    onClick={() => router.push('/dashboard/inspector/checklist')}
                    className="flex items-center gap-2"
                  >
                    <Camera className="w-4 h-4" />
                    Kelola dengan Foto
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card className="border-border">
                    <CardContent className="p-4">
                      <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
                        <ListChecks className="w-4 h-4" />
                        Checklist Progress
                      </h3>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-sm">Total Items</span>
                          <span className="font-bold">{checklistStats.totalItems}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm">Terselesaikan</span>
                          <span className="font-bold text-green-600">{checklistStats.completedItems}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm">Tertunda</span>
                          <span className="font-bold text-orange-600">{checklistStats.pendingItems}</span>
                        </div>
                        <Progress value={checklistCompletionRate} className="h-2" />
                        <p className="text-center text-sm text-muted-foreground">
                          {checklistCompletionRate}% Complete
                        </p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-border">
                    <CardContent className="p-4">
                      <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
                        <Camera className="w-4 h-4" />
                        Photogeotag Progress
                        <Badge variant="outline" className="text-xs ml-1">
                          Wajib
                        </Badge>
                      </h3>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-sm">Butuh Photogeotag</span>
                          <span className="font-bold">{photogeotagStats.required}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm">Foto Terselesaikan</span>
                          <span className="font-bold text-green-600">{photogeotagStats.completed}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm">Foto Tertunda</span>
                          <span className="font-bold text-orange-600">
                            {photogeotagStats.pending}
                          </span>
                        </div>
                        <Progress value={photogeotagCompletionRate} className="h-2 bg-orange-100" />
                        <p className="text-center text-sm text-muted-foreground">
                          {photogeotagCompletionRate}% Foto dengan GPS
                        </p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-border">
                    <CardContent className="p-4">
                      <h3 className="font-semibold text-sm mb-3">Daftar Simak Progress</h3>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-sm">Total Items</span>
                          <span className="font-bold">{simakStats.totalItems}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm">Terselesaikan</span>
                          <span className="font-bold text-green-600">{simakStats.completedItems}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm">Tertunda</span>
                          <span className="font-bold text-orange-600">{simakStats.pendingItems}</span>
                        </div>
                        <Progress value={simakCompletionRate} className="h-2" />
                        <p className="text-center text-sm text-muted-foreground">
                          {simakCompletionRate}% Complete
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <Alert className="mt-4">
                  <Info className="h-4 w-4" />
                  <AlertTitle>Persyaratan Photogeotag</AlertTitle>
                  <AlertDescription>
                    Semua checklist teknis (non-administratif) wajib dilengkapi foto dengan metadata GPS untuk validasi lokasi inspeksi. Checklist administratif tidak memerlukan photogeotag.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}