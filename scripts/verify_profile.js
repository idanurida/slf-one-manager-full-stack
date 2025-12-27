
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });


const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkProfile() {
    console.log("🔍 Checking profile for 'admin_lead@test.com'...");

    const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', 'admin_lead@test.com');

    if (error) {
        console.log("❌ Error fetching profile:", error.message);
    } else if (data && data.length > 0) {
        console.log(`✅ Profile FOUND (${data.length} records):`, data[0]);
    } else {
        console.log("⚠️ Profile NOT found.");
    }
}

checkProfile();
