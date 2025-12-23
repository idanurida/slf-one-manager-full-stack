
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function findCorrectColumn() {
    const table = 'checklist_responses';
    console.log(`Checking ${table} for item_id vs checklist_item_id...`);

    const { error: err1 } = await supabase.from(table).select('item_id').limit(0);
    if (err1) console.log(`item_id error: ${err1.message}`);
    else console.log(`item_id EXISTS`);

    const { error: err2 } = await supabase.from(table).select('checklist_item_id').limit(0);
    if (err2) console.log(`checklist_item_id error: ${err2.message}`);
    else console.log(`checklist_item_id EXISTS`);
}

findCorrectColumn();
