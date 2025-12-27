import { supabaseAdmin } from '../../../utils/supabaseAdmin';

export default async function handler(req, res) {
    console.log('API: form-options handler called');

    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        // 1. Manual Session Verification
        console.log('API: Verifying session...');
        let accessToken = null;

        // Check Authorization Header
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            accessToken = authHeader.substring(7);
        }

        // Try to find the token in cookies (Fallback)
        if (!accessToken) {
            for (const [key, value] of Object.entries(req.cookies)) {
                if (key.startsWith('sb-') && key.endsWith('-auth-token')) {
                    try {
                        const parsed = JSON.parse(value);
                        if (parsed.access_token) {
                            accessToken = parsed.access_token;
                            break;
                        }
                    } catch (e) {
                        // ignore
                    }
                }
            }
        }

        if (!accessToken && req.cookies['supabase-auth-token']) {
            accessToken = req.cookies['supabase-auth-token'];
        }

        if (!accessToken) {
            console.warn('API: No access token found');
            return res.status(401).json({ error: 'Unauthorized: No token' });
        }

        const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(accessToken);

        if (authError || !user) {
            console.error('API: Auth verification failed', authError);
            return res.status(401).json({ error: 'Unauthorized: Invalid token' });
        }

        // 2. Verified User - Fetch Data Serially to avoid connection issues
        console.log('API: User verified. Fetching data...');

        const { data: clients, error: clientsErr } = await supabaseAdmin.from('clients').select('id, name, email').order('name');
        if (clientsErr) throw clientsErr;
        console.log(`API: Fetched ${clients?.length} clients`);

        const { data: leads, error: leadsErr } = await supabaseAdmin.from('profiles').select('id, full_name, email, role').eq('role', 'project_lead').order('full_name');
        if (leadsErr) throw leadsErr;

        const { data: heads, error: headsErr } = await supabaseAdmin.from('profiles').select('id, full_name, email, role').eq('role', 'head_consultant').order('full_name');
        if (headsErr) throw headsErr;

        const { data: adminTeams, error: adminErr } = await supabaseAdmin.from('profiles').select('id, full_name, email, role').eq('role', 'admin_team').order('full_name');
        if (adminErr) throw adminErr;

        const { data: drafters, error: draftsErr } = await supabaseAdmin.from('profiles').select('id, full_name, email, role').eq('role', 'drafter').order('full_name');
        if (draftsErr) throw draftsErr;

        const { data: inspectors, error: inspErr } = await supabaseAdmin.from('profiles').select('id, full_name, email, role, specialization').eq('role', 'inspector').order('full_name');
        if (inspErr) throw inspErr;

        console.log(`API: Fetched all data. Returning response.`);

        const allLeads = [...(leads || []), ...(heads || [])];
        const allAdminTeams = [...(adminTeams || []), ...(drafters || [])];

        return res.status(200).json({
            clients: clients || [],
            projectLeads: allLeads,
            adminTeams: allAdminTeams,
            inspectors: inspectors || []
        });

    } catch (err) {
        console.error('API: Handler Exception:', err);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
}
