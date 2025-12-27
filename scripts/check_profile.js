const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkProfile() {
    const email = 'inspector.struktur@slf.com';
    const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', email)
        .single();

    if (error) {
        console.error('Error:', error.message);
    } else {
        console.log(JSON.stringify(data, null, 2));
    }
}

checkProfile();
