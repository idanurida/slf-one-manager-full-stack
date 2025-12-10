// FILE: src/pages/dashboard/admin-lead/pending-documents.js
// Halaman untuk Admin Lead melihat dokumen client yang belum di-link ke project
// dan membuat project baru serta link dokumen tersebut

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

// Components
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

// Icons
import {
  Search, FileText, Building, Users, CheckCircle2, Clock, 
  AlertTriangle, Eye, RefreshCw, Calendar, User, ArrowRight, 
  X, CheckCircle, Loader2, FolderOpen, AlertCircle, Info,
  Plus, Link2, ExternalLink, FileCheck, Mail, Phone, MapPin,
  Download, Trash2, Edit, ArrowLeft
} from 'lucide-react';

// Utils & Context
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { supabase } from '@/utils/supabaseClient';
import { useAuth } from '@/context/AuthContext';

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { duration: 0.5, ease: "easeOut" } }
};

// Format date helper
const formatDate = (dateString) => {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

// Format file size
const formatFileSize = (bytes) => {
  if (!bytes) return '-';
  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(2)} MB`;
};

export default function PendingDocumentsPage() {
  const router = useRouter();
  const { user, profile, loading: authLoading } = useAuth();

  // States
  const [loading, setLoading] = useState(true);
  const [pendingDocuments, setPendingDocuments] = useState([]);
  const [groupedByClient, setGroupedByClient] = useState({});
  const [clients, setClients] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClient, setSelectedClient] = useState(null);
  const [selectedDocuments, setSelectedDocuments] = useState([]);
  
  // Dialog states
  const [createProjectDialog, setCreateProjectDialog] = useState(false);
  const [linkToProjectDialog, setLinkToProjectDialog] = useState(false);
  const [viewDocumentDialog, setViewDocumentDialog] = useState({ open: false, document: null });
  const [existingProjects, setExistingProjects] = useState([]);
  const [selectedProjectToLink, setSelectedProjectToLink] = useState('');
  
  // New project form
  const [projectForm, setProjectForm] = useState({
    name: '',
    address: '',
    city: '',
    description: '',
    application_type: 'SLF',
    client_id: ''
  });
  const [creating, setCreating] = useState(false);

  // Fetch pending documents (documents without project_id)
  const fetchPendingDocuments = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch documents tanpa project_id
      const { data: docs, error } = await supabase
        .from('documents')
        .select(`
          *,
          profiles:created_by (
            id,
            full_name,
            email,
            phone_number,
            client_id
          )
        `)
        .is('project_id', null)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setPendingDocuments(docs || []);

      // Group by client (created_by)
      const grouped = (docs || []).reduce((acc, doc) => {
        const clientId = doc.created_by;
        if (!acc[clientId]) {
          acc[clientId] = {
            client: doc.profiles,
            documents: [],
            buildingInfo: null,
            applicationType: null
          };
        }
        acc[clientId].documents.push(doc);
        
        // Get building info from first document metadata
        if (doc.metadata?.building_info && !acc[clientId].buildingInfo) {
          acc[clientId].buildingInfo = doc.metadata.building_info;
        }
        if (doc.metadata?.application_type && !acc[clientId].applicationType) {
          acc[clientId].applicationType = doc.metadata.application_type;
        }
        
        return acc;
      }, {});

      setGroupedByClient(grouped);

    } catch (error) {
      console.error('Error fetching pending documents:', error);
      toast.error('Gagal memuat dokumen pending');
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch clients for dropdown
  const fetchClients = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .order('name');

      if (error) throw error;
      setClients(data || []);
    } catch (error) {
      console.error('Error fetching clients:', error);
    }
  }, []);

  // Fetch existing projects for linking
  const fetchExistingProjects = useCallback(async (clientId) => {
    if (!clientId) return;
    
    try {
      // Get client_id from profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('client_id')
        .eq('id', clientId)
        .single();

      if (profileData?.client_id) {
        const { data, error } = await supabase
          .from('projects')
          .select('*')
          .eq('client_id', profileData.client_id)
          .order('created_at', { ascending: false });

        if (error) throw error;
        setExistingproject_id;
      }
    } catch (error) {
      console.error('Error fetching projects:', error);
    }
  }, []);

  // Create new project and link documents
  const handleCreateProject = async () => {
    if (!projectForm.name || !selectedClient) {
      toast.error('Nama proyek harus diisi');
      return;
    }

    setCreating(true);
    try {
      // Get client_id from profile
      const clientData = groupedByClient[selectedClient];
      const clientProfileId = clientData?.client?.client_id;

      // Create project
      const { data: newProject, error: projectError } = await supabase
        .from('projects')
        .insert([{
          name: projectForm.name,
          address: projectForm.address || clientData?.buildingInfo?.buildingAddress,
          city: projectForm.city || clientData?.buildingInfo?.buildingCity,
          description: projectForm.description || clientData?.buildingInfo?.notes,
          application_type: projectForm.application_type || clientData?.applicationType || 'SLF',
          client_id: clientProfileId,
          admin_lead_id: user.id,
          status: 'draft',
          created_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (projectError) throw projectError;

      // Link selected documents to project
      const docsToLink = selectedDocuments.length > 0 
        ? selectedDocuments 
        : clientData.documents.map(d => d.id);

      const { error: updateError } = await supabase
        .from('documents')
        .update({ project_id: newProject.id })
        .in('id', docsToLink);

      if (updateError) throw updateError;

      // Create notification for client
      await supabase.from('notifications').insert([{
        recipient_id: selectedClient,
        sender_id: user.id,
        type: 'project_created',
        message: `Proyek "${projectForm.name}" telah dibuat untuk pengajuan ${projectForm.application_type} Anda. Dokumen Anda telah ditautkan ke proyek ini.`,
        read: false,
        project_id: newProject.id,
        created_at: new Date().toISOString()
      }]);

      toast.success(`Proyek "${projectForm.name}" berhasil dibuat dan ${docsToLink.length} dokumen telah ditautkan`);
      
      // Reset and refresh
      setCreateProjectDialog(false);
      setSelectedClient(null);
      setSelectedDocuments([]);
      setProjectForm({
        name: '',
        address: '',
        city: '',
        description: '',
        application_type: 'SLF',
        client_id: ''
      });
      await fetchPendingDocuments();

      // Redirect to project detail
      router.push(`/dashboard/admin-lead/projects/${newProject.id}`);

    } catch (error) {
      console.error('Error creating project:', error);
      toast.error(`Gagal membuat proyek: ${error.message}`);
    } finally {
      setCreating(false);
    }
  };

  // Link documents to existing project
  const handleLinkToProject = async () => {
    if (!selectedProjectToLink || selectedDocuments.length === 0) {
      toast.error('Pilih proyek dan dokumen yang akan ditautkan');
      return;
    }

    setCreating(true);
    try {
      const { error } = await supabase
        .from('documents')
        .update({ project_id: selectedProjectToLink })
        .in('id', selectedDocuments);

      if (error) throw error;

      // Get project name
      const project = existingProjects.find(p => p.id === selectedProjectToLink);

      // Notify client
      if (selectedClient) {
        await supabase.from('notifications').insert([{
          recipient_id: selectedClient,
          sender_id: user.id,
          type: 'documents_linked',
          message: `${selectedDocuments.length} dokumen Anda telah ditautkan ke proyek "${project?.name}"`,
          read: false,
          project_id: selectedProjectToLink,
          created_at: new Date().toISOString()
        }]);
      }

      toast.success(`${selectedDocuments.length} dokumen berhasil ditautkan ke proyek "${project?.name}"`);
      
      setLinkToProjectDialog(false);
      setSelectedDocuments([]);
      setSelectedProjectToLink('');
      await fetchPendingDocuments();

    } catch (error) {
      console.error('Error linking documents:', error);
      toast.error(`Gagal menautkan dokumen: ${error.message}`);
    } finally {
      setCreating(false);
    }
  };

  // Toggle document selection
  const toggleDocumentSelection = (docId) => {
    setSelectedDocuments(prev => 
      prev.includes(docId) 
        ? prev.filter(id => id !== docId)
        : [...prev, docId]
    );
  };

  // Select all documents from a client
  const selectAllFromClient = (clientId) => {
    const clientDocs = groupedByClient[clientId]?.documents || [];
    const allSelected = clientDocs.every(d => selectedDocuments.includes(d.id));
    
    if (allSelected) {
      setSelectedDocuments(prev => prev.filter(id => !clientDocs.some(d => d.id === id)));
    } else {
      const newSelected = [...selectedDocuments];
      clientDocs.forEach(d => {
        if (!newSelected.includes(d.id)) newSelected.push(d.id);
      });
      setSelectedDocuments(newSelected);
    }
  };

  // Open create project dialog
  const openCreateProjectDialog = (clientId) => {
    setSelectedClient(clientId);
    const clientData = groupedByClient[clientId];
    
    // Pre-fill form with building info
    setProjectForm({
      name: clientData?.buildingInfo?.buildingName || '',
      address: clientData?.buildingInfo?.buildingAddress || '',
      city: clientData?.buildingInfo?.buildingCity || '',
      description: clientData?.buildingInfo?.notes || '',
      application_type: clientData?.applicationType || 'SLF',
      client_id: clientData?.client?.client_id || ''
    });
    
    // Select all documents from this client
    setSelectedDocuments(clientData?.documents.map(d => d.id) || []);
    setCreateProjectDialog(true);
  };

  // Open link to project dialog
  const openLinkToProjectDialog = (clientId) => {
    setSelectedClient(clientId);
    fetchExistingproject_id;
    setSelectedDocuments(groupedByClient[clientId]?.documents.map(d => d.id) || []);
    setLinkToProjectDialog(true);
  };

  // Filter clients by search
  const filteredClients = Object.entries(groupedByClient).filter(([clientId, data]) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      data.client?.full_name?.toLowerCase().includes(query) ||
      data.client?.email?.toLowerCase().includes(query) ||
      data.buildingInfo?.buildingName?.toLowerCase().includes(query) ||
      data.buildingInfo?.buildingCity?.toLowerCase().includes(query)
    );
  });

  useEffect(() => {
    if (!authLoading && user) {
      fetchPendingDocuments();
      fetchClients();
    }
  }, [authLoading, user, fetchPendingDocuments, fetchClients]);

  if (authLoading) {
    return (
      <DashboardLayout title="Dokumen Pending">
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  const totalPendingDocs = pendingDocuments.length;
  const totalClients = Object.keys(groupedByClient).length;

  return (
    <DashboardLayout title="Dokumen Pending">
      <motion.div
        className="space-y-6"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Header */}
        <motion.div variants={itemVariants} className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => router.back()}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Dokumen Pending</h1>
              <p className="text-muted-foreground">
                Dokumen dari client yang belum di-link ke proyek
              </p>
            </div>
          </div>
          <Button onClick={fetchPendingDocuments} variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </motion.div>

        {/* Stats */}
        <motion.div variants={itemVariants} className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                  <FileText className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{totalPendingDocs}</p>
                  <p className="text-sm text-muted-foreground">Total Dokumen Pending</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
                  <Users className="w-6 h-6 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{totalClients}</p>
                  <p className="text-sm text-muted-foreground">Client Menunggu</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                  <Clock className="w-6 h-6 text-orange-600 dark:text-orange-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{selectedDocuments.length}</p>
                  <p className="text-sm text-muted-foreground">Dokumen Dipilih</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Search */}
        <motion.div variants={itemVariants}>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Cari berdasarkan nama client, email, atau nama bangunan..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </motion.div>

        {/* Content */}
        <motion.div variants={itemVariants}>
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <Skeleton key={i} className="h-48" />
              ))}
            </div>
          ) : totalClients === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <CheckCircle2 className="w-12 h-12 mx-auto text-green-500 mb-4" />
                <h3 className="text-lg font-semibold mb-2">Tidak Ada Dokumen Pending</h3>
                <p className="text-muted-foreground">
                  Semua dokumen client sudah ditautkan ke proyek
                </p>
              </CardContent>
            </Card>
          ) : (
            <Accordion type="multiple" className="space-y-4">
              {filteredClients.map(([clientId, data]) => {
                const allSelected = data.documents.every(d => selectedDocuments.includes(d.id));
                const someSelected = data.documents.some(d => selectedDocuments.includes(d.id));

                return (
                  <AccordionItem key={clientId} value={clientId} className="border rounded-lg">
                    <AccordionTrigger className="px-4 hover:no-underline">
                      <div className="flex items-center justify-between w-full pr-4">
                        <div className="flex items-center gap-4">
                          <div className="p-2 bg-primary/10 rounded-full">
                            <User className="w-5 h-5 text-primary" />
                          </div>
                          <div className="text-left">
                            <p className="font-semibold">{data.client?.full_name || 'Unknown Client'}</p>
                            <p className="text-sm text-muted-foreground">{data.client?.email}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge variant="secondary">
                            {data.documents.length} dokumen
                          </Badge>
                          <Badge variant={data.applicationType === 'PBG' ? 'default' : 'outline'}>
                            {data.applicationType || 'SLF'}
                          </Badge>
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-4 pb-4">
                      {/* Building Info */}
                      {data.buildingInfo && (
                        <Alert className="mb-4">
                          <Building className="w-4 h-4" />
                          <AlertTitle>Informasi Bangunan</AlertTitle>
                          <AlertDescription>
                            <div className="grid gap-2 mt-2 text-sm">
                              {data.buildingInfo.buildingName && (
                                <div className="flex gap-2">
                                  <span className="font-medium">Nama:</span>
                                  <span>{data.buildingInfo.buildingName}</span>
                                </div>
                              )}
                              {data.buildingInfo.buildingAddress && (
                                <div className="flex gap-2">
                                  <span className="font-medium">Alamat:</span>
                                  <span>{data.buildingInfo.buildingAddress}</span>
                                </div>
                              )}
                              {data.buildingInfo.buildingCity && (
                                <div className="flex gap-2">
                                  <span className="font-medium">Kota:</span>
                                  <span>{data.buildingInfo.buildingCity}</span>
                                </div>
                              )}
                              {data.buildingInfo.notes && (
                                <div className="flex gap-2">
                                  <span className="font-medium">Catatan:</span>
                                  <span>{data.buildingInfo.notes}</span>
                                </div>
                              )}
                            </div>
                          </AlertDescription>
                        </Alert>
                      )}

                      {/* Actions */}
                      <div className="flex flex-wrap gap-2 mb-4">
                        <Button onClick={() => openCreateProjectDialog(clientId)}>
                          <Plus className="w-4 h-4 mr-2" />
                          Buat Proyek Baru
                        </Button>
                        <Button variant="outline" onClick={() => openLinkToProjectDialog(clientId)}>
                          <Link2 className="w-4 h-4 mr-2" />
                          Tautkan ke Proyek
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => selectAllFromClient(clientId)}
                        >
                          <Checkbox checked={allSelected} className="mr-2" />
                          {allSelected ? 'Batal Pilih Semua' : 'Pilih Semua'}
                        </Button>
                      </div>

                      {/* Documents Table */}
                      <div className="border rounded-lg overflow-hidden">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-12">
                                <Checkbox 
                                  checked={allSelected}
                                  onCheckedChange={() => selectAllFromClient(clientId)}
                                />
                              </TableHead>
                              <TableHead>Dokumen</TableHead>
                              <TableHead>Kategori</TableHead>
                              <TableHead>Format</TableHead>
                              <TableHead>Tanggal Upload</TableHead>
                              <TableHead className="text-right">Aksi</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {data.documents.map(doc => (
                              <TableRow key={doc.id}>
                                <TableCell>
                                  <Checkbox 
                                    checked={selectedDocuments.includes(doc.id)}
                                    onCheckedChange={() => toggleDocumentSelection(doc.id)}
                                  />
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    <FileText className="w-4 h-4 text-primary" />
                                    <div>
                                      <p className="font-medium">{doc.name}</p>
                                      <p className="text-xs text-muted-foreground">
                                        {doc.metadata?.original_name}
                                      </p>
                                    </div>
                                    {doc.metadata?.required && (
                                      <Badge variant="destructive" className="text-xs">Wajib</Badge>
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <Badge variant="outline">
                                    {doc.metadata?.category || '-'}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <span className="uppercase text-xs font-mono">
                                    {doc.type}
                                  </span>
                                  <span className="text-xs text-muted-foreground ml-2">
                                    ({formatFileSize(doc.metadata?.size)})
                                  </span>
                                </TableCell>
                                <TableCell className="text-sm">
                                  {formatDate(doc.created_at)}
                                </TableCell>
                                <TableCell className="text-right">
                                  <div className="flex justify-end gap-1">
                                    <TooltipProvider>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <Button 
                                            variant="ghost" 
                                            size="icon"
                                            onClick={() => window.open(doc.url, '_blank')}
                                          >
                                            <Eye className="w-4 h-4" />
                                          </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>Lihat Dokumen</TooltipContent>
                                      </Tooltip>
                                    </TooltipProvider>
                                    <TooltipProvider>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <Button 
                                            variant="ghost" 
                                            size="icon"
                                            onClick={() => {
                                              const link = document.createElement('a');
                                              link.href = doc.url;
                                              link.download = doc.metadata?.original_name || doc.name;
                                              link.click();
                                            }}
                                          >
                                            <Download className="w-4 h-4" />
                                          </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>Download</TooltipContent>
                                      </Tooltip>
                                    </TooltipProvider>
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          )}
        </motion.div>

        {/* Create Project Dialog */}
        <Dialog open={createProjectDialog} onOpenChange={setCreateProjectDialog}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Buat Proyek Baru</DialogTitle>
              <DialogDescription>
                Buat proyek baru dan tautkan dokumen client yang dipilih
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {/* Selected documents count */}
              <Alert>
                <FileCheck className="w-4 h-4" />
                <AlertTitle>{selectedDocuments.length} Dokumen Akan Ditautkan</AlertTitle>
                <AlertDescription>
                  Dokumen yang dipilih akan otomatis ditautkan ke proyek ini setelah dibuat
                </AlertDescription>
              </Alert>

              <div className="grid gap-4">
                <div className="space-y-2">
                  <Label htmlFor="projectName">Nama Proyek *</Label>
                  <Input
                    id="projectName"
                    placeholder="Contoh: Gedung Kantor ABC"
                    value={projectForm.name}
                    onChange={(e) => setProjectForm({...projectForm, name: e.target.value})}
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="city">Kota</Label>
                    <Input
                      id="city"
                      placeholder="Jakarta Selatan"
                      value={projectForm.city}
                      onChange={(e) => setProjectForm({...projectForm, city: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="appType">Jenis Pengajuan</Label>
                    <Select 
                      value={projectForm.application_type} 
                      onValueChange={(v) => setProjectForm({...projectForm, application_type: v})}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="SLF">SLF</SelectItem>
                        <SelectItem value="PBG">PBG</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address">Alamat</Label>
                  <Textarea
                    id="address"
                    placeholder="Alamat lengkap bangunan"
                    value={projectForm.address}
                    onChange={(e) => setProjectForm({...projectForm, address: e.target.value})}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Deskripsi/Catatan</Label>
                  <Textarea
                    id="description"
                    placeholder="Catatan tambahan..."
                    value={projectForm.description}
                    onChange={(e) => setProjectForm({...projectForm, description: e.target.value})}
                  />
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateProjectDialog(false)} disabled={creating}>
                Batal
              </Button>
              <Button onClick={handleCreateProject} disabled={creating || !projectForm.name}>
                {creating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Membuat...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 mr-2" />
                    Buat Proyek
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Link to Existing Project Dialog */}
        <Dialog open={linkToProjectDialog} onOpenChange={setLinkToProjectDialog}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Tautkan ke Proyek</DialogTitle>
              <DialogDescription>
                Pilih proyek yang sudah ada untuk menautkan dokumen
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <Alert>
                <FileCheck className="w-4 h-4" />
                <AlertTitle>{selectedDocuments.length} Dokumen Dipilih</AlertTitle>
              </Alert>

              <div className="space-y-2">
                <Label>Pilih Proyek</Label>
                {existingProjects.length === 0 ? (
                  <Alert variant="destructive">
                    <AlertCircle className="w-4 h-4" />
                    <AlertDescription>
                      Tidak ada proyek untuk client ini. Silakan buat proyek baru.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <Select value={selectedProjectToLink} onValueChange={setSelectedProjectToLink}>
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih proyek..." />
                    </SelectTrigger>
                    <SelectContent>
                      {existingProjects.map(project => (
                        <SelectItem key={project.id} value={project.id}>
                          <div className="flex items-center gap-2">
                            <Building className="w-4 h-4" />
                            <span>{project.name}</span>
                            <Badge variant="outline" className="ml-2">
                              {project.application_type || 'SLF'}
                            </Badge>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setLinkToProjectDialog(false)} disabled={creating}>
                Batal
              </Button>
              <Button 
                onClick={handleLinkToProject} 
                disabled={creating || !selectedProjectToLink || selectedDocuments.length === 0}
              >
                {creating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Menautkan...
                  </>
                ) : (
                  <>
                    <Link2 className="w-4 h-4 mr-2" />
                    Tautkan Dokumen
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </motion.div>
    </DashboardLayout>
  );
}
