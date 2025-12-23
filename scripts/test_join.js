
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function testJoin() {
    const { data, error } = await supabase
        .from('checklist_responses')
        .select(`
      *,
      checklist_items (
        item_name
      )
    `)
        .limit(1);

    if (error) {
        console.log('Join Error:', error.message);
        if (error.message.includes('relationship')) {
            console.log('Hint: The relationship between checklist_responses and checklist_items is not recognized.');
        }
    } else {
        console.log('Join Success!');
    }
}

testJoin();
