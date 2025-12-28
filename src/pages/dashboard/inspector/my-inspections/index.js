"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ui/use-toast';
import { motion } from 'framer-motion';

// shadcn/ui Components
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
  FileText, Activity, MapPin, Play, Eye,
  Home, Target, Loader2, Navigation, WifiOff,
  Search, RefreshCw, Filter, ListChecks
} from 'lucide-react';

// Other Imports
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { supabase } from '@/utils/supabaseClient';
import { useAuth } from '@/context/AuthContext';

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { duration: 0.5, ease: "easeOut" } }
};

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

  // Fetch inspections data
  const fetchInspections = async () => {
    if (!user?.id || !isInspector) return;

    setLoading(true);
    try {
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
            projects(
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
        .in('status', ['scheduled', 'in_progress', 'completed'])
        .order('scheduled_date', { ascending: true });

      if (inspectionError) throw inspectionError;
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

  useEffect(() => {
    if (user && isInspector) {
      fetchInspections();
    }
  }, [user, isInspector]);

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

  // Utils (Camera, GPS, Helpers) - Preserved Logic
  const getMobileCameraConstraints = () => ({ video: true }); // Simplification for example

  const requestCameraPermission = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia(getMobileCameraConstraints());
      stream.getTracks().forEach(track => track.stop());
      return true;
    } catch (err) {
      return false;
    }
  };

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
          resolve({ success: false, error: 'Gagal mendapatkan lokasi' });
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    });
  };

  const handleStartInspection = async (inspection) => {
    setCurrentInspection(inspection);
    const cameraGranted = await requestCameraPermission();
    if (!cameraGranted) {
      toast({
        title: "Izin kamera diperlukan",
        description: "Anda perlu mengizinkan akses kamera untuk dokumentasi inspeksi",
        variant: "destructive",
      });
      return;
    }
    setLocationDialog(true);
  };

  const processLocationAndStart = async (withGPS = true) => {
    if (!currentInspection) return;
    let locationData = null;

    if (withGPS) {
      const locationResult = await getCurrentLocation();
      if (locationResult.success) {
        locationData = { type: 'gps', data: locationResult.location, note: null };
      } else {
        toast({ title: "GPS tidak tersedia", description: "Silakan gunakan lokasi manual", variant: "default" });
        return;
      }
    } else {
      if (!locationNote.trim()) {
        toast({ title: "Keterangan lokasi diperlukan", variant: "destructive" });
        return;
      }
      locationData = { type: 'manual', data: null, note: locationNote.trim() };
    }

    const success = await updateInspectionStatus(currentInspection.id, 'in_progress', locationData);
    if (success) {
      setLocationDialog(false);
      setLocationNote('');
      setTimeout(() => {
        router.push(`/dashboard/inspector/inspections/${currentInspection.id}/checklist`);
      }, 1000);
    }
  };

  const updateInspectionStatus = async (inspectionId, newStatus, locationData = null) => {
    if (!user) return false;
    setSavingStates(prev => ({ ...prev, [inspectionId]: true }));
    try {
      const updateData = {
        status: newStatus,
        updated_at: new Date().toISOString(),
        ...(locationData && { inspection_location: locationData })
      };
      if (newStatus === 'in_progress') updateData.start_time = new Date().toISOString();
      if (newStatus === 'completed') updateData.end_time = new Date().toISOString();

      const { error } = await supabase.from('inspections').update(updateData).eq('id', inspectionId);
      if (error) throw error;

      setInspections(prev => prev.map(i => i.id === inspectionId ? { ...i, status: newStatus, ...updateData } : i));
      toast({ title: "✅ Status diperbarui", description: `Inspeksi ${newStatus.replace('_', ' ')}` });
      return true;
    } catch (err) {
      toast({ title: "❌ Gagal mengupdate", description: err.message, variant: "destructive" });
      return false;
    } finally {
      setSavingStates(prev => ({ ...prev, [inspectionId]: false }));
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    try {
      return new Date(dateString).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch { return dateString; }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      scheduled: { className: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800', label: 'Terjadwal' },
      in_progress: { className: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800', label: 'Berlangsung' },
      completed: { className: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800', label: 'Selesai' }
    };
    const config = statusConfig[status] || { className: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300', label: status };
    return <Badge className={`${config.className} border-0 capitalize`}>{config.label}</Badge>;
  };

  // Views
  if (authLoading) return <DashboardLayout><div className="flex justify-center p-20"><Loader2 className="animate-spin text-primary" /></div></DashboardLayout>;
  if (!user || !isInspector) return <DashboardLayout><div className="p-10 text-center">Akses Ditolak</div></DashboardLayout>;

  return (
    <DashboardLayout>
      <div className="pb-20">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="flex flex-col gap-8"
        >
          {/* Header */}
          <motion.div variants={itemVariants} className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-2">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Badge className="bg-primary/10 text-primary hover:bg-primary/20 border-0 uppercase tracking-widest text-[10px]">
                  Worksheet
                </Badge>
              </div>
              <h1 className="text-3xl md:text-5xl font-black text-slate-900 dark:text-white tracking-tighter leading-none">
                Inspeksi & <span className="text-primary">Checklist</span>
              </h1>
              <p className="text-slate-500 font-medium mt-3 max-w-lg">
                Kelola jadwal kunjungan dan pengisian lembar kerja inspeksi lapangan.
              </p>
            </div>
            <Button
              onClick={fetchInspections}
              className="h-12 px-6 rounded-2xl bg-primary text-primary-foreground border border-primary font-bold uppercase text-[11px] tracking-widest shadow-lg hover:bg-white hover:text-slate-900 hover:border-white transition-all"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh Data
            </Button>
          </motion.div>

          {/* Filters */}
          <motion.div variants={itemVariants} className="bg-card rounded-[2.5rem] p-2 pr-4 border border-border shadow-2xl shadow-slate-200/50 dark:shadow-none flex flex-col md:flex-row items-center gap-4">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="Cari proyek, alamat, atau klien..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full h-14 pl-14 pr-4 rounded-[2rem] bg-transparent border-0 focus:ring-0 text-foreground font-medium placeholder:text-muted-foreground focus:outline-none"
              />
            </div>
            <div className="h-8 w-px bg-border hidden md:block"></div>
            <div className="w-full md:w-64">
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger className="h-12 rounded-xl bg-muted/50 border-0 font-bold text-xs uppercase tracking-widest text-muted-foreground">
                  <SelectValue placeholder="Semua Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Status</SelectItem>
                  <SelectItem value="scheduled">Terjadwal</SelectItem>
                  <SelectItem value="in_progress">Berlangsung</SelectItem>
                  <SelectItem value="completed">Selesai</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </motion.div>

          {/* Table Card */}
          <motion.div variants={itemVariants} className="bg-card rounded-[2.5rem] border border-border shadow-2xl shadow-slate-200/50 dark:shadow-none overflow-hidden flex flex-col">
            <div className="p-8 border-b border-border flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="size-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                  <ListChecks size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-black tracking-tighter">Daftar Penugasan</h3>
                  <p className="text-xs font-bold text-muted-foreground tracking-widest">
                    {filteredInspections.length} item ditemukan
                  </p>
                </div>
              </div>
            </div>

            <div className="p-2">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent border-border">
                      <TableHead className="w-[300px] pl-8 text-xs font-black uppercase tracking-widest text-muted-foreground h-14">Proyek & Lokasi</TableHead>
                      <TableHead className="text-xs font-black uppercase tracking-widest text-muted-foreground">Klien</TableHead>
                      <TableHead className="text-xs font-black uppercase tracking-widest text-muted-foreground">Tanggal</TableHead>
                      <TableHead className="text-xs font-black uppercase tracking-widest text-muted-foreground">Status</TableHead>
                      <TableHead className="text-right pr-8 text-xs font-black uppercase tracking-widest text-muted-foreground">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      [...Array(3)].map((_, i) => (
                        <TableRow key={i} className="border-0">
                          <TableCell colSpan={5} className="h-24"><div className="w-full h-full bg-muted/30 animate-pulse rounded-xl"></div></TableCell>
                        </TableRow>
                      ))
                    ) : filteredInspections.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="h-40 text-center text-muted-foreground">
                          Belum ada data inspeksi yang ditemukan.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredInspections.map((inspection) => (
                        <TableRow key={inspection.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors group">
                          <TableCell className="pl-8 py-6">
                            <div className="flex items-start gap-4">
                              <div className="size-10 rounded-xl bg-orange-100 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 flex items-center justify-center shrink-0">
                                <Home size={18} />
                              </div>
                              <div>
                                <p className="font-bold text-foreground line-clamp-1">{inspection.projects?.name || 'Tanpa Nama'}</p>
                                <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                                  <MapPin size={10} />
                                  <span className="line-clamp-1 max-w-[200px]">{inspection.projects?.address || '-'}</span>
                                </div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="font-medium text-sm text-muted-foreground">{inspection.projects?.clients?.name}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Activity size={12} className="text-primary" />
                              <span className="text-sm font-bold text-foreground">{formatDate(inspection.scheduled_date)}</span>
                            </div>
                          </TableCell>
                          <TableCell>{getStatusBadge(inspection.status)}</TableCell>
                          <TableCell className="text-right pr-8">
                            <div className="flex justify-end gap-2">
                              {inspection.status === 'scheduled' ? (
                                <Button size="sm" onClick={() => handleStartInspection(inspection)} className="bg-primary text-primary-foreground border border-primary hover:bg-white hover:text-slate-900 hover:border-white rounded-lg shadow-lg shadow-primary/20">
                                  <Play size={14} className="mr-2" /> Mulai
                                </Button>
                              ) : (
                                <Button size="sm" onClick={() => router.push(`/dashboard/inspector/inspections/${inspection.id}/checklist`)} variant="secondary" className="rounded-lg">
                                  <ListChecks size={14} className="mr-2" /> Detail
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </motion.div>
        </motion.div>

        {/* Dialogs logic preserved */}
        <Dialog open={locationDialog} onOpenChange={setLocationDialog}>
          <DialogContent className="sm:max-w-md bg-card border-border">
            <DialogHeader>
              <DialogTitle>Konfirmasi Lokasi</DialogTitle>
              <DialogDescription>Pastikan Anda berada di lokasi proyek.</DialogDescription>
            </DialogHeader>
            <div className="space-y-3 py-4">
              <Button variant="outline" className="w-full justify-start h-16" onClick={() => processLocationAndStart(true)}>
                <div className="p-2 bg-green-100 rounded-full mr-3"><MapPin className="text-green-600" size={20} /></div>
                <div className="text-left">
                  <div className="font-bold">Gunakan GPS</div>
                  <div className="text-xs text-muted-foreground">Geotagging otomatis</div>
                </div>
              </Button>
              <Button variant="outline" className="w-full justify-start h-16" onClick={() => processLocationAndStart(false)}>
                <div className="p-2 bg-orange-100 rounded-full mr-3"><WifiOff className="text-orange-600" size={20} /></div>
                <div className="text-left">
                  <div className="font-bold">Input Manual</div>
                  <div className="text-xs text-muted-foreground">Jika sinyal lemah</div>
                </div>
              </Button>
              {!isGettingLocation && !isGettingLocation && (
                <Textarea
                  placeholder="Catatan lokasi (wajib jika manual)"
                  value={locationNote}
                  onChange={e => setLocationNote(e.target.value)}
                  className="resize-none bg-muted border-0"
                />
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default InspectorChecklistDashboard;
