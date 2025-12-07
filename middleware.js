// FILE: middleware.js
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';

const ROLE_REDIRECT_MAP = {
  head_consultant: "/dashboard/head-consultant",
  admin_lead: "/dashboard/admin-lead",
  // ... tambahkan semua peran lain
  client: "/dashboard/client",
};

export async function middleware(req) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });
  const { pathname } = req.nextUrl;

  // 1. Ambil Sesi (dari cookies)
  const { data: { session } } = await supabase.auth.getSession();

  // 2. Jika BELUM login, cegah akses ke dashboard
  if (!session) {
    if (pathname.startsWith('/dashboard') || pathname === '/') {
      const redirectUrl = req.nextUrl.clone();
      redirectUrl.pathname = '/login';
      return NextResponse.redirect(redirectUrl);
    }
    return res;
  } 
  
  // 3. Jika SUDAH login: Lakukan Redirect Berdasarkan Peran
  if (session) {
    let userRole = 'client'; // Default
    
    // NOTE: Ini adalah satu-satunya bagian yang memanggil Supabase DB
    try {
        const { data: profileData } = await supabase
            .from("profiles")
            .select("role")
            .eq("id", session.user.id)
            .single();

        if (profileData && profileData.role) {
            userRole = profileData.role.trim().toLowerCase().replace(/\s/g, '_');
        }
    } catch (e) {
        console.error("[Middleware] Gagal fetch role:", e);
    }
    
    const targetPath = ROLE_REDIRECT_MAP[userRole] || ROLE_REDIRECT_MAP['client'];

    if (pathname === '/' || pathname === '/dashboard') {
      const redirectUrl = req.nextUrl.clone();
      redirectUrl.pathname = targetPath;
      return NextResponse.redirect(redirectUrl);
    }
    
    // Mencegah akses ke dashboard yang salah (misal client mencoba /dashboard/admin-lead)
    if (pathname.startsWith('/dashboard/') && pathname !== targetPath) {
        if (Object.values(ROLE_REDIRECT_MAP).includes(pathname)) {
            const redirectUrl = req.nextUrl.clone();
            redirectUrl.pathname = targetPath;
            return NextResponse.redirect(redirectUrl);
        }
    }
  }
  
  return res;
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.jpg$|.*\\.jpeg$|.*\\.svg$).*)'],
};