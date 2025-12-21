const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function cleanupSpecificUser(email) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log(`--- DEFCON cleanup for user: ${email} ---`);

    // 1. Find the user in Auth
    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
    const authUser = users.find(u => u.email === email);

    if (!authUser) {
        console.log(`❌ User ${email} not found in Supabase Auth.`);
    } else {
        console.log(`✅ Found Auth User ID: ${authUser.id}`);

        // 2. Delete from Auth
        console.log('🗑️ Deleting from Auth...');
        const { error: authError } = await supabase.auth.admin.deleteUser(authUser.id);
        if (authError) {
            console.error('❌ Failed to delete from Auth:', authError.message);
        } else {
            console.log('✅ Successfully deleted from Auth.');
        }

        // 3. Mark Profile as Deleted (if exists)
        console.log('📊 Updating Profile in database...');
        const timestamp = Math.floor(Date.now() / 1000);
        const archivedEmail = `${email}_deleted_${timestamp}_final`;

        const { error: pError } = await supabase
            .from('profiles')
            .update({
                status: 'deleted',
                is_active: false,
                is_approved: false,
                email: archivedEmail,
                deleted_at: new Date().toISOString()
            })
            .eq('id', authUser.id);

        if (pError) {
            console.log('⚠️ No profile record found to update or update failed:', pError.message);
        } else {
            console.log('✅ Profile record updated to "deleted" status.');
        }
    }

    // 4. Also check for ANY profile with this email (just in case there are more)
    console.log('\n--- Checking for remaining active profiles with this email string ---');
    const { data: stragglerProfiles, error: sError } = await supabase
        .from('profiles')
        .select('id, email, status')
        .or(`email.eq.${email},email.ilike.%${email}%archived%`);

    if (sError) {
        console.error('Error checking for stragglers:', sError);
    } else if (stragglerProfiles && stragglerProfiles.length > 0) {
        console.log(`Found ${stragglerProfiles.length} related profile(s).`);
        for (const p of stragglerProfiles) {
            if (p.status !== 'deleted') {
                console.log(`⚠️ Profile ${p.id} (${p.email}) is STILL [${p.status}]. Fixing...`);
                await supabase
                    .from('profiles')
                    .update({ status: 'deleted', is_active: false, is_approved: false, deleted_at: new Date().toISOString() })
                    .eq('id', p.id);
                console.log(`  ✅ Profile ${p.id} fixed.`);
            } else {
                console.log(`  Profile ${p.id} is already correctly marked as deleted.`);
            }
        }
    } else {
        console.log('No other active profiles found for this email.');
    }

    console.log('\n--- Cleanup Finished ---');
}

cleanupSpecificUser('ida.nuridasw@gmail.com');
