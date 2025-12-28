import { createServerClient, serializeCookie } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import NotifikasiService from '@/services/NotifikasiService'

export default async function handler(req, res) {
    const { code } = req.query

    if (code) {
        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
            {
                cookies: {
                    getAll() {
                        return Object.keys(req.cookies).map((name) => ({ name, value: req.cookies[name] }))
                    },
                    setAll(cookiesToSet) {
                        cookiesToSet.forEach(({ name, value, options }) => {
                            res.setHeader('Set-Cookie', serializeCookie(name, value, options))
                        })
                    },
                },
            }
        )
        const { data } = await supabase.auth.exchangeCodeForSession(code)

        // Trigger notification if user session is established
        if (data?.user) {
            // Use Service Role to bypass RLS for Admin Notification
            const supabaseAdmin = createClient(
                process.env.NEXT_PUBLIC_SUPABASE_URL,
                process.env.SUPABASE_SERVICE_ROLE_KEY,
                {
                    auth: {
                        autoRefreshToken: false,
                        persistSession: false
                    }
                }
            );

            await NotifikasiService.kirimNotifikasiEmailDikonfirmasi(data.user.id, data.user.email, supabaseAdmin);
        }
    }

    // URL to redirect to after sign in process completes
    res.redirect('/awaiting-approval?reason=email-confirmed')
}
