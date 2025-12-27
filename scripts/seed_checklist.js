const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function seedChecklist() {
    console.log('Seeding checklist items...');

    const items = [
        {
            id: 'fungsi_bangunan_gedung',
            template_id: 'tata_bangunan',
            template_title: 'Pemeriksaan Tata Bangunan',
            category: 'TATA_BANGUNAN',
            specialization: 'Arsitektur',
            applicable_for: [], // Applies to all
            item_name: 'Fungsi Bangunan Gedung',
            columns: [
                {
                    "name": "kesesuaian",
                    "type": "radio",
                    "options": ["Sesuai", "Tidak Sesuai"]
                },
                {
                    "name": "catatan",
                    "type": "textarea"
                },
                {
                    "name": "foto",
                    "type": "photo" // Assuming the app uses this or handles photos separately via the button which the test clicks using 'Ambil Foto'
                }
            ]
        }
    ];

    const { data, error } = await supabase
        .from('checklist_items')
        .upsert(items, { onConflict: 'id' })
        .select();

    if (error) {
        console.error('❌ Error seeding checklist items:', error.message);
    } else {
        console.log(`✅ Seeded ${data.length} items.`);
        console.log('Seeded items:', data.map(i => i.item_name));
    }
}

seedChecklist();
