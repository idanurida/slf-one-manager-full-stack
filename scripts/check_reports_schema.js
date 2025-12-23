
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function checkSchema() {
    const { data, error } = await supabase
        .from('inspection_reports')
        .select('*')
        .limit(1);

    if (error) {
        console.error('Error:', error);
        return;
    }

    if (data && data.length > 0) {
        console.log('Columns in inspection_reports:', Object.keys(data[0]));
    } else {
        // If no data, try to fetch from system table if possible, or just look at another file
        console.log('No data in inspection_reports to check columns.');
    }
}

checkSchema();
