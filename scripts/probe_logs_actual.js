const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function probeLogs() {
    console.log('Probing logs table...');
    const { data, error } = await supabase.from('logs').select('*').limit(1);

    if (error) {
        console.error('Error probing logs:', error.message);
        return;
    }

    if (data.length > 0) {
        console.log('Columns found:', Object.keys(data[0]));
    } else {
        const { error: colErr } = await supabase.from('logs').select('non_existent_column');
        console.log('Error hints (should list columns):', colErr.message);
    }
}

probeLogs();
