
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function check() {
    const emails = ['inspector.struktur@slf.com', 'admin-team@slf.com', 'project_lead@test.com'];

    console.log('--- Fetching Profile IDs ---');
    const { data: profiles, error: pErr } = await supabase
        .from('profiles')
        .select('id, email, role')
        .in('email', emails);

    if (pErr) {
        console.error('Error fetching profiles:', pErr.message);
        return;
    }
    console.log(JSON.stringify(profiles, null, 2));

    const project_id = 'b2c3d4e5-f6a7-8901-bcde-fa2345678901';
    console.log('\n--- Re-assigning to Project ' + project_id + ' ---');

    for (const profile of profiles) {
        let teamRole = profile.role;
        // Map roles if necessary to match project_teams role constraints
        if (profile.role === 'admin_team') teamRole = 'admin_team';
        if (profile.role === 'project_lead') teamRole = 'project_lead';
        if (profile.role === 'inspector') teamRole = 'inspector';

        // Delete existing to avoid conflicts
        await supabase.from('project_teams').delete().eq('project_id', project_id).eq('user_id', profile.id);

        const { error: insErr } = await supabase
            .from('project_teams')
            .insert({
                project_id,
                user_id: profile.id,
                role: teamRole
            });

        if (insErr) {
            console.error(`Error assigning ${profile.email}:`, insErr.message);
        } else {
            console.log(`✅ Assigned ${profile.email} as ${teamRole}`);
        }
    }
}

check();
