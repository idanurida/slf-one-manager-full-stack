import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, ArrowLeft, Save, ShieldAlert } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function EditUserPage() {
  const router = useRouter();
  const { id } = router.query;
  const { user, isSuperadmin, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    role: '',
    specialization: '',
    phone_number: '',
    company_name: '',
    status: '',
    is_approved: false
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!authLoading && !isSuperadmin) {
      router.push('/dashboard');
      return;
    }

    if (id && isSuperadmin) {
      fetchUserDetails();
    }
  }, [id, authLoading, isSuperadmin]);

  const fetchUserDetails = async () => {
    try {
      setLoading(true);
      // Use internal API to fetch single user (via query param)
      const response = await fetch(`/api/superadmin/users?id=${id}`);
      const data = await response.json();

      if (!response.ok) throw new Error(data.error || 'Gagal mengambil data user');

      setFormData({
        full_name: data.full_name || '',
        email: data.email || '',
        role: data.role || 'client',
        specialization: data.specialization || '',
        phone_number: data.phone_number || '',
        company_name: data.company_name || '',
        status: data.status || 'pending',
        is_approved: data.is_approved
      });

    } catch (err) {
      setError(err.message);
      toast({
        title: "Gagal memuat data",
        description: err.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleRoleChange = (value) => {
    setFormData(prev => ({
      ...prev,
      role: value,
      specialization: value !== 'inspector' ? '' : prev.specialization
    }));
  };

  const handleStatusChange = (value) => {
    setFormData(prev => ({
      ...prev,
      status: value,
      is_approved: value === 'approved'
    }));
  };

  const handleSpecializationChange = (value) => {
    setFormData(prev => ({ ...prev, specialization: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      // Use the API we just patched
      const response = await fetch('/api/superadmin/users', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id,
          ...formData
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Gagal menyimpan perubahan');
      }

      toast({
        title: "Berhasil",
        description: "Data pengguna berhasil diperbarui",
        variant: "default"
      });

      router.push('/dashboard/superadmin/users');

    } catch (err) {
      toast({
        title: "Gagal menyimpan",
        description: err.message,
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout title="Edit Penggun">
        <div className="flex justify-center items-center h-full p-8">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Edit Pengguan">
      <div className="p-6 max-w-2xl mx-auto">
        <div className="mb-6">
          <Button variant="ghost" className="pl-0 hover:pl-2 transition-all" onClick={() => router.back()}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Kembali ke Daftar User
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Edit Informas Pengguna</CardTitle>
            <CardDescription>Ubah detail dan hak akses pengguna</CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <Alert variant="destructive" className="mb-4">
                <ShieldAlert className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">

              <div className="space-y-2">
                <Label>Email</Label>
                <Input value={formData.email} disabled className="bg-muted" />
                <p className="text-xs text-muted-foreground">Email tidak dapat diubah</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="full_name">Nama Lengkap</Label>
                <Input
                  id="full_name"
                  name="full_name"
                  value={formData.full_name}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone_number">No. Telepon</Label>
                <Input
                  id="phone_number"
                  name="phone_number"
                  value={formData.phone_number}
                  onChange={handleChange}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="company_name">Perusahaan</Label>
                <Input
                  id="company_name"
                  name="company_name"
                  value={formData.company_name}
                  onChange={handleChange}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="role">Role</Label>
                  <Select value={formData.role} onValueChange={handleRoleChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih Role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="client">Klien</SelectItem>
                      <SelectItem value="head_consultant">Head Consultant</SelectItem>
                      <SelectItem value="admin_lead">Admin Lead</SelectItem>
                      <SelectItem value="admin_team">Admin Team</SelectItem>
                      <SelectItem value="project_lead">Team Leader</SelectItem>
                      <SelectItem value="inspector">Inspector</SelectItem>
                      <SelectItem value="drafter">Drafter</SelectItem>
                      <SelectItem value="superadmin">Super Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="status">Status Akun</Label>
                  <Select value={formData.status} onValueChange={handleStatusChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="approved">Approved</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                      <SelectItem value="suspended">Suspended</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {formData.role === 'inspector' && (
                <div className="space-y-2">
                  <Label htmlFor="specialization">Spesialisasi</Label>
                  <Select value={formData.specialization} onValueChange={handleSpecializationChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih Spesialisasi" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="architectural">Arsitektur</SelectItem>
                      <SelectItem value="structural">Struktur</SelectItem>
                      <SelectItem value="mep">MEP</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="pt-4 flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => router.back()} disabled={saving}>
                  Batal
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Menyimpan...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Simpan Perubahan
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
}
