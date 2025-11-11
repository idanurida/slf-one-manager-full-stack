// src/components/head-consultant/projects/ProjectDetail.js
"use client";

import React from 'react';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';

// =========================================================================
// INLINE UTILS (Menggantikan impor dari '@/lib/utils')
// =========================================================================
const cn = (...inputs) => {
  // Implementasi sederhana untuk menggabungkan string kelas
  return inputs.filter(Boolean).join(' ');
};

// shadcn/ui Components
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

// Icons from lucide-react (Menggantikan react-icons/fi)
import { FileText, User, MapPin, Calendar, Briefcase, Info, AlertTriangle } from 'lucide-react';


// Peta status ke class Tailwind untuk Badge
const getStatusBadgeClass = (status) => {
  switch (status?.toLowerCase()) {
    case 'draft': 
      return 'bg-gray-100 text-gray-800 border-gray-300';
    case 'submitted': 
      return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    case 'project_lead_review': 
      return 'bg-orange-100 text-orange-800 border-orange-300';
    case 'head_consultant_review': 
      return 'bg-purple-100 text-purple-800 border-purple-300';
    case 'client_review': 
      return 'bg-pink-100 text-pink-800 border-pink-300';
    case 'government_submitted': 
      return 'bg-cyan-100 text-cyan-800 border-cyan-300';
    case 'slf_issued': 
      return 'bg-green-100 text-green-800 border-green-300';
    case 'rejected': 
      return 'bg-red-100 text-red-800 border-red-300';
    case 'head_consultant_approved': 
      return 'bg-blue-100 text-blue-800 border-blue-300';
    default: 
      return 'bg-gray-100 text-gray-800 border-gray-300';
  }
};

const formatStatus = (status) => {
    if (!status) return 'N/A';
    // Mengganti underscore dengan spasi dan mengubah huruf pertama menjadi kapital
    const formatted = status.toLowerCase().replace(/_/g, ' ');
    return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

const ProjectDetail = ({ project }) => {

  if (!project) {
    return (
      <Alert variant="warning" className="border-yellow-500 bg-yellow-50/50 text-yellow-800">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Proyek tidak ditemukan</AlertTitle>
        <AlertDescription>
          Tidak dapat menemukan detail proyek.
        </AlertDescription>
      </Alert>
    );
  }

  // Helper component untuk menampilkan detail (menggantikan HStack di Chakra)
  const DetailItem = ({ icon: Icon, label, value, isHighlighted = false }) => (
    <div 
        className={cn(
            "flex justify-between items-center p-3 rounded-md text-sm",
            isHighlighted ? "bg-gray-100 dark:bg-gray-800" : "bg-white dark:bg-gray-900"
        )}
    >
        <div className="flex items-center font-semibold text-gray-700 dark:text-gray-300">
            <Icon className="w-4 h-4 mr-2 text-blue-600" /> 
            {label}:
        </div>
        <div className="text-gray-900 dark:text-gray-100 font-normal text-right">
            {value}
        </div>
    </div>
  );

  return (
    <div className="flex flex-col space-y-4">
      <Card className="shadow-sm">
        <CardContent className="p-6">
          <div className="flex flex-col space-y-4">
            <h2 className="text-lg font-bold border-b pb-2 text-gray-800 dark:text-gray-200 border-gray-200 dark:border-gray-700">
                Informasi Dasar Proyek
            </h2>

            {/* SimpleGrid columns={{ base: 1, md: 2 }} */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <DetailItem 
                    icon={Briefcase} 
                    label="Nama Proyek" 
                    value={project.name} 
                    isHighlighted={true}
                />
                <DetailItem 
                    icon={User} 
                    label="Klien" 
                    value={project.clients?.name || '-'} 
                    isHighlighted={true}
                />
                <DetailItem 
                    icon={MapPin} 
                    label="Alamat" 
                    value={project.address || '-'} 
                />
                <DetailItem 
                    icon={Calendar} 
                    label="Tanggal Dibuat" 
                    value={project.created_at ? format(new Date(project.created_at), 'dd MMM yyyy', { locale: localeId }) : '-'}
                />
                <DetailItem 
                    icon={FileText} 
                    label="Status" 
                    value={
                        <Badge 
                            variant="outline" 
                            className={cn("border font-semibold", getStatusBadgeClass(project.status))}
                        >
                            {formatStatus(project.status)}
                        </Badge>
                    } 
                    isHighlighted={true}
                />
                <DetailItem 
                    icon={User} 
                    label="Project Lead" 
                    value={project.profiles?.[0]?.full_name || project.profiles?.[0]?.email || 'N/A'}
                    isHighlighted={true} 
                />
            </div>

            {/* Catatan Project Lead */}
            {project.notes_project_lead && (
              <>
                <Separator className="mt-4 mb-2 bg-gray-200 dark:bg-gray-700" />
                <h3 className="text-base font-semibold text-gray-700 dark:text-gray-300">Catatan Project Lead</h3>
                <div className="p-4 rounded-md border text-sm bg-blue-50 dark:bg-blue-900/50 border-blue-200 dark:border-blue-700 text-gray-800 dark:text-gray-200">
                  {project.notes_project_lead}
                </div>
              </>
            )}

            {/* Catatan Head Consultant */}
            {project.notes_head_consultant && (
              <>
                <Separator className="mt-4 mb-2 bg-gray-200 dark:bg-gray-700" />
                <h3 className="text-base font-semibold text-gray-700 dark:text-gray-300">Catatan Anda (Head Consultant)</h3>
                <div className="p-4 rounded-md border text-sm bg-purple-50 dark:bg-purple-900/50 border-purple-200 dark:border-purple-700 text-gray-800 dark:text-gray-200">
                  {project.notes_head_consultant}
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProjectDetail;