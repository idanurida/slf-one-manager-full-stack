"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
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
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';

// Lucide Icons
import { 
  FileText, Clock, Activity, CheckCircle, MapPin, Camera, 
  Play, Eye, Calendar, Building, User, AlertTriangle,
  CheckSquare, ListChecks, ArrowRight, Search, Loader2,
  Navigation, WifiOff, Home, Target, ClipboardCheck
} from 'lucide-react';

// Other Imports
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { supabase } from '@/utils/supabaseClient';
import { useAuth } from '@/context/AuthContext';

const InspectorChecklistDashboard = () => {
  const router = useRouter();
  const { toast } = useToast();
  const { user, profile, loading: authLoading, isInspector } = useAuth();

  const [inspections, setInspections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingStates, setSavingStates] = useState({});
  
  // State untuk permission dan location
  const [permissionDialog, setPermissionDialog] = useState(false);
  const [locationDialog, setLocationDialog] = useState(false);
  const [currentInspection, setCurrentInspection] = useState(null);
  const [locationNote, setLocationNote] = useState('');
  const [isGettingLocation, setIsGettingLocation] = useState(false);

  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');

  // Fetch inspections data - DIPERBAIKI query tanpa building_type
  useEffect(() => {
    const fetchInspections = async () => {
      if (!user?.id || !isInspector) return;

      setLoading(true);
      try {
        console.log('🔄 Fetching inspections for user:', user.id);

        const { data: inspectionData, error: inspectionError } = await supabase
          .from('inspections')
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
            projects!fk_inspections_projects(
              name, 
              address, 
              city,
              client_id,
              clients(name)
            ),
            profiles!inspections_inspector_id_fkey(
              full_name, 
              specialization
            )
          `)
          .eq('inspector_id', user.id)
          .in('status', ['scheduled', 'in_progress'])
          .order('scheduled_date', { ascending: true });

        if (inspectionError) {
          console.error('❌ Fetch inspections error:', inspectionError);
          throw inspectionError;
        }

        console.log('✅ Inspections loaded:', inspectionData?.length);
        setInspections(inspectionData || []);

      } catch (err) {
        console.error('❌ Fetch inspections failed:', err);
        toast({
          title: "Gagal memuat data inspeksi",
          description: err.message,
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    if (user && isInspector) {
      fetchInspections();
    }
  }, [user, isInspector, toast]);

  // Stats calculation
  const stats = useMemo(() => {
    const total = inspections.length;
    const scheduled = inspections.filter(i => i.status === 'scheduled').length;
    const inProgress = inspections.filter(i => i.status === 'in_progress').length;
    const today = inspections.filter(i => {
      const inspectionDate = new Date(i.scheduled_date);
      const today = new Date();
      return inspectionDate.toDateString() === today.toDateString();
    }).length;

    return { total, scheduled, inProgress, today };
  }, [inspections]);

  // Filter inspections
  const filteredInspections = useMemo(() => {
    let result = inspections;

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(inspection =>
        inspection.projects?.name?.toLowerCase().includes(term) ||
        inspection.projects?.address?.toLowerCase().includes(term) ||
        inspection.projects?.clients?.name?.toLowerCase().includes(term)
      );
    }

    if (selectedStatus !== 'all') {
      result = result.filter(inspection => inspection.status === selectedStatus);
    }

    return result;
  }, [inspections, searchTerm, selectedStatus]);

  // ✅ FUNGSI BARU: Request camera permission
  const requestCameraPermission = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      // Stop semua track setelah dapat permission
      stream.getTracks().forEach(track => track.stop());
      return true;
    } catch (err) {
      console.warn('Camera permission denied:', err);
      return false;
    }
  };

  // ✅ FUNGSI BARU: Get current location dengan fallback
  const getCurrentLocation = async () => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        resolve({ success: false, error: 'Geolocation tidak didukung' });
        return;
      }

      setIsGettingLocation(true);

      navigator.geolocation.getCurrentPosition(
        (position) => {
          setIsGettingLocation(false);
          resolve({
            success: true,
            location: {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              accuracy: position.coords.accuracy,
              timestamp: new Date().toISOString()
            }
          });
        },
        (error) => {
          setIsGettingLocation(false);
          let errorMessage = 'Gagal mendapatkan lokasi';
          
          switch(error.code) {
            case error.PERMISSION_DENIED:
              errorMessage = 'Izin lokasi ditolak';
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage = 'Informasi lokasi tidak tersedia';
              break;
            case error.TIMEOUT:
              errorMessage = 'Waktu permintaan lokasi habis';
              break;
          }
          
          resolve({ success: false, error: errorMessage });
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        }
      );
    });
  };

  // ✅ FUNGSI BARU: Start inspection dengan permission flow
  const handleStartInspection = async (inspection) => {
    setCurrentInspection(inspection);
    
    // 1. Request camera permission dulu
    const cameraGranted = await requestCameraPermission();
    
    if (!cameraGranted) {
      toast({
        title: "Izin kamera diperlukan",
        description: "Anda perlu mengizinkan akses kamera untuk dokumentasi inspeksi",
        variant: "destructive",
      });
      return;
    }

    // 2. Tampilkan dialog untuk mendapatkan lokasi
    setLocationDialog(true);
  };

  // ✅ FUNGSI BARU: Process location dengan opsi tanpa GPS
  const processLocationAndStart = async (withGPS = true) => {
    if (!currentInspection) return;

    let locationData = null;

    if (withGPS) {
      // Coba dapatkan lokasi GPS
      const locationResult = await getCurrentLocation();
      
      if (locationResult.success) {
        locationData = {
          type: 'gps',
          data: locationResult.location,
          note: null
        };
      } else {
        // Jika GPS gagal, tawarkan opsi tanpa GPS
        toast({
          title: "GPS tidak tersedia",
          description: "Silakan tambahkan keterangan lokasi manual",
          variant: "default",
        });
        return; // Tetap di dialog untuk input manual
      }
    } else {
      // Gunakan lokasi manual
      if (!locationNote.trim()) {
        toast({
          title: "Keterangan lokasi diperlukan",
          description: "Silakan isi keterangan lokasi manual",
          variant: "destructive",
        });
        return;
      }

      locationData = {
        type: 'manual',
        data: null,
        note: locationNote.trim()
      };
    }

    // Update status inspeksi dan simpan data lokasi
    const success = await updateInspectionStatus(
      currentInspection.id, 
      'in_progress',
      locationData
    );

    if (success) {
      setLocationDialog(false);
      setLocationNote('');
      
      // Redirect ke halaman checklist
      setTimeout(() => {
        router.push(`/dashboard/inspector/inspections/${currentInspection.id}/checklist`);
      }, 1000);
    }
  };

  // ✅ PERBAIKAN: Fungsi UPSERT yang aman untuk update status inspeksi
  const updateInspectionStatus = async (inspectionId, newStatus, locationData = null) => {
    if (!user) return false;

    setSavingStates(prev => ({ ...prev, [inspectionId]: true }));

    try {
      console.log(`🔄 Updating inspection ${inspectionId} to ${newStatus}`);

      // 1. Cek apakah inspeksi ada
      const { data: existingInspection, error: checkError } = await supabase
        .from('inspections')
        .select('id, status')
        .eq('id', inspectionId)
        .single();

      if (checkError && checkError.code !== 'PGRST116') {
        throw checkError;
      }

      let error;
      const updateData = {
        status: newStatus,
        updated_at: new Date().toISOString(),
        ...(locationData && { inspection_location: locationData })
      };

      // Tambahkan start_time jika mulai inspeksi
      if (newStatus === 'in_progress') {
        updateData.start_time = new Date().toISOString();
      }

      // Tambahkan end_time jika selesai inspeksi
      if (newStatus === 'completed') {
        updateData.end_time = new Date().toISOString();
      }

      if (existingInspection) {
        // 2. Jika ada, UPDATE
        const { error: updateError } = await supabase
          .from('inspections')
          .update(updateData)
          .eq('id', inspectionId);
        error = updateError;
      } else {
        // 3. Jika tidak ada (seharusnya tidak terjadi), INSERT
        const { error: insertError } = await supabase
          .from('inspections')
          .insert([{
            id: inspectionId,
            ...updateData,
            inspector_id: user.id
          }]);
        error = insertError;
      }

      if (error) {
        console.error('❌ Update inspection error:', error);
        throw error;
      }

      // Update local state
      setInspections(prev => 
        prev.map(inspection => 
          inspection.id === inspectionId 
            ? { 
                ...inspection, 
                status: newStatus,
                ...updateData
              }
            : inspection
        )
      );

      toast({
        title: "✅ Inspeksi dimulai",
        description: `Siap melakukan inspeksi ${currentInspection?.projects?.name}`,
        variant: "default",
      });

      return true;

    } catch (err) {
      console.error('❌ Failed to update inspection:', err);
      toast({
        title: "❌ Gagal memulai inspeksi",
        description: err.message || "Terjadi kesalahan saat menyimpan",
        variant: "destructive",
      });
      return false;
    } finally {
      setSavingStates(prev => ({ ...prev, [inspectionId]: false }));
    }
  };

  // Fungsi continue inspection
  const handleContinueInspection = async (inspectionId) => {
    // Langsung redirect ke halaman checklist
    router.push(`/dashboard/inspector/inspections/${inspectionId}/checklist`);
  };

  const handleViewDetails = (inspectionId) => {
    router.push(`/dashboard/inspector/my-inspections/${inspectionId}`);
  };

  // Helper functions
  const formatDate = (dateString) => {
    if (!dateString) return '-';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });
    } catch (e) {
      return dateString;
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      scheduled: { variant: 'secondary', label: 'Terjadwal' },
      in_progress: { variant: 'default', label: 'Berlangsung' },
      completed: { variant: 'success', label: 'Selesai' }
    };

    const config = statusConfig[status] || { variant: 'secondary', label: status };

    return (
      <Badge variant={config.variant} className="capitalize">
        {config.label}
      </Badge>
    );
  };

  const isSaving = (inspectionId) => savingStates[inspectionId] || false;

  // Loading and auth states
  if (authLoading) {
    return (
      <DashboardLayout title="Checklist Inspector">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-muted-foreground">Memuat...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!user || !isInspector) {
    return (
      <DashboardLayout title="Checklist Inspector">
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
    <DashboardLayout title="Checklist Inspector">
      <div className="p-6 space-y-6">
        {/* Location Permission Dialog */}
        <Dialog open={locationDialog} onOpenChange={setLocationDialog}>
          <DialogContent className="sm:max-w-md bg-card-solid">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Navigation className="w-5 h-5" />
                Konfirmasi Lokasi Inspeksi
              </DialogTitle>
              <DialogDescription>
                Untuk {currentInspection?.projects?.name || 'inspeksi ini'}, konfirmasi lokasi Anda.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {/* GPS Location Option */}
              <div className="space-y-3">
                <Button
                  onClick={() => processLocationAndStart(true)}
                  disabled={isGettingLocation}
                  className="w-full justify-start h-auto p-4"
                  variant="outline"
                >
                  <div className="flex items-center gap-3 text-left">
                    <div className="p-2 bg-green-100 rounded-full">
                      <MapPin className="w-5 h-5 text-green-600" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">Gunakan GPS Lokasi</p>
                      <p className="text-sm text-muted-foreground">
                        Dapatkan koordinat GPS saat ini
                      </p>
                    </div>
                    {isGettingLocation && (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    )}
                  </div>
                </Button>

                <Separator />

                {/* Manual Location Option */}
                <div className="space-y-2">
                  <Button
                    onClick={() => processLocationAndStart(false)}
                    className="w-full justify-start h-auto p-4"
                    variant="outline"
                  >
                    <div className="flex items-center gap-3 text-left">
                      <div className="p-2 bg-orange-100 rounded-full">
                        <WifiOff className="w-5 h-5 text-orange-600" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">Lokasi Manual</p>
                        <p className="text-sm text-muted-foreground">
                          Tidak ada sinyal GPS
                        </p>
                      </div>
                    </div>
                  </Button>

                  <div className="pl-14 pr-4">
                    <Label htmlFor="location-note" className="text-sm">
                      Keterangan lokasi:
                    </Label>
                    <Textarea
                      id="location-note"
                      placeholder="Contoh: Di dalam gedung lantai 5, Parkir basement B2, Area tertutup sinyal, dll."
                      value={locationNote}
                      onChange={(e) => setLocationNote(e.target.value)}
                      className="mt-1 text-sm"
                      rows={3}
                    />
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setLocationDialog(false);
                  setLocationNote('');
                  setCurrentInspection(null);
                }}
              >
                Batal
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Stats Cards dengan warna soft - SESUAI GLOBAL CSS */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Total Inspections */}
          <Card className="bg-card-solid border-blue-200 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-primary text-sm font-medium mb-1">Total Inspeksi</p>
                  <p className="text-2xl font-bold text-foreground">{stats.total}</p>
                  <p className="text-muted-foreground text-xs mt-1">Semua penugasan aktif</p>
                </div>
                <div className="p-3 bg-primary rounded-full">
                  <FileText className="w-5 h-5 text-primary-foreground" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Scheduled Today */}
          <Card className="bg-card-solid border-emerald-200 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-secondary text-sm font-medium mb-1">Hari Ini</p>
                  <p className="text-2xl font-bold text-foreground">{stats.today}</p>
                  <p className="text-muted-foreground text-xs mt-1">Jadwal hari ini</p>
                </div>
                <div className="p-3 bg-secondary rounded-full">
                  <Calendar className="w-5 h-5 text-secondary-foreground" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* In Progress */}
          <Card className="bg-card-solid border-amber-200 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-amber-600 text-sm font-medium mb-1">Berlangsung</p>
                  <p className="text-2xl font-bold text-foreground">{stats.inProgress}</p>
                  <p className="text-muted-foreground text-xs mt-1">Sedang dikerjakan</p>
                </div>
                <div className="p-3 bg-amber-500 rounded-full">
                  <Activity className="w-5 h-5 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Scheduled */}
          <Card className="bg-card-solid border-violet-200 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-primary text-sm font-medium mb-1">Terjadwal</p>
                  <p className="text-2xl font-bold text-foreground">{stats.scheduled}</p>
                  <p className="text-muted-foreground text-xs mt-1">Menunggu dikerjakan</p>
                </div>
                <div className="p-3 bg-primary rounded-full">
                  <Clock className="w-5 h-5 text-primary-foreground" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters Section - SESUAI GLOBAL CSS */}
        <Card className="bg-card-solid border-border shadow-sm">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
              <div className="relative flex-1 w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Cari proyek, alamat, atau klien..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-background"
                />
              </div>
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger className="w-full sm:w-[180px] bg-background">
                  <SelectValue placeholder="Filter Status" />
                </SelectTrigger>
                <SelectContent className="select-content">
                  <SelectItem value="all" className="select-item">Semua Status</SelectItem>
                  <SelectItem value="scheduled" className="select-item">Terjadwal</SelectItem>
                  <SelectItem value="in_progress" className="select-item">Berlangsung</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Inspections Table - SESUAI GLOBAL CSS */}
        <Card className="bg-card-solid border-border shadow-sm">
          <CardContent className="p-0">
            <div className="p-6 border-b border-border">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h2 className="text-xl font-semibold text-foreground">Daftar Inspeksi</h2>
                  <p className="text-muted-foreground text-sm mt-1">
                    {filteredInspections.length} dari {inspections.length} inspeksi
                  </p>
                </div>
                <Badge variant="outline" className="px-3 py-1.5 text-sm bg-accent/50">
                  <Target className="w-3 h-3 mr-1" />
                  {profile?.full_name || 'Inspector'}
                </Badge>
              </div>
            </div>

            {loading ? (
              <div className="p-6 space-y-4">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-16 bg-muted rounded-lg animate-pulse"></div>
                ))}
              </div>
            ) : filteredInspections.length > 0 ? (
              <div className="overflow-hidden">
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow>
                      <TableHead className="font-semibold text-foreground">Proyek</TableHead>
                      <TableHead className="font-semibold text-foreground">Klien</TableHead>
                      <TableHead className="font-semibold text-foreground">Tanggal</TableHead>
                      <TableHead className="font-semibold text-foreground">Alamat</TableHead>
                      <TableHead className="font-semibold text-foreground">Status</TableHead>
                      <TableHead className="font-semibold text-foreground text-center">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredInspections.map((inspection) => (
                      <TableRow key={inspection.id} className="hover:bg-accent/50 transition-colors">
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-primary/10 rounded-full">
                              <Home className="w-4 h-4 text-primary" />
                            </div>
                            <div>
                              <p className="font-medium text-foreground">{inspection.projects?.name || '-'}</p>
                              <p className="text-xs text-muted-foreground mt-1">
                                {inspection.profiles?.specialization?.replace(/_/g, ' ') || 'Inspector'}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-foreground">
                          {inspection.projects?.clients?.name || '-'}
                        </TableCell>
                        <TableCell className="text-foreground">
                          {formatDate(inspection.scheduled_date)}
                        </TableCell>
                        <TableCell>
                          <p className="text-sm text-muted-foreground max-w-[200px] truncate">
                            {inspection.projects?.address || '-'}
                          </p>
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(inspection.status)}
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleViewDetails(inspection.id)}
                              className="bg-background border-border hover:bg-accent"
                            >
                              <Eye className="w-4 h-4 mr-1" />
                              Detail
                            </Button>
                            {inspection.status === 'scheduled' ? (
                              <Button
                                size="sm"
                                onClick={() => handleStartInspection(inspection)}
                                disabled={isSaving(inspection.id)}
                                variant="default"
                              >
                                {isSaving(inspection.id) ? (
                                  <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                                ) : (
                                  <Play className="w-4 h-4 mr-1" />
                                )}
                                {isSaving(inspection.id) ? 'Memproses...' : 'Mulai'}
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                onClick={() => handleContinueInspection(inspection.id)}
                                variant="secondary"
                              >
                                <Activity className="w-4 h-4 mr-1" />
                                Lanjutkan
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
              <div className="p-6">
                <Alert className="bg-muted/50 border-border">
                  <FileText className="h-4 w-4" />
                  <AlertTitle className="text-foreground">Tidak ada inspeksi</AlertTitle>
                  <AlertDescription className="text-muted-foreground">
                    {inspections.length === 0 
                      ? "Belum ada inspeksi yang ditugaskan kepada Anda."
                      : "Tidak ditemukan inspeksi yang sesuai dengan filter."
                    }
                  </AlertDescription>
                </Alert>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default InspectorChecklistDashboard;