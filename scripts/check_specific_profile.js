const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function checkProfileById(id) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log(`--- Checking Profile for ID: ${id} ---`);

    const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', id)
        .single();

    if (error) {
        if (error.code === 'PGRST116') {
            console.log('❌ No profile found in database for this ID.');
        } else {
            console.error('Error fetching profile:', error);
        }
    } else {
        console.log('✅ Profile found:');
        console.log(JSON.stringify(profile, null, 2));
    }
}

const authId = 'a5c4718f-f624-4bf8-bb62-46b4388e4e22';
checkProfileById(authId);
