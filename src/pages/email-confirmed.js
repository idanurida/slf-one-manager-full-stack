"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle2 } from 'lucide-react';

export default function EmailConfirmedPage() {
  const router = useRouter();
  const [role, setRole] = useState('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const r = params.get('role') || '';
    setRole(r);
    // clear query string for cleanliness
    try {
      const url = new URL(window.location.href);
      url.search = '';
      window.history.replaceState({}, document.title, url.toString());
    } catch (e) {}
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <main className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <Card className="border-border shadow-lg">
            <CardHeader className="text-center space-y-4 pb-4">
              <div className="flex justify-center">
                <CheckCircle2 className="w-12 h-12 text-green-600" />
              </div>
              <div>
                <CardTitle className="text-xl font-semibold">Email Terverifikasi</CardTitle>
                <CardDescription className="mt-1 text-sm text-muted-foreground">Terima kasih, email Anda telah berhasil diverifikasi.</CardDescription>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              <Alert className="border-green-500/50 bg-green-500/10">
                <AlertDescription className="text-green-700">
                  {role ? (
                    <>
                      Permintaan role: <strong>{role}</strong>. Selanjutnya, tunggu persetujuan SuperAdmin jika role memerlukan approval.
                    </>
                  ) : (
                    'Silakan tunggu approval SuperAdmin jika diperlukan, atau langsung login menggunakan kredensial Anda.'
                  )}
                </AlertDescription>
              </Alert>

              <div className="flex flex-col gap-2">
                <Button onClick={() => router.replace('/login')}>Pergi ke Login</Button>
                <Link href="/awaiting-approval">
                  <Button variant="outline">Cek Status Persetujuan</Button>
                </Link>
                <Button variant="ghost" onClick={() => router.replace('/')}>Kembali ke Beranda</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
