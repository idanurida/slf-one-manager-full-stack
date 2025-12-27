require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing env vars');
    process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false,
    },
});

async function testQuery() {
    console.log('Testing Admin Query...');
    try {
        const { data, error } = await supabaseAdmin.from('profiles').select('role').limit(5);
        if (error) {
            console.error('Query Error:', error);
        } else {
            console.log('Query Success:', data);
        }
    } catch (e) {
        console.error('Exception:', e);
    }
}

testQuery();
