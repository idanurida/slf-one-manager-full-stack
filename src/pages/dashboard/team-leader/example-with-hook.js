// FILE: src/pages/dashboard/team-leader/example-with-hook.js
// Contoh penggunaan useAuthGuard hook untuk auth protection
// File ini bisa dihapus - hanya untuk demonstrasi

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Users, Building, FileText, AlertTriangle } from 'lucide-react';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { useTeamLeaderGuard } from '@/hooks/useAuthGuard';
import { handleApiError } from '@/utils/errorHandler';
import { supabase } from '@/utils/supabaseClient';

/**
 * Contoh halaman yang menggunakan useAuthGuard hook
 * 
 * Keuntungan menggunakan Hook vs HOC:
 * 1. Lebih fleksibel - bisa menggunakan multiple guards
 * 2. Bisa mengakses state loading dan authorized langsung
 * 3. Lebih mudah untuk conditional rendering
 * 4. Tidak perlu wrap komponen
 */
export default function ExampleWithHookPage() {
  // Gunakan hook untuk auth guard
  const {
    isAuthorized,
    isLoading,
    user,
    profile,
    userRole,
    hasRole,
  } = useTeamLeaderGuard();

  const [data, setData] = useState(null);
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    // Hanya fetch data jika authorized
    if (!isAuthorized) return;

    const fetchData = async () => {
      try {
        const { data: projects, error } = await supabase
          .from('projects')
          .select('id, name, status')
          .limit(5);

        if (error) throw error;
        setData(projects);
      } catch (error) {
        handleApiError(error, 'ExampleWithHook', {
          fallbackMessage: 'Gagal memuat data'
        });
      } finally {
        setDataLoading(false);
      }
    };

    fetchData();
  }, [isAuthorized]);

  // Loading state
  if (isLoading) {
    return (
      <DashboardLayout title="Contoh Hook">
        <div className="p-6 space-y-6">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
      </DashboardLayout>
    );
  }

  // Not authorized
  if (!isAuthorized) {
    return (
      <DashboardLayout title="Contoh Hook">
        <div className="p-6">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Anda tidak memiliki akses ke halaman ini.
              Halaman ini hanya untuk Team Leader.
            </AlertDescription>
          </Alert>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Contoh Hook">
      <div className="p-6 space-y-6">
        {/* User Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Info User (dari Hook)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p><strong>User ID:</strong> {user?.id}</p>
            <p><strong>Nama:</strong> {profile?.full_name}</p>
            <p><strong>Role:</strong> <Badge>{userRole}</Badge></p>
            <p><strong>Is Team Leader:</strong> {hasRole('team_leader') ? 'Ya' : 'Tidak'}</p>
          </CardContent>
        </Card>

        {/* Contoh Data */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building className="w-5 h-5" />
              Contoh Data Proyek
            </CardTitle>
          </CardHeader>
          <CardContent>
            {dataLoading ? (
              <p>Loading...</p>
            ) : data?.length > 0 ? (
              <ul className="space-y-2">
                {data.map(project => (
                  <li key={project.id} className="flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    {project.name} - <Badge variant="outline">{project.status}</Badge>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-muted-foreground">Tidak ada data</p>
            )}
          </CardContent>
        </Card>

        {/* Cara Penggunaan */}
        <Card>
          <CardHeader>
            <CardTitle>Cara Menggunakan useAuthGuard Hook</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="bg-muted p-4 rounded-lg text-sm overflow-x-auto">
{`// 1. Import hook
import { useTeamLeaderGuard } from '@/hooks/useAuthGuard';

// 2. Gunakan di komponen
function MyPage() {
  const {
    isAuthorized,
    isLoading,
    user,
    profile,
    userRole,
    hasRole,
  } = useTeamLeaderGuard();

  // 3. Handle loading
  if (isLoading) return <Loading />;

  // 4. Handle unauthorized
  if (!isAuthorized) return <Unauthorized />;

  // 5. Render content
  return <div>Hello {profile?.full_name}</div>;
}

// Alternatif dengan custom roles:
import { useAuthGuard } from '@/hooks/useAuthGuard';

const { isAuthorized } = useAuthGuard({
  allowedRoles: ['project_lead', 'admin_lead'],
  redirectOnFail: true,
  redirectTo: '/dashboard'
});`}
            </pre>
          </CardContent>
        </Card>

        {/* Perbandingan HOC vs Hook */}
        <Card>
          <CardHeader>
            <CardTitle>Kapan Menggunakan HOC vs Hook?</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-semibold">Gunakan HOC (withAuth) ketika:</h4>
              <ul className="list-disc list-inside text-sm text-muted-foreground">
                <li>Halaman sederhana dengan satu role check</li>
                <li>Ingin loading/error state ditangani otomatis</li>
                <li>Tidak perlu akses ke auth state di komponen</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold">Gunakan Hook (useAuthGuard) ketika:</h4>
              <ul className="list-disc list-inside text-sm text-muted-foreground">
                <li>Butuh kontrol penuh atas rendering</li>
                <li>Perlu multiple role checks di satu halaman</li>
                <li>Ingin conditional rendering berdasarkan role</li>
                <li>Butuh akses ke hasRole() untuk conditional features</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
