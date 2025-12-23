
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function checkIndices() {
    const { data, error } = await supabase.rpc('get_table_indices', { t_name: 'checklist_responses' });
    if (error) {
        console.log('RPC failed. Trying query via information_schema...');
        // Likely not possible via PostgREST. Let's try to upsert with NO onConflict and see if it works.
    } else {
        console.log('Indices:', data);
    }
}

// Just try to insert a dummy row.
async function tryInsert() {
    const { data, error } = await supabase.from('checklist_responses').insert({
        inspection_id: '17acbf0d-4f85-4924-aa5b-4b0bdcf3f8cb',
        item_id: 'test_item',
        responded_by: 'c2b271bb-13a3-421b-a1ef-c8e13c3ec983',
        response: { status: 'ok' },
        status: 'completed'
    });
    if (error) {
        console.error('Insert Error:', error);
    } else {
        console.log('Insert Success:', data);
    }
}

tryInsert();
