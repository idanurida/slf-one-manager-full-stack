// FILE: src/pages/dashboard/admin-lead/documents/index.js
// Halaman Dokumen Admin Lead - Clean dengan tab SLF/PBG
import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { toast } from 'sonner';

// UI Components
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger
} from '@/components/ui/tooltip';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle
} from '@/components/ui/dialog';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table';

// Icons
import {
  Search, FileText, Building, CheckCircle, Clock, AlertTriangle,
  Eye, RefreshCw, X, XCircle, Loader2, ExternalLink, AlertCircle
} from 'lucide-react';

// Utils & Context
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { supabase } from '@/utils/supabaseClient';
import { useAuth } from '@/context/AuthContext';

// Helpers
const formatDate = (dateString) => {
  if (!dateString) return '-';
  try {
    return format(new Date(dateString), 'dd MMM yyyy HH:mm', { locale: localeId });
  } catch (e) {
    return dateString;
  }
};

const getStatusBadge = (status) => {
  const config = {
    pending: { label: 'Menunggu', variant: 'secondary', icon: Clock },
    verified: { label: 'Terverifikasi', variant: 'default', icon: CheckCircle },
    approved: { label: 'Disetujui', variant: 'default', icon: CheckCircle },
    rejected: { label: 'Ditolak', variant: 'destructive', icon: XCircle },
  };
  const { label, variant, icon: Icon } = config[status] || { label: status, variant: 'secondary', icon: Clock };
  return (
    <Badge variant={variant} className="flex items-center gap-1">
      <Icon className="w-3 h-3" />
      {label}
    </Badge>
  );
};

// Document Row Component
const DocumentRow = ({ doc, onView, onVerify, isVerifying }) => {
  return (
    <TableRow className="hover:bg-muted/50">
      <TableCell className="font-medium">
        <div>
          <p className="font-semibold">{doc.name}</p>
          <p className="text-sm text-muted-foreground">{doc.document_type || '-'}</p>
        </div>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          <Building className="w-4 h-4 text-muted-foreground" />
          {doc.project_name || 'Belum ditautkan'}
        </div>
      </TableCell>
      <TableCell>{doc.uploader_name || '-'}</TableCell>
      <TableCell>{getStatusBadge(doc.status)}</TableCell>
      <TableCell className="text-sm text-muted-foreground">
        {formatDate(doc.created_at)}
      </TableCell>
      <TableCell>
        <div className="flex justify-end gap-1">
          {doc.url && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={() => window.open(doc.url, '_blank')}>
                  <ExternalLink className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Buka File</TooltipContent>
            </Tooltip>
          )}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={() => onView(doc)}>
                <Eye className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Detail</TooltipContent>
          </Tooltip>
          {(doc.status === 'pending' || doc.status === 'verified') && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => onVerify(doc)}
                  disabled={isVerifying}
                >
                  {isVerifying ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>Verifikasi</TooltipContent>
            </Tooltip>
          )}
        </div>
      </TableCell>
    </TableRow>
  );
};

