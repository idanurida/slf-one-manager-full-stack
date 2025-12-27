const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkSchema() {
    console.log('Checking checklist_items schema...');
    // We can't query information_schema easily via JS client without raw SQL if strictly allowed, 
    // but we can try to select * limit 1 and see keys.

    const { data, error } = await supabase
        .from('checklist_items')
        .select('*')
        .limit(1);

    if (error) {
        console.error('Error:', error);
    } else {
        if (data.length > 0) {
            console.log('Sample Item:', JSON.stringify(data[0], null, 2));
        } else {
            console.log('Table is empty.');
        }
    }
}

checkSchema();
