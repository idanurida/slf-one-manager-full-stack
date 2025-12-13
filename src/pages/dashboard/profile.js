import React from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/context/AuthContext';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Mail, Phone, MapPin, Briefcase, User, Edit } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export default function ProfilePage() {
    const router = useRouter();
    const { user, profile, loading } = useAuth();

    const handleEditProfile = () => {
        router.push('/dashboard/settings');
    };

    const getRoleLabel = (role) => {
        if (!role) return '';
        return role.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
    };

    if (loading) {
        return (
            <DashboardLayout title="Profil Saya">
                <div className="p-6 max-w-4xl mx-auto space-y-6">
                    <Card>
                        <CardContent className="p-6">
                            <div className="flex flex-col md:flex-row items-center gap-6">
                                <Skeleton className="h-24 w-24 rounded-full" />
                                <div className="space-y-2 text-center md:text-left flex-1">
                                    <Skeleton className="h-8 w-48" />
                                    <Skeleton className="h-4 w-32" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader>
                            <Skeleton className="h-6 w-32" />
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <Skeleton className="h-4 w-full" />
                            <Skeleton className="h-4 w-full" />
                            <Skeleton className="h-4 w-full" />
                        </CardContent>
                    </Card>
                </div>
            </DashboardLayout>
        );
    }

    if (!user || !profile) {
        return (
            <DashboardLayout title="Profil Saya">
                <div className="p-6 text-center">
                    <p>Data profil tidak ditemukan. Silakan login kembali.</p>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout title="Profil Saya">
            <div className="p-6 max-w-4xl mx-auto space-y-6">
                {/* Header Card with Avatar and Basic Info */}
                <Card>
                    <CardContent className="p-6">
                        <div className="flex flex-col md:flex-row items-center gap-6">
                            <Avatar className="h-24 w-24 border-2 border-slate-200 dark:border-slate-700">
                                <AvatarImage src={profile.avatar_url} alt={profile.full_name} />
                                <AvatarFallback className="text-2xl">
                                    {profile.full_name?.charAt(0) || <User />}
                                </AvatarFallback>
                            </Avatar>

                            <div className="flex-1 text-center md:text-left space-y-2">
                                <div>
                                    <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                                        {profile.full_name}
                                    </h2>
                                    <Badge variant="secondary" className="mt-1">
                                        {getRoleLabel(profile.role)}
                                    </Badge>
                                </div>
                                <p className="text-slate-500 dark:text-slate-400 flex items-center justify-center md:justify-start gap-2">
                                    <Mail className="w-4 h-4" />
                                    {profile.email}
                                </p>
                            </div>

                            <Button onClick={handleEditProfile} className="shrink-0">
                                <Edit className="w-4 h-4 mr-2" />
                                Edit Profil
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Details Card */}
                <Card>
                    <CardHeader>
                        <CardTitle>Informasi Detail</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-1">
                                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Nomor Telepon</p>
                                <div className="flex items-center gap-2 text-slate-900 dark:text-slate-100">
                                    <Phone className="w-4 h-4 text-slate-400" />
                                    {profile.phone_number || '-'}
                                </div>
                            </div>

                            {['project_lead', 'head_consultant', 'admin_lead', 'inspector'].includes(profile.role) && (
                                <div className="space-y-1">
                                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Lokasi Kantor</p>
                                    <div className="flex items-center gap-2 text-slate-900 dark:text-slate-100">
                                        <MapPin className="w-4 h-4 text-slate-400" />
                                        {profile.office_location || '-'}
                                    </div>
                                </div>
                            )}

                            {profile.role === 'inspector' && (
                                <div className="space-y-1">
                                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Spesialisasi</p>
                                    <div className="flex items-center gap-2 text-slate-900 dark:text-slate-100">
                                        <Briefcase className="w-4 h-4 text-slate-400" />
                                        {getRoleLabel(profile.specialization) || '-'}
                                    </div>
                                </div>
                            )}

                            <div className="space-y-1">
                                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Status Akun</p>
                                <div className="flex items-center gap-2">
                                    <Badge variant={profile.is_active ? "success" : "destructive"}>
                                        {profile.is_active ? "Aktif" : "Nonaktif"}
                                    </Badge>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </DashboardLayout>
    );
}
