const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY // Use anon key for sign in
);

async function testLogin() {
    const email = 'inspector.struktur@slf.com';
    const password = 'Password123!';

    console.log(`Attempting login for ${email}...`);
    const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
    });

    if (error) {
        console.error('❌ Login Error:', error.message);
    } else {
        console.log('✅ Login Successful!');
        console.log('User ID:', data.user.id);
    }
}

testLogin();
