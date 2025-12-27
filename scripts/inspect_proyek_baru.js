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

async function inspectProject() {
    console.log('--- Inspecting "proyek baru" ---');

    const { data: projects, error } = await supabase
        .from('projects')
        .select('id, name, project_lead_id, created_at, created_by')
        .ilike('name', '%proyek baru%');

    if (error) {
        console.error('Error fetching projects:', error);
        return;
    }

    if (!projects || projects.length === 0) {
        console.log('No project found.');
        return;
    }

    for (const p of projects) {
        console.log(`\nProject: ${p.name}`);
        console.log(`  ID: ${p.id}`);
        console.log(`  Lead ID (Metadata): ${p.project_lead_id}`);

        // Get team
        const { data: team } = await supabase
            .from('project_teams')
            .select('user_id, role, profiles(full_name, email)')
            .eq('project_id', p.id);

        console.log('  Team Members:');
        if (team && team.length > 0) {
            team.forEach(t => {
                console.log(`    - ${t.profiles?.full_name} (${t.role}) [${t.user_id}]`);
            });
        } else {
            console.log('    None');
        }
    }
}

inspectProject();
