// src/components/timeline/AllProjectsOverview.js
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

// Helper functions
const getProjectPhase = (status) => {
  const phaseMap = {
    'draft': 1, 'submitted': 1, 'project_lead_review': 1,
    'inspection_scheduled': 2, 'inspection_in_progress': 2,
    'report_draft': 3, 'head_consultant_review': 3,
    'client_review': 4,
    'government_submitted': 5, 'slf_issued': 5, 'completed': 5
  };
  return phaseMap[status] || 1;
};

const getStatusColor = (status) => {
  const colorMap = {
    'completed': 'default',
    'in_progress': 'secondary',
    'pending': 'outline',
    'delayed': 'destructive',
    'draft': 'outline',
    'submitted': 'secondary',
    'project_lead_review': 'secondary',
    'inspection_scheduled': 'secondary',
    'inspection_in_progress': 'secondary',
    'report_draft': 'secondary',
    'head_consultant_review': 'secondary',
    'client_review': 'secondary',
    'government_submitted': 'secondary',
    'slf_issued': 'default'
  };
  return colorMap[status] || 'outline';
};

const getProjectProgress = (projectId) => {
  // This would typically come from your project data or calculations
  // For now, we'll return a dummy value
  const progressMap = {
    1: 20, 2: 40, 3: 60, 4: 80, 5: 95
  };
  const phase = getProjectPhase(projectId); // This should be based on actual project status
  return progressMap[phase] || 0;
};

const getPhaseColor = (phaseNumber) => {
  const colors = {
    1: 'bg-blue-500',
    2: 'bg-green-500', 
    3: 'bg-yellow-500',
    4: 'bg-purple-500',
    5: 'bg-indigo-500'
  };
  return colors[phaseNumber] || 'bg-gray-500';
};

export default function AllProjectsOverview({ projects = [], currentRole = 'admin_lead' }) {
  const phases = [1, 2, 3, 4, 5];
  
  if (!projects || projects.length === 0) {
    return (
      <Card className="border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
        <CardContent className="p-8 text-center">
          <div className="text-slate-500 dark:text-slate-400">
            Tidak ada project yang tersedia
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Project Distribution by Phase */}
      <Card className="border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
        <CardHeader>
          <CardTitle className="text-slate-900 dark:text-slate-100">
            Distribusi Project per Fase
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {phases.map(phase => {
              const phaseProjects = projects.filter(p => 
                getProjectPhase(p.status) === phase
              );
              const percentage = projects.length > 0 
                ? (phaseProjects.length / projects.length) * 100 
                : 0;
              
              return (
                <div key={phase} className="text-center p-4 border border-slate-200 dark:border-slate-700 rounded-lg">
                  <div className={`w-16 h-16 rounded-full flex items-center justify-center text-white text-lg font-bold mx-auto mb-2 ${getPhaseColor(phase)}`}>
                    {phase}
                  </div>
                  <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                    {phaseProjects.length}
                  </div>
                  <div className="text-sm text-slate-600 dark:text-slate-400 mb-2">Fase {phase}</div>
                  <Progress 
                    value={percentage} 
                    className="h-2 bg-slate-200 dark:bg-slate-700"
                  />
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    {percentage.toFixed(1)}%
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Detailed Projects List */}
      <Card className="border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
        <CardHeader>
          <CardTitle className="text-slate-900 dark:text-slate-100">
            Detail Semua Project
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border border-slate-200 dark:border-slate-700">
            <Table>
              <TableHeader className="bg-slate-50 dark:bg-slate-800/50">
                <TableRow>
                  <TableHead className="text-slate-900 dark:text-slate-100 font-semibold">
                    Project
                  </TableHead>
                  <TableHead className="text-slate-900 dark:text-slate-100 font-semibold">
                    Client
                  </TableHead>
                  <TableHead className="text-slate-900 dark:text-slate-100 font-semibold">
                    Project Lead
                  </TableHead>
                  <TableHead className="text-slate-900 dark:text-slate-100 font-semibold">
                    Fase
                  </TableHead>
                  <TableHead className="text-slate-900 dark:text-slate-100 font-semibold">
                    Status
                  </TableHead>
                  <TableHead className="text-slate-900 dark:text-slate-100 font-semibold">
                    Progress
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {projects.map(project => {
                  const currentPhase = getProjectPhase(project.status);
                  const progress = getProjectProgress(currentPhase);
                  
                  return (
                    <TableRow 
                      key={project.id} 
                      className="border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                    >
                      <TableCell className="font-medium text-slate-900 dark:text-slate-100">
                        {project.name}
                      </TableCell>
                      <TableCell className="text-slate-700 dark:text-slate-300">
                        {project.clients?.name || '-'}
                      </TableCell>
                      <TableCell className="text-slate-700 dark:text-slate-300">
                        {project.project_lead?.full_name || '-'}
                      </TableCell>
                      <TableCell>
                        <Badge className={`${getPhaseColor(currentPhase)} text-white`}>
                          Fase {currentPhase}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusColor(project.status)}>
                          {project.status === 'completed' ? 'Selesai' :
                           project.status === 'in_progress' ? 'Berjalan' :
                           project.status === 'pending' ? 'Menunggu' :
                           project.status === 'delayed' ? 'Terlambat' :
                           project.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Progress 
                            value={progress} 
                            className="w-20 h-2 bg-slate-200 dark:bg-slate-700"
                          />
                          <span className="text-sm text-slate-700 dark:text-slate-300 w-8">
                            {progress}%
                          </span>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          
          {/* Summary */}
          <div className="mt-4 p-4 bg-slate-50 dark:bg-slate-800/30 rounded-lg">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                  {projects.length}
                </div>
                <div className="text-sm text-slate-600 dark:text-slate-400">Total Projects</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {projects.filter(p => p.status === 'completed').length}
                </div>
                <div className="text-sm text-slate-600 dark:text-slate-400">Selesai</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {projects.filter(p => p.status === 'in_progress').length}
                </div>
                <div className="text-sm text-slate-600 dark:text-slate-400">Berjalan</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                  {projects.filter(p => p.status === 'delayed').length}
                </div>
                <div className="text-sm text-slate-600 dark:text-slate-400">Terlambat</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
