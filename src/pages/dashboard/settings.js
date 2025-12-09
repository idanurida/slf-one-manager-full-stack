// src/pages/dashboard/settings.js

"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from "@/components/ui/use-toast";
import { 
  Loader2, Upload, Trash2, Save, Info, Eye, EyeOff, 
  Shield, KeyRound, User, Bell, CheckCircle2
} from 'lucide-react';

// shadcn/ui Components
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

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

// Password strength checker
const checkPasswordStrength = (password) => {
  const checks = {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
  };
  const score = Object.values(checks).filter(Boolean).length;
  return {
    checks,
    score,
    label: score <= 1 ? 'Lemah' : score <= 2 ? 'Sedang' : score <= 3 ? 'Kuat' : 'Sangat Kuat',
    color: score <= 1 ? 'text-red-500' : score <= 2 ? 'text-yellow-500' : 'text-green-500',
  };
};

const SettingsPage = () => {
  const { profile: authProfile, refreshProfile: refreshProfileContext } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  // Profile states
  const [profileData, setProfileData] = useState(authProfile);
  const [fullName, setFullName] = useState(authProfile?.full_name || '');
  const [phone, setPhone] = useState(authProfile?.phone_number || '');
  const [specialization, setSpecialization] = useState(authProfile?.specialization || '');
  const [officeLocation, setOfficeLocation] = useState(authProfile?.office_location || '');
  const [avatarFile, setAvatarFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef(null);
  
  // Password change states
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  
  // Notification settings
  const [notifications, setNotifications] = useState({
    emailNotifications: true,
    projectUpdates: true,
    documentUploads: true,
    approvalRequests: true,
  });

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
      if (refreshProfileContext) refreshProfileContext();
    } catch (err) {
      console.error("Avatar Remove Error:", err);
      toast({ title: 'Gagal menghapus avatar', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }

  // --- Password Change Logic ---
  const passwordStrength = checkPasswordStrength(passwordData.newPassword);
  const passwordsMatch = passwordData.newPassword === passwordData.confirmPassword && passwordData.confirmPassword !== '';

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({ ...prev, [name]: value }));
    setPasswordError('');
    setPasswordSuccess(false);
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPasswordLoading(true);
    setPasswordError('');
    setPasswordSuccess(false);

    // Validation
    if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
      setPasswordError('Semua field harus diisi');
      setPasswordLoading(false);
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordError('Password baru tidak cocok');
      setPasswordLoading(false);
      return;
    }

    if (passwordData.newPassword.length < 8) {
      setPasswordError('Password minimal 8 karakter');
      setPasswordLoading(false);
      return;
    }

    try {
      // Verify current password by re-authenticating
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: profileData.email,
        password: passwordData.currentPassword,
      });

      if (signInError) {
        throw new Error('Password saat ini salah');
      }

      // Update password
      const { error: updateError } = await supabase.auth.updateUser({
        password: passwordData.newPassword,
      });

      if (updateError) {
        throw updateError;
      }

      setPasswordSuccess(true);
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      toast({ title: 'Berhasil', description: 'Password berhasil diubah.', variant: 'default' });
    } catch (err) {
      console.error('Password change error:', err);
      setPasswordError(err.message || 'Gagal mengubah password');
    } finally {
      setPasswordLoading(false);
    }
  };

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
      <div className="p-4 md:p-6 max-w-4xl mx-auto">
        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="profile" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              <span className="hidden sm:inline">Profil</span>
            </TabsTrigger>
            <TabsTrigger value="security" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              <span className="hidden sm:inline">Keamanan</span>
            </TabsTrigger>
            <TabsTrigger value="notifications" className="flex items-center gap-2">
              <Bell className="h-4 w-4" />
              <span className="hidden sm:inline">Notifikasi</span>
            </TabsTrigger>
          </TabsList>

          {/* === TAB 1: PROFILE === */}
          <TabsContent value="profile" className="space-y-6">
            {/* --- Section: Pengaturan Avatar --- */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Foto Profil</CardTitle>
                <CardDescription>Kelola foto profil Anda</CardDescription>
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
                        className="hidden"
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
                          Hapus
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
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        Simpan Avatar
                      </Button>
                    )}
                    <p className="text-sm text-muted-foreground">
                      {avatarFile ? `File: ${avatarFile.name}` : 'Maks. 2MB. Format: JPG, PNG.'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* --- Section: Data Profil --- */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Informasi Pribadi</CardTitle>
                <CardDescription>Kelola informasi profil Anda</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="fullName">Nama Lengkap *</Label>
                      <Input
                        id="fullName"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Masukkan nama lengkap"
                        required
                        disabled={loading}
                      />
                    </div>

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

                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input 
                        id="email"
                        value={profileData.email} 
                        readOnly 
                        disabled 
                        className="bg-muted/50"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="role">Role</Label>
                      <Input 
                        id="role"
                        value={profileData.role === 'project_lead' ? 'TEAM LEADER' : profileData.role?.toUpperCase().replace(/_/g, ' ')} 
                        readOnly 
                        disabled 
                        className="bg-muted/50"
                      />
                    </div>
                    
                    {profileData.role === 'inspector' && (
                      <div className="space-y-2">
                        <Label htmlFor="specialization">Spesialisasi</Label>
                        <Select value={specialization} onValueChange={setSpecialization} disabled={loading}>
                          <SelectTrigger id="specialization">
                            <SelectValue placeholder="Pilih spesialisasi" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="architectural">Arsitektur</SelectItem>
                            <SelectItem value="structural">Struktur</SelectItem>
                            <SelectItem value="mep">MEP (Mekanikal, Elektrikal, Plumbing)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {['project_lead', 'head_consultant', 'admin_lead', 'inspector'].includes(profileData.role) && (
                      <div className="space-y-2">
                        <Label htmlFor="officeLocation">Lokasi Kantor</Label>
                        <Input
                          id="officeLocation"
                          value={officeLocation}
                          onChange={(e) => setOfficeLocation(e.target.value)}
                          placeholder="Jakarta/Surabaya"
                          disabled={loading}
                        />
                      </div>
                    )}
                  </div>

                  <Button type="submit" disabled={loading}>
                    {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    Simpan Perubahan
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* === TAB 2: SECURITY === */}
          <TabsContent value="security" className="space-y-6">
            {/* --- Section: Ubah Password --- */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <KeyRound className="h-5 w-5" />
                  Ubah Password
                </CardTitle>
                <CardDescription>
                  Pastikan akun Anda menggunakan password yang kuat dan unik
                </CardDescription>
              </CardHeader>
              <CardContent>
                {passwordSuccess && (
                  <Alert className="mb-4 border-green-500/50 bg-green-500/10">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <AlertDescription className="text-green-600">
                      Password berhasil diubah!
                    </AlertDescription>
                  </Alert>
                )}

                {passwordError && (
                  <Alert variant="destructive" className="mb-4">
                    <Info className="h-4 w-4" />
                    <AlertDescription>{passwordError}</AlertDescription>
                  </Alert>
                )}

                <form onSubmit={handleChangePassword} className="space-y-4">
                  {/* Current Password */}
                  <div className="space-y-2">
                    <Label htmlFor="currentPassword">Password Saat Ini</Label>
                    <div className="relative">
                      <Input
                        id="currentPassword"
                        name="currentPassword"
                        type={showCurrentPassword ? "text" : "password"}
                        value={passwordData.currentPassword}
                        onChange={handlePasswordChange}
                        placeholder="Masukkan password saat ini"
                        disabled={passwordLoading}
                        className="pr-10"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      >
                        {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>

                  {/* New Password */}
                  <div className="space-y-2">
                    <Label htmlFor="newPassword">Password Baru</Label>
                    <div className="relative">
                      <Input
                        id="newPassword"
                        name="newPassword"
                        type={showNewPassword ? "text" : "password"}
                        value={passwordData.newPassword}
                        onChange={handlePasswordChange}
                        placeholder="Masukkan password baru"
                        disabled={passwordLoading}
                        className="pr-10"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                      >
                        {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                    
                    {/* Password Strength */}
                    {passwordData.newPassword && (
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">Kekuatan:</span>
                          <span className={passwordStrength.color}>{passwordStrength.label}</span>
                        </div>
                        <div className="grid grid-cols-4 gap-1">
                          {[1, 2, 3, 4].map((i) => (
                            <div
                              key={i}
                              className={`h-1 rounded ${
                                i <= passwordStrength.score
                                  ? passwordStrength.score <= 1 ? 'bg-red-500' : passwordStrength.score <= 2 ? 'bg-yellow-500' : 'bg-green-500'
                                  : 'bg-muted'
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Confirm Password */}
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Konfirmasi Password Baru</Label>
                    <div className="relative">
                      <Input
                        id="confirmPassword"
                        name="confirmPassword"
                        type={showConfirmPassword ? "text" : "password"}
                        value={passwordData.confirmPassword}
                        onChange={handlePasswordChange}
                        placeholder="Ulangi password baru"
                        disabled={passwordLoading}
                        className="pr-10"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      >
                        {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                    {passwordData.confirmPassword && (
                      <p className={`text-xs ${passwordsMatch ? 'text-green-600' : 'text-red-500'}`}>
                        {passwordsMatch ? '✓ Password cocok' : '✗ Password tidak cocok'}
                      </p>
                    )}
                  </div>

                  <Button 
                    type="submit" 
                    disabled={passwordLoading || !passwordData.currentPassword || !passwordsMatch}
                  >
                    {passwordLoading ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <KeyRound className="mr-2 h-4 w-4" />
                    )}
                    Ubah Password
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* --- Section: Info Keamanan --- */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Info Akun</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center py-2 border-b">
                  <div>
                    <p className="font-medium">Email</p>
                    <p className="text-sm text-muted-foreground">{profileData.email}</p>
                  </div>
                  <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded dark:bg-green-900/30 dark:text-green-400">
                    Terverifikasi
                  </span>
                </div>
                <div className="flex justify-between items-center py-2 border-b">
                  <div>
                    <p className="font-medium">Dibuat pada</p>
                    <p className="text-sm text-muted-foreground">
                      {profileData.created_at ? new Date(profileData.created_at).toLocaleDateString('id-ID', { 
                        year: 'numeric', month: 'long', day: 'numeric' 
                      }) : '-'}
                    </p>
                  </div>
                </div>
                <div className="flex justify-between items-center py-2">
                  <div>
                    <p className="font-medium">Terakhir diperbarui</p>
                    <p className="text-sm text-muted-foreground">
                      {profileData.updated_at ? new Date(profileData.updated_at).toLocaleDateString('id-ID', { 
                        year: 'numeric', month: 'long', day: 'numeric' 
                      }) : '-'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* === TAB 3: NOTIFICATIONS === */}
          <TabsContent value="notifications" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Preferensi Notifikasi</CardTitle>
                <CardDescription>Kelola bagaimana Anda menerima notifikasi</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Notifikasi Email</Label>
                    <p className="text-sm text-muted-foreground">Terima notifikasi penting via email</p>
                  </div>
                  <Switch
                    checked={notifications.emailNotifications}
                    onCheckedChange={(checked) => setNotifications(prev => ({ ...prev, emailNotifications: checked }))}
                  />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Update Proyek</Label>
                    <p className="text-sm text-muted-foreground">Notifikasi saat ada perubahan pada proyek</p>
                  </div>
                  <Switch
                    checked={notifications.projectUpdates}
                    onCheckedChange={(checked) => setNotifications(prev => ({ ...prev, projectUpdates: checked }))}
                  />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Upload Dokumen</Label>
                    <p className="text-sm text-muted-foreground">Notifikasi saat dokumen baru diupload</p>
                  </div>
                  <Switch
                    checked={notifications.documentUploads}
                    onCheckedChange={(checked) => setNotifications(prev => ({ ...prev, documentUploads: checked }))}
                  />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Permintaan Approval</Label>
                    <p className="text-sm text-muted-foreground">Notifikasi untuk approval yang menunggu</p>
                  </div>
                  <Switch
                    checked={notifications.approvalRequests}
                    onCheckedChange={(checked) => setNotifications(prev => ({ ...prev, approvalRequests: checked }))}
                  />
                </div>

                <div className="pt-4">
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertDescription>
                      Pengaturan notifikasi akan diterapkan setelah Anda menyimpan perubahan.
                    </AlertDescription>
                  </Alert>
                </div>

                <Button disabled>
                  <Save className="mr-2 h-4 w-4" />
                  Simpan Preferensi
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default SettingsPage;
