import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';

import {
  FileText,
  Search,
  Building,
  Camera,
  MapPin,
  CheckCircle,
  AlertTriangle,
  Info,
  Eye,
  Loader2,
  Shield,
  AlertCircle
} from 'lucide-react';

import DashboardLayout from '@/components/layouts/DashboardLayout';
import { useAuth } from '@/context/AuthContext';
import { getChecklistsBySpecialization, itemRequiresPhotogeotag, getPhotoRequirements, INSPECTOR_SPECIALIZATIONS } from '@/utils/checklistTemplates';

export default function InspectorTemplates() {
  const router = useRouter();
  const { toast } = useToast();
  const { user, profile, loading: authLoading, isInspector } = useAuth();

  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterCategory, setFilterCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [buildingType, setBuildingType] = useState('baru');
  const [expandedItems, setExpandedItems] = useState({});

  useEffect(() => {
    const loadTemplates = async () => {
      if (!profile?.specialization) return;

      try {
        setLoading(true);
        
        // Gunakan fungsi dari checklistTemplates.js untuk mendapatkan template berdasarkan spesialisasi
        const specializationTemplates = getChecklistsBySpecialization(
          profile.specialization, 
          buildingType
        );
        
        setTemplates(specializationTemplates);
      } catch (err) {
        console.error('Error loading templates:', err);
        toast({
          title: "Gagal memuat template",
          description: err.message,
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    if (profile?.specialization) {
      loadTemplates();
    }
  }, [profile?.specialization, buildingType, toast]);

  // Filter templates berdasarkan kategori dan pencarian
  const filteredTemplates = templates.filter(template => {
    const matchesCategory = filterCategory === 'all' || template.category === filterCategory;
    const matchesSearch = 
      template.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.description?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // 🔥 PERBAIKAN: Dapatkan kategori unik untuk filter
  const categories = [...new Set(templates.map(template => template.category))];

  const getCategoryBadge = (category) => {
    const categoryConfig = {
      administrative: { label: 'Administratif', color: 'bg-gray-100 text-gray-800' },
      tata_bangunan: { label: 'Tata Bangunan', color: 'bg-blue-100 text-blue-800' },
      keandalan: { label: 'Keandalan', color: 'bg-green-100 text-green-800' },
      keselamatan: { label: 'Keselamatan', color: 'bg-orange-100 text-orange-800' }
    };
    
    const config = categoryConfig[category] || { label: category, color: 'bg-gray-100 text-gray-800' };
    
    return (
      <Badge variant="outline" className={config.color}>
        {config.label}
      </Badge>
    );
  };

  const getBuildingTypeLabel = (type) => {
    const types = {
      baru: 'Bangunan Baru',
      existing: 'Bangunan Existing',
      perubahan_fungsi: 'Perubahan Fungsi',
      perpanjangan_slf: 'Perpanjangan SLF',
      pascabencana: 'Pasca Bencana'
    };
    return types[type] || type;
  };

  const getApplicableForBadges = (template) => {
    if (!template.applicable_for || template.applicable_for.length === 0) {
      return <Badge variant="outline">Semua Tipe</Badge>;
    }
    
    return template.applicable_for.map(type => (
      <Badge key={type} variant="secondary" className="text-xs">
        {getBuildingTypeLabel(type)}
      </Badge>
    ));
  };

  const toggleItemExpansion = (templateId, subsectionId = null) => {
    const key = subsectionId ? `${templateId}-${subsectionId}` : templateId;
    setExpandedItems(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const getTotalItems = (template) => {
    let count = 0;
    
    if (template.items) {
      count += template.items.length;
    }
    
    if (template.subsections) {
      template.subsections.forEach(subsection => {
        count += subsection.items?.length || 0;
      });
    }
    
    return count;
  };

  const getPhotogeotagInfo = (template) => {
    const requirements = getPhotoRequirements(template.id);
    const requiresGeotag = itemRequiresPhotogeotag(template.id);
    
    return {
      requiresGeotag,
      minPhotos: requirements.min_photos || 0,
      maxPhotos: requirements.max_photos || 10,
      requiredShots: requirements.required_shots || []
    };
  };

  if (authLoading) {
    return (
      <DashboardLayout title="Daftar Simak">
        <div className="flex flex-col items-center justify-center min-h-[400px] p-8">
          <Loader2 className="w-8 w-8 animate-spin text-primary" />
          <p className="mt-4 text-muted-foreground">Memuat daftar simak...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (!user || !isInspector) {
    return (
      <DashboardLayout title="Daftar Simak">
        <div className="p-4 md:p-6">
          <Alert variant="destructive">
            <AlertTitle>Akses Ditolak</AlertTitle>
            <AlertDescription>
              Hanya inspector yang dapat mengakses halaman ini.
            </AlertDescription>
          </Alert>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Daftar Simak">
      <div className="p-4 md:p-6 space-y-4">
        {/* Sub-header dengan info dan actions */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div className="flex items-center gap-3">
            <Badge variant="default" className="capitalize text-xs bg-primary">
              {INSPECTOR_SPECIALIZATIONS.find(s => s.value === profile?.specialization)?.label || profile?.specialization?.replace(/_/g, ' ') || 'General'}
            </Badge>
            <span className="text-sm text-muted-foreground">
              {templates.length} template tersedia
            </span>
          </div>
          <Button
            onClick={() => router.push('/dashboard/inspector/checklist')}
            variant="default"
            size="sm"
            className="flex items-center gap-2"
          >
            <Eye className="h-4 w-4" />
            Buka Checklist
          </Button>
        </div>

        {/* Info Specialization */}
        <Alert className="border-primary/20 bg-primary/5">
          <Info className="h-4 w-4 text-primary" />
          <AlertDescription>
            Menampilkan daftar simak untuk spesialisasi <strong>{INSPECTOR_SPECIALIZATIONS.find(s => s.value === profile?.specialization)?.label || profile?.specialization?.replace(/_/g, ' ') || 'General'}</strong>
            {INSPECTOR_SPECIALIZATIONS.find(s => s.value === profile?.specialization)?.description && 
              ` (${INSPECTOR_SPECIALIZATIONS.find(s => s.value === profile?.specialization)?.description})`}.
            Tipe bangunan: <strong>{getBuildingTypeLabel(buildingType)}</strong>.
          </AlertDescription>
        </Alert>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <Label htmlFor="search" className="sr-only">Search</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    id="search"
                    placeholder="Cari daftar simak..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              
              <div className="w-full sm:w-48">
                <Label htmlFor="category-filter">Filter Kategori</Label>
                <Select value={filterCategory} onValueChange={setFilterCategory}>
                  <SelectTrigger id="category-filter">
                    <SelectValue placeholder="Semua Kategori" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Kategori</SelectItem>
                    {categories.map(category => (
                      <SelectItem key={category} value={category}>
                        {getCategoryBadge(category).props.children}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="w-full sm:w-48">
                <Label htmlFor="building-type">Tipe Bangunan</Label>
                <Select value={buildingType} onValueChange={setBuildingType}>
                  <SelectTrigger id="building-type">
                    <SelectValue placeholder="Pilih tipe" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="baru">Bangunan Baru</SelectItem>
                    <SelectItem value="existing">Bangunan Existing</SelectItem>
                    <SelectItem value="perubahan_fungsi">Perubahan Fungsi</SelectItem>
                    <SelectItem value="perpanjangan_slf">Perpanjangan SLF</SelectItem>
                    <SelectItem value="pascabencana">Pasca Bencana</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Templates List */}
        {loading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <div className="flex items-center space-x-4">
                    <Skeleton className="h-12 w-12 rounded-full" />
                    <div className="space-y-2 flex-1">
                      <Skeleton className="h-4 w-[250px]" />
                      <Skeleton className="h-4 w-[200px]" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredTemplates.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center">
              <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-3" />
              <h3 className="text-lg font-semibold text-foreground">
                {templates.length === 0 ? "Belum ada daftar simak" : "Tidak ada daftar simak yang sesuai"}
              </h3>
              <p className="text-muted-foreground mt-1 mb-4">
                {templates.length === 0 
                  ? "Tidak ada daftar simak yang tersedia untuk spesialisasi Anda."
                  : "Coba ubah filter pencarian atau tipe bangunan."
                }
              </p>
              {templates.length === 0 && (
                <Button
                  onClick={() => router.push('/dashboard/inspector')}
                  variant="outline"
                >
                  Kembali ke Dashboard
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {filteredTemplates.map((template) => {
              const photoInfo = getPhotogeotagInfo(template);
              const totalItems = getTotalItems(template);
              
              return (
                <Card key={template.id} className="overflow-hidden">
                  <CardContent className="p-0">
                    {/* Template Header */}
                    <div className="p-6 border-b border-border">
                      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                        <div className="flex-1 space-y-3">
                          <div className="flex items-start gap-3">
                            <div className="p-2 bg-primary/10 rounded-lg">
                              <FileText className="h-6 w-6 text-primary" />
                            </div>
                            <div className="flex-1 space-y-2">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h3 className="text-xl font-semibold text-foreground">
                                  {template.title}
                                </h3>
                                {getCategoryBadge(template.category)}
                              </div>
                              
                              <p className="text-muted-foreground">
                                {template.description}
                              </p>
                              
                              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                <div className="flex items-center gap-1">
                                  <FileText className="h-4 w-4" />
                                  <span>{totalItems} item checklist</span>
                                </div>
                                
                                <div className="flex items-center gap-1">
                                  <Camera className="h-4 w-4" />
                                  <span>
                                    {photoInfo.requiresGeotag ? 'Wajib Photogeotag' : 'Tidak Wajib Photo'}
                                  </span>
                                </div>
                                
                                {template.applicable_for && (
                                  <div className="flex items-center gap-1">
                                    <Building className="h-4 w-4" />
                                    <span>Untuk: </span>
                                    <div className="flex gap-1">
                                      {getApplicableForBadges(template)}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex flex-col sm:flex-row lg:flex-col gap-2">
                          <Button
                            onClick={() => router.push(`/dashboard/inspector/checklist?template=${template.id}`)}
                            size="sm"
                            className="flex items-center gap-2"
                          >
                            <Eye className="h-4 w-4" />
                            Gunakan Template
                          </Button>
                        </div>
                      </div>
                    </div>

                    {/* Template Details */}
                    <div className="p-6">
                      {/* Photogeotag Requirements */}
                      {photoInfo.requiresGeotag && (
                        <Alert className="mb-4 bg-blue-50 border-blue-200">
                          <Camera className="h-4 w-4 text-blue-600" />
                          <AlertTitle className="text-blue-800">Persyaratan Photogeotag</AlertTitle>
                          <AlertDescription className="text-blue-700">
                            <div className="space-y-1">
                              <p>• Wajib dilengkapi foto dengan metadata GPS</p>
                              <p>• Minimum {photoInfo.minPhotos} foto, maksimum {photoInfo.maxPhotos} foto</p>
                              {photoInfo.requiredShots.length > 0 && (
                                <p>• Foto wajib: {photoInfo.requiredShots.join(', ')}</p>
                              )}
                            </div>
                          </AlertDescription>
                        </Alert>
                      )}

                      {/* Subsections & Items */}
                      {template.subsections ? (
                        <Accordion type="single" collapsible className="space-y-2">
                          {template.subsections.map((subsection) => (
                            <AccordionItem key={subsection.id} value={subsection.id} className="border rounded-lg">
                              <AccordionTrigger className="px-4 py-3 hover:no-underline">
                                <div className="flex items-center gap-3 text-left">
                                  <div className="flex-1">
                                    <h4 className="font-semibold text-foreground">
                                      {subsection.title}
                                    </h4>
                                    {subsection.applicable_for && (
                                      <div className="flex gap-1 mt-1">
                                        {getApplicableForBadges({ applicable_for: subsection.applicable_for })}
                                      </div>
                                    )}
                                  </div>
                                  <Badge variant="outline">
                                    {subsection.items?.length || 0} items
                                  </Badge>
                                </div>
                              </AccordionTrigger>
                              <AccordionContent className="px-4 pb-3">
                                <div className="space-y-3">
                                  {subsection.items?.map((item) => (
                                    <div key={item.id} className="p-3 border rounded-lg bg-muted/30">
                                      <div className="flex items-start justify-between">
                                        <div className="flex-1 space-y-2">
                                          <h5 className="font-medium text-foreground">
                                            {item.item_name}
                                          </h5>
                                          
                                          {/* Column Types */}
                                          {item.columns && (
                                            <div className="flex flex-wrap gap-1">
                                              {item.columns.map((column, idx) => (
                                                <Badge key={idx} variant="secondary" className="text-xs">
                                                  {column.type.replace(/_/g, ' ')}
                                                  {column.unit && ` (${column.unit})`}
                                                </Badge>
                                              ))}
                                            </div>
                                          )}
                                        </div>
                                        
                                        {/* Item Photogeotag Status */}
                                        {itemRequiresPhotogeotag(template.id, item.id) && (
                                          <Badge className="bg-blue-100 text-blue-800 flex items-center gap-1">
                                            <MapPin className="h-3 w-3" />
                                            GPS Required
                                          </Badge>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </AccordionContent>
                            </AccordionItem>
                          ))}
                        </Accordion>
                      ) : template.items ? (
                        <div className="space-y-3">
                          {template.items.map((item) => (
                            <div key={item.id} className="p-3 border rounded-lg bg-muted/30">
                              <div className="flex items-start justify-between">
                                <div className="flex-1 space-y-2">
                                  <h5 className="font-medium text-foreground">
                                    {item.item_name}
                                  </h5>
                                  
                                  {/* Column Types */}
                                  {item.columns && (
                                    <div className="flex flex-wrap gap-1">
                                      {item.columns.map((column, idx) => (
                                        <Badge key={idx} variant="secondary" className="text-xs">
                                          {column.type.replace(/_/g, ' ')}
                                          {column.unit && ` (${column.unit})`}
                                        </Badge>
                                      ))}
                                    </div>
                                  )}
                                </div>
                                
                                {/* Item Photogeotag Status */}
                                {itemRequiresPhotogeotag(template.id, item.id) && (
                                  <Badge className="bg-blue-100 text-blue-800 flex items-center gap-1">
                                    <MapPin className="h-3 w-3" />
                                    GPS Required
                                  </Badge>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <Alert>
                          <AlertTriangle className="h-4 w-4" />
                          <AlertTitle>Tidak ada item checklist</AlertTitle>
                          <AlertDescription>
                            Template ini belum memiliki item checklist yang terdefinisi.
                          </AlertDescription>
                        </Alert>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Summary Stats */}
        {!loading && filteredTemplates.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Ringkasan Template</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">{filteredTemplates.length}</div>
                  <div className="text-sm text-blue-800">Total Template</div>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">
                    {filteredTemplates.filter(t => itemRequiresPhotogeotag(t.id)).length}
                  </div>
                  <div className="text-sm text-green-800">Wajib Photogeotag</div>
                </div>
                <div className="text-center p-4 bg-orange-50 rounded-lg">
                  <div className="text-2xl font-bold text-orange-600">
                    {filteredTemplates.reduce((total, template) => total + getTotalItems(template), 0)}
                  </div>
                  <div className="text-sm text-orange-800">Total Item</div>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">
                    {categories.length}
                  </div>
                  <div className="text-sm text-purple-800">Kategori</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}