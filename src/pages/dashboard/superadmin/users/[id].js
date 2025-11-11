"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { useToast } from '@/components/ui/use-toast';

// shadcn/ui Components
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

// Icons
import { 
  Bell, Loader2, Save, XCircle, Shield, AlertTriangle, 
  User, Mail, Phone, Key, FileText, Clock, Activity, 
  CheckCircle, Eye, Search, X, CheckSquare, Info, Calendar, 
  UserCheck, Camera, Plus, RotateCcw
} from 'lucide-react';

// Other Imports
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { useAuth } from '@/context/AuthContext';
import { createUserWithPassword, createUserBasic, getProfileById, updateProfile } from '@/utils/supabaseAPI';
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

const getRoleColor = (role) => {
  switch (role?.toLowerCase()) {
    case 'superadmin': return 'destructive';
    case 'project_lead': return 'default';
    case 'client': return 'default';
    case 'inspector': return 'default';
    case 'drafter': return 'default';
    case 'head_consultant': return 'default';
    case 'admin_lead': return 'default';
    default: return 'outline';
  }
};

const getRoleText = (role) => {
  return role?.replace(/_/g, ' ') || 'N/A';
};

// --- Main Component: EditUserPage ---
export default function EditUserPage() {
  const router = useRouter();
  const { toast } = useToast();

  const { id } = router.query;
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  useEffect(() => {
    const loadUserData = async () => {
      try {
        const { user: authUser, profile: userProfile } = await getUserAndProfile();
        if (!authUser || !userProfile || userProfile.role !== 'superadmin') {
          console.warn('[EditUserPage] Bukan superadmin atau tidak ada profil.');
          router.push('/login');
          return;
        }
        setUser(authUser);
        setProfile(userProfile);
      } catch (err) {
        console.error('[EditUserPage] Load user error:', err);
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

    const loadUser = async () => {
      if (!id || !user) return;

      try {
        setLoading(true);
        setError(null);

        const userData = await getProfileById(id);
        setForm(userData || {});
      } catch (error) {
        console.error('Error loading user:', error);
        const errorMessage = error.message || 'Silakan coba lagi.';
        setError(errorMessage);
        toast({
          title: 'Gagal memuat data user',
          description: errorMessage,
          variant: "destructive",
        });
        router.push('/dashboard/superadmin/users');
      } finally {
        setLoading(false);
      }
    };

    if (router.isReady) {
      loadUserData().then(() => {
        loadUser();
      });
    }
  }, [id, user, router, toast]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!id || !user) return;

    setSaving(true);
    setError(null);

    try {
      await updateProfile(id, {
        full_name: form.full_name,
        email: form.email,
        phone_number: form.phone_number,
        role: form.role,
      });

      toast({
        title: 'User diperbarui',
        description: 'Data user berhasil diperbarui.',
        variant: "default",
      });

      router.push('/dashboard/superadmin/users');
    } catch (error) {
      console.error('Update user error:', error);
      const errorMessage = error.message || 'Periksa data Anda.';
      setError(errorMessage);
      toast({
        title: 'Gagal memperbarui user',
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading || !router.isReady) {
    return (
      <DashboardLayout title="Edit User">
        <div className="flex flex-col items-center justify-center min-h-[400px] p-8">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="mt-4 text-muted-foreground">Memverifikasi sesi dan memuat data...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (error || !user || !profile) {
    return (
      <DashboardLayout title="Edit User">
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

  return (
    <DashboardLayout title="Edit User" user={user} profile={profile}>
      <div className="p-4 md:p-6 space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h1 className="text-xl md:text-2xl font-semibold text-blue-600">
            Edit User
          </h1>
          <Button
            variant="ghost"
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
            onClick={() => router.push('/dashboard/notifications')}
          >
            <Bell className="w-4 h-4" />
            Notifikasi
          </Button>
        </div>

        <Separator className="bg-border" />

        <Card className="border-border max-w-2xl mx-auto">
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="full_name" className="text-sm font-medium text-foreground">
                    Nama Lengkap *
                  </Label>
                  <Input
                    id="full_name"
                    name="full_name"
                    value={form.full_name || ''}
                    onChange={handleChange}
                    placeholder="Nama lengkap"
                    disabled={saving}
                    className="bg-background"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium text-foreground">
                    Email *
                  </Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={form.email || ''}
                    onChange={handleChange}
                    placeholder="email@example.com"
                    disabled={saving}
                    className="bg-background"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone_number" className="text-sm font-medium text-foreground">
                    Nomor Telepon
                  </Label>
                  <Input
                    id="phone_number"
                    name="phone_number"
                    value={form.phone_number || ''}
                    onChange={handleChange}
                    placeholder="081234567890"
                    disabled={saving}
                    className="bg-background"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="role" className="text-sm font-medium text-foreground">
                    Role *
                  </Label>
                  <Select name="role" value={form.role || ''} onValueChange={(value) => setForm(prev => ({ ...prev, role: value }))}>
                    <SelectTrigger id="role" className="bg-background">
                      <SelectValue placeholder="Pilih Role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Pilih Role</SelectItem>
                      <SelectItem value="superadmin">Super Admin</SelectItem>
                      <SelectItem value="project_lead">Project Lead</SelectItem>
                      <SelectItem value="client">Client</SelectItem>
                      <SelectItem value="inspector">Inspector</SelectItem>
                      <SelectItem value="drafter">Drafter</SelectItem>
                      <SelectItem value="head_consultant">Head Consultant</SelectItem>
                      <SelectItem value="admin_lead">Admin Lead</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 pt-4">
                  <Button
                    variant="default"
                    type="submit"
                    disabled={saving}
                    className="w-full sm:w-auto flex items-center gap-2 bg-green-600 text-white hover:bg-green-700"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Menyimpan...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        Simpan Perubahan
                      </>
                    )}
                  </Button>

                  <Button
                    variant="ghost"
                    onClick={() => router.back()}
                    className="w-full sm:w-auto flex items-center gap-2 text-muted-foreground hover:text-foreground"
                  >
                    <XCircle className="w-4 h-4" />
                    Kembali
                  </Button>
                </div>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
