
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function checkInspectionResponses() {
    const { data, error } = await supabase.from('inspection_responses').select('*');
    if (error) console.error(error);
    if (data && data.length > 0) {
        console.log('Found data in inspection_responses! Columns:', Object.keys(data[0]));
        console.log('Data:', data);
    } else {
        console.log('No data found in inspection_responses.');
    }
}

checkInspectionResponses();
