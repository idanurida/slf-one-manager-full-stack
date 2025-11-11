// FILE: src/components/project-lead/TeamManagement.js
"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation'; // ✅ Ganti ke next/navigation
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { useToast } from '@/components/ui/use-toast'; // ✅ Gunakan useToast dari shadcn/ui

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

const getRoleBadgeColor = (role) => {
  switch (role?.toLowerCase()) {
    case 'inspector': return 'green';
    case 'drafter': return 'yellow';
    case 'project_lead': return 'blue';
    case 'head_consultant': return 'purple';
    case 'admin_lead': return 'cyan';
    case 'superadmin': return 'red';
    case 'client': return 'pink';
    default: return 'gray';
  }
};

const getSpecializationBadgeColor = (specialization) => {
  switch (specialization?.toLowerCase()) {
    case 'dokumen': return 'gray';
    case 'struktur': return 'blue';
    case 'kebakaran': return 'red';
    case 'elektrikal': return 'orange';
    case 'tata_udara': return 'cyan';
    case 'akustik': return 'purple';
    case 'arsitektur': return 'pink';
    case 'lingkungan': return 'green';
    case 'mekanikal': return 'yellow';
    case 'material': return 'teal';
    case 'gas_medik': return 'pink';
    case 'umum': return 'gray';
    default: return 'outline';
  }
};

const getRoleText = (role) => {
  return role?.replace(/_/g, ' ') || 'N/A';
};

const getSpecializationText = (specialization) => {
  return specialization?.replace(/_/g, ' ') || 'N/A';
};

