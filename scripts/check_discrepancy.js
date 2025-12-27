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

async function checkDiscrepancy() {
    console.log('--- Checking for Discrepancies ---');

    // Get all projects
    const { data: projects } = await supabase
        .from('projects')
        .select('id, name, project_lead_id');

    for (const p of projects) {
        // Get team lead
        const { data: team } = await supabase
            .from('project_teams')
            .select('user_id, profiles(full_name)')
            .eq('project_id', p.id)
            .eq('role', 'project_lead');

        const teamLead = team?.[0]; // Assume one lead

        if (teamLead && !p.project_lead_id) {
            console.log(`\n[FOUND IT!] Project: ${p.name}`);
            console.log(`  - Team has lead: ${teamLead.profiles?.full_name} (${teamLead.user_id})`);
            console.log(`  - Metadata project_lead_id is: ${p.project_lead_id} (NULL)`);
        } else if (teamLead && p.project_lead_id && teamLead.user_id !== p.project_lead_id) {
            console.log(`\n[MISMATCH] Project: ${p.name}`);
            console.log(`  - Team Lead: ${teamLead.user_id}`);
            console.log(`  - Meta Lead: ${p.project_lead_id}`);
        }
    }
    console.log('Done.');
}

checkDiscrepancy();
