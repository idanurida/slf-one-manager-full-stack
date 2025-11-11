"use client";

import React from 'react';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';

// shadcn/ui Components
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/use-toast'; // ✅ Gunakan useToast dari shadcn/ui

// Lucide Icons
import {
  FileText, Clock, Activity, CheckCircle, XCircle, Bell, Eye, Search, X,
  CheckSquare, AlertTriangle, Loader2, Info, Calendar, UserCheck, Camera, Plus, Save, RotateCcw
} from 'lucide-react';

// Other Imports
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { supabase } from '@/utils/supabaseClient';
import { getUserAndProfile } from '@/utils/auth';

// --- Utility Functions ---
const formatDateSafely = (dateString) => {
  if (!dateString) return '-';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '-';
    return format(date, 'dd MMM yyyy', { locale: localeId });
  } catch (e) {
    console.error("Date formatting error:", e);
    return dateString;
  }
};

const getStatusColor = (status) => {
  switch (status?.toLowerCase()) {
    case 'draft': return 'secondary';
    case 'submitted': return 'default';
    case 'project_lead_review': return 'default';
    case 'head_consultant_review': return 'default';
    case 'client_review': return 'default';
    case 'government_submitted': return 'default';
    case 'slf_issued': return 'default';
    case 'completed': return 'default';
    case 'cancelled': return 'destructive';
    case 'rejected': return 'destructive';
    default: return 'outline';
  }
};

const getStatusText = (status) => {
  return status?.replace(/_/g, ' ') || 'N/A';
};

// --- Main Component ---
const ProjectDetail = ({ project }) => {
  const { toast } = useToast(); // ✅ Gunakan useToast dari shadcn/ui

  if (!project) {
    return (
      <Alert variant="warning" className="m-4">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Proyek tidak ditemukan</AlertTitle>
        <AlertDescription>
          Tidak dapat menemukan detail proyek.
        </AlertDescription>
      </Alert>
    );
  }

  // Karena Anda menggunakan "profiles!project_lead_id(full_name, email)" di query parent, 
  // data Project Lead akan ada di project.profiles.
  const projectLeadName = project.profiles?.full_name || project.profiles?.email || 'N/A';
  
  // Asumsi: project.clients adalah objek { name: '...' }
  const clientName = project.clients?.name || project.client_name || '-';

  return (
    <div className="space-y-6"> {/* ✅ Ganti VStack dengan div space-y-6 */}
      <Card className="border-border"> {/* ✅ Ganti Card dengan Card shadcn/ui dan tambahkan border-border */}
        <CardContent className="p-6"> {/* ✅ Ganti CardBody dengan CardContent shadcn/ui dan tambahkan p-6 */}
          <div className="space-y-4"> {/* ✅ Ganti VStack dengan div space-y-4 */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"> {/* ✅ Ganti HStack dengan div flex justify-between items-start sm:items-center gap-4 */}
              <div className="space-y-2"> {/* ✅ Ganti VStack dengan div space-y-2 */}
                <h2 className="text-xl md:text-2xl font-semibold text-primary"> {/* Ganti text-blue.600 ke text-primary */}
                  {project.name}
                </h2>
                <p className="text-sm text-muted-foreground"> {/* ✅ Ganti Text dengan p dan tambahkan text-sm text-muted-foreground */}
                  Klien: {clientName}
                </p>
                <p className="text-sm text-muted-foreground"> {/* ✅ Ganti Text dengan p dan tambahkan text-sm text-muted-foreground */}
                  Alamat: {project.address || '-'}
                </p>
              </div>
              <Badge variant={getStatusColor(project.status)} className="text-lg capitalize"> {/* ✅ Ganti Badge colorScheme dengan variant dan tambahkan text-lg capitalize */}
                {getStatusText(project.status)}
              </Badge>
            </div>

            <Separator className="bg-border" /> {/* ✅ Ganti Divider dengan Separator shadcn/ui dan tambahkan bg-border */ }

            <div className="space-y-3"> {/* ✅ Ganti VStack dengan div space-y-3 */}
              {/* ID Proyek */}
              <div className="flex justify-between items-center"> {/* ✅ Ganti HStack dengan div flex justify-between items-center */}
                <p className="font-bold text-foreground"> {/* ✅ Ganti Text fontWeight="bold" dengan p font-bold text-foreground */}
                  ID Proyek:
                </p>
                <p className="text-foreground"> {/* ✅ Ganti Text dengan p text-foreground */}
                  {project.id}
                </p>
              </div>
              {/* Nama Proyek */}
              <div className="flex justify-between items-center"> {/* ✅ Ganti HStack dengan div flex justify-between items-center */}
                <p className="font-bold text-foreground"> {/* ✅ Ganti Text fontWeight="bold" dengan p font-bold text-foreground */}
                  Nama Proyek:
                </p>
                <p className="text-foreground"> {/* ✅ Ganti Text dengan p text-foreground */}
                  {project.name}
                </p>
              </div>
              {/* Klien */}
              <div className="flex justify-between items-center"> {/* ✅ Ganti HStack dengan div flex justify-between items-center */}
                <p className="font-bold text-foreground"> {/* ✅ Ganti Text fontWeight="bold" dengan p font-bold text-foreground */}
                  Klien:
                </p>
                <p className="text-foreground"> {/* ✅ Ganti Text dengan p text-foreground */}
                  {clientName}
                </p>
              </div>
              {/* Alamat */}
              <div className="flex justify-between items-center"> {/* ✅ Ganti HStack dengan div flex justify-between items-center */}
                <p className="font-bold text-foreground"> {/* ✅ Ganti Text fontWeight="bold" dengan p font-bold text-foreground */}
                  Alamat:
                </p>
                <p className="text-foreground"> {/* ✅ Ganti Text dengan p text-foreground */}
                  {project.address || '-'}
                </p>
              </div>
              {/* Tanggal Dibuat */}
              <div className="flex justify-between items-center"> {/* ✅ Ganti HStack dengan div flex justify-between items-center */}
                <p className="font-bold text-foreground"> {/* ✅ Ganti Text fontWeight="bold" dengan p font-bold text-foreground */}
                  Tanggal Dibuat:
                </p>
                <p className="text-foreground"> {/* ✅ Ganti Text dengan p text-foreground */}
                  {formatDateSafely(project.created_at)}
                </p>
              </div>
              {/* Status */}
              <div className="flex justify-between items-center"> {/* ✅ Ganti HStack dengan div flex justify-between items-center */}
                <p className="font-bold text-foreground"> {/* ✅ Ganti Text fontWeight="bold" dengan p font-bold text-foreground */}
                  Status:
                </p>
                <Badge variant={getStatusColor(project.status)} className="capitalize"> {/* ✅ Ganti Badge colorScheme dengan variant dan tambahkan capitalize */}
                  {getStatusText(project.status)}
                </Badge>
              </div>
              {/* Project Lead */}
              <div className="flex justify-between items-center"> {/* ✅ Ganti HStack dengan div flex justify-between items-center */}
                <p className="font-bold text-foreground"> {/* ✅ Ganti Text fontWeight="bold" dengan p font-bold text-foreground */}
                  Project Lead:
                </p>
                <p className="text-foreground"> {/* ✅ Ganti Text dengan p text-foreground */}
                  {projectLeadName}
                </p>
              </div>
              {/* Deskripsi (Tambahan, jika ada) */}
              <Separator className="bg-border mt-4" />
              <div className="space-y-2 pt-2">
                <p className="font-bold text-foreground">Deskripsi Proyek:</p>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {project.description || 'Tidak ada deskripsi yang disediakan.'}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProjectDetail;
