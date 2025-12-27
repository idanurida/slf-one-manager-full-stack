const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function seedPendingUser() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const email = `pending_user_${Date.now()}@test.com`;
    const password = 'password123';
    const fullName = 'Test Pending User';

    console.log(`🚀 Seeding Pending User: ${email}`);

    // Create Auth User
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true, // Confirmed email, but pending approval
        user_metadata: {
            full_name: fullName,
            role: 'client'
        }
    });

    if (authError) {
        console.error('❌ Auth Creation Failed:', authError.message);
        return;
    }

    const userId = authData.user.id;

    // Create Profile with status='pending' and is_approved=false
    const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
            id: userId,
            email,
            full_name: fullName,
            role: 'client',
            status: 'pending',
            is_approved: false,
            updated_at: new Date().toISOString()
        });

    if (profileError) {
        console.error('❌ Profile Creation Failed:', profileError.message);
    } else {
        console.log('✅ Pending User Created Successfully.');
        console.log(`   Email: ${email}`);
        console.log(`   ID: ${userId}`);
    }

    // Output email for the test to pick up? 
    // Usually tests should use a known email or checking most recent.
    // I will write this email to a temp file or just log it. 
    // For simplicity, let's use a FIXED email so the test is deterministic if I clean up validly.
    // Or I can just grep the output.
}

seedPendingUser();
