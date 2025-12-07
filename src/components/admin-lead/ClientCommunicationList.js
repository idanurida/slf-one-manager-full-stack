// FILE: src/components/admin-lead/ClientCommunicationList.js
import React, { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Mail, MessageCircle, Building, User, Clock } from "lucide-react";

// Komponen ini menerima daftar proyek dan fungsi untuk menangani klik pada thread percakapan
const ClientCommunicationList = ({ projects, loading, unreadOnly, readOnly, onViewThread }) => {
  // Fungsi untuk mendapatkan warna badge status proyek
  const getStatusColor = (status) => {
    const colors = {
      'draft': 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400',
      'submitted': 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400',
      'project_lead_review': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400',
      'inspection_scheduled': 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400',
      'inspection_in_progress': 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400',
      'report_draft': 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400',
      'head_consultant_review': 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/20 dark:text-indigo-400',
      'client_review': 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/20 dark:text-cyan-400',
      'government_submitted': 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
      'slf_issued': 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-400',
      'completed': 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
      'cancelled': 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
    };
    return colors[status] || 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
  };

  // Fungsi untuk mendapatkan label status proyek
  const getStatusLabel = (status) => {
    const labels = {
      'draft': 'Draft',
      'submitted': 'Submitted',
      'project_lead_review': 'Project Lead Review',
      'inspection_scheduled': 'Inspection Scheduled',
      'inspection_in_progress': 'Inspection In Progress',
      'report_draft': 'Report Draft',
      'head_consultant_review': 'Head Consultant Review',
      'client_review': 'Client Review',
      'government_submitted': 'Government Submitted',
      'slf_issued': 'SLF Issued',
      'completed': 'Completed',
      'cancelled': 'Cancelled'
    };
    return labels[status] || status;
  };

  // Filter proyek berdasarkan props unreadOnly atau readOnly
  const filteredProjects = useMemo(() => {
    if (!projects) return [];
    if (unreadOnly) {
      return projects.filter(p => p.has_unread_messages);
    } else if (readOnly) {
      return projects.filter(p => !p.has_unread_messages);
    }
    return projects;
  }, [projects, unreadOnly, readOnly]);

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

  if (filteredProjects.length === 0) {
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
      {filteredProjects.map((project) => {
        // Hitung jumlah pesan dari client (atau jumlah percakapan aktif jika struktur datanya berbeda)
        // Asumsi: project.messages adalah array pesan
        const messageCount = project.messages ? project.messages.length : 0;
        // Asumsi: project.has_unread_messages adalah boolean
        const hasUnread = project.has_unread_messages;

        return (
          <Card 
            key={project.id} 
            className="border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors cursor-pointer"
            onClick={() => onViewThread(project.id, project.client_id)} // Panggil handler dengan ID proyek dan client
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-full">
                    <Building className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-900 dark:text-slate-100">{project.name}</h4>
                    <div className="flex items-center text-sm text-slate-600 dark:text-slate-400 space-x-4 mt-1">
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3" /> 
                        {project.client_name || project.clients?.name || 'Client Tidak Diketahui'}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" /> 
                        {new Date(project.created_at).toLocaleDateString('id-ID')}
                      </span>
                    </div>
                    <div className="flex items-center text-xs mt-1">
                      <Badge className={getStatusColor(project.status)}>
                        {getStatusLabel(project.status)}
                      </Badge>
                      {hasUnread && (
                        <Badge variant="destructive" className="ml-2 h-5">Belum Dibaca</Badge>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {messageCount > 0 && (
                    <Badge variant="outline" className="flex items-center gap-1">
                      <MessageCircle className="w-3 h-3" />
                      {messageCount}
                    </Badge>
                  )}
                  <Button variant="outline" size="sm">
                    <Mail className="w-4 h-4 mr-2" />
                    Buka
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default ClientCommunicationList;