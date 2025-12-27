// FILE: middleware.js - UPDATED WITH RPC FALLBACK
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';

export async function middleware(req) {
    const { pathname } = req.nextUrl;

    console.log('🔵 ===== MIDDLEWARE START =====');
    console.log('📍 Path:', pathname);

    // Skip untuk static files
    if (pathname.startsWith('/_next') || pathname.includes('.')) {
        return NextResponse.next();
    }

    const res = NextResponse.next();
    const supabase = createMiddlewareClient({ req, res });

    try {
        // Get session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        console.log('🔐 Session exists:', !!session);
        if (sessionError) console.error('Session error:', sessionError);

        if (!session) {
            console.log('🚫 No session');
            if (pathname.startsWith('/dashboard')) {
                console.log('➡️ Redirecting to login');
                return NextResponse.redirect(new URL('/login', req.url));
            }
            return res;
        }

        console.log('✅ User:', session.user.email);
        console.log('🆔 User ID:', session.user.id);

        let userRole = 'client';
        let detectionMethod = 'unknown';

        // METHOD 1: Coba direct query dulu
        console.log('🔄 METHOD 1: Direct profile query...');
        try {
            const { data: profileData, error: profileError } = await supabase
                .from('profiles')
                .select('role, email')
                .eq('id', session.user.id)
                .single();

            console.log('📊 Profile query result:', profileData);
            console.log('❌ Profile query error:', profileError);

            if (profileError) {
                console.error('💥 Direct query failed:', profileError.message);

                // METHOD 2: Try RPC function untuk bypass RLS
                console.log('🔄 METHOD 2: Trying RPC function slf_get_user_role_fallback...');
                const { data: rpcData, error: rpcError } = await supabase.rpc(
                    'slf_get_user_role_fallback',
                    { user_uuid: session.user.id }
                );

                console.log('📊 RPC result:', rpcData);
                console.log('❌ RPC error:', rpcError);

                if (rpcError) {
                    console.error('💥 RPC also failed:', rpcError.message);

                    // METHOD 3: Try another RPC function
                    console.log('🔄 METHOD 3: Trying RPC function slf_get_user_role...');
                    const { data: rpc2Data, error: rpc2Error } = await supabase.rpc(
                        'slf_get_user_role',
                        { user_id_param: session.user.id }
                    );

                    console.log('📊 RPC2 result:', rpc2Data);
                    console.log('❌ RPC2 error:', rpc2Error);

                    if (!rpc2Error && rpc2Data) {
                        userRole = rpc2Data;
                        detectionMethod = 'rpc_slf_get_user_role';
                        console.log('✅ Role from RPC slf_get_user_role:', userRole);
                    } else {
                        // METHOD 4: Hardcode berdasarkan email
                        console.log('🔄 METHOD 4: Hardcoding based on email...');
                        if (session.user.email === 'superadmin2@slf.com') {
                            userRole = 'superadmin';
                            detectionMethod = 'email_hardcode_superadmin';
                            console.log('🎯 Hardcoded as superadmin (email match)');
                        } else if (session.user.email.includes('admin.lead')) {
                            userRole = 'admin_lead';
                            detectionMethod = 'email_hardcode_adminlead';
                        } else if (session.user.email.includes('client')) {
                            userRole = 'client';
                            detectionMethod = 'email_hardcode_client';
                        } else {
                            // Default ke client
                            detectionMethod = 'default_fallback';
                        }
                    }
                } else if (rpcData) {
                    userRole = rpcData;
                    detectionMethod = 'rpc_fallback';
                    console.log('✅ Role from RPC slf_get_user_role_fallback:', userRole);
                }
            } else if (profileData) {
                userRole = profileData.role || 'client';
                detectionMethod = 'direct_query';
                console.log('✅ Role from direct query:', userRole);
            }
        } catch (error) {
            console.error('💥 Exception in role detection:', error);
            detectionMethod = 'exception_fallback';
        }

        // HARDCODE OVERRIDE: Jika email adalah superadmin2@slf.com, FORCE superadmin
        if (session.user.email === 'superadmin2@slf.com') {
            console.log('🔥 HARDCODE OVERRIDE ACTIVATED for superadmin2@slf.com');
            userRole = 'superadmin';
            detectionMethod = 'hardcode_override';
        }

        console.log('🎯 FINAL ROLE DETECTION:');
        console.log('   Role:', userRole);
        console.log('   Method:', detectionMethod);
        console.log('   Email:', session.user.email);

        // Redirect mapping
        const ROLE_REDIRECT_MAP = {
            superadmin: '/dashboard/superadmin',
            admin: '/dashboard/admin',
            admin_lead: '/dashboard/admin-lead',
            head_consultant: '/dashboard/head-consultant',
            project_lead: '/dashboard/project-lead',
            inspector: '/dashboard/inspector',
            admin_team: '/dashboard/admin-team',
            client: '/dashboard/client',
            drafter: '/dashboard/drafter'
        };

        const targetPath = ROLE_REDIRECT_MAP[userRole] || '/dashboard/client';

        console.log('🗺️  REDIRECT:');
        console.log('   Detected role:', userRole);
        console.log('   Target path:', targetPath);

        // Redirect logic
        if (pathname === '/' || pathname === '/dashboard') {
            console.log('🔄 Redirecting from root to:', targetPath);
            const redirectUrl = new URL(targetPath, req.url);
            redirectUrl.searchParams.set('detection_method', detectionMethod);
            return NextResponse.redirect(redirectUrl);
        }

        // Jika di dashboard yang salah, redirect ke yang benar
        if (pathname.startsWith('/dashboard/')) {
            const currentDashboard = pathname;
            const correctDashboard = targetPath;

            if (currentDashboard !== correctDashboard && Object.values(ROLE_REDIRECT_MAP).includes(currentDashboard)) {
                console.log('🚫 Wrong dashboard! Current:', currentDashboard, 'Correct:', correctDashboard);
                console.log('🔄 Redirecting to correct dashboard...');
                return NextResponse.redirect(new URL(correctDashboard, req.url));
            }
        }

        console.log('✅ Access granted to:', pathname);
        console.log('🔵 ===== MIDDLEWARE END =====');

        // Add debug headers
        res.headers.set('X-User-Role', userRole);
        res.headers.set('X-Detection-Method', detectionMethod);
        res.headers.set('X-User-Email', session.user.email || 'unknown');

        return res;

    } catch (error) {
        console.error('💥 Middleware fatal error:', error);
        return NextResponse.next();
    }
}

export const config = {
    matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|webp)$).*)'],
};
