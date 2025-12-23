
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function checkColumns() {
    const { data, error } = await supabase
        .from('checklist_responses')
        .select('*')
        .limit(1);

    if (error) {
        // If empty, try to insert a record with only one column and see what errors we get
        console.log('Table seems empty. Probing columns via dummy insert...');
        const { error: insErr } = await supabase.from('checklist_responses').insert({ id: '00000000-0000-0000-0000-000000000000' });
        console.log('Insert error:', insErr);
    } else if (data.length > 0) {
        console.log('Columns:', Object.keys(data[0]));
    } else {
        // Zero rows but no error. Try to get column names via select from a known non-existent column to see the suggest list
        const { error: colErr } = await supabase.from('checklist_responses').select('non_existent_column');
        console.log('Error hints:', colErr.message);
    }
}

checkColumns();
