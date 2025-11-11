// FILE: src/pages/dashboard/projects/new.js
"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
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
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

// Lucide Icons
import {
  FileText, Clock, Activity, CheckCircle, XCircle, Bell, Eye, Search, X,
  CheckSquare, AlertTriangle, Loader2, Info, Calendar, UserCheck, Camera, Plus, Save, RotateCcw
} from 'lucide-react';

// Other Imports
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { supabase } from '@/utils/supabaseClient';
import { getUserAndProfile } from '@/utils/auth';

// --- Utility Functions ---
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

const getStatusColor = (status) => {
  switch (status?.toLowerCase()) {
    case 'draft': return 'secondary';
    case 'submitted': return 'default';
    case 'project_lead_review': return 'default';
    case 'head_consultant_review': return 'default';
    case 'client_review': return 'default';
    case 'government_submitted': return 'default';
    case 'slf_issued': return 'default';
    case 'completed': return 'default';
    case 'cancelled': return 'destructive';
    case 'rejected': return 'destructive';
    default: return 'outline';
  }
};

const getStatusText = (status) => {
  return status?.replace(/_/g, ' ') || 'N/A';
};

// --- Main Component ---
const NewProjectPage = () => {
  const router = useRouter();
  const { toast } = useToast();

  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    city: '',
    status: 'draft', // Default status
    project_lead_id: '', // Akan diisi dari user.id
    client_id: '',
    start_date: '',
    due_date: '',
    description: '',
    application_type: 'baru', // Default application type
    is_special_function: false,
    special_function_type: '',
    special_building_type: '',
    region_name: '',
    authority_title: '',
    department_name: '',
    region_id: '',
  });

  // Dropdown options
  const [clients, setClients] = useState([]);
  const [regions, setRegions] = useState([]);
  const [specialFunctionTypes, setSpecialFunctionTypes] = useState([]);
  const [specialBuildingTypes, setSpecialBuildingTypes] = useState([]);

  // --- 1. HOOKS: Data Fetching (useCallback, useEffect) - Urutan Statis ---
  useEffect(() => {
    const loadUserData = async () => {
      try {
        const { user: authUser, profile: userProfile } = await getUserAndProfile();
        if (!authUser || !userProfile || userProfile.role !== 'project_lead') {
          console.warn('[NewProjectPage] Bukan project_lead atau tidak ada profil.');
          router.push('/login');
          return;
        }
        setUser(authUser);
        setProfile(userProfile);
        setFormData(prev => ({
          ...prev,
          project_lead_id: authUser.id // ✅ Isi project_lead_id dari user.id
        }));
      } catch (err) {
        console.error('[NewProjectPage] Load user error:', err);
        const errorMessage = err.message || 'Terjadi kesalahan saat memuat data pengguna.';
        setError(errorMessage);
        toast({
          title: 'Gagal memuat data pengguna.',
          description: errorMessage,
          variant: "destructive",
        });
        router.push('/login');
      }
    };

    const loadDropdownData = async () => {
      try {
        // --- Ambil daftar client ---
        const {  clientData, error: clientError } = await supabase
          .from('clients')
          .select('id, name, address, city')
          .order('name', { ascending: true });

        if (clientError) throw clientError;
        setClients(Array.isArray(clientData) ? clientData : []);

        // --- Ambil daftar region ---
        const {  regionData, error: regionError } = await supabase
          .from('regions')
          .select('id, name, type, authority_title, department_name')
          .order('name', { ascending: true });

        if (regionError) throw regionError;
        setRegions(Array.isArray(regionData) ? regionData : []);

        // --- Ambil daftar special function types ---
        const {  sfTypeData, error: sfTypeError } = await supabase
          .from('special_function_checklists')
          .select('function_type')
          .order('function_type', { ascending: true });

        if (sfTypeError) throw sfTypeError;
        setSpecialFunctionTypes(Array.isArray(sfTypeData) ? sfTypeData.map(item => item.function_type) : []);

        // --- Ambil daftar special building types ---
        const {  sbTypeData, error: sbTypeError } = await supabase
          .from('special_building_types')
          .select('name')
          .order('name', { ascending: true });

        if (sbTypeError) throw sbTypeError;
        setSpecialBuildingTypes(Array.isArray(sbTypeData) ? sbTypeData.map(item => item.name) : []);

      } catch (err) {
        console.error('[NewProjectPage] Load dropdown data error:', err);
        const errorMessage = err.message || 'Terjadi kesalahan saat memuat data dropdown.';
        setError(errorMessage);
        toast({
          title: 'Gagal memuat data dropdown.',
          description: errorMessage,
          variant: "destructive",
        });
        setClients([]);
        setRegions([]);
        setSpecialFunctionTypes([]);
        setSpecialBuildingTypes([]);
      } finally {
        setLoading(false);
      }
    };

    if (router.isReady) {
      loadUserData();
      loadDropdownData();
    }
  }, [router.isReady, router, toast]);

  // --- Handlers ---
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSelectChange = (name, value) => {
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validasi form
    if (!formData.name || !formData.address || !formData.city || !formData.client_id || !formData.region_id) {
      toast({
        title: 'Validasi Gagal',
        description: 'Harap isi semua field yang wajib diisi.',
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // --- Simpan proyek baru ke tabel `projects` ---
      const {  projectData, error: insertError } = await supabase
        .from('projects')
        .insert([{
          name: formData.name.trim(),
          address: formData.address.trim(),
          city: formData.city.trim(),
          status: formData.status,
          project_lead_id: formData.project_lead_id,
          client_id: formData.client_id,
          start_date: formData.start_date ? new Date(formData.start_date).toISOString() : null,
          due_date: formData.due_date ? new Date(formData.due_date).toISOString() : null,
          description: formData.description.trim() || null,
          application_type: formData.application_type,
          is_special_function: formData.is_special_function,
          special_function_type: formData.is_special_function ? formData.special_function_type : null,
          special_building_type: formData.is_special_function ? formData.special_building_type : null,
          region_name: formData.region_name,
          authority_title: formData.authority_title,
          department_name: formData.department_name,
          region_id: formData.region_id,
        }])
        .select()
        .single();

      if (insertError) throw insertError;

      toast({
        title: 'Proyek Dibuat',
        description: 'Proyek baru berhasil dibuat.',
        variant: "default",
      });

      // Redirect ke halaman detail proyek
      router.push(`/dashboard/projects/${projectData.id}`);

    } catch (err) {
      console.error('[NewProjectPage] Create project error:', err);
      const errorMessage = err.message || 'Gagal membuat proyek baru.';
      setError(errorMessage);
      toast({
        title: 'Gagal membuat proyek.',
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    router.push('/dashboard/projects');
  };

  // --- Loading State ---
  if (loading) {
    return (
      <DashboardLayout title="Buat Proyek Baru">
        <div className="flex flex-col items-center justify-center min-h-[400px] p-8">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="mt-4 text-muted-foreground">Memverifikasi sesi dan memuat data...</p>
        </div>
      </DashboardLayout>
    );
  }

  // --- Error State ---
  if (error || !user || !profile) {
    return (
      <DashboardLayout title="Buat Proyek Baru">
        <div className="p-4 md:p-6">
          <Alert variant="destructive" className="m-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Terjadi Kesalahan</AlertTitle>
            <AlertDescription>
              {error || "Akses Ditolak. Silakan login kembali."}
            </AlertDescription>
          </Alert>
        </div>
      </DashboardLayout>
    );
  }

  // --- Render Utama ---
  return (
    <DashboardLayout title="Buat Proyek Baru" user={user} profile={profile}>
      <div className="p-4 md:p-6 space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h1 className="text-xl md:text-2xl font-semibold text-blue.600">
            Buat Proyek Baru
          </h1>
          <Button
            onClick={handleCancel}
            variant="outline"
            className="flex items-center gap-2"
          >
            <X className="w-4 h-4" />
            Batal
          </Button>
        </div>

        <Separator className="bg-border" />

        <Card className="border-border">
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                {/* Informasi Dasar Proyek */}
                <div className="space-y-4">
                  <h2 className="text-lg font-semibold text-foreground">Informasi Dasar Proyek</h2>

                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-sm font-medium text-foreground">
                      Nama Proyek *
                    </Label>
                    <Input
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      placeholder="Masukkan nama proyek"
                      disabled={loading}
                      className="bg-background"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="address" className="text-sm font-medium text-foreground">
                      Alamat Proyek *
                    </Label>
                    <Textarea
                      id="address"
                      name="address"
                      value={formData.address}
                      onChange={handleChange}
                      placeholder="Masukkan alamat lengkap proyek"
                      rows={3}
                      disabled={loading}
                      className="bg-background min-h-[100px]"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="city" className="text-sm font-medium text-foreground">
                      Kota *
                    </Label>
                    <Input
                      id="city"
                      name="city"
                      value={formData.city}
                      onChange={handleChange}
                      placeholder="Masukkan kota proyek"
                      disabled={loading}
                      className="bg-background"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="client_id" className="text-sm font-medium text-foreground">
                      Klien *
                    </Label>
                    <Select
                      name="client_id"
                      value={formData.client_id}
                      onValueChange={(value) => handleSelectChange('client_id', value)}
                      disabled={loading}
                    >
                      <SelectTrigger id="client_id" className="bg-background">
                        <SelectValue placeholder="Pilih klien" />
                      </SelectTrigger>
                      <SelectContent>
                        {clients.map((client) => (
                          <SelectItem key={client.id} value={client.id}>
                            {client.name} ({client.city})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="region_id" className="text-sm font-medium text-foreground">
                      Wilayah *
                    </Label>
                    <Select
                      name="region_id"
                      value={formData.region_id}
                      onValueChange={(value) => {
                        const selectedRegion = regions.find(r => r.id === value);
                        handleSelectChange('region_id', value);
                        if (selectedRegion) {
                          setFormData(prev => ({
                            ...prev,
                            region_name: selectedRegion.name,
                            authority_title: selectedRegion.authority_title,
                            department_name: selectedRegion.department_name,
                          }));
                        }
                      }}
                      disabled={loading}
                    >
                      <SelectTrigger id="region_id" className="bg-background">
                        <SelectValue placeholder="Pilih wilayah" />
                      </SelectTrigger>
                      <SelectContent>
                        {regions.map((region) => (
                          <SelectItem key={region.id} value={region.id}>
                            {region.name} ({region.type})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="application_type" className="text-sm font-medium text-foreground">
                      Jenis Permohonan *
                    </Label>
                    <Select
                      name="application_type"
                      value={formData.application_type}
                      onValueChange={(value) => handleSelectChange('application_type', value)}
                      disabled={loading}
                    >
                      <SelectTrigger id="application_type" className="bg-background">
                        <SelectValue placeholder="Pilih jenis permohonan" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="baru">SLF Baru</SelectItem>
                        <SelectItem value="perpanjangan_slf">Perpanjangan SLF</SelectItem>
                        <SelectItem value="perubahan_fungsi">Perubahan Fungsi</SelectItem>
                        <SelectItem value="pascabencana">Pasca Bencana</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Spesifikasi Bangunan */}
                <div className="space-y-4">
                  <h2 className="text-lg font-semibold text-foreground">Spesifikasi Bangunan</h2>

                  <div className="space-y-2">
                    <Label htmlFor="start_date" className="text-sm font-medium text-foreground">
                      Tanggal Mulai
                    </Label>
                    <Input
                      id="start_date"
                      name="start_date"
                      type="date"
                      value={formData.start_date}
                      onChange={handleChange}
                      disabled={loading}
                      className="bg-background"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="due_date" className="text-sm font-medium text-foreground">
                      Tanggal Selesai
                    </Label>
                    <Input
                      id="due_date"
                      name="due_date"
                      type="date"
                      value={formData.due_date}
                      onChange={handleChange}
                      disabled={loading}
                      className="bg-background"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description" className="text-sm font-medium text-foreground">
                      Deskripsi Proyek
                    </Label>
                    <Textarea
                      id="description"
                      name="description"
                      value={formData.description}
                      onChange={handleChange}
                      placeholder="Masukkan deskripsi proyek..."
                      rows={3}
                      disabled={loading}
                      className="bg-background min-h-[100px]"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="is_special_function" className="text-sm font-medium text-foreground flex items-center gap-2">
                      <input
                        id="is_special_function"
                        name="is_special_function"
                        type="checkbox"
                        checked={formData.is_special_function}
                        onChange={handleChange}
                        disabled={loading}
                        className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                      />
                      Bangunan Fungsi Khusus
                    </Label>
                  </div>

                  {formData.is_special_function && (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="special_function_type" className="text-sm font-medium text-foreground">
                          Jenis Fungsi Khusus *
                        </Label>
                        <Select
                          name="special_function_type"
                          value={formData.special_function_type}
                          onValueChange={(value) => handleSelectChange('special_function_type', value)}
                          disabled={loading}
                        >
                          <SelectTrigger id="special_function_type" className="bg-background">
                            <SelectValue placeholder="Pilih jenis fungsi khusus" />
                          </SelectTrigger>
                          <SelectContent>
                            {specialFunctionTypes.map((type) => (
                              <SelectItem key={type} value={type}>
                                {type.replace(/_/g, ' ')}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="special_building_type" className="text-sm font-medium text-foreground">
                          Jenis Bangunan Khusus *
                        </Label>
                        <Select
                          name="special_building_type"
                          value={formData.special_building_type}
                          onValueChange={(value) => handleSelectChange('special_building_type', value)}
                          disabled={loading}
                        >
                          <SelectTrigger id="special_building_type" className="bg-background">
                            <SelectValue placeholder="Pilih jenis bangunan khusus" />
                          </SelectTrigger>
                          <SelectContent>
                            {specialBuildingTypes.map((type) => (
                              <SelectItem key={type} value={type}>
                                {type.replace(/_/g, ' ')}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </>
                  )}
                </div>
              </div>

              <Separator className="bg-border" />

              {/* Action Buttons */}
              <div className="flex justify-end gap-4">
                <Button
                  variant="outline"
                  onClick={handleCancel}
                  disabled={loading}
                  className="flex items-center gap-2"
                >
                  <X className="w-4 h-4" />
                  Batal
                </Button>
                <Button
                  type="submit"
                  disabled={loading}
                  className="flex items-center gap-2 bg-blue-600 text-white hover:bg-blue-700 dark:hover:bg-blue-800"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Membuat...
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      Buat Proyek
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default NewProjectPage;