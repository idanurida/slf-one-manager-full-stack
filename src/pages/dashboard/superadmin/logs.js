// FILE: src/pages/dashboard/superadmin/logs.js
import React from 'react';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Terminal } from 'lucide-react';

export default function SystemLogsPage() {
    const dummyLogs = [
        { id: 1, type: 'info', message: 'System startup', timestamp: new Date().toISOString() },
        { id: 2, type: 'warning', message: 'High memory usage detected', timestamp: new Date(Date.now() - 3600000).toISOString() },
        { id: 3, type: 'error', message: 'Failed to connect to external API', timestamp: new Date(Date.now() - 7200000).toISOString() },
    ];

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
                            {dummyLogs.map((log) => (
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
