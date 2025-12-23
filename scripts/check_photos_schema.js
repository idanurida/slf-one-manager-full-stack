
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function checkPhotosSchema() {
    const { data, error } = await supabase
        .from('inspection_photos')
        .select('*')
        .limit(1);

    if (error) {
        console.error('Error:', error);
        return;
    }

    if (data && data.length > 0) {
        console.log('Columns in inspection_photos:', Object.keys(data[0]));
    } else {
        console.log('No data in inspection_photos');
    }
}

checkPhotosSchema();
