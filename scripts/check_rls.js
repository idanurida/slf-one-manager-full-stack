
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function checkRLS() {
    const tables = ['checklist_responses', 'inspection_photos', 'inspection_reports'];
    for (const t of tables) {
        // We can't directly check RLS status via API easily, but we can try to insert/select.
        // However, let's look at the database setup script again or use a query.
        console.log(`Checking ${t}...`);
        const { error: selErr } = await supabase.from(t).select('*').limit(1);
        if (selErr) console.log(`${t} Select Error: ${selErr.message}`);

        const { error: insErr } = await supabase.from(t).insert({ id: '00000000-0000-0000-0000-000000000000' });
        if (insErr) console.log(`${t} Insert Error: ${insErr.message}`);
    }
}

checkRLS();
