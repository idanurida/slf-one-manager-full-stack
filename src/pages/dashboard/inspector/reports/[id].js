import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import ReportContent from '@/components/dashboard/inspector/ReportContent';

import {
  ArrowLeft,
  FileText,
  Download,
  Edit,
  Calendar,
  Building,
  User,
  MapPin,
  CheckCircle,
  Clock,
  AlertTriangle,
  Loader2,
  Share2,
  Printer
} from 'lucide-react';

import DashboardLayout from '@/components/layouts/DashboardLayout';
import { supabase } from '@/utils/supabaseClient';
import { useAuth } from '@/context/AuthContext';

export default function ReportDetail() {
  const router = useRouter();
  const { id } = router.query;
  const { toast } = useToast();
  const { user, profile, loading: authLoading, isInspector } = useAuth();

  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [checklistData, setChecklistData] = useState([]);
  const [photos, setPhotos] = useState([]);

  useEffect(() => {
    const loadReportDetail = async () => {
      if (!id || !user?.id || !isInspector) return;

      try {
        setLoading(true);

        // Load report detail
        const { data: reportData, error: reportError } = await supabase
          .from('inspection_reports')
          .select(`
            *,
            projects (
              id,
              name,
              location,
              application_type,
              clients (
                id,
                name,
                email
              )
            )
          `)
          .eq('id', id)
          .eq('inspector_id', user.id)
          .single();

        if (reportError) throw reportError;
        setReport(reportData);

        // Load checklist data if available
        if (reportData?.selected_findings_ids?.length > 0) {
          const { data: checklistResponses, error: checklistError } = await supabase
            .from('checklist_responses')
            .select(`
              *,
              checklist_items (
                item_name,
                category,
                template_title
              )
            `)
            .in('id', reportData.selected_findings_ids);

          if (!checklistError) {
            setChecklistData(checklistResponses || []);
          }
        }

        // Load photos
        // Fallback: If inspection_id is not in report, use project_id and inspector_id
        let photoQuery = supabase
          .from('inspection_photos')
          .select('*, checklist_items(item_name, category, template_title)')
          .order('created_at', { ascending: false });

        if (reportData.inspection_id) {
          photoQuery = photoQuery.eq('inspection_id', reportData.inspection_id);
        } else {
          photoQuery = photoQuery.eq('project_id', reportData.project_id)
            .eq('uploaded_by', user.id);
        }

        const { data: photosData, error: photosError } = await photoQuery;

        if (!photosError) {
          setPhotos(photosData || []);
        }

      } catch (err) {
        console.error('Error loading report detail:', err);
        toast({
          title: "Gagal memuat detail laporan",
          description: err.message,
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    if (id && user && isInspector) {
      loadReportDetail();
    }
  }, [id, user, isInspector, toast]);

  const getStatusBadge = (status) => {
    const statusConfig = {
      draft: { variant: 'outline', label: 'Draft', icon: Edit, color: 'bg-gray-100 text-gray-800' },
      submitted: { variant: 'secondary', label: 'Submitted', icon: Clock, color: 'bg-blue-100 text-blue-800' },
      under_review: { variant: 'default', label: 'Under Review', icon: AlertTriangle, color: 'bg-orange-100 text-orange-800' },
      approved: { variant: 'default', label: 'Approved', icon: CheckCircle, color: 'bg-green-100 text-green-800' },
      rejected: { variant: 'destructive', label: 'Rejected', icon: AlertTriangle, color: 'bg-red-100 text-red-800' }
    };

    const config = statusConfig[status] || { variant: 'outline', label: status, icon: FileText, color: '' };
    const IconComponent = config.icon;

    return (
      <Badge variant={config.variant} className={`flex items-center gap-1 ${config.color}`}>
        <IconComponent className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('id-ID', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '-';

    return date.toLocaleString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExportPDF = () => {
    toast({
      title: "Fitur dalam pengembangan",
      description: "Export PDF akan segera tersedia",
      variant: "default",
    });
  };

  if (authLoading) {
    return (
      <DashboardLayout title="Detail Laporan">
        <div className="flex flex-col items-center justify-center min-h-[400px] p-8">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="mt-4 text-muted-foreground">Memuat halaman...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (!user || !isInspector) {
    return (
      <DashboardLayout title="Detail Laporan">
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

  if (loading) {
    return (
      <DashboardLayout title="Detail Laporan">
        <div className="p-4 md:p-6 space-y-6">
          <div className="flex items-center gap-4">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
            <p className="text-muted-foreground">Memuat detail laporan...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!report) {
    return (
      <DashboardLayout title="Detail Laporan">
        <div className="p-4 md:p-6">
          <Alert variant="destructive">
            <AlertTitle>Laporan tidak ditemukan</AlertTitle>
            <AlertDescription>
              Laporan yang diminta tidak ditemukan atau Anda tidak memiliki akses.
            </AlertDescription>
          </Alert>
          <Button
            onClick={() => router.push('/dashboard/inspector/reports')}
            className="mt-4"
          >
            Kembali ke Daftar Laporan
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  const project = report.inspections?.projects || report.projects;
  // Handle nested clients object from query
  const clientName = project?.clients?.name || project?.client_name;
  const findingsSummary = report.findings_summary || {};

  return (
    <DashboardLayout title={`Laporan - ${report.title}`}>
      <div className="p-4 md:p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push('/dashboard/inspector/reports')}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm text-muted-foreground">{project?.name}</span>
            {getStatusBadge(report.status)}
          </div>
          <div className="flex items-center gap-2">
            {(report.status === 'draft' || report.status === 'rejected') && (
              <Button
                onClick={() => router.push(`/dashboard/inspector/reports/new?reportId=${report.id}`)}
                variant="outline"
                size="sm"
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={handlePrint}
            variant="outline"
            className="flex items-center gap-2"
          >
            <Printer className="h-4 w-4" />
            Print
          </Button>
          <Button
            onClick={handleExportPDF}
            variant="outline"
            className="flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            Export PDF
          </Button>
          <Button
            variant="outline"
            className="flex items-center gap-2"
          >
            <Share2 className="h-4 w-4" />
            Share
          </Button>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="bg-muted p-1 rounded-2xl h-auto w-full justify-start overflow-x-auto gap-1">
            <TabsTrigger value="overview" className="rounded-xl px-4 py-2.5 font-bold text-xs uppercase tracking-widest whitespace-nowrap data-[state=active]:bg-white data-[state=active]:!text-[#7c3aed] data-[state=active]:shadow-sm">Ringkasan</TabsTrigger>
            <TabsTrigger value="preview" className="rounded-xl px-4 py-2.5 font-bold text-xs uppercase tracking-widest whitespace-nowrap data-[state=active]:bg-white data-[state=active]:!text-[#7c3aed] data-[state=active]:shadow-sm">Preview Utuh</TabsTrigger>
            <TabsTrigger value="findings" className="rounded-xl px-4 py-2.5 font-bold text-xs uppercase tracking-widest whitespace-nowrap data-[state=active]:bg-white data-[state=active]:!text-[#7c3aed] data-[state=active]:shadow-sm">Temuan Detail</TabsTrigger>
            <TabsTrigger value="photos" className="rounded-xl px-4 py-2.5 font-bold text-xs uppercase tracking-widest whitespace-nowrap data-[state=active]:bg-white data-[state=active]:!text-[#7c3aed] data-[state=active]:shadow-sm">Dokumentasi</TabsTrigger>
            <TabsTrigger value="status" className="rounded-xl px-4 py-2.5 font-bold text-xs uppercase tracking-widest whitespace-nowrap data-[state=active]:bg-white data-[state=active]:!text-[#7c3aed] data-[state=active]:shadow-sm">Status & Review</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              {/* Project Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building className="h-5 w-5" />
                    Informasi Proyek
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Nama Proyek</Label>
                    <p className="text-foreground font-medium">{project?.name}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Klien</Label>
                    <p className="text-foreground">{clientName}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Lokasi</Label>
                    <p className="text-foreground flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      {project?.location}
                    </p>
                  </div>
                  {report.inspections?.scheduled_date && (
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Tanggal Inspeksi</Label>
                      <p className="text-foreground flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {formatDate(report.inspections.scheduled_date)}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Report Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Informasi Laporan
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Status</Label>
                    <div>{getStatusBadge(report.status)}</div>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Dibuat Oleh</Label>
                    <p className="text-foreground flex items-center gap-1">
                      <User className="h-4 w-4" />
                      {profile?.full_name || 'Unknown Inspector'}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Tanggal Dibuat</Label>
                    <p className="text-foreground flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      {formatDateTime(report.created_at)}
                    </p>
                  </div>
                  {report.updated_at && (
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Terakhir Diupdate</Label>
                      <p className="text-foreground">{formatDateTime(report.updated_at)}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Findings Summary */}
            <Card>
              <CardHeader>
                <CardTitle>Temuan Utama</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">Temuan Inspeksi:</h4>
                  <div className="prose max-w-none">
                    {report.findings ? (
                      <p className="whitespace-pre-wrap">{report.findings}</p>
                    ) : (
                      <Alert>
                        <AlertTriangle className="h-4 w-4" />
                        <AlertTitle>Temuan belum diisi</AlertTitle>
                      </Alert>
                    )}
                  </div>
                </div>

                <Separator />

                <div>
                  <h4 className="font-semibold mb-2">Rekomendasi:</h4>
                  <div className="prose max-w-none">
                    {report.recommendations ? (
                      <p className="whitespace-pre-wrap">{report.recommendations}</p>
                    ) : (
                      <Alert>
                        <AlertTriangle className="h-4 w-4" />
                        <AlertTitle>Rekomendasi belum diisi</AlertTitle>
                      </Alert>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Checklist Summary */}
            {Object.keys(findingsSummary).length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Ringkasan Checklist</CardTitle>
                  <CardDescription>
                    Item checklist yang termasuk dalam laporan
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {Object.entries(findingsSummary).map(([category, items]) => (
                      <div key={category} className="space-y-2">
                        <h5 className="font-semibold capitalize text-foreground">{category}</h5>
                        <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground ml-4">
                          {items.map((item, index) => (
                            <li key={index}>
                              {item.checklist_items?.item_name || item.item_id}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Full Preview Tab */}
          <TabsContent value="preview" className="space-y-8">
            <ReportContent report={report} project={project} clientName={clientName} checklistData={checklistData} photos={photos} formatDate={formatDate} formatDateTime={formatDateTime} />
          </TabsContent>

          {/* Findings Tab */}
          <TabsContent value="findings">
            <Card>
              <CardHeader>
                <CardTitle>Detail Temuan Checklist</CardTitle>
                <CardDescription>
                  Data lengkap dari checklist yang dipilih
                </CardDescription>
              </CardHeader>
              <CardContent>
                {checklistData.length === 0 ? (
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Tidak ada data checklist</AlertTitle>
                    <AlertDescription>
                      Tidak ada item checklist yang dipilih untuk laporan ini.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <div className="space-y-4">
                    {checklistData.map((item) => (
                      <Card key={item.id} className="border-border">
                        <CardContent className="p-4">
                          <div className="space-y-3">
                            <div className="flex items-start justify-between">
                              <div>
                                <h4 className="font-semibold text-foreground">
                                  {item.checklist_items?.item_name || item.item_id}
                                </h4>
                                <div className="flex items-center gap-2 mt-1">
                                  <Badge variant="outline" className="text-xs">
                                    {item.checklist_items?.category}
                                  </Badge>
                                  <span className="text-xs text-muted-foreground">
                                    {item.checklist_items?.template_title}
                                  </span>
                                </div>
                              </div>
                              <Badge
                                variant={item.status === 'completed' ? 'default' : 'outline'}
                                className={
                                  item.status === 'completed'
                                    ? 'bg-green-100 text-green-800'
                                    : 'bg-yellow-100 text-yellow-800'
                                }
                              >
                                {item.status === 'completed' ? 'Selesai' : 'Dalam Proses'}
                              </Badge>
                            </div>

                            {item.response && (
                              <div className="bg-muted/50 p-3 rounded-md">
                                <h5 className="font-medium text-sm mb-2">Response:</h5>
                                <pre className="text-sm whitespace-pre-wrap">
                                  {JSON.stringify(item.response, null, 2)}
                                </pre>
                              </div>
                            )}

                            {item.notes && (
                              <div>
                                <h5 className="font-medium text-sm mb-1">Catatan:</h5>
                                <p className="text-sm text-muted-foreground">{item.notes}</p>
                              </div>
                            )}

                            <div className="text-xs text-muted-foreground flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              Diisi: {formatDateTime(item.responded_at)}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Photos Tab */}
          <TabsContent value="photos">
            <Card>
              <CardHeader>
                <CardTitle>Dokumentasi Foto</CardTitle>
                <CardDescription>
                  Foto dokumentasi dari inspeksi
                </CardDescription>
              </CardHeader>
              <CardContent>
                {photos.length === 0 ? (
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Belum ada dokumentasi foto</AlertTitle>
                    <AlertDescription>
                      Tidak ada foto dokumentasi untuk inspeksi ini.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {photos.map((photo) => (
                      <Card key={photo.id} className="overflow-hidden">
                        <CardContent className="p-0">
                          <img
                            src={photo.photo_url}
                            alt={photo.caption || 'Dokumentasi inspeksi'}
                            className="w-full h-48 object-cover"
                          />
                          <div className="p-3 space-y-2">
                            {photo.caption && (
                              <p className="text-sm font-medium text-foreground">
                                {photo.caption}
                              </p>
                            )}
                            {photo.latitude && photo.longitude && (
                              <div className="text-xs text-muted-foreground flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                GPS: {photo.latitude.toFixed(6)}, {photo.longitude.toFixed(6)}
                              </div>
                            )}
                            <div className="text-xs text-muted-foreground">
                              {formatDateTime(photo.captured_at || photo.created_at)}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Status Tab */}
          <TabsContent value="status">
            <Card>
              <CardHeader>
                <CardTitle>Status & Review</CardTitle>
                <CardDescription>
                  Track status dan review laporan
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Status Timeline */}
                <div className="space-y-4">
                  <h4 className="font-semibold">Timeline Status</h4>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">Dibuat</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDateTime(report.created_at)}
                        </p>
                      </div>
                      <Badge variant="outline">Draft</Badge>
                    </div>

                    {report.status !== 'draft' && (
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                        <div className="flex-1">
                          <p className="text-sm font-medium">Submitted</p>
                          <p className="text-xs text-muted-foreground">
                            {report.updated_at ? formatDateTime(report.updated_at) : 'N/A'}
                          </p>
                        </div>
                        <Badge variant="secondary">Submitted</Badge>
                      </div>
                    )}

                    {(report.status === 'approved' || report.status === 'rejected') && (
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full ${report.status === 'approved' ? 'bg-green-500' : 'bg-red-500'
                          }`}></div>
                        <div className="flex-1">
                          <p className="text-sm font-medium">
                            {report.status === 'approved' ? 'Approved' : 'Rejected'}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {report.project_lead_reviewed_at ? formatDateTime(report.project_lead_reviewed_at) : 'N/A'}
                          </p>
                          {report.project_lead_notes && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Catatan: {report.project_lead_notes}
                            </p>
                          )}
                        </div>
                        <Badge variant={report.status === 'approved' ? 'default' : 'destructive'}>
                          {report.status === 'approved' ? 'Approved' : 'Rejected'}
                        </Badge>
                      </div>
                    )}
                  </div>
                </div>

                {/* Review Information */}
                {report.project_lead_reviewed && (
                  <div className="space-y-3">
                    <h4 className="font-semibold">Review Project Lead</h4>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <Label className="text-sm font-medium text-muted-foreground">Status Review</Label>
                        <p className="text-foreground">
                          {report.project_lead_approved ? 'Disetujui' : 'Ditolak'}
                        </p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-muted-foreground">Tanggal Review</Label>
                        <p className="text-foreground">
                          {report.project_lead_reviewed_at ? formatDateTime(report.project_lead_reviewed_at) : 'N/A'}
                        </p>
                      </div>
                    </div>
                    {report.project_lead_notes && (
                      <div>
                        <Label className="text-sm font-medium text-muted-foreground">Catatan Review</Label>
                        <p className="text-foreground whitespace-pre-wrap mt-1">
                          {report.project_lead_notes}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Next Actions */}
                <Alert>
                  <AlertTitle>Status Saat Ini: {getStatusBadge(report.status)}</AlertTitle>
                  <AlertDescription className="space-y-2">
                    {report.status === 'draft' && (
                      <p>Laporan masih dalam draft. Anda dapat mengedit dan submit ke admin team.</p>
                    )}
                    {report.status === 'submitted' && (
                      <p>Laporan telah submitted dan menunggu review dari admin team.</p>
                    )}
                    {report.status === 'under_review' && (
                      <p>Laporan sedang dalam proses review oleh project lead.</p>
                    )}
                    {report.status === 'approved' && (
                      <p>Laporan telah disetujui oleh project lead.</p>
                    )}
                    {report.status === 'rejected' && (
                      <p>Laporan ditolak. Silakan perbaiki berdasarkan catatan review.</p>
                    )}
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
      {/* Styles for printing */}
      <style jsx global>{`
        @media print {
          /* Hide everything by default */
          body > * {
            visibility: hidden;
          }
          
          /* Only show the print container */
          #printable-report, #printable-report * {
            visibility: visible;
          }

          /* Position the print container absolutely to take up the full page */
          #printable-report {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            margin: 0;
            padding: 0;
            background: white;
            z-index: 9999;
          }

          /* Hide UI elements that might leak through */
          header, nav, aside, .fixed, .sticky {
            display: none !important;
          }
        }
      `}</style>

      {/* Hidden container for printing */}
      <div id="printable-report" className="hidden print:block">
        <ReportContent
          report={report}
          project={project}
          clientName={clientName}
          checklistData={checklistData}
          photos={photos}
          formatDate={formatDate}
          formatDateTime={formatDateTime}
        />
      </div>
    </DashboardLayout>
  );
}
