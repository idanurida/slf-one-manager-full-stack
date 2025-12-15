const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials!');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

async function runMigration() {
    const sqlPath = path.join(__dirname, 'apply_strict_rls.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    // Split by statement if possible, or try running huge block (Supabase rpc/sql exec capability varies)
    // Since we don't have direct SQL exec via JS client without a Postgres connection or generic RPC,
    // we will try to use a specialized RPC if it exists, OR just warn if we can't.
    // actually, checking previous context, we've been using 'scripts/check_schema_node.js' which just queries.
    // Standard supabase-js doesn't run raw SQL DDL.

    // WAIT - The user has "run_command" tool. I should try to check if I can run psql or similar.
    // But wait, the environment is Windows. 
    // We don't have `psql` or `supabase db execute` reliably configured in the prompt context history (it failed once).

    // ALTERNATIVE: Use the text file and ask user to run it? 
    // OR: If there is an existing `exec_sql` RPC function in the database (common in these projects), we can use it.

    console.log("Reading SQL...");

    // Let's assume we can't easily run DDL from node without a connection string.
    // I will check if there is a `exec_sql` function.

    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });

    if (error) {
        if (error.message.includes('function "exec_sql" does not exist')) {
            console.error("RPC 'exec_sql' not found. Cannot auto-migrate via JS client.");
            console.log("Please run the contents of 'scripts/apply_strict_rls.sql' in your Supabase SQL Editor.");
        } else {
            console.error("Migration Error:", error);
        }
    } else {
        console.log("Migration Success!");
    }
}

// Check for exec_sql first
// If strict RLS is requested, we really should apply it.
// I'll try to create a Postgres connection if I can find the connection string.
// But I don't have the connection string in the env vars listed in context (only URL/KEY).

// Strategy: I will try to use the 'run_command' to execute the file if 'supabase' CLI is available.
// If not, I will rely on the user or the RPC. `exec_sql` is a common pattern in agentic backups.

runMigration();
