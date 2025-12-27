const { Client } = require('pg');
const path = require('path');
const fs = require('fs');

// Try loading from .env.local first, then .env
if (fs.existsSync('.env.local')) {
    require('dotenv').config({ path: '.env.local' });
} else {
    require('dotenv').config();
}

console.log('Env loaded.');
console.log('DATABASE_URL present:', !!process.env.DATABASE_URL);
console.log('POSTGRES_URL present:', !!process.env.POSTGRES_URL);

const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;

if (!connectionString) {
    console.error('DATABASE_URL not found. Cannot connect to DB.');
    process.exit(1);
}

const client = new Client({
    connectionString: connectionString,
});

async function fixPolicies() {
    try {
        await client.connect();
        console.log('Connected to DB');

        // 1. Drop existing policies on profiles (safe to drop if exists)
        // We drop the complex one and add a simple one for now.
        // Or we can keep it and add another OR condition?
        // Let's just create a new broad policy 'view_profiles_for_app'

        const query = `
      -- Enable RLS just in case
      ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

      -- Drop restrictive policies if they interfere (Postgres uses OR for multiple policies usually, so adding a permissive one is enough)
      -- But let's be clean.
      DROP POLICY IF EXISTS "profiles_select_policy" ON profiles;
      DROP POLICY IF EXISTS "public_profiles_access" ON profiles;
      DROP POLICY IF EXISTS "authenticated_view_profiles" ON profiles;

      -- Create simple permissive policy for authenticated users
      -- This allows any logged in user to see names/emails of others (needed for team UI)
      CREATE POLICY "authenticated_view_profiles" ON profiles
      FOR SELECT
      TO authenticated
      USING (true);
      
      -- Also allow service_role just in case (usually bypasses, but good measure)
      -- CREATE POLICY "service_role_manage_profiles" ON profiles
      -- FOR ALL
      -- TO service_role
      -- USING (true) WITH CHECK (true);
    `;

        console.log('Executing SQL...');
        await client.query(query);
        console.log('Policy updated successfully.');

    } catch (err) {
        console.error('Error executing SQL:', err);
    } finally {
        await client.end();
    }
}

fixPolicies();
