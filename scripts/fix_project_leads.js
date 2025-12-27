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

async function fixProjectLeads() {
    console.log('--- Fixing Project Leads ---');

    // Get all projects
    const { data: projects, error } = await supabase
        .from('projects')
        .select('id, name, project_lead_id');

    if (error) {
        console.error('Error fetching projects:', error);
        return;
    }

    for (const p of projects) {
        // Get team lead
        const { data: team } = await supabase
            .from('project_teams')
            .select('user_id, profiles(full_name)')
            .eq('project_id', p.id)
            .eq('role', 'project_lead');

        const teamLead = team?.[0]; // Assume one lead

        if (teamLead) {
            // If metadata is null OR different, update it
            if (!p.project_lead_id || p.project_lead_id !== teamLead.user_id) {
                console.log(`\nFixing Project: ${p.name}`);
                console.log(`  - Setting lead to: ${teamLead.profiles?.full_name} (${teamLead.user_id})`);

                const { error: updateError } = await supabase
                    .from('projects')
                    .update({ project_lead_id: teamLead.user_id })
                    .eq('id', p.id);

                if (updateError) console.error('  FAILED:', updateError);
                else console.log('  SUCCESS');
            }
        }
    }
    console.log('Done.');
}

fixProjectLeads();
