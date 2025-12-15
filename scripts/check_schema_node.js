const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
    const { data, error } = await supabase
        .from('projects')
        .select('id, name, created_by, admin_lead_id') // Try to select both
        .limit(1);

    if (error) {
        console.log('Error selecting columns:', error.message);
        // If error says column does not exist, we know.
    } else {
        console.log('Columns exist. Sample data:', data);
    }
}

checkSchema();
