
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: 'c:\\Temp\\slf-one-manager-test-3\\.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixData() {
    const reportId = '3bad24ac-8bca-40a6-a84e-79a3aafbe2bd';
    const correctInspectionId = '45e911dd-b659-44b8-a2d8-be935a5cf57d'; // Has photos
    const dummyInspectionId = '123e4567-e89b-12d3-a456-426614174000'; // Dummy

    console.log('Fixing data...');

    // 1. Update Report
    const { error: updateError } = await supabase
        .from('inspection_reports')
        .update({ inspection_id: correctInspectionId })
        .eq('id', reportId);

    if (updateError) {
        console.error('Error updating report:', updateError);
        return;
    }
    console.log(`✅ Updated report ${reportId} to use inspection ${correctInspectionId}`);

    // 2. Cancel Dummy Inspection
    const { error: cancelError } = await supabase
        .from('inspections')
        .update({ status: 'cancelled' })
        .eq('id', dummyInspectionId);

    if (cancelError) {
        console.error('Error cancelling dummy inspection:', cancelError);
        return;
    }
    console.log(`✅ Cancelled dummy inspection ${dummyInspectionId}`);

    // 3. Verify
    const { count: photoCount } = await supabase
        .from('inspection_photos')
        .select('*', { count: 'exact', head: true })
        .eq('inspection_id', correctInspectionId);

    console.log(`\nVerification: Correct inspection now has ${photoCount} photos available.`);
}

fixData();
