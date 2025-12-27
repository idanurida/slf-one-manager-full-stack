
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function resetPasswords() {
    const emails = [
        'inspector.struktur@slf.com',
        'admin-team@slf.com',
        'project_lead@test.com'
    ];

    console.log('--- Resetting Test Account Passwords ---');

    for (const email of emails) {
        // Find user by email
        const { data: users, error: findError } = await supabase.auth.admin.listUsers();
        if (findError) {
            console.error('Error listing users:', findError.message);
            return;
        }

        const user = users.users.find(u => u.email === email);
        if (!user) {
            console.log(`⚠️ User ${email} not found in Auth.`);
            continue;
        }

        const { error } = await supabase.auth.admin.updateUserById(
            user.id,
            { password: 'testpassword123' }
        );

        if (error) {
            console.error(`❌ Failed to reset ${email}:`, error.message);
        } else {
            console.log(`✅ Reset password for ${email} to 'Password123!'`);
        }
    }
}

resetPasswords();
