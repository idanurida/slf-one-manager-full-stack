// FILE: src/components/admin-lead/ClientCommunicationList.js
import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { MessageCircle, Building, User, Clock, Mail } from "lucide-react";

// Helper functions with safety checks - move them here to avoid import issues
const getStatusColor = (status) => {
  if (!status) return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300";
  
  const statusMap = {
    'pending': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
    'active': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
    'completed': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
    'cancelled': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
    'on_hold': 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
  };
  
  return statusMap[status] || "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300";
};

const getStatusLabel = (status) => {
  if (!status) return 'Tidak Diketahui';
  
  const labelMap = {
    'pending': 'Menunggu',
    'active': 'Aktif',
    'completed': 'Selesai',
    'cancelled': 'Dibatalkan',
    'on_hold': 'Ditahan',
  };
  
  return labelMap[status] || status;
};

// Safe date formatting
const formatDate = (dateString) => {
  if (!dateString) return 'Tanggal tidak tersedia';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Tanggal tidak valid';
    return date.toLocaleDateString('id-ID');
  } catch (error) {
    return 'Tanggal tidak valid';
  }
};

const ClientCommunicationList = ({ 
  projects = [], // ADD DEFAULT VALUE HERE
  loading = false, 
  unreadOnly = false, 
  readOnly = false, 
  onViewThread = () => {} 
}) => {
  // Ensure projects is always an array
  const safeProjects = Array.isArray(projects) ? projects : [];
  
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

  // FIX: Use safeProjects.length instead of projects.length
  if (safeProjects.length === 0) {
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
      {safeProjects.map((project) => {
        // Add null check for each project
        if (!project) return null;
        
        const projectId = project.id || '';
        const clientId = project.client_id || '';
        const projectName = project.name || 'Project Tanpa Nama';
        const clientName = project.clients?.name || 'Client Tidak Diketahui';
        const projectStatus = project.status || '';
        const hasUnreadMessages = Boolean(project.has_unread_messages);
        
        return (
          <Card 
            key={projectId || Math.random()} 
            className="border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors cursor-pointer"
            onClick={() => {
              if (projectId && clientId) {
                onViewThread(projectId, clientId);
              }
            }}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-full">
                    <Building className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-900 dark:text-slate-100">{projectName}</h4>
                    <div className="flex items-center text-sm text-slate-600 dark:text-slate-400 space-x-4">
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3" /> {clientName}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {formatDate(project.created_at)}
                      </span>
                    </div>
                    <div className="flex items-center text-xs mt-1">
                      <Badge className={getStatusColor(projectStatus)}>
                        {getStatusLabel(projectStatus)}
                      </Badge>
                      {hasUnreadMessages && (
                        <Badge variant="destructive" className="ml-2 h-5">Belum Dibaca</Badge>
                      )}
                    </div>
                  </div>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (projectId && clientId) {
                      onViewThread(projectId, clientId);
                    }
                  }}
                >
                  <MessageCircle className="w-4 h-4 mr-2" />
                  Buka
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default ClientCommunicationList;