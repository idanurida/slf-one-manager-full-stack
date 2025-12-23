
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: 'c:\\Temp\\slf-one-manager-test-3\\.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkRecentPhotos() {
    console.log('Checking all inspection photos uploaded in the last 24 hours...');

    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);

    const { data: photos, error } = await supabase
        .from('inspection_photos')
        .select('id, project_id, inspection_id, uploaded_by, created_at, photo_url')
        .gte('created_at', oneDayAgo.toISOString())
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching photos:', error);
        return;
    }

    console.log(`Found ${photos.length} photos uploaded in the last 24 hours.`);

    photos.forEach(p => {
        console.log(`Photo: ${p.id}`);
        console.log(`  Project: ${p.project_id}`);
        console.log(`  Inspection: ${p.inspection_id}`);
        console.log(`  User: ${p.uploaded_by}`);
        console.log(`  Created: ${p.created_at}`);
        console.log(`  URL: ${p.photo_url.substring(0, 50)}...`);
        console.log('---');
    });
}

checkRecentPhotos();
