
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function findWhereResponsSaves() {
    const tables = ['checklist_responses', 'inspection_responses', 'checklist_answers'];
    for (const t of tables) {
        console.log(`Checking table: ${t}`);
        const { data, error } = await supabase.from(t).select('*');
        if (error) {
            console.log(`Table ${t} error: ${error.message}`);
        } else {
            console.log(`Table ${t} has ${data.length} rows.`);
            if (data.length > 0) console.log('Sample:', data[0]);
        }
    }
}

findWhereResponsSaves();
