import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { MessageCircle, Building, User, Clock, Mail } from "lucide-react";

// Helper functions with safety checks
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
    return date.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  } catch (error) {
    return 'Tanggal tidak valid';
  }
};

const ClientCommunicationList = ({ 
  projects = [], // Default empty array
  loading = false, 
  unreadOnly = false, 
  readOnly = false, 
  onViewThread = () => {} 
}) => {
  // Ensure projects is always an array
  const safeProjects = React.useMemo(() => {
    if (!projects) return [];
    if (Array.isArray(projects)) return projects;
    return [];
  }, [projects]);

  // Loading state
  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <Card 
            key={i} 
            className="border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
          >
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

  // Empty state - use safeProjects.length instead of projects.length
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

  // Render projects list
  return (
    <div className="space-y-4">
      {safeProjects.map((project, index) => {
        // Validate project object
        if (!project || typeof project !== 'object') {
          return null; // Skip invalid projects
        }

        const projectId = project.id || `project-${index}`;
        const clientId = project.client_id || '';
        const projectName = project.name || 'Project Tanpa Nama';
        const clientName = project.clients?.name || project.client_name || 'Client Tidak Diketahui';
        const projectStatus = project.status || '';
        const hasUnreadMessages = Boolean(project.has_unread_messages || project.unread_count > 0);
        const isValidProject = projectId && clientId;

        return (
          <Card 
            key={projectId}
            className={`border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 transition-colors ${
              isValidProject ? 'hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer' : 'cursor-not-allowed opacity-70'
            }`}
            onClick={() => {
              if (isValidProject) {
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
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                      {projectName}
                    </h4>
                    
                    <div className="flex flex-wrap items-center text-sm text-slate-600 dark:text-slate-400 gap-2 mt-1">
                      <span className="flex items-center gap-1 whitespace-nowrap">
                        <User className="w-3 h-3 flex-shrink-0" />
                        <span className="truncate">{clientName}</span>
                      </span>
                      
                      <span className="text-slate-400 dark:text-slate-500">•</span>
                      
                      <span className="flex items-center gap-1 whitespace-nowrap">
                        <Clock className="w-3 h-3 flex-shrink-0" />
                        <span>{formatDate(project.created_at)}</span>
                      </span>
                    </div>
                    
                    <div className="flex items-center flex-wrap gap-2 mt-2">
                      <Badge 
                        className={`${getStatusColor(projectStatus)} text-xs font-medium`}
                      >
                        {getStatusLabel(projectStatus)}
                      </Badge>
                      
                      {hasUnreadMessages && (
                        <Badge 
                          variant="destructive" 
                          className="h-5 text-xs font-medium"
                        >
                          Belum Dibaca
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                
                <Button 
                  variant="outline" 
                  size="sm"
                  disabled={!isValidProject}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (isValidProject) {
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

// Default props for extra safety
ClientCommunicationList.defaultProps = {
  projects: [],
  loading: false,
  unreadOnly: false,
  readOnly: false,
  onViewThread: () => {},
};

export default ClientCommunicationList;