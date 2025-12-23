
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function checkRowCounts() {
    const tables = [
        'checklist_responses', 'inspection_responses', 'responses',
        'checklists', 'inspections_results', 'inspection_checks'
    ];
    for (const t of tables) {
        const { count, error } = await supabase.from(t).select('*', { count: 'exact', head: true });
        if (!error) {
            console.log(`Table ${t}: ${count} rows`);
        } else {
            console.log(`Table ${t}: Error ${error.code} - ${error.message}`);
        }
    }
}

checkRowCounts();
