const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

// Load env
const envPath = path.resolve(process.cwd(), '.env.local');
const envConfig = dotenv.parse(fs.readFileSync(envPath));

const supabase = createClient(
    envConfig.NEXT_PUBLIC_SUPABASE_URL,
    envConfig.SUPABASE_SERVICE_ROLE_KEY
);

async function checkProjectLeads() {
    console.log('--- Finding Client "majubersama" ---');

    const { data: clients } = await supabase
        .from('clients')
        .select('id, name')
        .ilike('name', '%majubersama%');

    if (!clients || clients.length === 0) {
        console.log('Client "majubersama" not found. Listing recent projects instead to guess.');
        // Fallback
        const { data: recent } = await supabase.from('projects').select('id, name').limit(3).order('created_at', { ascending: false });
        console.log('Recent projects:', recent);
        return;
    }

    const clientIds = clients.map(c => c.id);
    console.log('Found Clients:', clients);

    const { data: projects, error: pErr } = await supabase
        .from('projects')
        .select('id, name, project_lead_id')
        .in('client_id', clientIds);

    if (pErr) {
        console.error('Error fetching projects:', pErr);
        return;
    }

    for (const p of projects) {
        console.log(`\nProject: ${p.name} (${p.id})`);
        console.log(`  - project_lead_id (Metadata): ${p.project_lead_id}`);

        // 2. Get Team Members with role 'project_lead'
        const { data: team, error: tErr } = await supabase
            .from('project_teams')
            .select('user_id, role, profiles(full_name)')
            .eq('project_id', p.id);

        const teamLeads = team?.filter(t => t.role === 'project_lead') || [];
        console.log('  - Team Members (Role: project_lead):');
        if (teamLeads.length === 0) {
            console.log('    None');
        } else {
            teamLeads.forEach(t => {
                console.log(`    - ${t.profiles?.full_name} (${t.user_id})`);
            });
        }

        const isConsistent = teamLeads.some(t => t.user_id === p.project_lead_id);
        console.log(`  > Consistent? ${isConsistent ? 'YES' : 'NO (Discrepancy Detected)'}`);
    }
}

checkProjectLeads();
