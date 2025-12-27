const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function checkUserByEmail(email) {
    if (!email) {
        console.error('❌ Please provide an email.');
        return;
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log(`🔎 Checking User: ${email}...`);

    // 1. Check Auth
    const { data: listData, error: listError } = await supabase.auth.admin.listUsers();
    if (listError) {
        console.error('❌ Auth List Error:', listError.message);
        return;
    }

    const authUser = listData.users.find(u => u.email === email);
    if (!authUser) {
        console.log('❌ User NOT FOUND in Auth.');
        return;
    }

    console.log(`✅ Auth User Found. ID: ${authUser.id}`);
    console.log(`   Email Confirmed: ${authUser.email_confirmed_at ? 'YES' : 'NO'}`);
    console.log(`   Metadata:`, authUser.user_metadata);

    // 2. Check Profile
    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .single();

    if (profileError) {
        console.error('❌ Profile Fetch Error:', profileError.message);
    } else {
        console.log(`✅ Profile Found:`);
        console.log(profile);
    }
}

const emailArg = process.argv[2];
checkUserByEmail(emailArg);
