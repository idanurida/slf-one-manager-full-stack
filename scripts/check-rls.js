require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkRLS() {
    console.log('Checking RLS policies for profiles...');
    const { data, error } = await supabase.rpc('get_policies', { table_name: 'profiles' });

    if (error) {
        // If rpc doesn't exist, try querying pg_policies directly via sql if possible (usually not via client)
        // alternative: just try a query as anon and see the error message
        console.log('RPC get_policies failed, likely not defined. Trying manual check...');

        // Check as anon
        const anonClient = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
        const { data: anonData, error: anonError } = await anonClient.from('profiles').select('id').limit(1);

        console.log('Anon query result:', { data: anonData, error: anonError });
        if (anonError) {
            console.log('RLS is likely blocking anon access.');
        } else {
            console.log('RLS is NOT blocking anon access (at least for one row).');
        }
    } else {
        console.table(data);
    }
}

checkRLS();
