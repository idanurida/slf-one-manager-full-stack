// src/pages/dashboard/client/projects/[id].js
import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { toast } from "sonner";

// shadcn/ui Components
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Lucide Icons
import {
  ArrowLeft, Download, ExternalLink, FileText, Building, Calendar,
  Clock, DollarSign, AlertTriangle, CheckCircle, Loader2, Info,
  Folder, FolderOpen, CheckCircle2, XCircle, AlertCircle, Upload,
  BarChart3, ChevronDown
} from "lucide-react";

// Other Imports
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { supabase } from "@/utils/supabaseClient";
import { useAuth } from "@/context/AuthContext";

// Import SLF Document Structure dari dashboard
import { SLF_DOCUMENT_CATEGORIES } from "../slf-document-structure";

// --- Utility Functions ---
const getStatusColor = (status) => {
  const statusMap = {
    draft: 'secondary',
    submitted: 'default',
    project_lead_review: 'default',
    head_consultant_review: 'default',
    client_review: 'destructive',
    government_submitted: 'default',
    slf_issued: 'default',
    rejected: 'destructive',
    inspection_in_progress: 'default',
    completed: 'default',
    cancelled: 'destructive',
  };
  return statusMap[status] || 'default';
};

const formatDateSafely = (dateString) => {
  if (!dateString) return "-";
  try {
    return format(new Date(dateString), 'dd MMM yyyy', { locale: localeId });
  } catch (e) {
    return dateString;
  }
};

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(amount || 0);
};

const getDocumentStatusIcon = (status) => {
  switch (status) {
    case 'approved': return <CheckCircle2 className="w-4 h-4 text-green-500" />;
    case 'rejected': return <XCircle className="w-4 h-4 text-red-500" />;
    case 'pending': return <AlertCircle className="w-4 h-4 text-yellow-500" />;
    default: return <FileText className="w-4 h-4 text-gray-400" />;
  }
};

// --- Document Category Component ---
const DocumentCategory = ({ category, documentsStatus, onDocumentUpload, projectId }) => {
  const [isOpen, setIsOpen] = useState(false);

  const getCategoryCompletion = (category) => {
    let totalDocs = 0;
    let completedDocs = 0;

    if (category.subkategori) {
      Object.values(category.subkategori).forEach(subCat => {
        subCat.dokumen.forEach(doc => {
          totalDocs++;
          if (documentsStatus[doc.id] === 'approved') completedDocs++;
        });
      });
    } else {
      category.dokumen.forEach(doc => {
        totalDocs++;
        if (documentsStatus[doc.id] === 'approved') completedDocs++;
      });
    }

    return totalDocs > 0 ? Math.round((completedDocs / totalDocs) * 100) : 0;
  };

  const completion = getCategoryCompletion(category);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="border rounded-lg bg-card">
      <CollapsibleTrigger className="flex items-center justify-between w-full p-4 hover:bg-accent/50 transition-colors">
        <div className="flex items-center gap-3">
          {isOpen ? <FolderOpen className="w-5 h-5 text-primary" /> : <Folder className="w-5 h-5 text-primary" />}
          <div className="text-left">
            <h3 className="font-semibold text-foreground">{category.nama_kategori}</h3>
            <p className="text-sm text-muted-foreground">{category.deskripsi}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-20 bg-secondary rounded-full h-2">
              <div 
                className="bg-primary h-2 rounded-full transition-all duration-300"
                style={{ width: `${completion}%` }}
              />
            </div>
            <span className="text-sm font-medium text-foreground">
              {completion}%
            </span>
          </div>
          <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </CollapsibleTrigger>
      
      <CollapsibleContent className="px-4 pb-4">
        {/* Konten kategori dokumen sama seperti di dashboard */}
        {/* ... */}
      </CollapsibleContent>
    </Collapsible>
  );
};

