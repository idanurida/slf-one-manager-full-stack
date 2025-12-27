
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function findInspection() {
    console.log('--- Finding Inspection for Reporting Test ---');

    // Find inspector profile
    const { data: inspector } = await supabase
        .from('profiles')
        .select('id, email')
        .eq('email', 'inspector.struktur@slf.com')
        .single();

    if (!inspector) {
        console.error('Inspector not found');
        return;
    }

    // Find an inspection for this inspector that has checklist items
    const { data: inspection, error } = await supabase
        .from('inspections')
        .select('id, project_id, status')
        .eq('inspector_id', inspector.id)
        .limit(1)
        .single();

    if (error || !inspection) {
        console.error('No inspection found for this inspector:', error?.message);
        return;
    }

    console.log(`✅ Found Inspection: ${inspection.id} (Project: ${inspection.project_id}, Status: ${inspection.status})`);

    // Check if it has checklist items
    const { count } = await supabase
        .from('checklist_responses')
        .select('*', { count: 'exact', head: true })
        .eq('inspection_id', inspection.id);

    console.log(`Checklist items count: ${count}`);
}

findInspection();
