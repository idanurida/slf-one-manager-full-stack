// src/components/head-consultant/projects/ProjectList.js
"use client";

import React from 'react';
import { supabase } from '@/utils/supabaseClient';
import { useRouter } from 'next/router';
import { useToast } from '@/components/ui/use-toast'; 
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
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

// Icons from lucide-react (Menggantikan react-icons/fi)
import { Search, Eye, Check, X, Filter, Loader2, Info, RotateCw } from 'lucide-react';


// Peta status ke class Tailwind untuk Badge
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

const ProjectList = ({ projects, loading, onApprove, onReject, onViewDetail }) => {
  const router = useRouter();
  const { toast } = useToast();

  const [filteredProjects, setFilteredProjects] = React.useState(projects);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [selectedStatus, setSelectedStatus] = React.useState('');
  const [projectLeads, setProjectLeads] = React.useState([]);
  const [selectedProjectLead, setSelectedProjectLead] = React.useState('');
  const [plLoading, setPlLoading] = React.useState(true);


  // ✅ Filter projects logic
  React.useEffect(() => {
    let result = projects;

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(p =>
        p.name?.toLowerCase().includes(term) ||
        p.client_name?.toLowerCase().includes(term) ||
        p.address?.toLowerCase().includes(term)
      );
    }

    if (selectedStatus) {
      result = result.filter(p => p.status === selectedStatus);
    }

    if (selectedProjectLead) {
      result = result.filter(p => p.project_lead_id === selectedProjectLead);
    }

    setFilteredProjects(result);
  }, [searchTerm, selectedStatus, selectedProjectLead, projects]);

  // ✅ Fetch project leads for filter
  React.useEffect(() => {
    const fetchProjectLeads = async () => {
      setPlLoading(true);
      try {
        const { data: projectLeadData, error: projectLeadError } = await supabase
          .from('profiles')
          .select('id, full_name, email')
          .eq('role', 'project_lead');

        if (projectLeadError) throw projectLeadError;
        setProjectLeads(projectLeadData || []);
      } catch (err) {
        console.error('[ProjectList] Fetch project leads error:', err);
        toast({
          title: 'Gagal memuat daftar project lead.',
          description: err.message || 'Terjadi kesalahan saat memuat daftar project lead.',
          variant: 'destructive',
        });
        setProjectLeads([]);
      } finally {
        setPlLoading(false);
      }
    };

    fetchProjectLeads();
  }, [toast]);

  const resetFilters = () => {
    setSearchTerm('');
    setSelectedStatus('');
    setSelectedProjectLead('');
  };

  // Handler untuk Select (shadcn/ui menggunakan string value)
  const handleStatusChange = (value) => {
    setSelectedStatus(value === '' ? '' : value);
  };
  
  const handleProjectLeadChange = (value) => {
    setSelectedProjectLead(value === '' ? '' : value);
  };


  if (loading) {
    return (
      <div className="flex justify-center items-center p-10">
        <Loader2 className="h-10 w-10 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="flex flex-col space-y-6">
        {/* Filter Card */}
        <Card className="shadow-sm">
          <CardContent className="p-4">
            <div className="flex flex-wrap items-center gap-4">
              {/* Search Input */}
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Cari nama proyek, klien, atau alamat..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Status Filter */}
              <Select
                value={selectedStatus}
                onValueChange={handleStatusChange}
              >
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Filter Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="no-option">Semua Status</SelectItem>
                  <SelectItem value="project_lead_approved">Project Lead Approved</SelectItem>
                  <SelectItem value="head_consultant_review">Head Consultant Review</SelectItem>
                  <SelectItem value="head_consultant_approved">Head Consultant Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>

              {/* Project Lead Filter */}
              <Select
                value={selectedProjectLead}
                onValueChange={handleProjectLeadChange}
                disabled={plLoading}
              >
                <SelectTrigger className="w-[200px]">
                  {plLoading ? (
                    <div className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span className="text-gray-500">Memuat Lead...</span>
                    </div>
                  ) : (
                    <SelectValue placeholder="Filter Project Lead" />
                  )}
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="no-option">Semua Project Lead</SelectItem>
                  {projectLeads.map(pl => (
                    <SelectItem key={pl.id} value={pl.id}>
                      {pl.full_name || pl.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Reset Button */}
              <Button
                onClick={resetFilters}
                disabled={!searchTerm && !selectedStatus && !selectedProjectLead}
                variant="outline"
                className="text-gray-600 hover:bg-gray-100 border-gray-300"
              >
                <X className="h-4 w-4 mr-2" />
                Reset
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Project List Card */}
        <Card>
          <CardContent className="p-6">
            <h2 className="text-xl font-bold mb-4 text-gray-800">Daftar Proyek</h2>
            {filteredProjects.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-gray-50">
                    <TableRow>
                      <TableHead className="w-[20%]">Nama Proyek</TableHead>
                      <TableHead className="w-[15%]">Klien</TableHead>
                      <TableHead className="w-[20%]">Alamat</TableHead>
                      <TableHead className="w-[15%]">Project Lead</TableHead>
                      <TableHead className="w-[10%]">Status</TableHead>
                      <TableHead className="w-[10%]">Tanggal</TableHead>
                      <TableHead className="w-[10%]">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredProjects.map((project) => (
                      <TableRow key={project.id} className="hover:bg-gray-50">
                        <TableCell>
                          <p className="font-semibold text-sm">{project.name}</p>
                        </TableCell>
                        <TableCell className="text-sm">{project.client_name || '-'}</TableCell>
                        <TableCell className="text-sm">{project.address || '-'}</TableCell>
                        <TableCell>
                          <p className="text-sm">
                            {project.profiles?.full_name || project.profiles?.email || 'N/A'}
                          </p>
                        </TableCell>
                        <TableCell>
                          <Badge 
                              variant="outline" 
                              className={cn("border font-semibold", getStatusBadgeClass(project.status))}
                          >
                            {formatStatus(project.status)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">
                          {format(new Date(project.created_at), 'dd MMM yyyy', { locale: localeId })}
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  size="icon"
                                  variant="outline"
                                  className="h-8 w-8 text-blue-600 border-blue-300 hover:bg-blue-50"
                                  onClick={() => onViewDetail(project.id)}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Lihat Detail</TooltipContent>
                            </Tooltip>
                            
                            {/* Actions for 'project_lead_approved' status */}
                            {project.status === 'project_lead_approved' && (
                              <>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      size="icon"
                                      variant="outline"
                                      className="h-8 w-8 text-green-600 border-green-300 hover:bg-green-50"
                                      onClick={() => onApprove(project.id)}
                                    >
                                      <Check className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Setujui</TooltipContent>
                                </Tooltip>
                                
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      size="icon"
                                      variant="outline"
                                      className="h-8 w-8 text-red-600 border-red-300 hover:bg-red-50"
                                      onClick={() => onReject(project.id)}
                                    >
                                      <X className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Tolak</TooltipContent>
                                </Tooltip>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <Alert variant="default" className="border-blue-500 bg-blue-50/50 text-blue-800">
                <Info className="h-4 w-4" />
                <AlertTitle>Informasi</AlertTitle>
                <AlertDescription>
                  Tidak ditemukan proyek yang sesuai dengan filter.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  );
};

export default ProjectList;
