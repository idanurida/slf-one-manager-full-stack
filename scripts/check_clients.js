const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' }); // Load env from .env.local

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkClientsSchema() {
    const { data, error } = await supabase
        .from('clients')
        .select('*')
        .limit(1);

    if (error) {
        console.log('Error checking clients:', error.message);
    } else {
        console.log('Clients table data sample:', data);
    }
}

checkClientsSchema();