// --- Main Component ---
export default function ProjectDetail() {
  const router = useRouter();
  const { id } = router.query;
  const { user, profile, loading: authLoading, isClient } = useAuth();

  // State Declarations
  const [dataLoading, setDataLoading] = useState(true);
  const [error, setError] = useState(null);
  const [project, setProject] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [documentsStatus, setDocumentsStatus] = useState({});
  const [payment, setPayment] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  // Calculate document stats
  const calculateDocumentStats = useCallback((docs) => {
    const statusCount = {
      approved: 0,
      pending: 0,
      rejected: 0,
      total: 0
    };

    if (!docs || docs.length === 0) {
      return {
        pendingDocuments: 0,
        completionPercentage: 0,
        statusCount,
        uploadedDocuments: 0
      };
    }

    docs.forEach(doc => {
      let mappedStatus = 'pending';
      if (doc.status === 'approved' || doc.compliance_status === 'compliant') {
        mappedStatus = 'approved';
        statusCount.approved++;
      } else if (doc.status === 'rejected' || doc.compliance_status === 'non-compliant') {
        mappedStatus = 'rejected';
        statusCount.rejected++;
      } else {
        mappedStatus = 'pending';
        statusCount.pending++;
      }
      statusCount.total++;
    });

    const totalRequiredDocs = 32;
    const completionPercentage = Math.round((statusCount.approved / totalRequiredDocs) * 100);

    return {
      pendingDocuments: statusCount.pending,
      completionPercentage: Math.min(completionPercentage, 100),
      uploadedDocuments: statusCount.total,
      statusCount
    };
  }, []);

  // --- Enhanced Data Fetching ---
  const fetchData = useCallback(async () => {
    if (!id) return;

    setDataLoading(true);
    setError(null);

    try {
      if (!profile?.client_id) {
        setError('Profil Anda tidak terhubung ke klien. Hubungi administrator.');
        setDataLoading(false);
        return;
      }

      // Fetch project data
      const { data: proj, error: projError } = await supabase
        .from('projects')
        .select('*')
        .eq('id', id)
        .eq('client_id', profile.client_id)
        .single();

      if (projError) throw projError;
      if (!proj) {
        setError('Proyek tidak ditemukan.');
        setDataLoading(false);
        return;
      }
      setProject(proj);

      // Enhanced documents fetch
      const { data: docs, error: docsError } = await supabase
        .from('documents')
        .select('*')
        .eq('project_id', id)
        .order('created_at', { ascending: false });

      if (docsError && docsError.code !== 'PGRST116') throw docsError;
      setDocuments(docs || []);

      // Create documents status map
      const statusMap = {};
      docs?.forEach(doc => {
        const docKey = doc.document_type || doc.name;
        let mappedStatus = 'pending';
        if (doc.status === 'approved' || doc.compliance_status === 'compliant') {
          mappedStatus = 'approved';
        } else if (doc.status === 'rejected' || doc.compliance_status === 'non-compliant') {
          mappedStatus = 'rejected';
        }

        if (docKey) {
          statusMap[docKey] = mappedStatus;
        }
        statusMap[doc.id] = mappedStatus;
      });
      setDocumentsStatus(statusMap);

      // Fetch payment
      const { data: pay, error: payError } = await supabase
        .from('payments')
        .select('*')
        .eq('project_id', id)
        .single();

      if (payError && payError.code !== 'PGRST116') throw payError;
      setPayment(pay || null);

    } catch (err) {
      console.error('[ProjectDetail] Error:', err);
      setError('Proyek tidak ditemukan atau Anda tidak memiliki akses.');
      toast.error('Gagal memuat data proyek');
    } finally {
      setDataLoading(false);
    }
  }, [id, profile?.client_id]);

  // Handle document upload (sama seperti di dashboard)
  const handleDocumentUpload = async (documentType, file, docInfo) => {
    try {
      // Implementasi upload sama seperti di dashboard
      // ...
    } catch (error) {
      console.error('Upload error:', error);
      throw error;
    }
  };

  // Authentication & Data Fetching Logic
  useEffect(() => {
    if (router.isReady && !authLoading) {
      if (!user) {
        router.replace('/login');
        return;
      }
      
      if (!isClient) {
        router.replace('/dashboard');
        return;
      }
      
      fetchData();
    }
  }, [router.isReady, authLoading, user, isClient, router, fetchData]);

  // Calculate document stats
  const documentStats = calculateDocumentStats(documents);

  // --- Render Logic ---
  if (authLoading || (user && !isClient) || dataLoading) {
    return (
      <DashboardLayout title="Detail Proyek">
        <div className="flex flex-col items-center justify-center min-h-[400px] p-8">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="mt-4 text-muted-foreground">Memuat data proyek...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (error || !project) {
    return (
      <DashboardLayout title="Detail Proyek">
        <div className="p-4 md:p-6">
          <Alert variant="destructive" className="mb-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Proyek Tidak Ditemukan</AlertTitle>
            <AlertDescription>
              {error}
            </AlertDescription>
          </Alert>
          <Button asChild>
            <Link href="/dashboard/client">
              Kembali ke Dashboard
            </Link>
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title={`${project.name}`}>
      <TooltipProvider>
        <div className="p-4 md:p-6 space-y-6">
          
          {/* Back Button */}
          <Button
            variant="ghost"
            onClick={() => router.push('/dashboard/client')}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-4 h-4" />
            Kembali ke Dashboard
          </Button>

          {/* Header dengan Progress */}
          <div className="space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="text-sm text-muted-foreground">{project.name}</span>
                <Badge variant={getStatusColor(project.status)} className="capitalize">
                  {project.status?.replace(/_/g, ' ')}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {project.application_type}
                </span>
              </div>

              {/* Progress Overview */}
              <Card className="p-4 border-border bg-card">
                <div className="flex items-center gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary">
                      {documentStats.completionPercentage}%
                    </div>
                    <div className="text-xs text-muted-foreground">Kelengkapan</div>
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-muted-foreground">Dokumen SLF</span>
                      <span className="font-medium">
                        {documentStats.uploadedDocuments}/32
                      </span>
                    </div>
                    <Progress value={documentStats.completionPercentage} className="h-2" />
                  </div>
                </div>
              </Card>
            </div>

            {/* Tab Navigation */}
            <div className="flex gap-2 border-b border-border">
              <Button
                variant={activeTab === 'overview' ? 'default' : 'ghost'}
                onClick={() => setActiveTab('overview')}
                className={`rounded-none border-b-2 ${activeTab === 'overview' ? 'border-primary' : 'border-transparent'}`}
              >
                <Building className="w-4 h-4 mr-2" />
                Overview
              </Button>
              <Button
                variant={activeTab === 'documents' ? 'default' : 'ghost'}
                onClick={() => setActiveTab('documents')}
                className={`rounded-none border-b-2 ${activeTab === 'documents' ? 'border-primary' : 'border-transparent'}`}
              >
                <FileText className="w-4 h-4 mr-2" />
                Dokumen SLF
              </Button>
              <Button
                variant={activeTab === 'payment' ? 'default' : 'ghost'}
                onClick={() => setActiveTab('payment')}
                className={`rounded-none border-b-2 ${activeTab === 'payment' ? 'border-primary' : 'border-transparent'}`}
              >
                <DollarSign className="w-4 h-4 mr-2" />
                Pembayaran
              </Button>
            </div>
          </div>

          {/* Tab Content */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Project Information Card */}
              <Card className="border-border">
                <div className="p-6">
                  <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                    <Building className="w-5 h-5" />
                    Informasi Proyek
                  </h2>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Konten informasinya sama seperti sebelumnya */}
                    {/* ... */}
                  </div>
                </div>
              </Card>

              {/* Quick Documents Overview */}
              <Card className="border-border">
                <div className="p-6">
                  <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                    <BarChart3 className="w-5 h-5" />
                    Ringkasan Dokumen
                  </h2>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center p-4 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
                      <div className="text-2xl font-bold text-green-600">{documentStats.statusCount?.approved || 0}</div>
                      <div className="text-green-700 dark:text-green-400 text-sm">Disetujui</div>
                    </div>
                    <div className="text-center p-4 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                      <div className="text-2xl font-bold text-yellow-600">{documentStats.statusCount?.pending || 0}</div>
                      <div className="text-yellow-700 dark:text-yellow-400 text-sm">Tertunda</div>
                    </div>
                    <div className="text-center p-4 bg-red-50 dark:bg-red-950/20 rounded-lg border border-red-200 dark:border-red-800">
                      <div className="text-2xl font-bold text-red-600">{documentStats.statusCount?.rejected || 0}</div>
                      <div className="text-red-700 dark:text-red-400 text-sm">Ditolak</div>
                    </div>
                    <div className="text-center p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                      <div className="text-2xl font-bold text-blue-600">{documentStats.statusCount?.total || 0}</div>
                      <div className="text-blue-700 dark:text-blue-400 text-sm">Total</div>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          )}

          {activeTab === 'documents' && (
            <div className="space-y-4">
              <Alert className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
                <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <AlertDescription className="text-blue-700 dark:text-blue-400">
                  Kelengkapan dokumen: <strong>{documentStats.completionPercentage}%</strong> ({documentStats.uploadedDocuments}/32 dokumen)
                </AlertDescription>
              </Alert>

              <div className="grid gap-4">
                {Object.entries(SLF_DOCUMENT_CATEGORIES).map(([categoryKey, category]) => (
                  <DocumentCategory
                    key={categoryKey}
                    category={category}
                    documentsStatus={documentsStatus}
                    onDocumentUpload={handleDocumentUpload}
                    projectId={id}
                  />
                ))}
              </div>
            </div>
          )}

          {activeTab === 'payment' && (
            <div>
              {/* Konten payment sama seperti sebelumnya */}
              {/* ... */}
            </div>
          )}
        </div>
      </TooltipProvider>
    </DashboardLayout>
  );
}