import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        // Fetch logs from system_logs table
        // Limit to latest 100 for now
        const { data, error } = await supabase
            .from('logs')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(100);

        if (error) {
            throw error;
        }

        // Transform data to match frontend expectations if necessary
        // Frontend expects: { id, type, message, timestamp }
        const logs = data.map(log => ({
            id: log.id,
            type: log.type,
            message: log.message,
            timestamp: log.created_at,
            metadata: log.metadata
        }));

        res.status(200).json(logs);

    } catch (error) {
        console.error('Error fetching logs:', error);
        res.status(500).json({ error: 'Failed to fetch logs' });
    }
}
