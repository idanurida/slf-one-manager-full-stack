
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: 'c:\\Temp\\slf-one-manager-test-3\\.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function compareInspections() {
    const ids = [
        '123e4567-e89b-12d3-a456-426614174000',
        '45e911dd-b659-44b8-a2d8-be935a5cf57d'
    ];

    console.log('Comparing inspections...');

    const { data: inspections, error } = await supabase
        .from('inspections')
        .select('*')
        .in('id', ids);

    if (error) {
        console.error('Error fetching inspections:', error);
        return;
    }

    inspections.forEach(i => {
        console.log(`\nInspection: ${i.id}`);
        console.log(`  Project ID: ${i.project_id}`);
        console.log(`  Inspector ID: ${i.inspector_id}`);
        console.log(`  Status: ${i.status}`);
        console.log(`  Created At: ${i.created_at}`);
        console.log(`  Updated At: ${i.updated_at}`);
    });
}

compareInspections();
