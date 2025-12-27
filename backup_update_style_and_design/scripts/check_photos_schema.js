const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkPhotoSchema() {
    console.log('Checking inspection_photos schema...');

    const { data, error } = await supabase
        .from('inspection_photos')
        .select('*')
        .limit(1);

    if (error) {
        console.error('Error:', error);
    } else {
        if (data.length > 0) {
            console.log('Sample Photo Record:', JSON.stringify(data[0], null, 2));
        } else {
            console.log('Table is empty. Cannot verify strict columns, but query succeeded.');
        }
    }
}

checkPhotoSchema();