export default function AdminLeadDocumentsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [activeTab, setActiveTab] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Dialogs
  const [viewDialog, setViewDialog] = useState({ open: false, doc: null });
  const [verifyDialog, setVerifyDialog] = useState({ open: false, doc: null });
  const [verifyNotes, setVerifyNotes] = useState('');

  // Fetch documents
  const fetchDocuments = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const { data: docs, error: docsError } = await supabase
        .from('documents')
        .select('*')
        .order('created_at', { ascending: false });

      if (docsError) throw docsError;

      // Fetch related data
      const [projectsRes, profilesRes] = await Promise.all([
        supabase.from('projects').select('id, name, application_type'),
        supabase.from('profiles').select('id, full_name')
      ]);

      const projectsMap = {};
      (projectsRes.data || []).forEach(p => { projectsMap[p.id] = p; });

      const profilesMap = {};
      (profilesRes.data || []).forEach(p => { profilesMap[p.id] = p; });

      const docsWithDetails = (docs || []).map(doc => ({
        ...doc,
        project_name: projectsMap[doc.project_id]?.name,
        application_type: projectsMap[doc.project_id]?.application_type || 'SLF',
        uploader_name: profilesMap[doc.created_by]?.full_name || '-'
      }));

      setDocuments(docsWithDetails);
    } catch (err) {
      console.error('Error fetching documents:', err);
      setError('Gagal memuat dokumen');
      toast.error('Gagal memuat dokumen');
    } finally {
      setLoading(false);
    }
  }, []);

  // Filter documents
  const filteredDocuments = documents.filter(doc => {
    // Tab filter
    if (activeTab === 'slf' && doc.application_type !== 'SLF') return false;
    if (activeTab === 'pbg' && doc.application_type !== 'PBG') return false;
    if (activeTab === 'pending' && doc.status !== 'pending' && doc.status !== 'verified') return false;

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      if (!doc.name?.toLowerCase().includes(term) && 
          !doc.project_name?.toLowerCase().includes(term) &&
          !doc.uploader_name?.toLowerCase().includes(term)) {
        return false;
      }
    }

    // Status filter
    if (statusFilter !== 'all' && doc.status !== statusFilter) return false;

    return true;
  });

  // Handle verification
  const handleVerify = async (action) => {
    if (!verifyDialog.doc) return;
    setVerifying(true);

    try {
      const newStatus = action === 'approve' ? 'approved' : 'rejected';
      
      const { error } = await supabase
        .from('documents')
        .update({
          status: newStatus,
          approved_by_id: action === 'approve' ? user.id : null,
          approved_at: action === 'approve' ? new Date().toISOString() : null,
          rejected_by_id: action === 'reject' ? user.id : null,
          rejected_at: action === 'reject' ? new Date().toISOString() : null,
          approval_notes: verifyNotes,
          rejection_reason: action === 'reject' ? verifyNotes : null,
        })
        .eq('id', verifyDialog.doc.id);

      if (error) throw error;

      toast.success(`Dokumen ${action === 'approve' ? 'disetujui' : 'ditolak'}`);
      setVerifyDialog({ open: false, doc: null });
      setVerifyNotes('');
      fetchDocuments();
    } catch (err) {
      console.error('Error verifying document:', err);
      toast.error('Gagal memperbarui status dokumen');
    } finally {
      setVerifying(false);
    }
  };

  useEffect(() => {
    if (!authLoading && user) {
      fetchDocuments();
    }
  }, [authLoading, user, fetchDocuments]);

  if (authLoading || loading) {
    return (
      <DashboardLayout title="Dokumen">
        <div className="p-6 space-y-4">
          <Skeleton className="h-10 w-full max-w-md" />
          <Skeleton className="h-64 w-full" />
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout title="Dokumen">
        <div className="p-6">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          <Button onClick={fetchDocuments} className="mt-4">
            <RefreshCw className="w-4 h-4 mr-2" />
            Coba Lagi
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  const pendingCount = documents.filter(d => d.status === 'pending' || d.status === 'verified').length;
  const slfCount = documents.filter(d => d.application_type === 'SLF').length;
  const pbgCount = documents.filter(d => d.application_type === 'PBG').length;

  return (
    <DashboardLayout title="Dokumen">
      <TooltipProvider>
        <div className="p-4 md:p-6 space-y-6">

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <TabsList>
                <TabsTrigger value="all">
                  Semua ({documents.length})
                </TabsTrigger>
                <TabsTrigger value="slf">
                  SLF ({slfCount})
                </TabsTrigger>
                <TabsTrigger value="pbg">
                  PBG ({pbgCount})
                </TabsTrigger>
                <TabsTrigger value="pending" className="relative">
                  Menunggu
                  {pendingCount > 0 && (
                    <Badge variant="destructive" className="ml-2">
                      {pendingCount}
                    </Badge>
                  )}
                </TabsTrigger>
              </TabsList>

              <Button 
                variant="outline" 
                onClick={() => router.push('/dashboard/admin-lead/pending-documents')}
              >
                Dokumen Client Baru
              </Button>
            </div>

            {/* Filters */}
            <Card className="mt-4">
              <CardContent className="pt-6">
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Cari nama dokumen, proyek, atau pengunggah..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-full md:w-[180px]">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Semua Status</SelectItem>
                      <SelectItem value="pending">Menunggu</SelectItem>
                      <SelectItem value="verified">Terverifikasi</SelectItem>
                      <SelectItem value="approved">Disetujui</SelectItem>
                      <SelectItem value="rejected">Ditolak</SelectItem>
                    </SelectContent>
                  </Select>
                  {(searchTerm || statusFilter !== 'all') && (
                    <Button variant="ghost" size="icon" onClick={() => { setSearchTerm(''); setStatusFilter('all'); }}>
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Documents Table */}
            <Card className="mt-4">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Daftar Dokumen ({filteredDocuments.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {filteredDocuments.length === 0 ? (
                  <div className="text-center py-12">
                    <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium mb-2">Tidak Ada Dokumen</h3>
                    <p className="text-muted-foreground">
                      {documents.length === 0 
                        ? 'Belum ada dokumen yang diupload'
                        : 'Tidak ada dokumen yang sesuai dengan filter'
                      }
                    </p>
                  </div>
                ) : (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Nama Dokumen</TableHead>
                          <TableHead>Proyek</TableHead>
                          <TableHead>Pengunggah</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Tanggal</TableHead>
                          <TableHead className="text-right">Aksi</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredDocuments.map((doc) => (
                          <DocumentRow
                            key={doc.id}
                            doc={doc}
                            onView={(d) => setViewDialog({ open: true, doc: d })}
                            onVerify={(d) => setVerifyDialog({ open: true, doc: d })}
                            isVerifying={verifying}
                          />
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </Tabs>

          {/* View Document Dialog */}
          <Dialog open={viewDialog.open} onOpenChange={(open) => setViewDialog({ open, doc: open ? viewDialog.doc : null })}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Detail Dokumen</DialogTitle>
              </DialogHeader>
              {viewDialog.doc && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium">Nama</Label>
                      <p className="text-sm">{viewDialog.doc.name}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Tipe</Label>
                      <p className="text-sm">{viewDialog.doc.document_type || '-'}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Proyek</Label>
                      <p className="text-sm">{viewDialog.doc.project_name || 'Belum ditautkan'}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Jenis Pengajuan</Label>
                      <Badge variant="outline">{viewDialog.doc.application_type || 'SLF'}</Badge>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Status</Label>
                      <div className="mt-1">{getStatusBadge(viewDialog.doc.status)}</div>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Tanggal Upload</Label>
                      <p className="text-sm">{formatDate(viewDialog.doc.created_at)}</p>
                    </div>
                  </div>
                  {viewDialog.doc.url && (
                    <Button className="w-full" onClick={() => window.open(viewDialog.doc.url, '_blank')}>
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Buka File
                    </Button>
                  )}
                </div>
              )}
              <DialogFooter>
                <Button variant="outline" onClick={() => setViewDialog({ open: false, doc: null })}>
                  Tutup
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Verify Document Dialog */}
          <Dialog open={verifyDialog.open} onOpenChange={(open) => { setVerifyDialog({ open, doc: open ? verifyDialog.doc : null }); if (!open) setVerifyNotes(''); }}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Verifikasi Dokumen</DialogTitle>
                <DialogDescription>
                  {verifyDialog.doc?.name}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Catatan</Label>
                  <Textarea
                    placeholder="Berikan catatan atau alasan..."
                    value={verifyNotes}
                    onChange={(e) => setVerifyNotes(e.target.value)}
                    className="mt-2"
                  />
                </div>
              </div>
              <DialogFooter className="gap-2 sm:gap-0">
                <Button variant="outline" onClick={() => setVerifyDialog({ open: false, doc: null })}>
                  Batal
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => handleVerify('reject')}
                  disabled={verifying}
                >
                  {verifying ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <XCircle className="w-4 h-4 mr-2" />}
                  Tolak
                </Button>
                <Button
                  onClick={() => handleVerify('approve')}
                  disabled={verifying}
                >
                  {verifying ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle className="w-4 h-4 mr-2" />}
                  Setujui
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

        </div>
      </TooltipProvider>
    </DashboardLayout>
  );
}
