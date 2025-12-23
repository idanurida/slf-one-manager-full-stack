
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function listTables() {
    const { data, error } = await supabase.rpc('get_tables');
    if (error) {
        console.log('RPC get_tables failed, searching via information_schema...');
        // Fallback: This might not work via rest api if not allowed, but worth a try
        // Actually, let's just try to select from likely names.
    } else {
        console.log('Tables:', data);
    }
}

// Alternative for PostgREST:
async function listLikelyTables() {
    const tables = [
        'checklist_responses', 'inspection_responses', 'responses',
        'checklists', 'inspections_results', 'inspection_checks'
    ];
    for (const t of tables) {
        const { error } = await supabase.from(t).select('*', { count: 'exact', head: true });
        if (!error) {
            console.log(`Table exists: ${t}`);
        } else if (error.code !== '42P01') {
            console.log(`Table ${t} exists but error: ${error.message}`);
        }
    }
}

listLikelyTables();
