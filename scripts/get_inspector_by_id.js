const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function getInspector() {
    const { data, error } = await supabase
        .from('profiles')
        .select('email, role')
        .eq('id', 'c2b271bb-13a3-421b-a1ef-c8e13c3ec983')
        .single();

    if (error) {
        console.error('Error:', error);
        return;
    }
    console.log(JSON.stringify(data, null, 2));
}

getInspector();
