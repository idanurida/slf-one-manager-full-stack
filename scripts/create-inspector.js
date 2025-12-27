require('dotenv').config({ path: '.env.local' });
const { supabaseAdmin } = require('../src/utils/supabaseAdmin');

async function createInspector() {
    const email = 'inspector.struktur@test.com';
    const password = 'Password123!';
    const fullName = 'Inspector Struktur Utility';
    const role = 'inspector';
    const specialization = 'Struktur';

    console.log(`Creating user: ${email}...`);

    // 1. Create Auth User
    const { data: { user }, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true
    });

    if (createError) {
        console.error('Error creating auth user:', createError.message);
        // If user already exists, try to fetch to update profile
        if (createError.message.includes('already has been registered')) {
            console.log('User exists, updating profile...');
            // We'd need the ID, usually found via listUsers or just update profiles by email if possible? 
            // Profiles usually keyed by ID.
            // Let's simplified fetching the user ID by email
            // But admin.listUsers is better
        } else {
            return;
        }
    }

    let userId = user?.id;

    if (!userId) {
        // Fetch existing
        const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers();
        const found = users.find(u => u.email === email);
        if (found) userId = found.id;
    }

    if (!userId) {
        console.error('Could not determine User ID');
        return;
    }

    console.log(`User ID: ${userId}`);

    // 2. Upsert Profile
    // We need to ensure the profile exists and has the correct role/specialization
    const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .upsert({
            id: userId,
            email: email,
            full_name: fullName,
            role: role,
            specialization: specialization,
            updated_at: new Date()
        });

    if (profileError) {
        console.error('Error updating profile:', profileError);
    } else {
        console.log(`Successfully created/updated Inspector: ${fullName} (${specialization})`);
    }
}

createInspector();
