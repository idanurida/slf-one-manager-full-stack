// FILE: src/pages/dashboard/superadmin/logs.js
import React from 'react';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Terminal } from 'lucide-react';

export default function SystemLogsPage() {
    const [logs, setLogs] = React.useState([]);
    const [loading, setLoading] = React.useState(true);

    React.useEffect(() => {
        const fetchLogs = async () => {
            try {
                const res = await fetch('/api/superadmin/logs');
                if (res.ok) {
                    const data = await res.json();
                    setLogs(data);
                }
            } catch (error) {
                console.error('Failed to fetch system logs:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchLogs();
    }, []);

    return (
        <DashboardLayout title="System Logs">
            <div className="space-y-6">
                <div className="flex items-center justify-end">
                    <Badge variant="outline">Last updated: {new Date().toLocaleTimeString()}</Badge>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Terminal className="w-5 h-5" />
                            Console Output
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="bg-slate-950 text-slate-50 p-4 rounded-lg font-mono text-sm h-[500px] overflow-y-auto">
                            {logs.map((log) => (
                                <div key={log.id} className="mb-2">
                                    <span className="text-slate-500">[{new Date(log.timestamp).toLocaleString()}]</span>{' '}
                                    <span className={
                                        log.type === 'error' ? 'text-red-400' :
                                            log.type === 'warning' ? 'text-yellow-400' :
                                                'text-blue-400'
                                    }>
                                        [{log.type.toUpperCase()}]
                                    </span>{' '}
                                    {log.message}
                                </div>
                            ))}
                            <div className="text-green-500 mt-4">$ _</div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </DashboardLayout>
    );
}
