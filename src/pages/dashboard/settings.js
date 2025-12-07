// src/pages/dashboard/settings.js

"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation'; // Mengubah dari 'next/router' ke 'next/navigation'
import { useToast } from "@/components/ui/use-toast"; // useToast shadcn
import { Loader2, Upload, Trash2, Save, Info } from 'lucide-react'; // Lucide Icons sebagai pengganti react-icons/fi

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
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

// Other Imports
import DashboardLayout from '../../components/layouts/DashboardLayout';
import { getUserAndProfile } from '@/utils/auth';
import { supabase } from '@/utils/supabaseClient';
import { useAuth } from '@/context/AuthContext';

// --- Utility: cn (tanpa lib) ---
const cn = (...classes) => classes.filter(Boolean).join(' ');

// --- Helper: Mendapatkan nama file storage dari URL ---
const getFilenameFromUrl = (url) => {
  if (!url) return null;
  const parts = url.split('/');
  // Supabase URL format: [base_url]/storage/v1/object/public/[bucket_name]/[path/filename]
  return parts[parts.length - 1];
};

const SettingsPage = () => {
  const { profile: authProfile, updateProfile: refreshProfileContext } = useAuth(); // Ambil dari context
  const { toast } = useToast();
  const router = useRouter();

  const [profileData, setProfileData] = useState(authProfile);
  const [fullName, setFullName] = useState(authProfile?.full_name || '');
  const [phone, setPhone] = useState(authProfile?.phone_number || '');
  const [specialization, setSpecialization] = useState(authProfile?.specialization || '');
  const [officeLocation, setOfficeLocation] = useState(authProfile?.office_location || '');
  const [avatarFile, setAvatarFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef(null);

  // Load initial data dari context (atau redirect jika belum login)
  useEffect(() => {
    if (authProfile) {
      setProfileData(authProfile);
      setFullName(authProfile.full_name || '');
      setPhone(authProfile.phone_number || '');
      setSpecialization(authProfile.specialization || '');
      setOfficeLocation(authProfile.office_location || '');
    } else {
      // Jika profile tidak ada di context, coba ambil manual (opsional, sudah dihandle layout)
      const checkAuth = async () => {
        const { profile } = await getUserAndProfile();
        if (!profile) {
          router.push('/login');
        }
      };
      checkAuth();
    }
  }, [authProfile, router]);


  // --- Avatar Logic ---

  const handleAvatarUpload = async () => {
    if (!avatarFile || !profileData) return;

    setLoading(true);
    const file = avatarFile;
    const fileExt = file.name.split('.').pop();
    const fileName = `${profileData.id}.${fileExt}`;
    const filePath = `avatars/${fileName}`;

    try {
      // 1. Upload file ke Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true, // Timpa file lama jika nama sama
        });

      if (uploadError) throw uploadError;

      // 2. Dapatkan URL publik
      const { data: publicUrlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      const publicUrl = publicUrlData.publicUrl;

      // 3. Update profiles table dengan URL baru
      const { error: profileUpdateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', profileData.id);

      if (profileUpdateError) throw profileUpdateError;

      toast({ title: 'Berhasil', description: 'Avatar berhasil diperbarui.', variant: 'default' });
      setAvatarFile(null); // Reset file input
      if (fileInputRef.current) fileInputRef.current.value = "";
      refreshProfileContext(); // Trigger context update
    } catch (err) {
      console.error("Avatar Upload Error:", err);
      toast({ title: 'Gagal mengunggah avatar', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarRemove = async () => {
    if (!profileData || !profileData.avatar_url) return;

    setLoading(true);
    try {
      const filename = getFilenameFromUrl(profileData.avatar_url);

      // 1. Hapus record dari profiles
      const { error: profileUpdateError } = await supabase
        .from('profiles')
        .update({ avatar_url: null })
        .eq('id', profileData.id);

      if (profileUpdateError) throw profileUpdateError;

      // 2. Hapus file dari Storage (Opsional, tergantung kebijakan, tapi dianjurkan)
      if (filename) {
          const { error: storageError } = await supabase.storage
             .from('avatars')
             .remove([`avatars/${filename}`]);
        // Note: Storage remove might fail if policy is strict, but we ignore it if profile is updated
        if (storageError && storageError.message !== 'The resource was not found') {
             console.warn("Storage removal warning:", storageError.message);
        }
      }

      toast({ title: 'Berhasil', description: 'Avatar berhasil dihapus.', variant: 'default' });
      refreshProfileContext(); // Trigger context update
    } catch (err) {
      console.error("Avatar Remove Error:", err);
      toast({ title: 'Gagal menghapus avatar', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }

  // --- Profile Update Logic ---

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const updates = {
        full_name: fullName,
        phone_number: phone,
        specialization: specialization,
        office_location: officeLocation,
      };

      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', profileData.id);

      if (error) throw error;

      toast({ title: 'Berhasil!', description: 'Data profil diperbarui.', variant: 'default' });
      refreshProfileContext(); // Trigger context update
    } catch (err) {
      toast({ title: 'Gagal', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  // --- Render Fallback ---
  if (!profileData) {
    return (
      <DashboardLayout title="Pengaturan Akun">
          <div className="p-6">
              <p className="text-muted-foreground">Memuat data profil...</p>
          </div>
      </DashboardLayout>
    )
  }

  // --- Main Render ---
  return (
    <DashboardLayout title="Pengaturan Akun">
      <div className="p-4 md:p-6 space-y-6 max-w-4xl mx-auto">

        <div className="space-y-6">

          {/* --- Section 1: Pengaturan Avatar --- */}
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Foto Profil</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-6">
                <Avatar className="h-24 w-24 border-2 border-primary/50">
                  <AvatarImage 
                    src={avatarFile ? URL.createObjectURL(avatarFile) : profileData.avatar_url || undefined} 
                    alt={profileData.full_name || "User"} 
                  />
                  <AvatarFallback className="text-2xl font-semibold">
                    {profileData.full_name ? profileData.full_name[0] : <Info className="w-6 h-6" />}
                  </AvatarFallback>
                </Avatar>

                <div className="flex flex-col items-start space-y-2">
                  <div className="flex space-x-2">
                    <Button
                      onClick={() => fileInputRef.current.click()}
                      disabled={loading}
                      size="sm"
                      className="flex items-center gap-2"
                    >
                      <Upload className="w-4 h-4" />
                      {avatarFile ? 'Ganti File' : 'Unggah Foto'}
                    </Button>
                    <Input
                      type="file"
                      ref={fileInputRef}
                      onChange={(e) => setAvatarFile(e.target.files[0])}
                      className="hidden" // Sembunyikan input file asli
                      accept="image/*"
                    />

                    {profileData.avatar_url && (
                      <Button
                        variant="outline"
                        onClick={handleAvatarRemove}
                        disabled={loading}
                        size="sm"
                        className="flex items-center gap-2 text-red-600 hover:text-red-700 border-red-300 hover:bg-red-50/50"
                      >
                        <Trash2 className="w-4 h-4" />
                        Hapus Foto
                      </Button>
                    )}
                  </div>

                  {avatarFile && (
                    <Button
                      onClick={handleAvatarUpload}
                      disabled={loading}
                      size="sm"
                      className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white"
                    >
                      {loading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Save className="w-4 h-4" />
                      )}
                      Simpan Avatar Baru
                    </Button>
                  )}
                  <p className="text-sm text-muted-foreground mt-2">
                    {avatarFile ? `File siap diunggah: ${avatarFile.name}` : 'Maks. ukuran 2MB. Format: JPG, PNG.'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* --- Section 2: Data Profil --- */}
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Informasi Pribadi</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Nama Lengkap */}
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Nama Lengkap *</Label>
                    <Input
                      id="fullName"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Masukkan nama lengkap Anda"
                      required
                      disabled={loading}
                    />
                  </div>

                  {/* Nomor Telepon */}
                  <div className="space-y-2">
                    <Label htmlFor="phone">Nomor Telepon</Label>
                    <Input
                      id="phone"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="08xxxxxxxxxx"
                      disabled={loading}
                    />
                  </div>

                  {/* Email (Read-only) */}
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input 
                      id="email"
                      value={profileData.email} 
                      readOnly 
                      disabled 
                      className="bg-muted/50"
                      placeholder="Email (Read-only)" 
                    />
                  </div>

                  {/* Role (Read-only) */}
                  <div className="space-y-2">
                    <Label htmlFor="role">Role</Label>
                    <Input 
                      id="role"
                      value={profileData.role?.toUpperCase().replace(/_/g, ' ')} 
                      readOnly 
                      disabled 
                      className="bg-muted/50"
                      placeholder="Role (Read-only)" 
                    />
                  </div>
                  
                  {/* Field Conditional untuk Spesialisasi (Inspector/Drafter) */}
                  {(profileData.role === 'inspector' || profileData.role === 'drafter') && (
                    <div className="space-y-2">
                      <Label htmlFor="specialization">Spesialisasi</Label>
                      <Select
                        value={specialization}
                        onValueChange={setSpecialization}
                        disabled={loading}
                      >
                        <SelectTrigger id="specialization" className="w-full">
                          <SelectValue placeholder="Pilih spesialisasi" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="architectural">Arsitektur</SelectItem>
                          <SelectItem value="structural">Struktur</SelectItem>
                          <SelectItem value="mep">MEP</SelectItem>
                          <SelectItem value="fire_safety">Keselamatan Kebakaran</SelectItem>
                          <SelectItem value="hvac">HVAC</SelectItem>
                          {/* Tambahkan opsi spesialisasi lain jika ada */}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {/* Field untuk Lokasi Kantor/Kerja */}
                  {(profileData.role === 'project_lead' || profileData.role === 'head_consultant' || profileData.role === 'admin_lead' || profileData.role === 'inspector') && (
                    <div className="space-y-2">
                      <Label htmlFor="officeLocation">Lokasi Kantor/Kerja</Label>
                      <Input
                        id="officeLocation"
                        value={officeLocation}
                        onChange={(e) => setOfficeLocation(e.target.value)}
                        placeholder="Jakarta/Surabaya/Wilayah Kerja"
                        disabled={loading}
                      />
                    </div>
                  )}
                </div>

                <Button type="submit" disabled={loading} className="w-full md:w-auto mt-4">
                  {loading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="mr-2 h-4 w-4" />
                  )}
                  Simpan Perubahan Data
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* --- Section 3: Pengaturan Keamanan (Opsional) --- */}
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Keamanan</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-start space-x-3 p-4 border rounded-lg bg-yellow-50/50 border-yellow-200 text-yellow-800 dark:bg-yellow-900/10 dark:border-yellow-900 dark:text-yellow-300">
                <Info className="h-5 w-5 flex-shrink-0 mt-0.5" />
                <p className="text-sm">
                  Untuk mengganti password, silakan gunakan fitur reset password atau hubungi Superadmin. Kami tidak menyimpan password Anda secara langsung.
                </p>
              </div>
              
              {/* Di sini bisa ditambahkan fitur ganti password yang lebih aman */}
            </CardContent>
          </Card>

        </div>
      </div>
    </DashboardLayout>
  );
};

export default SettingsPage;