
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: 'c:\\Temp\\slf-one-manager-test-3\\.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase URL or Service Role Key in .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkData() {
    console.log('Checking recent inspection reports...');

    const { data: reports, error: reportsError } = await supabase
        .from('inspection_reports')
        .select('id, inspection_id, project_id, inspector_id, created_at, status')
        .order('created_at', { ascending: false })
        .limit(5);

    if (reportsError) {
        console.error('Error fetching reports:', reportsError);
        return;
    }

    console.log(`Found ${reports.length} recent reports:`);

    for (const report of reports) {
        console.log(`\nReport ID: ${report.id}`);
        console.log(`  Inspection ID: ${report.inspection_id}`);
        console.log(`  Project ID: ${report.project_id}`);
        console.log(`  Inspector ID: ${report.inspector_id}`);
        console.log(`  Created At: ${report.created_at}`);

        // Check photos for this report's inspection_id
        if (report.inspection_id) {
            const { count: photoCount, error: photoError } = await supabase
                .from('inspection_photos')
                .select('*', { count: 'exact', head: true })
                .eq('inspection_id', report.inspection_id);

            if (photoError) console.error('  Error checking photos by inspection_id:', photoError.message);
            else console.log(`  Photos found (by inspection_id): ${photoCount}`);
        } else {
            console.log('  No inspection_id on report.');
        }

        // Check photos by project_id and inspector_id (fallback)
        const { count: fallbackCount, error: fallbackError } = await supabase
            .from('inspection_photos')
            .select('*', { count: 'exact', head: true })
            .eq('project_id', report.project_id)
            .eq('uploaded_by', report.inspector_id);

        if (fallbackError) console.error('  Error checking photos by fallback:', fallbackError.message);
        else console.log(`  Photos found (by fallback project_id+inspector): ${fallbackCount}`);
    }

    console.log('\nChecking recent inspection photos without inspection_id...');
    const { data: orphanedPhotos, error: orphanedError } = await supabase
        .from('inspection_photos')
        .select('id, project_id, uploaded_by, created_at, inspection_id')
        .is('inspection_id', null)
        .order('created_at', { ascending: false })
        .limit(5);

    if (orphanedError) {
        console.error('Error checking orphaned photos:', orphanedError);
    } else {
        console.log(`Found ${orphanedPhotos.length} recent photos without inspection_id:`);
        orphanedPhotos.forEach(p => {
            console.log(`  Photo ID: ${p.id}, Project: ${p.project_id}, User: ${p.uploaded_by}, Created: ${p.created_at}`);
        });
    }
}

checkData();
