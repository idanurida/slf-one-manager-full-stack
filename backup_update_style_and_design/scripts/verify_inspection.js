const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function verifyInspection() {
    const inspectionId = '17acbf0d-4f85-4924-aa5b-4b0bdcf3f8cb';
    const email = 'inspector.struktur@slf.com';

    console.log(`Checking Inspection ID: ${inspectionId}`);
    console.log(`Checking User Email: ${email}`);

    // 1. Check User
    const { data: users, error: userError } = await supabase.from('profiles').select('*').eq('email', email).single();
    if (userError) {
        console.error('❌ User not found or error:', userError.message);
    } else {
        console.log('✅ User found:', users.id, users.role);
    }

    // 2. Check Inspection
    const { data: inspection, error: inspError } = await supabase.from('inspections').select('*').eq('id', inspectionId).single();
    if (inspError) {
        console.error('❌ Inspection not found:', inspError.message);
    } else {
        console.log('✅ Inspection found:', inspection.project_id, inspection.status);
    }

    // 3. Check Checklist Items (Definitions)
    console.log('Checking Checklist Item Definitions...');
    const { data: items, error: itemsError } = await supabase
        .from('checklist_items')
        .select('*')
        .eq('category', 'TATA_BANGUNAN'); // Assuming category matches test interaction

    if (itemsError) {
        console.error('❌ Error fetching checklist items:', itemsError.message);
    } else {
        console.log(`✅ Found ${items.length} checklist items in category TATA_BANGUNAN.`);

        const targetItem = items.find(i => i.item_name === 'Fungsi Bangunan Gedung' || i.item_name.includes('Fungsi Bangunan'));

        if (targetItem) {
            console.log('✅ Target item "Fungsi Bangunan Gedung" found:', targetItem.id);
            console.log('   Template Title:', targetItem.template_title);
        } else {
            console.error('❌ Target item "Fungsi Bangunan Gedung" NOT found in category TATA_BANGUNAN.');
            console.log('Available items:', items.map(i => i.item_name).slice(0, 5));
        }
    }

    // 4. Check Inspection Progress/Photos (if any)
    const { count, error: photoError } = await supabase
        .from('inspection_photos')
        .select('*', { count: 'exact', head: true })
        .eq('inspection_id', inspectionId);

    if (photoError) {
        console.error('❌ Error checking photos:', photoError.message);
    } else {
        console.log(`ℹ️ Inspection currently has ${count} photos.`);
    }
}

verifyInspection();
