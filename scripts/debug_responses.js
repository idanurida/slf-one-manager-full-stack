
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function checkChecklistResponses() {
    // Query all records to see what's there
    const { data, error } = await supabase
        .from('checklist_responses')
        .select('*');

    if (error) {
        console.error('Error fetching checklist_responses:', error);
        return;
    }

    console.log(`Total checklist_responses: ${data.length}`);
    if (data.length > 0) {
        console.log('Sample record keys:', Object.keys(data[0]));
        console.log('Sample record:', data[0]);
    } else {
        // If empty, maybe look at inspections to see if any are COMPLETED
        const { data: insp, error: inspErr } = await supabase
            .from('inspections')
            .select('id, status, created_at')
            .order('created_at', { ascending: false })
            .limit(5);

        console.log('Latest 5 inspections:', insp);
    }
}

checkChecklistResponses();
