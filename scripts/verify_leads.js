const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function check() {
    const { data, error } = await supabase.from('profiles').select('id, full_name, role, status, is_approved').in('role', ['project_lead', 'admin_lead']);
    if (error) {
        console.error('ERROR:', error);
    } else {
        console.log('COUNT:', data.length);
        console.log(JSON.stringify(data, null, 2));
    }
}

check();
