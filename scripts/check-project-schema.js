require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

async function checkSchema() {
    console.log('Checking projects table columns...');

    // Method 1: Try to select the specific column to see if it allows it
    const { data, error } = await supabaseAdmin
        .from('projects')
        .select('estimated_duration')
        .limit(1);

    if (error) {
        console.error('Error selecting estimated_duration:', error.message);
    } else {
        console.log('Column estimated_duration exists and is accessible.');
    }

    // Method 2: Select all columns to see what IS there
    const { data: allData, error: allError } = await supabaseAdmin
        .from('projects')
        .select('*')
        .limit(1);

    if (allData && allData.length > 0) {
        console.log('Available keys in projects table:', Object.keys(allData[0]));
    } else {
        console.log('No rows found, cannot inspect keys via select *');
    }
}

checkSchema();
