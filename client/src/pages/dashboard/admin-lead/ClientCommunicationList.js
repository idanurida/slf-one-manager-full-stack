// FILE: src/components/admin-lead/ClientCommunicationList.js
import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getStatusColor, getStatusLabel } from "@/pages/dashboard/admin-lead/communication"; // Asumsi helper ada di sana
import { MessageCircle, Building, User, Clock, Mail } from "lucide-react";

const ClientCommunicationList = ({ projects, loading, unreadOnly, readOnly, onViewThread }) => {
  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <Card key={i} className="border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Skeleton className="h-10 w-10 rounded-full bg-slate-300 dark:bg-slate-600" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-40 bg-slate-300 dark:bg-slate-600" />
                  <Skeleton className="h-3 w-32 bg-slate-300 dark:bg-slate-600" />
                </div>
              </div>
              <Skeleton className="h-8 w-20 bg-slate-300 dark:bg-slate-600" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div className="text-center py-8">
        <Mail className="w-12 h-12 mx-auto text-slate-400 dark:text-slate-500 mb-4" />
        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">
          {unreadOnly ? 'Tidak ada pesan belum dibaca' : readOnly ? 'Tidak ada pesan sudah dibaca' : 'Tidak ada komunikasi'}
        </h3>
        <p className="text-slate-600 dark:text-slate-400">
          {unreadOnly ? 'Semua pesan dari client telah Anda baca.' : readOnly ? 'Belum ada pesan yang sudah dibaca.' : 'Belum ada komunikasi dengan client.'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {projects.map((project) => (
        <Card key={project.id} className="border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors cursor-pointer"
              onClick={() => onViewThread(project.id, project.client_id)}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-full">
                  <Building className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h4 className="font-semibold text-slate-900 dark:text-slate-100">{project.name}</h4>
                  <div className="flex items-center text-sm text-slate-600 dark:text-slate-400 space-x-4">
                    <span className="flex items-center gap-1"><User className="w-3 h-3" /> {project.clients?.name || 'Client Tidak Diketahui'}</span>
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {new Date(project.created_at).toLocaleDateString('id-ID')}</span>
                  </div>
                  <div className="flex items-center text-xs mt-1">
                    <Badge className={getStatusColor(project.status)}>
                      {getStatusLabel(project.status)}
                    </Badge>
                    {project.has_unread_messages && (
                      <Badge variant="destructive" className="ml-2 h-5">Belum Dibaca</Badge>
                    )}
                  </div>
                </div>
              </div>
              <Button variant="outline" size="sm">
                <MessageCircle className="w-4 h-4 mr-2" />
                Buka
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default ClientCommunicationList;