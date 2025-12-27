const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkUser() {
    console.log('Checking user: admin_lead@test.com');

    const { data: userData, error: userError } = await supabase.auth.admin.listUsers();
    if (userError) {
        console.error('Auth check error:', userError);
        return;
    }

    const user = userData.users.find(u => u.email === 'admin_lead@test.com');
    if (!user) {
        console.log('❌ User NOT found in Auth');
        return;
    }

    console.log('✅ User found in Auth. ID:', user.id);
    console.log('Metadata:', user.user_metadata);

    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

    if (profileError) {
        console.log('❌ Profile error:', profileError.message);
    } else {
        console.log('✅ Profile found:', profile);
    }
}

checkUser();
