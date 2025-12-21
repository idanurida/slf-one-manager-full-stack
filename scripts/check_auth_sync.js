const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function checkSync() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
        console.error('Missing environment variables');
        return;
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('--- Checking Synchronization ---');

    // 1. Get all profiles marked as deleted
    const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('id, email, status')
        .eq('status', 'deleted');

    if (profileError) {
        console.error('Error fetching profiles:', profileError);
        return;
    }

    console.log(`\n--- Status in Profiles Table ---`);
    console.log(`Found ${profiles.length} profiles marked as 'deleted'.`);

    // 2. Check each deleted profile in auth.users
    for (const profile of profiles) {
        const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(profile.id);

        if (authError) {
            if (authError.message.includes('User not found')) {
                // Correct
            } else {
                console.error(`❌ Error checking auth for ${profile.email}:`, authError.message);
            }
        } else if (authUser && authUser.user) {
            console.log(`⚠️ User ${profile.email} (${profile.id}) marked as 'deleted' in profiles but STILL EXISTS in Auth!`);
        }
    }

    // 3. Check all users in auth
    console.log('\n--- All Users currently in Supabase Auth ---');
    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();

    if (listError) {
        console.error('Error listing auth users:', listError);
        return;
    }

    console.log(`Found ${users.length} total users in Supabase Auth.`);

    for (const user of users) {
        const { data: profile, error: pError } = await supabase
            .from('profiles')
            .select('email, status, is_approved')
            .eq('id', user.id)
            .single();

        if (pError) {
            if (pError.code === 'PGRST116') {
                console.log(`⚠️  Auth User [${user.email}] has NO profile in database.`);
            } else {
                console.error(`❌ Error fetching profile for ${user.id} (${user.email}):`, pError.message);
            }
        } else {
            console.log(`ℹ️  Auth User [${user.email}] is [${profile.status || 'null'}] (Approved: ${profile.is_approved})`);
        }
    }
}

checkSync();
