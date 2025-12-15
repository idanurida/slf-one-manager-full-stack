
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkDuplicate() {
    console.log("🔍 Checking profiles for 'ida.nuridasw@gmail.com'...");

    const { data: profiles, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', 'ida.nuridasw@gmail.com');

    if (error) {
        console.log("❌ Error fetching profiles:", error.message);
    } else {
        console.log(`✅ Found ${profiles.length} profile(s):`);
        profiles.forEach(p => {
            console.log(` - ID: ${p.id}, Status: ${p.status}, Role: ${p.role}`);
        });
    }
}

checkDuplicate();
