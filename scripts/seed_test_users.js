const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const TEST_USERS = [
    {
        email: 'superadmin@test.com',
        password: '123456',
        fullName: 'Test Superadmin',
        role: 'superadmin',
        specialization: ''
    },
    {
        email: 'admin@test.com',
        password: '123456',
        fullName: 'Test Admin',
        role: 'admin',
        specialization: ''
    },
    {
        email: 'inspector@test.com',
        password: '123456',
        fullName: 'Test Inspector',
        role: 'inspector',
        specialization: 'Arsitektur'
    },
    {
        email: 'admin_lead@test.com',
        password: '123456',
        fullName: 'Test Admin Lead',
        role: 'admin_lead',
        specialization: ''
    },
    {
        email: 'project_lead@test.com',
        password: '123456',
        fullName: 'Test Project Lead',
        role: 'project_lead',
        specialization: ''
    },
    // Adding the one used in tests explicitly if not covered
    {
        email: 'inspector.struktur@slf.com',
        password: '123456',
        fullName: 'Inspector Struktur',
        role: 'inspector',
        specialization: 'Arsitektur' // Assuming structure maps to architecture or handled
    }
];

async function upsertUser(supabase, { email, password, fullName, role, specialization }) {
    console.log(`\nProcessing: ${email} (${role})...`);

    // 1. Check if user exists in Auth
    const { data: listData, error: listError } = await supabase.auth.admin.listUsers();
    if (listError) {
        console.error('❌ Failed to list users:', listError.message);
        return;
    }

    let userId;
    const existingUser = listData.users.find(u => u.email === email);

    if (existingUser) {
        console.log('   - User already exists in Auth. ID:', existingUser.id);
        userId = existingUser.id;

        // Force update password to ensure it matches 'password123'
        const { error: updateError } = await supabase.auth.admin.updateUserById(userId, { password: password });
        if (updateError) {
            console.error('   ❌ Failed to update password:', updateError.message);
        } else {
            console.log('   ✅ Password updated to ensuring consistency.');
        }
    } else {
        console.log('   - Creating new Auth user...');
        const { data: authData, error: authError } = await supabase.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: {
                full_name: fullName,
                role: role,
                specialization: specialization
            }
        });

        if (authError) {
            console.error('   ❌ Auth creation failed:', authError.message);
            return;
        }
        userId = authData.user.id;
        console.log('   - Auth user created. ID:', userId);
    }

    // 2. Upsert Profile (Ensure they are approved)
    const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
            id: userId,
            email,
            full_name: fullName,
            role: role,
            specialization: specialization,
            status: 'approved',
            is_approved: true,
            updated_at: new Date().toISOString()
        });

    if (profileError) {
        console.error('   ❌ Profile update failed:', profileError.message);
    } else {
        console.log('   ✅ Profile synced and approved.');
    }
}

async function seedClient(supabase) {
    console.log('\nProcessing: Client Data...');
    const clientData = {
        name: 'PT Test Client',
        email: 'client@test.com',
        phone: '08123456789',
        address: 'Jl. Test No. 1',
        city: 'Jakarta',
        status: 'active'
    };

    // Upsert client based on email
    const { data, error } = await supabase
        .from('clients')
        .upsert(clientData, { onConflict: 'email' })
        .select()
        .single();

    if (error) {
        console.error('   ❌ Client creation failed:', error.message);
    } else {
        console.log('   ✅ Client seeded:', data.id);
    }
}

async function seedTestUsers() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
        console.error('❌ Missing environment variables (SUPABASE_URL or SERVICE_ROLE_KEY)');
        return;
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    console.log('🚀 Starting Test User Seeding...');

    for (const user of TEST_USERS) {
        await upsertUser(supabase, user);
    }

    await seedClient(supabase);

    console.log('\n✅ Seeding Complete.');
}

seedTestUsers();
