// src/components/head-consultant/projects/ProjectReview.js
"use client";

import React, { useState } from 'react';
import { supabase } from '@/utils/supabaseClient'; // Asumsi path ini benar
import { useRouter } from 'next/router'; // Asumsi Next.js App Router/Pages Router
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { useToast } from '@/components/ui/use-toast'; // Menggantikan useToast dari Chakra UI

// =========================================================================
// INLINE UTILS & CONSTANTS
// =========================================================================
const cn = (...inputs) => {
  // Simple utility for combining class names (like clsx)
  return inputs.filter(Boolean).join(' ');
};

const getStatusBadgeClass = (status) => {
  switch (status?.toLowerCase().replace(/\s/g, '_')) {
    case 'draft': 
      return 'bg-gray-100 text-gray-800 border-gray-300';
    case 'submitted': 
      return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    case 'project_lead_review': 
      return 'bg-orange-100 text-orange-800 border-orange-300';
    case 'project_lead_approved': 
      return 'bg-blue-100 text-blue-800 border-blue-300';
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

// shadcn/ui Components
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea'; // Menggantikan Chakra Textarea
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'; // Menggantikan Chakra Tabs

// Icons from lucide-react (Menggantikan react-icons/fi dan Spinner)
import { Check, X, Loader2, Info } from 'lucide-react';


const ProjectReview = ({ project, onApprove, onReject }) => {
  const router = useRouter();
  const { toast } = useToast();

  const [reviewNotes, setReviewNotes] = useState('');
  const [actionLoading, setActionLoading] = useState({});

  const handleApprove = async () => {
    setActionLoading(prev => ({ ...prev, approve: true }));
    try {
      await onApprove(project.id, reviewNotes);
      setReviewNotes('');
    } catch (err) {
      console.error('[ProjectReview] Approve error:', err);
      toast({
        title: 'Gagal menyetujui proyek.',
        description: err.message || 'Terjadi kesalahan saat menyetujui proyek.',
        variant: 'destructive', // Menggantikan status: 'error'
      });
    } finally {
      setActionLoading(prev => ({ ...prev, approve: false }));
    }
  };

  const handleReject = async () => {
    if (!window.confirm('Apakah Anda yakin ingin menolak proyek ini?')) {
      return;
    }

    setActionLoading(prev => ({ ...prev, reject: true }));
    try {
      await onReject(project.id, reviewNotes);
      setReviewNotes('');
    } catch (err) {
      console.error('[ProjectReview] Reject error:', err);
      toast({
        title: 'Gagal menolak proyek.',
        description: err.message || 'Terjadi kesalahan saat menolak proyek.',
        variant: 'destructive',
      });
    } finally {
      setActionLoading(prev => ({ ...prev, reject: false }));
    }
  };

  if (!project) {
    return (
      // Menggantikan Chakra Spinner
      <div className="flex justify-center items-center p-10">
        <Loader2 className="h-10 w-10 animate-spin text-blue-500" />
      </div>
    );
  }

  // Helper component untuk detail item
  const DetailItem = ({ label, value }) => (
    <div className="flex justify-between py-2 border-b last:border-b-0">
      <p className="font-semibold text-gray-700 dark:text-gray-300">{label}</p>
      <div className="text-gray-900 dark:text-gray-100 text-right">{value}</div>
    </div>
  );

  const canTakeAction = project.status === 'project_lead_approved';

  return (
    <div className="flex flex-col space-y-6">
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col space-y-4">
            
            {/* Header Info (Menggantikan HStack & VStack) */}
            <div className="flex justify-between items-start">
              <div className="flex flex-col space-y-1">
                <h1 className="text-xl font-bold text-blue-600 dark:text-blue-400">{project.name}</h1>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Klien: {project.client_name || '-'}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Alamat: {project.address || '-'}
                </p>
              </div>
              <Badge 
                variant="outline" 
                className={cn("text-lg font-semibold px-3 py-1", getStatusBadgeClass(project.status))}
              >
                {formatStatus(project.status)}
              </Badge>
            </div>

            <Separator className="my-4" />

            {/* Tabs Section */}
            <Tabs defaultValue="detail" className="w-full">
              {/* TabList */}
              <TabsList className="grid w-full grid-cols-4 h-auto">
                <TabsTrigger value="detail">Detail Proyek</TabsTrigger>
                <TabsTrigger value="team">Tim Proyek</TabsTrigger>
                <TabsTrigger value="inspection">Daftar Inspeksi</TabsTrigger>
                <TabsTrigger value="documents">Dokumen</TabsTrigger>
              </TabsList>
              
              {/* Tab Content: Detail Proyek */}
              <TabsContent value="detail" className="mt-4">
                <Card>
                  <CardContent className="p-4">
                    <h3 className="text-base font-semibold mb-4 border-b pb-2">Informasi Proyek</h3>
                    <div className="flex flex-col space-y-1">
                      <DetailItem label="ID Proyek" value={project.id} />
                      <DetailItem label="Nama Proyek" value={project.name} />
                      <DetailItem label="Klien" value={project.client_name || '-'} />
                      <DetailItem label="Alamat" value={project.address || '-'} />
                      <DetailItem 
                        label="Tanggal Dibuat" 
                        value={format(new Date(project.created_at), 'dd MMM yyyy', { locale: localeId })} 
                      />
                      <DetailItem 
                        label="Status" 
                        value={
                          <Badge variant="outline" className={cn("font-medium", getStatusBadgeClass(project.status))}>
                            {formatStatus(project.status)}
                          </Badge>
                        } 
                      />
                      <DetailItem 
                        label="Project Lead" 
                        value={project.profiles?.full_name || project.profiles?.email || 'N/A'} 
                      />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Tab Content: Placeholder Tabs */}
              <TabsContent value="team" className="mt-4">
                <Alert className="border-blue-500 bg-blue-50/50 text-blue-800 dark:border-blue-700 dark:bg-blue-900/50 dark:text-blue-200">
                  <Info className="h-4 w-4" />
                  <AlertTitle>Fitur ini sedang dikembangkan</AlertTitle>
                  <AlertDescription>
                    Menampilkan daftar tim proyek dan memungkinkan penambahan/penghapusan anggota.
                  </AlertDescription>
                </Alert>
              </TabsContent>
              
              <TabsContent value="inspection" className="mt-4">
                <Alert className="border-blue-500 bg-blue-50/50 text-blue-800 dark:border-blue-700 dark:bg-blue-900/50 dark:text-blue-200">
                  <Info className="h-4 w-4" />
                  <AlertTitle>Fitur ini sedang dikembangkan</AlertTitle>
                  <AlertDescription>
                    Menampilkan daftar inspeksi untuk proyek ini.
                  </AlertDescription>
                </Alert>
              </TabsContent>

              <TabsContent value="documents" className="mt-4">
                <Alert className="border-blue-500 bg-blue-50/50 text-blue-800 dark:border-blue-700 dark:bg-blue-900/50 dark:text-blue-200">
                  <Info className="h-4 w-4" />
                  <AlertTitle>Fitur ini sedang dikembangkan</AlertTitle>
                  <AlertDescription>
                    Menampilkan daftar dokumen terkait proyek ini.
                  </AlertDescription>
                </Alert>
              </TabsContent>
            </Tabs>


            <Separator className="my-4" />

            {/* Review & Approval Section */}
            <Card>
              <CardContent className="p-6">
                <div className="flex flex-col space-y-4">
                  <h3 className="text-lg font-bold text-blue-600 dark:text-blue-400">Review & Persetujuan</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Tambahkan catatan review Anda sebelum memberikan persetujuan. Catatan ini akan disimpan sebagai **Catatan Head Consultant** pada proyek.
                  </p>

                  <Textarea
                    value={reviewNotes}
                    onChange={(e) => setReviewNotes(e.target.value)}
                    placeholder="Tambahkan catatan review..."
                    rows={4}
                    className="min-h-[100px]"
                  />

                  <div className="flex justify-end space-x-3 pt-2">
                    <Button
                      variant="outline"
                      className="text-red-600 border-red-600 hover:bg-red-50 dark:hover:bg-red-900/50"
                      onClick={handleReject}
                      disabled={actionLoading.reject || !canTakeAction}
                    >
                      {actionLoading.reject && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                      <X className="w-4 h-4 mr-2" />
                      Tolak Proyek
                    </Button>
                    <Button
                      className="bg-green-600 hover:bg-green-700 text-white"
                      onClick={handleApprove}
                      disabled={actionLoading.approve || !canTakeAction}
                    >
                      {actionLoading.approve && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                      <Check className="w-4 h-4 mr-2" />
                      Setujui Proyek
                    </Button>
                  </div>
                  {!canTakeAction && (
                      <p className="text-xs text-right text-yellow-600 mt-1">
                          Aksi hanya tersedia saat status proyek adalah "**Project Lead Approved**". Status saat ini: {formatStatus(project.status)}.
                      </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProjectReview;