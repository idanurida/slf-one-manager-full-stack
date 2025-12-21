const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function investigateEmail(searchEmail) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log(`--- Investigating Email: ${searchEmail} ---`);

    // 1. Check Profiles Table (Direct match and deleted versions)
    console.log('\n[1] Checking public.profiles table...');
    const { data: profiles, error: pError } = await supabase
        .from('profiles')
        .select('*')
        .or(`email.eq.${searchEmail},email.ilike.%${searchEmail}%deleted%`);

    if (pError) {
        console.error('Error fetching profiles:', pError);
    } else {
        console.log(`Found ${profiles.length} profile(s) related to this email.`);
        profiles.forEach(p => {
            console.log(`- ID: ${p.id}`);
            console.log(`  Email: ${p.email}`);
            console.log(`  Status: ${p.status}`);
            console.log(`  Is Approved: ${p.is_approved}`);
            console.log(`  Deleted At: ${p.deleted_at}`);
            console.log('---');
        });
    }

    // 2. Check Supabase Auth
    console.log('\n[2] Checking Supabase Auth (auth.users)...');
    const { data: { users }, error: authError } = await supabase.auth.admin.listUsers();

    if (authError) {
        console.error('Error listing auth users:', authError);
    } else {
        const matches = users.filter(u => u.email === searchEmail);
        console.log(`Found ${matches.length} user(s) with exact email in Auth.`);
        matches.forEach(u => {
            console.log(`- ID: ${u.id}`);
            console.log(`  Email: ${u.email}`);
            console.log(`  Created At: ${u.created_at}`);
            console.log(`  Last Sign In: ${u.last_sign_in_at}`);
        });
    }
}

const targetEmail = 'ida.nuridasw@gmail.com';
investigateEmail(targetEmail);
