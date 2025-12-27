require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Error: Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function seedNotifications(recipientId) {
    if (!recipientId) {
        console.error('Error: Please provide a recipient User ID as an argument.');
        console.log('Usage: node scripts/seed-notifications.js <USER_ID>');
        process.exit(1);
    }

    console.log(`Seeding notifications for user: ${recipientId}...`);

    const notifications = [
        {
            recipient_id: recipientId,
            type: 'success',
            title: 'Dokumen Disetujui',
            message: 'Dokumen "IMB Gedung A" telah disetujui oleh Admin Lead.',
            is_read: false,
            created_at: new Date().toISOString()
        },
        {
            recipient_id: recipientId,
            type: 'error',
            title: 'Dokumen Ditolak',
            message: 'Dokumen "Sertifikat Tanah" ditolak. Alasan: Scan tidak jelas.',
            is_read: false,
            created_at: new Date(Date.now() - 3600000).toISOString() // 1 hour ago
        },
        {
            recipient_id: recipientId,
            type: 'info',
            title: 'Update Proyek',
            message: 'Terdapat update jadwal inspeksi baru untuk proyek SLF Hotel.',
            is_read: true,
            created_at: new Date(Date.now() - 86400000).toISOString() // 1 day ago
        }
    ];

    const { data, error } = await supabase.from('notifications').insert(notifications).select();

    if (error) {
        console.error('Error seeding notifications:', error.message);
    } else {
        console.log(`Successfully seeded ${data.length} notifications.`);
    }
}

const args = process.argv.slice(2);
seedNotifications(args[0]);
