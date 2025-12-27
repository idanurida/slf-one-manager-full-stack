const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkAuthUsers() {
    console.log('Checking Supabase Auth Users...');
    const { data: { users }, error } = await supabase.auth.admin.listUsers();

    if (error) {
        console.error('Error listing users:', error);
        return;
    }

    const targetEmails = [
        'superadmin@test.com',
        'admin@test.com',
        'inspector@test.com',
        'inspector.struktur@slf.com'
    ];

    console.log(`Found ${users.length} total users.`);

    targetEmails.forEach(email => {
        const user = users.find(u => u.email === email);
        if (user) {
            console.log(`✅ Found ${email} (ID: ${user.id})`);
            console.log(`   Confirmed: ${user.email_confirmed_at ? 'Yes' : 'NO'}`);
            console.log(`   Last Sign In: ${user.last_sign_in_at}`);
        } else {
            console.log(`❌ MISSING ${email}`);
        }
    });
}

checkAuthUsers();
