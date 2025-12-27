
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function verifyProject() {
    console.log('--- Verifying E2E Project ---');
    const { data: projects, error } = await supabase
        .from('projects')
        .select('*')
        .ilike('name', 'E2E Test Proyek %')
        .order('created_at', { ascending: false })
        .limit(5);

    if (error) {
        console.error('Error:', error);
    } else {
        projects.forEach(p => {
            console.log(`- Project: ${p.name}, Status: ${p.status}, Created: ${p.created_at}`);
        });
    }
}

verifyProject();
