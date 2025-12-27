require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkRoles() {
    console.log('Fetching roles from profiles table...');
    const { data, error } = await supabase
        .from('profiles')
        .select('role, full_name, specialization')
        .order('role');

    if (error) {
        console.error('Error fetching roles:', error);
        return;
    }

    const roleCounts = {};
    data.forEach(p => {
        roleCounts[p.role] = (roleCounts[p.role] || 0) + 1;
    });

    console.log('Role counts found:');
    console.table(roleCounts);

    console.log('\nDetailed list:');
    console.table(data);
}

checkRoles();
