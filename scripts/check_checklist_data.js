
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function checkChecklistSchema() {
    const { data, error } = await supabase
        .from('checklist_responses')
        .select('*')
        .limit(1);

    if (error) {
        // If table is empty, this might not return columns. 
        // Let's try to find if there are ANY records.
        console.log('Error or no data:', error);
    }

    // Use rpc if available or just try a generic select
    const { data: cols, error: colErr } = await supabase.rpc('get_table_columns', { table_name: 'checklist_responses' });
    if (colErr) {
        console.log('RPC failed, trying fallback...');
    } else {
        console.log('Columns:', cols);
    }
}

// Fallback: try to insert a dummy and see errors or just select 1 column at a time?
// No, let's just try to select * and look at the first row if it exists.
// The user said they filled it, so there SHOULD be data.

async function checkDataAgain() {
    const { data, error } = await supabase.from('checklist_responses').select('*');
    if (error) console.error(error);
    if (data && data.length > 0) {
        console.log('Found data! Columns:', Object.keys(data[0]));
        console.log('Data:', data[0]);
    } else {
        console.log('No data found in checklist_responses.');
    }
}

checkDataAgain();
