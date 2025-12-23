
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function checkRecentData() {
    console.log('--- Recent Checklist Responses ---');
    const { data: responses, error } = await supabase
        .from('checklist_responses')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);

    if (error) {
        console.error('Error fetching responses:', error);
    } else {
        console.log('Latest 5 responses:', JSON.stringify(responses, null, 2));
    }

    console.log('\n--- Recent Inspection Photos ---');
    const { data: photos, error: photoError } = await supabase
        .from('inspection_photos')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);

    if (photoError) {
        console.error('Error fetching photos:', photoError);
    } else {
        console.log('Latest 5 photos:', JSON.stringify(photos, null, 2));
    }

    console.log('\n--- Recent Inspection Reports ---');
    const { data: reports, error: reportError } = await supabase
        .from('inspection_reports')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);

    if (reportError) {
        console.error('Error fetching reports:', reportError);
    } else {
        console.log('Latest 5 reports:', JSON.stringify(reports, null, 2));
    }
}

checkRecentData();
