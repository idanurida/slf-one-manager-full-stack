import React, { useEffect, useState } from 'react';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { supabase } from '@/utils/supabaseClient';

export default function DebugClientPage() {
    const [project, setProject] = useState(null);
    const [profiles, setProfiles] = useState([]);
    const [currentUserInfo, setCurrentUserInfo] = useState(null);
    const [myProjects, setMyProjects] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchData() {
            // 1. Fetch the specific project
            const { data: proj } = await supabase
                .from('projects')
                .select('*')
                .eq('id', '375f53e0-84f5-433b-9b26-404a02a5ba06')
                .single();
            setProject(proj);

            // 2. Fetch all user profiles with role 'client'
            const { data: prof } = await supabase
                .from('profiles')
                .select('*')
                .eq('role', 'client');
            setProfiles(prof || []);

            // 3. Get Current User info explicitly
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data: myProf } = await supabase.from('profiles').select('*').eq('id', user.id).single();
                setCurrentUserInfo(myProf);

                if (myProf?.client_id) {
                    const { data: myProjs } = await supabase.from('projects').select('*').eq('client_id', myProf.client_id);
                    setMyProjects(myProjs || []);
                }
            }

            setLoading(false);
        }
        fetchData();
    }, []);

    if (loading) return <DashboardLayout title="Debug">Loading...</DashboardLayout>;

    return (
        <DashboardLayout title="Debug Client Access">
            <div className="p-6 space-y-6">

                <div className="border p-4 rounded bg-white dark:bg-slate-800 border-blue-500">
                    <h2 className="font-bold mb-2 text-blue-600">Current Logged In User</h2>
                    <pre className="text-xs overflow-auto bg-slate-100 p-2 rounded">
                        Profile: {JSON.stringify(currentUserInfo, null, 2)}
                    </pre>
                    <p className="mt-2 font-semibold">
                        My Client ID: {currentUserInfo?.client_id || <span className="text-red-600">NULL (This is likely the problem)</span>}
                    </p>

                    <h3 className="font-bold mt-4 mb-2">Projects Linked to Me</h3>
                    {myProjects?.length > 0 ? (
                        <ul className="list-disc pl-5">
                            {myProjects.map(p => (
                                <li key={p.id}>{p.name} (ID: {p.id})</li>
                            ))}
                        </ul>
                    ) : (
                        <p className="text-red-500">No projects found for my Client ID.</p>
                    )}
                </div>

                <div className="border p-4 rounded bg-white dark:bg-slate-800">
                    <h2 className="font-bold mb-2">Target Project (that fails)</h2>
                    <pre className="text-xs overflow-auto bg-slate-100 p-2 rounded">
                        {JSON.stringify(project, null, 2)}
                    </pre>
                    <p className="mt-2 text-sm text-gray-600">
                        Target Client ID: {project?.client_id}
                    </p>
                </div>

                <div className="border p-4 rounded bg-white dark:bg-slate-800">
                    <h2 className="font-bold mb-2">All Client Profiles</h2>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b">
                                    <th className="text-left p-2">Name</th>
                                    <th className="text-left p-2">Email</th>
                                    <th className="text-left p-2">Profile Client ID</th>
                                    <th className="text-left p-2">Match Target?</th>
                                </tr>
                            </thead>
                            <tbody>
                                {profiles.map(p => (
                                    <tr key={p.id} className={`border-b hover:bg-slate-50 ${p.id === currentUserInfo?.id ? 'bg-blue-50' : ''}`}>
                                        <td className="p-2">{p.full_name} {p.id === currentUserInfo?.id && '(YOU)'}</td>
                                        <td className="p-2">{p.email}</td>
                                        <td className="p-2 font-mono">{p.client_id || 'NULL'}</td>
                                        <td className="p-2">
                                            {p.client_id === project?.client_id ?
                                                <span className="text-green-600 font-bold">MATCH</span> :
                                                <span className="text-red-500 font-bold">MISMATCH</span>
                                            }
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

            </div>
        </DashboardLayout>
    );
}
