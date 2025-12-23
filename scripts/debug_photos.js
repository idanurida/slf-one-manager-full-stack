
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function checkPhotos() {
    console.log('--- Checking Recent Inspection Photos ---');
    const { data, error } = await supabase
        .from('inspection_photos')
        .select('id, inspection_id, photo_url, created_at, item_name')
        .order('created_at', { ascending: false })
        .limit(5);

    if (error) {
        console.error('Error:', error);
        return;
    }

    console.log('Latest 5 photos:', JSON.stringify(data, null, 2));

    console.log('\n--- Checking Recent Inspections ---');
    const { data: ins, error: insErr } = await supabase
        .from('inspections')
        .select('id, status, updated_at')
        .order('updated_at', { ascending: false })
        .limit(5);

    if (insErr) {
        console.error('Ins error:', insErr);
        return;
    }

    console.log('Latest 5 inspections:', JSON.stringify(ins, null, 2));
}

checkPhotos();
