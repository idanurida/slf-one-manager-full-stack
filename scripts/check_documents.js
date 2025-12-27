
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkDocuments() {
    const { data, error } = await supabase
        .from('documents')
        .select('*')
        .limit(1);

    if (error) {
        console.log('❌ documents table error:', error.message);
    } else {
        console.log('✅ documents table exists.');
        if (data.length > 0) {
            console.log('Columns:', Object.keys(data[0]));
        } else {
            console.log('Table is empty.');
        }
    }
}

checkDocuments();
