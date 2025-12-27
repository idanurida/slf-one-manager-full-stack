const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function createAdmin() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
        console.error('❌ Missing environment variables');
        return;
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const email = 'admin@slf.com';
    const password = '123456';
    const fullName = 'Administrator';
    const role = 'admin';

    console.log(`🚀 Processing admin user: ${email}...`);

    // Try to list users first to see if it exists
    const { data: listData, error: listError } = await supabase.auth.admin.listUsers();
    if (listError) {
        console.error('❌ Failed to list users:', listError.message);
        return;
    }

    const existingUser = listData.users.find(u => u.email === email);
    let userId;

    if (existingUser) {
        console.log('✅ Auth user already exists. ID:', existingUser.id);
        userId = existingUser.id;
    } else {
        console.log('➕ Creating new Auth user...');
        const { data: authData, error: authError } = await supabase.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: {
                full_name: fullName,
                role: role
            }
        });

        if (authError) {
            console.error('❌ Auth creation failed:', authError.message);
            return;
        }
        userId = authData.user.id;
        console.log('✅ Auth user created:', userId);
    }

    // Update Profile
    const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
            id: userId,
            email,
            full_name: fullName,
            role: role,
            status: 'approved',
            is_approved: true,
            updated_at: new Date().toISOString()
        });

    if (profileError) {
        console.error('❌ Profile update failed:', profileError.message);
    } else {
        console.log('✅ Profile synchronized successfully');
        console.log('\n--- Admin Account Details ---');
        console.log(`Email: ${email}`);
        console.log(`Password: 123456`);
        console.log('-----------------------------');
    }
}

createAdmin();