// --- Main Component ---
const TeamManagement = ({ projectId }) => {
  const router = useRouter();
  const { toast } = useToast(); // ✅ Gunakan useToast dari shadcn/ui

  const [teamMembers, setTeamMembers] = useState([]);
  const [availableUsers, setAvailableUsers] = useState([]); // Untuk dropdown
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedRole, setSelectedRole] = useState('inspector'); // Default role
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);

  // --- Validasi projectId ---
  useEffect(() => {
    if (!projectId) {
      console.warn('[TeamManagement] projectId tidak tersedia.');
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        setLoading(true);

        // --- 1. Ambil anggota tim saat ini untuk proyek ini ---
        // ✅ PERBAIKAN: Gunakan nama tabel yang benar: 'project_teams'
        const {  teamData, error: teamError } = await supabase
          .from('project_teams')
          .select(`
            id,
            user_id,
            role,
            // ✅ PERBAIKAN: Gunakan relasi yang benar: profiles!user_id(...)
            profiles!user_id(full_name, email, specialization)
          `)
          .eq('project_id', projectId);

        if (teamError) throw teamError;
        setTeamMembers(Array.isArray(teamData) ? teamData : []);

        // --- 2. Ambil daftar user yang bisa ditambahkan ---
        const {  userData, error: userError } = await supabase
          .from('profiles')
          .select('id, full_name, email, role, specialization')
          // ✅ PERBAIKAN: Filter hanya user dengan role yang sesuai
          .in('role', ['inspector', 'drafter'])
          .order('full_name', { ascending: true });

        if (userError) throw userError;
        setAvailableUsers(Array.isArray(userData) ? userData : []);

      } catch (err) {
        console.error('[TeamManagement] Fetch data error:', err);
        const errorMessage = err.message || 'Terjadi kesalahan saat mengambil data tim.';
        setError(errorMessage); // ✅ Set error state
        toast({
          title: 'Gagal memuat data tim.',
          description: errorMessage,
          variant: "destructive", // ✅ Gunakan variant shadcn/ui
        });
        setTeamMembers([]);
        setAvailableUsers([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [projectId, toast]); // ✅ Tambahkan toast ke dependency

  // --- Handler untuk menambah anggota tim ---
  const handleAddMember = async () => {
    if (!selectedUserId || !projectId) {
      toast({
        title: 'Data tidak lengkap',
        description: 'Silakan pilih user dan role.',
        variant: "destructive", // ✅ Gunakan variant shadcn/ui
      });
      return;
    }

    try {
      setAdding(true);

      // --- Insert ke tabel project_teams ---
      // ✅ PERBAIKAN: Gunakan nama tabel yang benar: 'project_teams'
      const { error } = await supabase
        .from('project_teams')
        .insert([
          {
            project_id: projectId,
            user_id: selectedUserId,
            role: selectedRole,
          },
        ]);

      if (error) throw error;

      toast({
        title: 'Anggota tim ditambahkan.',
        description: 'Anggota tim berhasil ditambahkan ke proyek.',
        variant: "default", // ✅ Gunakan variant shadcn/ui
      });

      // --- Reset form ---
      setSelectedUserId('');
      setSelectedRole('inspector');

      // --- Refresh data tim ---
      // ✅ PERBAIKAN: Gunakan nama tabel yang benar dan relasi yang benar
      const {  refreshedTeamData, error: refreshError } = await supabase
        .from('project_teams')
        .select(`
          id,
          user_id,
          role,
          profiles!user_id(full_name, email, specialization)
        `)
        .eq('project_id', projectId);

      if (refreshError) throw refreshError;
      setTeamMembers(Array.isArray(refreshedTeamData) ? refreshedTeamData : []);

    } catch (err) {
      console.error('[TeamManagement] Add member error:', err);
      const errorMessage = err.message || 'Terjadi kesalahan saat menambahkan anggota.';
      setError(errorMessage); // ✅ Set error state
      toast({
        title: 'Gagal menambahkan anggota tim.',
        description: errorMessage,
        variant: "destructive", // ✅ Gunakan variant shadcn/ui
      });
    } finally {
      setAdding(false);
    }
  };

  // --- Handler untuk menghapus anggota tim ---
  const handleRemoveMember = async (teamMemberId) => {
    if (!teamMemberId) return;

    if (!window.confirm('Apakah Anda yakin ingin menghapus anggota tim ini?')) {
      return;
    }

    try {
      // --- Delete dari tabel project_teams ---
      // ✅ PERBAIKAN: Gunakan nama tabel yang benar: 'project_teams'
      const { error } = await supabase
        .from('project_teams')
        .delete()
        .eq('id', teamMemberId);

      if (error) throw error;

      toast({
        title: 'Anggota tim dihapus.',
        description: 'Anggota tim berhasil dihapus dari proyek.',
        variant: "default", // ✅ Gunakan variant shadcn/ui
      });

      // --- Refresh data tim ---
      // ✅ PERBAIKAN: Gunakan nama tabel yang benar dan relasi yang benar
      const {  refreshedTeamData, error: refreshError } = await supabase
        .from('project_teams')
        .select(`
          id,
          user_id,
          role,
          profiles!user_id(full_name, email, specialization)
        `)
        .eq('project_id', projectId);

      if (refreshError) throw refreshError;
      setTeamMembers(Array.isArray(refreshedTeamData) ? refreshedTeamData : []);

    } catch (err) {
      console.error('[TeamManagement] Remove member error:', err);
      const errorMessage = err.message || 'Terjadi kesalahan saat menghapus anggota.';
      setError(errorMessage); // ✅ Set error state
      toast({
        title: 'Gagal menghapus anggota tim.',
        description: errorMessage,
        variant: "destructive", // ✅ Gunakan variant shadcn/ui
      });
    }
  };

  // --- Tampilkan loading jika projectId belum tersedia ---
  if (!projectId) {
    return (
      <DashboardLayout title="Manajemen Tim">
        <div className="flex flex-col items-center justify-center min-h-[400px] p-8">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="mt-4 text-muted-foreground">Memuat detail proyek...</p>
        </div>
      </DashboardLayout>
    );
  }

  // --- Tampilkan loading saat mengambil data ---
  if (loading) {
    return (
      <DashboardLayout title="Manajemen Tim">
        <div className="flex flex-col items-center justify-center min-h-[400px] p-8">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="mt-4 text-muted-foreground">Memverifikasi sesi dan memuat data...</p>
        </div>
      </DashboardLayout>
    );
  }

  // --- Render Utama ---
  return (
    <DashboardLayout title="Manajemen Tim">
      <div className="p-4 md:p-6 space-y-6">
        {/* Card: Tambah Anggota Tim */}
        <Card className="border-border">
          <CardContent className="p-6">
            <h2 className="text-xl font-semibold text-foreground mb-4"> {/* ✅ Ganti Heading dengan h2 */}
              Tambah Anggota Tim
            </h2>
            <div className="flex flex-col md:flex-row gap-4 items-end"> {/* ✅ Ganti HStack dengan div flex flex-col md:flex-row gap-4 items-end */}
              <div className="flex-2 space-y-2"> {/* ✅ Ganti FormControl dengan div space-y-2 dan tambahkan flex-2 */}
                <Label htmlFor="user-select" className="text-sm font-medium text-foreground"> {/* ✅ Ganti FormLabel dengan Label */}
                  User
                </Label>
                <Select value={selectedUserId} onValueChange={setSelectedUserId}> {/* ✅ Ganti Select Chakra dengan Select shadcn/ui */}
                  <SelectTrigger id="user-select" className="w-full bg-background"> {/* ✅ Tambahkan id dan class Tailwind */}
                    <SelectValue placeholder="Pilih user" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableUsers.map(user => (
                      <SelectItem key={user.id} value={user.id}> {/* ✅ Ganti option dengan SelectItem shadcn/ui */}
                        {user.full_name || user.email} ({getRoleText(user.role)}{user.specialization ? ` - ${getSpecializationText(user.specialization)}` : ''})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex-1 space-y-2"> {/* ✅ Ganti FormControl dengan div space-y-2 dan tambahkan flex-1 */}
                <Label htmlFor="role-select" className="text-sm font-medium text-foreground"> {/* ✅ Ganti FormLabel dengan Label */}
                  Role
                </Label>
                <Select value={selectedRole} onValueChange={setSelectedRole}> {/* ✅ Ganti Select Chakra dengan Select shadcn/ui */}
                  <SelectTrigger id="role-select" className="w-full bg-background"> {/* ✅ Tambahkan id dan class Tailwind */}
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="inspector">Inspector</SelectItem> {/* ✅ Ganti option dengan SelectItem shadcn/ui */}
                    <SelectItem value="drafter">Drafter</SelectItem>
                    {/* Tambahkan role lain jika diperlukan */}
                  </SelectContent>
                </Select>
              </div>

              <Button
                variant="default" // ✅ Ganti colorScheme="green" dengan variant="default"
                className="flex items-center gap-2 bg-green-600 text-white hover:bg-green-700 dark:hover:bg-green-800" // ✅ Tambahkan class Tailwind untuk warna hijau
                onClick={handleAddMember}
                disabled={adding || !selectedUserId} // ✅ Ganti isLoading dan isDisabled
              >
                {adding ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Menambahkan...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    Tambah
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Card: Daftar Anggota Tim */}
        <Card className="border-border">
          <CardContent className="p-6">
            <h2 className="text-xl font-semibold text-foreground mb-4"> {/* ✅ Ganti Heading dengan h2 */}
              Daftar Anggota Tim
            </h2>
            {teamMembers.length > 0 ? (
              <div className="w-full overflow-x-auto"> {/* ✅ Ganti TableContainer dengan div overflow-x-auto */}
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-foreground">Nama</TableHead> {/* ✅ Ganti Th dengan TableHead */}
                      <TableHead className="text-foreground">Email</TableHead>
                      <TableHead className="text-foreground">Role</TableHead>
                      <TableHead className="text-foreground">Spesialisasi</TableHead>
                      <TableHead className="text-center text-foreground">Aksi</TableHead> {/* ✅ Tambahkan text-center */}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {teamMembers.map(member => (
                      <TableRow key={member.id} className="hover:bg-accent/50"> {/* ✅ Ganti Tr dengan TableRow dan tambahkan hover:bg-accent/50 */}
                        <TableCell className="font-medium"> {/* ✅ Ganti Td dengan TableCell */}
                          <p className="font-bold text-foreground">{member.profiles?.full_name || member.profiles?.email || 'N/A'}</p> {/* ✅ Ganti Text dengan p */}
                        </TableCell>
                        <TableCell className="text-foreground">{member.profiles?.email || '-'}</TableCell> {/* ✅ Ganti Td dengan TableCell */}
                        <TableCell>
                          <Badge variant={getRoleBadgeColor(member.role)}> {/* ✅ Ganti Badge colorScheme dengan variant dan gunakan getRoleBadgeColor */}
                            {getRoleText(member.role)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {member.profiles?.specialization ? (
                            <Badge variant={getSpecializationBadgeColor(member.profiles.specialization)}> {/* ✅ Ganti Badge colorScheme dengan variant dan gunakan getSpecializationBadgeColor */}
                              {getSpecializationText(member.profiles.specialization)}
                            </Badge>
                          ) : (
                            '-'
                          )}
                        </TableCell>
                        <TableCell className="text-center"> {/* ✅ Ganti Td dengan TableCell dan tambahkan text-center */}
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                                  onClick={() => handleRemoveMember(member.id)}
                                >
                                  <Trash2 className="w-4 h-4" />
                                  <span className="sr-only">Hapus Anggota</span>
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Hapus Anggota</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <Alert variant="info" className="m-4"> {/* ✅ Ganti Alert status="info" dengan variant="info" */}
                <Info className="h-4 w-4" />
                <AlertTitle>Belum ada anggota tim</AlertTitle>
                <AlertDescription>
                  Tambahkan inspector atau drafter ke proyek ini.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default TeamManagement;