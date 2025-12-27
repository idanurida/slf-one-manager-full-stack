const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function resetPassword() {
    console.log('Resetting password for: admin_lead@test.com');

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

    const { data: updateData, error: updateError } = await supabase.auth.admin.updateUserById(
        user.id,
        { password: 'Password123!' }
    );

    if (updateError) {
        console.log('❌ Update error:', updateError.message);
    } else {
        console.log('✅ Password updated successfully for', user.id);
    }
}

resetPassword();
