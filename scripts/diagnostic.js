
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function diagnostic() {
    console.log('--- Diagnostic ---');

    // 1. Check Profiles Count and Roles
    const { data: roles, error: err1 } = await supabase
        .from('profiles')
        .select('role');

    if (err1) console.error('Error fetching roles:', err1);
    else {
        const counts = roles.reduce((acc, r) => {
            acc[r.role] = (acc[r.role] || 0) + 1;
            return acc;
        }, {});
        console.log('Profile roles counts:', counts);
    }

    // 2. Check checklist_responses and inspection_photos schema
    const tables = ['checklist_responses', 'inspection_photos', 'inspection_reports'];
    for (const table of tables) {
        const { data: sample, error: err } = await supabase
            .from(table)
            .select('*')
            .limit(1);

        if (err) console.error(`Error fetching sample from ${table}:`, err);
        else if (sample && sample.length > 0) {
            console.log(`Columns in ${table}:`, Object.keys(sample[0]));
        } else {
            console.log(`${table} is empty.`);
        }
    }

    // 3. Find one active user for each role
    const rolesToFind = ['inspector', 'admin_team', 'project_lead', 'admin_lead'];
    console.log('\n--- Active Test Accounts ---');
    for (const role of rolesToFind) {
        const { data: p, error: err } = await supabase
            .from('profiles')
            .select('email, full_name, role')
            .eq('role', role)
            .is('deleted_at', null)
            .limit(1)
            .single();

        if (err) console.error(`No active ${role} found:`, err.message);
        else console.log(`- ${role.toUpperCase()}: ${p.email} (${p.full_name})`);
    }
}

diagnostic();
