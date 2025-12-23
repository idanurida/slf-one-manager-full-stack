
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function findHotelInspection() {
    const { data: projects, error } = await supabase
        .from('projects')
        .select('id, name')
        .ilike('name', '%Hotel%');

    if (error) {
        console.error(error);
        return;
    }

    console.log('Projects found:', projects);

    if (projects.length > 0) {
        const projectIds = projects.map(p => p.id);
        const { data: insp, error: inspErr } = await supabase
            .from('inspections')
            .select('*')
            .in('project_id', projectIds);

        console.log('Inspections for these projects:', insp);
    }
}

findHotelInspection();
