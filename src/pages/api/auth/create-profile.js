// FILE: src/pages/api/auth/create-profile.js
// API endpoint to create user profile after registration
// Uses service role to bypass RLS

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Service role client (bypasses RLS)
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { userId, email, full_name, role, specialization, phone_number, company_name } = req.body;

        // Validate required fields
        if (!userId || !email) {
            return res.status(400).json({ error: 'userId and email are required' });
        }

        console.log('[API/create-profile] Creating profile for:', email);

        // Archive any conflicting deleted profiles
        const { error: archiveError } = await supabaseAdmin
            .from('profiles')
            .update({
                email: `${email}_archived_${Date.now()}`
            })
            .eq('email', email)
            .neq('id', userId);

        if (archiveError) {
            console.warn('[API/create-profile] Archive warning:', archiveError.message);
        }

        // Create the profile
        const { data: profile, error: insertError } = await supabaseAdmin
            .from('profiles')
            .upsert({
                id: userId,
                email: email,
                full_name: full_name || email,
                role: role || 'client',
                specialization: specialization || null,
                phone_number: phone_number || null,
                company_name: company_name || null,
                status: 'pending',
                is_approved: false,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            }, {
                onConflict: 'id'
            })
            .select()
            .single();

        if (insertError) {
            console.error('[API/create-profile] Insert error:', insertError);
            return res.status(500).json({
                error: 'Failed to create profile',
                details: insertError.message
            });
        }

        console.log('[API/create-profile] Profile created successfully:', profile.id);

        return res.status(200).json({
            success: true,
            profile: profile
        });

    } catch (error) {
        console.error('[API/create-profile] Error:', error);
        return res.status(500).json({
            error: 'Internal server error',
            details: error.message
        });
    }
}
