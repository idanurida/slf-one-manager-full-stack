require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase credentials in .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

const KEEP_USERS = [
    'superadmin2@slf.com',
    'admin@slf.com',
    'head-consultant@slf.com'
];

async function cleanupData() {
    console.log('🚀 Starting VERY robust cleanup...');

    // 1. Delete dependent data first to avoid FK constraints
    console.log('🗑️ Deleting dependent data...');

    const tablesToClear = [
        'messages',
        'notifications',
        'project_teams',
        'project_documents',
        'inspection_photos',
        'checklist_responses',
        'checklists',
        'checklist_items',
        'inspections',
        'schedules',
        'project_progress',
        'support_requests',
        'geotag_data',
        'files',
        'logs'
    ];

    for (const table of tablesToClear) {
        console.log(`   - Clearing ${table}...`);
        try {
            const { error } = await supabase.from(table).delete().neq('id', '00000000-0000-0000-0000-000000000000');
            // If table doesn't have 'id', this might fail, but it's fine for most.
            if (error) console.log(`     ⚠️ Error clearing ${table}: ${error.message}`);
        } catch (e) {
            console.log(`     ⚠️ Fatal error clearing ${table}: ${e.message}`);
        }
    }

    // 2. Delete all projects
    console.log('🗑️ Deleting all projects...');
    const { data: allProjects, error: fetchProjError } = await supabase.from('projects').select('id');

    if (fetchProjError) {
        console.error('Error fetching projects:', fetchProjError.message);
    } else if (allProjects && allProjects.length > 0) {
        const projectIds = allProjects.map(p => p.id);
        const { error: deleteProjError } = await supabase
            .from('projects')
            .delete()
            .in('id', projectIds);

        if (deleteProjError) console.error('Error deleting projects:', deleteProjError.message);
        else console.log(`✅ Deleted ${projectIds.length} projects.`);
    } else {
        console.log('ℹ️ No projects found.');
    }

    // 3. Fetch all users
    console.log('👥 Fetching users...');
    let allUsers = [];
    let page = 1;
    const PER_PAGE = 50;

    while (true) {
        const { data: { users }, error } = await supabase.auth.admin.listUsers({
            page: page,
            perPage: PER_PAGE
        });

        if (error) {
            console.error('Error fetching users:', error);
            break;
        }

        if (!users || users.length === 0) break;

        allUsers = [...allUsers, ...users];
        if (users.length < PER_PAGE) break;
        page++;
    }

    console.log(`ℹ️ Found ${allUsers.length} total users.`);

    // 4. Filter and Delete Users
    const usersToDelete = allUsers.filter(u => !KEEP_USERS.includes(u.email));

    if (usersToDelete.length === 0) {
        console.log('✅ No users to delete.');
        return;
    }

    console.log(`🗑️ Deleting ${usersToDelete.length} users...`);

    for (const user of usersToDelete) {
        // Try to delete profile manually first just in case cascade is flaky
        await supabase.from('profiles').delete().eq('id', user.id);

        const { error } = await supabase.auth.admin.deleteUser(user.id);
        if (error) {
            console.error(`❌ Failed to delete ${user.email}:`, error.message);
        } else {
            console.log(`   Deleted ${user.email}`);
        }
    }

    console.log('✨ Cleanup complete!');
}

cleanupData();
