require('dotenv').config({ path: '.env.local' });
const { Client } = require('pg');

async function fixSchema() {
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) {
        console.error('DATABASE_URL is not set in .env.local');
        // Try to construct it? No, password is unknown.
        process.exit(1);
    }

    const client = new Client({
        connectionString: dbUrl,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        console.log('Connected to Postgres.');

        // Check if column exists again just to be sure
        const checkRes = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name='projects' AND column_name='estimated_duration';
    `);

        if (checkRes.rows.length === 0) {
            console.log('Column missing. Adding...');
            await client.query(`ALTER TABLE projects ADD COLUMN estimated_duration INTEGER;`);
            console.log('Column added successfully.');
        } else {
            console.log('Column already exists (via PG check).');
        }

        // Also, refresh schema cache just in case
        await client.query(`NOTIFY pgrst, 'reload schema';`);
        console.log('Notified PostgREST to reload schema.');

    } catch (err) {
        console.error('Error executing DDL:', err);
    } finally {
        await client.end();
    }
}

fixSchema();
