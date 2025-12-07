// FILE: src/pages/dashboard/team-leader/example-with-hoc.js
// Contoh penggunaan withAuth HOC untuk auth protection
// File ini bisa dihapus - hanya untuk demonstrasi

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Users, Building, FileText } from 'lucide-react';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { withTeamLeaderAuth } from '@/components/hoc/withAuth';
import { handleApiError } from '@/utils/errorHandler';
import { supabase } from '@/utils/supabaseClient';

/**
 * Contoh halaman yang menggunakan withAuth HOC
 * 
 * Keuntungan menggunakan HOC:
 * 1. Auth check otomatis - tidak perlu menulis ulang di setiap halaman
 * 2. Loading state otomatis ditangani
 * 3. Unauthorized access otomatis ditampilkan pesan error
 * 4. Props user, profile, userRole otomatis di-inject
 */
function ExamplePage({ user, profile, userRole }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Contoh fetch data
        const { data: projects, error } = await supabase
          .from('projects')
          .select('id, name, status')
          .limit(5);

        if (error) throw error;
        setData(projects);
      } catch (error) {
        // Gunakan standardized error handler
        handleApiError(error, 'ExamplePage', {
          fallbackMessage: 'Gagal memuat data'
        });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return (
    <DashboardLayout title="Contoh HOC">
      <div className="p-6 space-y-6">
        {/* User Info dari props yang di-inject oleh HOC */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Info User (dari HOC)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p><strong>User ID:</strong> {user?.id}</p>
            <p><strong>Nama:</strong> {profile?.full_name}</p>
            <p><strong>Role:</strong> <Badge>{userRole}</Badge></p>
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
            {loading ? (
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
            <CardTitle>Cara Menggunakan withAuth HOC</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="bg-muted p-4 rounded-lg text-sm overflow-x-auto">
{`// 1. Import HOC
import { withTeamLeaderAuth } from '@/components/hoc/withAuth';

// 2. Buat komponen biasa
function MyPage({ user, profile, userRole }) {
  return <div>Hello {profile?.full_name}</div>;
}

// 3. Wrap dengan HOC
export default withTeamLeaderAuth(MyPage, {
  pageTitle: 'My Page Title'
});

// Alternatif dengan custom roles:
import { withAuth } from '@/components/hoc/withAuth';

export default withAuth(MyPage, {
  allowedRoles: ['project_lead', 'admin_lead'],
  pageTitle: 'Custom Page'
});`}
            </pre>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

// Export dengan HOC - hanya Team Leader yang bisa akses
export default withTeamLeaderAuth(ExamplePage, {
  pageTitle: 'Contoh withAuth HOC'
});
