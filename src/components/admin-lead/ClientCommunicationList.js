// FILE: src/components/admin-lead/ClientCommunicationList.js
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

const ClientCommunicationList = ({ 
  projects = [], 
  loading = false, 
  unreadOnly = false, 
  readOnly = false, 
  onViewThread = () => {} 
}) => {
  // Ensure projects is always a valid array
  const safeProjects = React.useMemo(() => {
    if (!projects) return [];
    if (Array.isArray(projects)) return projects;
    console.warn('Projects is not an array:', typeof projects);
    return [];
  }, [projects]);

  // Format date safely
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
      console.error('Error formatting date:', error);
      return 'Tanggal tidak valid';
    }
  };

  // Handle project click
  const handleProjectClick = (projectId, clientId) => {
    if (!projectId || !clientId) {
      console.warn('Invalid projectId or clientId:', { projectId, clientId });
      return;
    }
    
    if (typeof onViewThread === 'function') {
      onViewThread(projectId, clientId);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="space-y-4" data-testid="client-communication-list-loading">
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

  // Empty state
  if (!safeProjects || safeProjects.length === 0) {
    const emptyMessage = React.useMemo(() => {
      if (unreadOnly) {
        return {
          title: 'Tidak ada pesan belum dibaca',
          description: 'Semua pesan dari client telah Anda baca.'
        };
      }
      if (readOnly) {
        return {
          title: 'Tidak ada pesan sudah dibaca',
          description: 'Belum ada pesan yang sudah dibaca.'
        };
      }
      return {
        title: 'Tidak ada komunikasi',
        description: 'Belum ada komunikasi dengan client.'
      };
    }, [unreadOnly, readOnly]);

    return (
      <div className="text-center py-8" data-testid="client-communication-list-empty">
        <Mail className="w-12 h-12 mx-auto text-slate-400 dark:text-slate-500 mb-4" />
        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">
          {emptyMessage.title}
        </h3>
        <p className="text-slate-600 dark:text-slate-400">
          {emptyMessage.description}
        </p>
      </div>
    );
  }

  // Render projects list
  return (
    <div className="space-y-4" data-testid="client-communication-list">
      {safeProjects.map((project, index) => {
        // Validate project object
        if (!project || typeof project !== 'object') {
          console.warn(`Invalid project at index ${index}:`, project);
          return null;
        }

        const projectId = project.id || `project-${index}`;
        const clientId = project.client_id || '';
        const projectName = project.name || 'Project Tanpa Nama';
        const clientName = project.clients?.name || project.client_name || 'Client Tidak Diketahui';
        const createdAt = project.created_at || project.createdAt || project.date || '';
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
                handleProjectClick(projectId, clientId);
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
                        <span>{formatDate(createdAt)}</span>
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
                      handleProjectClick(projectId, clientId);
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

// Prop types validation (optional, but recommended)
ClientCommunicationList.propTypes = {
  projects: (props, propName, componentName) => {
    const propValue = props[propName];
    if (propValue !== undefined && !Array.isArray(propValue)) {
      return new Error(
        `Invalid prop '${propName}' supplied to '${componentName}'. Expected array, got ${typeof propValue}.`
      );
    }
  },
  loading: (props, propName, componentName) => {
    const propValue = props[propName];
    if (propValue !== undefined && typeof propValue !== 'boolean') {
      return new Error(
        `Invalid prop '${propName}' supplied to '${componentName}'. Expected boolean, got ${typeof propValue}.`
      );
    }
  },
  unreadOnly: (props, propName, componentName) => {
    const propValue = props[propName];
    if (propValue !== undefined && typeof propValue !== 'boolean') {
      return new Error(
        `Invalid prop '${propName}' supplied to '${componentName}'. Expected boolean, got ${typeof propValue}.`
      );
    }
  },
  readOnly: (props, propName, componentName) => {
    const propValue = props[propName];
    if (propValue !== undefined && typeof propValue !== 'boolean') {
      return new Error(
        `Invalid prop '${propName}' supplied to '${componentName}'. Expected boolean, got ${typeof propValue}.`
      );
    }
  },
  onViewThread: (props, propName, componentName) => {
    const propValue = props[propName];
    if (propValue !== undefined && typeof propValue !== 'function') {
      return new Error(
        `Invalid prop '${propName}' supplied to '${componentName}'. Expected function, got ${typeof propValue}.`
      );
    }
  },
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

// Export helper functions for testing
export { getStatusColor, getStatusLabel };