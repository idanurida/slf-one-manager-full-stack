const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    // Using ANON KEY because we are simulating CLIENT login, not admin action
);

async function verifyLogin() {
    console.log('Testing login for inspector.struktur@slf.com...');

    const { data, error } = await supabase.auth.signInWithPassword({
        email: 'inspector.struktur@slf.com',
        password: 'password123'
    });

    if (error) {
        console.error('❌ Login Failed:', error.message);
    } else {
        console.log('✅ Login Successful!');
        console.log('   User ID:', data.user.id);
        console.log('   Email:', data.user.email);
        console.log('   Access Token:', data.session.access_token.substring(0, 15) + '...');
    }
}

verifyLogin();
