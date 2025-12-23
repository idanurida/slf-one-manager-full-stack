
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function findInspectionId() {
    console.log('--- Finding Inspection ID for orphaned photos ---');

    const { data: responses, error } = await supabase
        .from('checklist_responses')
        .select('inspection_id, checklist_item_id, created_at')
        .order('created_at', { ascending: false })
        .limit(20);

    if (error) {
        console.error('Error fetching responses:', error);
        return;
    }

    console.log('Recent 20 responses:');
    responses.forEach(r => console.log(`- Insp: ${r.inspection_id}, Item: ${r.checklist_item_id}, Date: ${r.created_at}`));

    const { data: photos, error: pErr } = await supabase
        .from('inspection_photos')
        .select('id, checklist_item_id, created_at')
        .is('inspection_id', null)
        .order('created_at', { ascending: false })
        .limit(10);

    if (pErr) {
        console.error('Error fetching photos:', pErr);
        return;
    }

    console.log('\nOrphaned photos:');
    photos.forEach(p => console.log(`- Photo ID: ${p.id}, Item: ${p.checklist_item_id}, Date: ${p.created_at}`));
}

findInspectionId();
