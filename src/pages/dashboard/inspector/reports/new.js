import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import {
  ArrowLeft,
  FileText,
  Upload,
  Camera,
  MapPin,
  Building,
  Calendar,
  User,
  CheckCircle,
  AlertTriangle,
  Loader2,
  Plus,
  X
} from 'lucide-react';

import DashboardLayout from '@/components/layouts/DashboardLayout';
import { supabase } from '@/utils/supabaseClient';
import { useAuth } from '@/context/AuthContext';

export default function NewInspectionReport() {
  const router = useRouter();
  const { inspectionId } = router.query;
  const { toast } = useToast();
  const { user, profile, loading: authLoading, isInspector } = useAuth();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [inspection, setInspection] = useState(null);
  const [checklistData, setChecklistData] = useState([]);
  const [photos, setPhotos] = useState([]);

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    findings: '',
    recommendations: '',
    status: 'draft',
    selectedFindings: []
  });

  // Load inspection data
  useEffect(() => {
    const loadInspectionData = async () => {
      if (!user?.id || !isInspector) return;

      try {
        setLoading(true);

        // Load inspection detail
        const { data: inspectionData, error: inspectionError } = await supabase
          .from('inspections')
          .select(`
            *,
            projects (
              id,
              name,
              location,
              client_name,
              description
            )
          `)
          .eq('id', inspectionId)
          .eq('inspector_id', user.id)
          .single();

        if (inspectionError) throw inspectionError;
        setInspection(inspectionData);

        // Load checklist responses
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
          .eq('inspection_id', inspectionId);

        if (checklistError) throw checklistError;
        setChecklistData(checklistResponses || []);

        // Load inspection photos
        const { data: photosData, error: photosError } = await supabase
          .from('inspection_photos')
          .select('*')
          .eq('inspection_id', inspectionId)
          .order('uploaded_at', { ascending: false });

        if (photosError) throw photosError;
        setPhotos(photosData || []);

        // Set default title
        if (inspectionData) {
          setFormData(prev => ({
            ...prev,
            title: `Laporan Inspeksi - ${inspectionData.projects?.name || 'Proyek'} - ${new Date().toLocaleDateString('id-ID')}`
          }));
        }

      } catch (err) {
        console.error('Error loading inspection data:', err);
        toast({
          title: "Gagal memuat data inspeksi",
          description: err.message,
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    if (inspectionId && user && isInspector) {
      loadInspectionData();
    }
  }, [inspectionId, user, isInspector, toast]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const toggleFindingSelection = (itemId) => {
    setFormData(prev => {
      const isSelected = prev.selectedFindings.includes(itemId);
      return {
        ...prev,
        selectedFindings: isSelected
          ? prev.selectedFindings.filter(id => id !== itemId)
          : [...prev.selectedFindings, itemId]
      };
    });
  };

  const getFindingsSummary = () => {
    const selectedItems = checklistData.filter(item => 
      formData.selectedFindings.includes(item.id)
    );

    const findingsByCategory = {};
    selectedItems.forEach(item => {
      const category = item.checklist_items?.category || 'lainnya';
      if (!findingsByCategory[category]) {
        findingsByCategory[category] = [];
      }
      findingsByCategory[category].push(item);
    });

    return findingsByCategory;
  };

  const generateReport = async (status = 'draft') => {
    if (!inspectionId || !user?.id) {
      toast({
        title: "Data tidak lengkap",
        description: "Inspection ID atau user tidak tersedia",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);

    try {
      const reportData = {
        inspection_id: inspectionId,
        project_id: inspection?.project_id,
        inspector_id: user.id,
        title: formData.title,
        findings: formData.findings,
        recommendations: formData.recommendations,
        status: status,
        findings_summary: getFindingsSummary(),
        selected_findings_ids: formData.selectedFindings,
        created_at: new Date().toISOString()
      };

      const { data: savedReport, error } = await supabase
        .from('inspection_reports')
        .insert([reportData])
        .select()
        .single();

      if (error) throw error;

      toast({
        title: status === 'draft' ? "✅ Draft disimpan" : "✅ Laporan dikirim",
        description: status === 'draft' 
          ? "Laporan berhasil disimpan sebagai draft" 
          : "Laporan berhasil dikirim ke admin team",
        variant: "default",
      });

      // Redirect to reports list or the created report
      router.push(`/dashboard/inspector/reports/${savedReport.id}`);

    } catch (err) {
      console.error('Error generating report:', err);
      toast({
        title: "Gagal membuat laporan",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      completed: { variant: 'default', label: 'Selesai', color: 'bg-green-100 text-green-800' },
      in_progress: { variant: 'secondary', label: 'Dalam Proses', color: 'bg-orange-100 text-orange-800' },
      scheduled: { variant: 'outline', label: 'Dijadwalkan', color: 'bg-blue-100 text-blue-800' }
    };
    
    const config = statusConfig[status] || { variant: 'outline', label: status, color: '' };
    return <Badge variant={config.variant} className={config.color}>{config.label}</Badge>;
  };

  if (authLoading) {
    return (
      <DashboardLayout title="Buat Laporan Baru">
        <div className="flex flex-col items-center justify-center min-h-[400px] p-8">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="mt-4 text-muted-foreground">Memuat halaman...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (!user || !isInspector) {
    return (
      <DashboardLayout title="Buat Laporan Baru">
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

  if (!inspectionId) {
    return (
      <DashboardLayout title="Buat Laporan Baru">
        <div className="p-4 md:p-6">
          <Alert variant="destructive">
            <AlertTitle>Inspection ID tidak tersedia</AlertTitle>
            <AlertDescription>
              Silakan pilih inspeksi terlebih dahulu dari halaman jadwal.
            </AlertDescription>
          </Alert>
          <Button 
            onClick={() => router.push('/dashboard/inspector/schedules')}
            className="mt-4"
          >
            Lihat Jadwal
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  if (loading) {
    return (
      <DashboardLayout title="Buat Laporan Baru">
        <div className="p-4 md:p-6 space-y-6">
          <div className="flex items-center gap-4">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
            <p className="text-muted-foreground">Memuat data inspeksi...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!inspection) {
    return (
      <DashboardLayout title="Buat Laporan Baru">
        <div className="p-4 md:p-6">
          <Alert variant="destructive">
            <AlertTitle>Inspeksi tidak ditemukan</AlertTitle>
            <AlertDescription>
              Inspeksi yang diminta tidak ditemukan atau Anda tidak memiliki akses.
            </AlertDescription>
          </Alert>
        </div>
      </DashboardLayout>
    );
  }

  const findingsSummary = getFindingsSummary();

  return (
    <DashboardLayout title="Buat Laporan Baru">
      <div className="p-4 md:p-6 space-y-4">
        {/* Sub-header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push(`/dashboard/inspector/inspections/${inspectionId}`)}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm text-muted-foreground">
              Proyek: {inspection.projects?.name}
            </span>
            {getStatusBadge(inspection.status)}
          </div>
        </div>

        <Tabs defaultValue="basic" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="basic">Informasi Dasar</TabsTrigger>
            <TabsTrigger value="findings">Temuan Checklist</TabsTrigger>
            <TabsTrigger value="review">Review & Submit</TabsTrigger>
          </TabsList>

          {/* Basic Information Tab */}
          <TabsContent value="basic" className="space-y-6">
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
                    <p className="text-foreground font-medium">{inspection.projects?.name}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Klien</Label>
                    <p className="text-foreground">{inspection.projects?.client_name}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Lokasi</Label>
                    <p className="text-foreground flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      {inspection.projects?.location}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Tanggal Inspeksi</Label>
                    <p className="text-foreground flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      {new Date(inspection.scheduled_date).toLocaleDateString('id-ID', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </p>
                  </div>
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
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">Judul Laporan *</Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) => handleInputChange('title', e.target.value)}
                      placeholder="Masukkan judul laporan..."
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="status">Status Laporan</Label>
                    <Select value={formData.status} onValueChange={(value) => handleInputChange('status', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="submitted">Submitted</SelectItem>
                        <SelectItem value="under_review">Under Review</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="bg-muted/50 p-3 rounded-md">
                    <div className="flex items-center gap-2 text-sm">
                      <User className="h-4 w-4" />
                      <span>Inspector: {profile?.full_name || 'Unknown'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm mt-1">
                      <Calendar className="h-4 w-4" />
                      <span>Dibuat: {new Date().toLocaleDateString('id-ID')}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Findings Input */}
            <Card>
              <CardHeader>
                <CardTitle>Temuan Utama</CardTitle>
                <CardDescription>
                  Deskripsikan temuan utama dari inspeksi ini
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="findings">Temuan Inspeksi *</Label>
                    <Textarea
                      id="findings"
                      value={formData.findings}
                      onChange={(e) => handleInputChange('findings', e.target.value)}
                      placeholder="Deskripsikan temuan-temuan penting dari inspeksi..."
                      rows={6}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="recommendations">Rekomendasi *</Label>
                    <Textarea
                      id="recommendations"
                      value={formData.recommendations}
                      onChange={(e) => handleInputChange('recommendations', e.target.value)}
                      placeholder="Berikan rekomendasi perbaikan berdasarkan temuan..."
                      rows={4}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Findings Tab */}
          <TabsContent value="findings" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Pilih Temuan dari Checklist</CardTitle>
                <CardDescription>
                  Pilih item checklist yang akan dimasukkan dalam laporan
                </CardDescription>
              </CardHeader>
              <CardContent>
                {checklistData.length === 0 ? (
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Belum ada checklist</AlertTitle>
                    <AlertDescription>
                      Isi checklist terlebih dahulu sebelum membuat laporan.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">
                        {formData.selectedFindings.length} dari {checklistData.length} item dipilih
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const allIds = checklistData.map(item => item.id);
                          setFormData(prev => ({
                            ...prev,
                            selectedFindings: prev.selectedFindings.length === allIds.length ? [] : allIds
                          }));
                        }}
                      >
                        {formData.selectedFindings.length === checklistData.length ? 'Batal Pilih Semua' : 'Pilih Semua'}
                      </Button>
                    </div>

                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {checklistData.map((item) => (
                        <Card 
                          key={item.id}
                          className={`cursor-pointer transition-all ${
                            formData.selectedFindings.includes(item.id)
                              ? 'border-primary bg-primary/5'
                              : 'hover:bg-accent/50'
                          }`}
                          onClick={() => toggleFindingSelection(item.id)}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-start gap-3">
                              <div className="flex items-center h-5 mt-0.5">
                                <input
                                  type="checkbox"
                                  checked={formData.selectedFindings.includes(item.id)}
                                  onChange={() => {}}
                                  className="w-4 h-4 text-primary border-border rounded"
                                />
                              </div>
                              <div className="flex-1 space-y-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium text-foreground">
                                    {item.checklist_items?.item_name || item.item_id}
                                  </span>
                                  <Badge variant="outline" className="text-xs">
                                    {item.checklist_items?.category}
                                  </Badge>
                                </div>
                                <p className="text-sm text-muted-foreground">
                                  Template: {item.checklist_items?.template_title}
                                </p>
                                {item.response && (
                                  <div className="mt-2 p-2 bg-muted rounded text-sm">
                                    <strong>Response:</strong> {JSON.stringify(item.response)}
                                  </div>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Photos Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Camera className="h-5 w-5" />
                  Dokumentasi Foto
                </CardTitle>
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
                      Tambahkan foto dokumentasi melalui halaman checklist.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {photos.slice(0, 6).map((photo) => (
                      <div key={photo.id} className="space-y-2">
                        <img
                          src={photo.photo_url}
                          alt={photo.caption || 'Dokumentasi inspeksi'}
                          className="w-full h-24 object-cover rounded-md border"
                        />
                        {photo.caption && (
                          <p className="text-xs text-muted-foreground truncate">
                            {photo.caption}
                          </p>
                        )}
                      </div>
                    ))}
                    {photos.length > 6 && (
                      <div className="flex items-center justify-center bg-muted rounded-md h-24">
                        <span className="text-sm text-muted-foreground">
                          +{photos.length - 6} foto lainnya
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Review Tab */}
          <TabsContent value="review" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Review Laporan</CardTitle>
                <CardDescription>
                  Periksa kembali laporan sebelum mengirim
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Summary */}
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-1 text-center p-4 bg-muted rounded-lg">
                    <div className="text-2xl font-bold text-foreground">
                      {checklistData.length}
                    </div>
                    <div className="text-sm text-muted-foreground">Total Checklist</div>
                  </div>
                  <div className="space-y-1 text-center p-4 bg-muted rounded-lg">
                    <div className="text-2xl font-bold text-foreground">
                      {formData.selectedFindings.length}
                    </div>
                    <div className="text-sm text-muted-foreground">Temuan Dipilih</div>
                  </div>
                  <div className="space-y-1 text-center p-4 bg-muted rounded-lg">
                    <div className="text-2xl font-bold text-foreground">
                      {photos.length}
                    </div>
                    <div className="text-sm text-muted-foreground">Dokumentasi</div>
                  </div>
                </div>

                {/* Findings Summary */}
                {Object.keys(findingsSummary).length > 0 && (
                  <div className="space-y-4">
                    <h4 className="font-semibold">Ringkasan Temuan per Kategori:</h4>
                    {Object.entries(findingsSummary).map(([category, items]) => (
                      <div key={category} className="space-y-2">
                        <h5 className="font-medium capitalize">{category}</h5>
                        <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                          {items.map(item => (
                            <li key={item.id}>
                              {item.checklist_items?.item_name || item.item_id}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-3 pt-4">
                  <Button
                    onClick={() => generateReport('draft')}
                    disabled={submitting || !formData.title}
                    variant="outline"
                    className="flex-1 flex items-center gap-2"
                  >
                    {submitting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <FileText className="h-4 w-4" />
                    )}
                    Simpan Draft
                  </Button>
                  
                  <Button
                    onClick={() => generateReport('submitted')}
                    disabled={submitting || !formData.title || !formData.findings || !formData.recommendations}
                    className="flex-1 flex items-center gap-2"
                  >
                    {submitting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <CheckCircle className="h-4 w-4" />
                    )}
                    Submit ke Admin
                  </Button>
                </div>

                {(!formData.findings || !formData.recommendations) && (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Data belum lengkap</AlertTitle>
                    <AlertDescription>
                      Temuan dan rekomendasi harus diisi sebelum submit ke admin.
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}