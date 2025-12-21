import { createServerClient, serializeCookie } from '@supabase/ssr'

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
        await supabase.auth.exchangeCodeForSession(code)
    }

    // URL to redirect to after sign in process completes
    res.redirect('/awaiting-approval?reason=email-confirmed')
}
