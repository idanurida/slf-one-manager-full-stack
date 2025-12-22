import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { toast } from "sonner";
import {
    Loader2, Upload, Trash2, Save, Info, Eye, EyeOff,
    Shield, KeyRound, User, Bell, CheckCircle2,
    LayoutDashboard, FolderOpen, FileText, Users, Settings,
    Search, Menu, Moon, Sun, Home, LogOut, CalendarDays, BarChart3,
    ChevronRight
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
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { supabase } from '@/utils/supabaseClient';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from "next-themes";

// --- Helper: Mendapatkan nama file storage dari URL ---
const getFilenameFromUrl = (url) => {
    if (!url) return null;
    const parts = url.split('/');
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

export default function HeadConsultantSettings() {
    const { profile, logout, refreshProfile: refreshProfileContext } = useAuth();
    const router = useRouter();
    const { theme, setTheme } = useTheme();

    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const fileInputRef = useRef(null);

    // Profile states
    const [profileData, setProfileData] = useState(profile);
    const [fullName, setFullName] = useState(profile?.full_name || '');
    const [phone, setPhone] = useState(profile?.phone_number || '');
    const [specialization, setSpecialization] = useState(profile?.specialization || '');
    const [officeLocation, setOfficeLocation] = useState(profile?.office_location || '');
    const [avatarFile, setAvatarFile] = useState(null);

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

    const toggleTheme = () => {
        setTheme(theme === 'dark' ? 'light' : 'dark');
    };

    const handleLogout = async () => {
        await logout();
        router.replace('/login');
    };

    // Load initial data dari context
    useEffect(() => {
        if (profile) {
            setProfileData(profile);
            setFullName(profile.full_name || '');
            setPhone(profile.phone_number || '');
            setSpecialization(profile.specialization || '');
            setOfficeLocation(profile.office_location || '');
        }
    }, [profile]);

    // --- Avatar Logic ---
    const handleAvatarUpload = async () => {
        if (!avatarFile || !profileData) return;

        setLoading(true);
        const file = avatarFile;
        const fileExt = file.name.split('.').pop();
        const fileName = `${profileData.id}.${fileExt}`;
        const filePath = `avatars/${fileName}`;

        try {
            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(filePath, file, {
                    cacheControl: '3600',
                    upsert: true,
                });

            if (uploadError) throw uploadError;

            const { data: publicUrlData } = supabase.storage
                .from('avatars')
                .getPublicUrl(filePath);

            const publicUrl = publicUrlData.publicUrl;

            const { error: profileUpdateError } = await supabase
                .from('profiles')
                .update({ avatar_url: publicUrl })
                .eq('id', profileData.id);

            if (profileUpdateError) throw profileUpdateError;

            toast.success('Avatar berhasil diperbarui');
            setAvatarFile(null);
            if (fileInputRef.current) fileInputRef.current.value = "";
            refreshProfileContext();
        } catch (err) {
            console.error("Avatar Upload Error:", err);
            toast.error('Gagal mengunggah avatar: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleAvatarRemove = async () => {
        if (!profileData || !profileData.avatar_url) return;

        setLoading(true);
        try {
            const filename = getFilenameFromUrl(profileData.avatar_url);

            const { error: profileUpdateError } = await supabase
                .from('profiles')
                .update({ avatar_url: null })
                .eq('id', profileData.id);

            if (profileUpdateError) throw profileUpdateError;

            if (filename) {
                await supabase.storage
                    .from('avatars')
                    .remove([`avatars/${filename}`]);
            }

            toast.success('Avatar berhasil dihapus');
            if (refreshProfileContext) refreshProfileContext();
        } catch (err) {
            console.error("Avatar Remove Error:", err);
            toast.error('Gagal menghapus avatar: ' + err.message);
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

        try {
            const { error: signInError } = await supabase.auth.signInWithPassword({
                email: profileData.email,
                password: passwordData.currentPassword,
            });

            if (signInError) throw new Error('Password saat ini salah');

            const { error: updateError } = await supabase.auth.updateUser({
                password: passwordData.newPassword,
            });

            if (updateError) throw updateError;

            setPasswordSuccess(true);
            setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
            toast.success('Password berhasil diubah');
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

            toast.success('Data profil diperbarui');
            refreshProfileContext();
        } catch (err) {
            toast.error('Gagal: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    const menuItems = [
        { icon: <LayoutDashboard size={20} />, label: "Dashboard", href: "/dashboard/head-consultant" },
        { icon: <FolderOpen size={20} />, label: "Proyek", href: "/dashboard/head-consultant/projects" },
        { icon: <FileText size={20} />, label: "Laporan", href: "/dashboard/head-consultant/approvals" },
        { icon: <Users size={20} />, label: "Tim", href: "/dashboard/head-consultant/team" },
        { icon: <CalendarDays size={20} />, label: "Timeline", href: "/dashboard/head-consultant/timeline" },
        { icon: <BarChart3 size={20} />, label: "Kinerja", href: "/dashboard/head-consultant/performance" },
    ];

    return (
        <DashboardLayout>
            <div className="flex flex-col gap-8">
                <div className="flex flex-col gap-1">
                    <h1 className="text-3xl md:text-4xl font-display font-black text-gray-900 dark:text-white tracking-tight">Konfigurasi akun</h1>
                    <p className="text-text-secondary-light dark:text-text-secondary-dark text-sm md:text-base">Kelola preferensi keamanan dan informasi profil profesional Anda.</p>
                </div>

                <Tabs defaultValue="profile" className="space-y-6">
                    <TabsList className="bg-card p-1 rounded-2xl border border-border shadow-sm flex flex-wrap h-auto">
                        <TabsTrigger value="profile" className="flex items-center gap-2 px-4 py-2.5 rounded-xl data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-primary/20">
                            <User className="h-4 w-4" />
                            <span className="text-sm font-bold">Profil</span>
                        </TabsTrigger>
                        <TabsTrigger value="security" className="flex items-center gap-2 px-4 py-2.5 rounded-xl data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-primary/20">
                            <Shield className="h-4 w-4" />
                            <span className="text-sm font-bold">Keamanan</span>
                        </TabsTrigger>
                        <TabsTrigger value="notifications" className="flex items-center gap-2 px-4 py-2.5 rounded-xl data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-primary/20">
                            <Bell className="h-4 w-4" />
                            <span className="text-sm font-bold">Notifikasi</span>
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="profile" className="space-y-6 animate-fade-in-up">
                        <Card className="rounded-2xl border-border overflow-hidden shadow-sm bg-card">
                            <CardHeader className="bg-muted/50 border-b border-border">
                                <CardTitle className="text-base font-bold text-gray-900 dark:text-white">Foto profil</CardTitle>
                                <CardDescription className="text-xs font-bold text-text-secondary-light">Kelola foto profil Anda</CardDescription>
                            </CardHeader>
                            <CardContent className="p-8">
                                <div className="flex flex-col md:flex-row items-center gap-8">
                                    <Avatar className="h-32 w-32 border-4 border-primary/20 shadow-xl shadow-primary/10">
                                        <AvatarImage
                                            src={avatarFile ? URL.createObjectURL(avatarFile) : profileData?.avatar_url || undefined}
                                            alt={profileData?.full_name || "User"}
                                        />
                                        <AvatarFallback className="text-4xl font-bold bg-primary text-white">
                                            {profileData?.full_name ? profileData.full_name[0] : 'U'}
                                        </AvatarFallback>
                                    </Avatar>

                                    <div className="flex flex-col items-center md:items-start gap-4">
                                        <div className="flex flex-wrap justify-center md:justify-start gap-3">
                                            <Button
                                                onClick={() => fileInputRef.current.click()}
                                                disabled={loading}
                                                className="rounded-xl bg-primary hover:bg-primary-hover text-white shadow-lg shadow-primary/20 flex items-center gap-2 h-11 px-6 font-bold text-sm transition-all"
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

                                            {profileData?.avatar_url && (
                                                <Button
                                                    variant="outline"
                                                    onClick={handleAvatarRemove}
                                                    disabled={loading}
                                                    className="rounded-xl border-consultant-red/20 text-consultant-red hover:bg-consultant-red hover:text-white flex items-center gap-2 h-11 px-6 font-bold text-xs transition-all"
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
                                                className="rounded-xl bg-status-green hover:bg-green-600 text-white shadow-green-500/20 flex items-center gap-2 h-11 px-6 font-bold text-xs animate-pulse"
                                            >
                                                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                                Simpan Avatar Baru
                                            </Button>
                                        )}
                                        <p className="text-xs font-bold text-text-secondary-light">
                                            {avatarFile ? `File terpilih: ${avatarFile.name}` : 'Maks. 2MB. Format: JPG, PNG.'}
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="rounded-2xl border-border overflow-hidden shadow-sm bg-card">
                            <CardHeader className="bg-muted/50 border-b border-border">
                                <CardTitle className="text-base font-bold text-gray-900 dark:text-white">Informasi pribadi</CardTitle>
                                <CardDescription className="text-xs font-bold text-text-secondary-light">Kelola informasi dasar profil Anda</CardDescription>
                            </CardHeader>
                            <CardContent className="p-8">
                                <form onSubmit={handleSubmit} className="space-y-8">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        <div className="space-y-3">
                                            <span className="text-sm font-bold text-primary">Nama lengkap</span>
                                            <Input
                                                value={fullName}
                                                onChange={(e) => setFullName(e.target.value)}
                                                placeholder="Masukkan nama lengkap"
                                                required
                                                className="h-12 rounded-xl bg-muted/50 border-border focus:ring-2 focus:ring-primary/20 placeholder-text-secondary-light/50"
                                            />
                                        </div>

                                        <div className="space-y-3">
                                            <span className="text-xs font-bold text-primary">Nomor telepon</span>
                                            <Input
                                                value={phone}
                                                onChange={(e) => setPhone(e.target.value)}
                                                placeholder="08xxxxxxxxxx"
                                                className="h-12 rounded-xl bg-muted/50 border-border focus:ring-2 focus:ring-primary/20 placeholder-text-secondary-light/50"
                                            />
                                        </div>

                                        <div className="space-y-3">
                                            <span className="text-xs font-bold text-primary">Alamat email</span>
                                            <Input
                                                value={profileData?.email || ""}
                                                readOnly
                                                className="h-12 rounded-xl bg-muted border-transparent cursor-not-allowed font-bold"
                                            />
                                        </div>

                                        <div className="space-y-3">
                                            <span className="text-xs font-bold text-primary">Peran sistem</span>
                                            <Input
                                                value={profileData?.role ? profileData.role.charAt(0).toUpperCase() + profileData.role.slice(1).replace(/_/g, ' ') : ""}
                                                readOnly
                                                className="h-12 rounded-xl bg-muted border-transparent cursor-not-allowed font-bold text-primary"
                                            />
                                        </div>

                                        <div className="space-y-3 md:col-span-2">
                                            <span className="text-xs font-bold text-primary">Lokasi kantor</span>
                                            <Input
                                                value={officeLocation}
                                                onChange={(e) => setOfficeLocation(e.target.value)}
                                                placeholder="Contoh: Jakarta Office / Remote"
                                                className="h-12 rounded-xl bg-muted/50 border-border focus:ring-2 focus:ring-primary/20 placeholder-text-secondary-light/50"
                                            />
                                        </div>
                                    </div>

                                    <Button
                                        type="submit"
                                        disabled={loading}
                                        className="w-full md:w-auto rounded-xl bg-primary hover:bg-primary-hover text-white shadow-lg shadow-primary/30 h-12 px-8 font-bold text-sm flex items-center justify-center gap-3 transition-all active:scale-95"
                                    >
                                        {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
                                        Simpan Perubahan Profil
                                    </Button>
                                </form>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="security" className="space-y-6 animate-fade-in-up">
                        <Card className="rounded-2xl border-border overflow-hidden shadow-sm bg-card">
                            <CardHeader className="bg-muted/50 border-b border-border">
                                <CardTitle className="text-base font-bold flex items-center gap-3 text-gray-900 dark:text-white">
                                    <KeyRound className="h-5 w-5 text-primary" />
                                    Keamanan akun
                                </CardTitle>
                                <CardDescription className="text-xs font-bold text-text-secondary-light">Perbarui password Anda secara berkala</CardDescription>
                            </CardHeader>
                            <CardContent className="p-8">
                                {passwordSuccess && (
                                    <Alert className="mb-8 border-green-500/20 bg-green-500/5 rounded-2xl">
                                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                                        <AlertDescription className="text-green-600 font-bold text-xs">Password berhasil diubah!</AlertDescription>
                                    </Alert>
                                )}

                                {passwordError && (
                                    <Alert variant="destructive" className="mb-8 rounded-2xl">
                                        <Info className="h-5 w-5" />
                                        <AlertDescription className="font-bold text-xs">{passwordError}</AlertDescription>
                                    </Alert>
                                )}

                                <form onSubmit={handleChangePassword} className="space-y-6">
                                    <div className="space-y-3">
                                        <span className="text-sm font-bold text-primary">Kata sandi saat ini</span>
                                        <div className="relative">
                                            <Input
                                                name="currentPassword"
                                                type={showCurrentPassword ? "text" : "password"}
                                                value={passwordData.currentPassword}
                                                onChange={handlePasswordChange}
                                                className="h-12 rounded-xl bg-muted/50 border-border pr-12 focus:ring-2 focus:ring-primary/20"
                                            />
                                            <button
                                                type="button"
                                                className="absolute right-4 top-1/2 -translate-y-1/2 text-text-secondary-light"
                                                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                                            >
                                                {showCurrentPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                            </button>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        <div className="space-y-3">
                                            <span className="text-xs font-bold text-primary">Kata sandi baru</span>
                                            <div className="relative">
                                                <Input
                                                    name="newPassword"
                                                    type={showNewPassword ? "text" : "password"}
                                                    value={passwordData.newPassword}
                                                    onChange={handlePasswordChange}
                                                    className="h-12 rounded-xl bg-muted/50 border-border pr-12 focus:ring-2 focus:ring-primary/20"
                                                />
                                                <button
                                                    type="button"
                                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-text-secondary-light"
                                                    onClick={() => setShowNewPassword(!showNewPassword)}
                                                >
                                                    {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                                </button>
                                            </div>

                                            {passwordData.newPassword && (
                                                <div className="space-y-1 pt-1">
                                                    <div className="flex justify-between text-xs font-bold">
                                                        <span className="text-text-secondary-light">Kekuatan:</span>
                                                        <span className={passwordStrength.color}>{passwordStrength.label}</span>
                                                    </div>
                                                    <div className="grid grid-cols-4 gap-1">
                                                        {[1, 2, 3, 4].map((i) => (
                                                            <div
                                                                key={i}
                                                                className={`h-1 rounded-full transition-all duration-500 ${i <= passwordStrength.score
                                                                    ? passwordStrength.score <= 1 ? 'bg-consultant-red' : passwordStrength.score <= 2 ? 'bg-status-yellow' : 'bg-status-green'
                                                                    : 'bg-muted'
                                                                    }`}
                                                            />
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        <div className="space-y-3">
                                            <span className="text-xs font-bold text-primary">Konfirmasi kata sandi</span>
                                            <div className="relative">
                                                <Input
                                                    name="confirmPassword"
                                                    type={showConfirmPassword ? "text" : "password"}
                                                    value={passwordData.confirmPassword}
                                                    onChange={handlePasswordChange}
                                                    className="h-12 rounded-xl bg-muted/50 border-border pr-12 focus:ring-2 focus:ring-primary/20"
                                                />
                                                <button
                                                    type="button"
                                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-text-secondary-light"
                                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                                >
                                                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                                </button>
                                            </div>
                                            {passwordData.confirmPassword && (
                                                <p className={`text-xs font-bold ${passwordsMatch ? 'text-status-green' : 'text-consultant-red'}`}>
                                                    {passwordsMatch ? '✓ Password Cocok' : '✗ Password Tidak Cocok'}
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    <Button
                                        type="submit"
                                        disabled={passwordLoading || !passwordData.currentPassword || !passwordsMatch}
                                        className="rounded-xl bg-slate-900 dark:bg-slate-100 dark:text-slate-900 hover:opacity-90 h-12 px-8 font-bold text-xs flex items-center justify-center gap-3 active:scale-95 transition-all"
                                    >
                                        {passwordLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <KeyRound className="h-5 w-5" />}
                                        Update Password Keamanan
                                    </Button>
                                </form>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="notifications" className="space-y-6 animate-fade-in-up">
                        <Card className="rounded-2xl border-border overflow-hidden shadow-sm bg-card">
                            <CardHeader className="bg-muted/50 border-b border-border">
                                <CardTitle className="text-sm font-bold text-gray-900 dark:text-white">Preferensi notifikasi</CardTitle>
                                <CardDescription className="text-xs font-bold text-text-secondary-light">Atur bagaimana cara sistem menghubungi Anda</CardDescription>
                            </CardHeader>
                            <CardContent className="p-8 space-y-8">
                                <div className="flex items-center justify-between p-4 rounded-2xl bg-muted/50 border border-transparent hover:border-primary/20 transition-all">
                                    <div className="space-y-1">
                                        <span className="text-sm font-bold text-primary">Notifikasi email</span>
                                        <p className="text-xs text-text-secondary-light font-bold">Terima ringkasan aktivitas via email</p>
                                    </div>
                                    <Switch
                                        checked={notifications.emailNotifications}
                                        onCheckedChange={(checked) => setNotifications(prev => ({ ...prev, emailNotifications: checked }))}
                                    />
                                </div>

                                <div className="flex items-center justify-between p-4 rounded-2xl bg-muted/50 border border-transparent hover:border-primary/20 transition-all">
                                    <div className="space-y-1">
                                        <span className="text-sm font-bold text-primary">Pembaruan proyek</span>
                                        <p className="text-xs text-text-secondary-light font-bold">Notifikasi instan perubahan data proyek</p>
                                    </div>
                                    <Switch
                                        checked={notifications.projectUpdates}
                                        onCheckedChange={(checked) => setNotifications(prev => ({ ...prev, projectUpdates: checked }))}
                                    />
                                </div>

                                <div className="flex items-center justify-between p-4 rounded-2xl bg-muted/50 border border-transparent hover:border-primary/20 transition-all">
                                    <div className="space-y-1">
                                        <Label className="text-sm font-bold text-primary">Approval requests</Label>
                                        <p className="text-xs text-text-secondary-light font-bold">Notifikasi saat ada dokumen menunggu approval</p>
                                    </div>
                                    <Switch
                                        checked={notifications.approvalRequests}
                                        onCheckedChange={(checked) => setNotifications(prev => ({ ...prev, approvalRequests: checked }))}
                                    />
                                </div>

                                <Button className="rounded-xl bg-primary hover:bg-primary-hover text-white h-11 px-8 font-bold text-sm transition-all" onClick={() => toast.success('Preferensi disimpan')}>
                                    Simpan Preferensi
                                </Button>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>

            <style jsx global>{`
          @keyframes fade-in-up {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
          }
          .animate-fade-in-up {
            animation: fade-in-up 0.4s ease-out forwards;
          }
        `}</style>
        </DashboardLayout>
    );
}

