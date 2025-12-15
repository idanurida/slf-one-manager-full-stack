
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkProfile() {
    console.log("🔍 Checking profile for 'ida.nuridasw@gmail.com'...");

    const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', 'ida.nuridasw@gmail.com')
        .single();

    if (error) {
        console.log("❌ Error fetching profile:", error.message);
    } else if (data) {
        console.log("✅ Profile FOUND:", data);
    } else {
        console.log("⚠️ Profile NOT found.");
    }
}

checkProfile();
