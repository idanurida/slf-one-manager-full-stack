// FILE: src/pages/api/drafter/projects.js
export default async function handler(req, res) {
  try {
    const { profile } = await getUserAndProfile(req);
    
    if (!profile || profile.role !== 'drafter') {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (req.method === 'GET') {
      const { data, error } = await supabase
        .from('project_teams')
        .select('project_id, projects(*)')
        .eq('user_id', profile.id)  // ✅ Profile ID
        .eq('role', 'drafter');

      if (error) throw error;
      return res.status(200).json(data || []);
    }
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ error: error.message });
  }
}