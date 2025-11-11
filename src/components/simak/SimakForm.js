// FILE: src/components/simak/SimakForms.js
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { motion } from 'framer-motion';

// shadcn/ui Components
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';

// Lucide Icons
import {
  FileText, Clock, Activity, CheckCircle, XCircle, Bell, Eye, Search, X,
  CheckSquare, AlertTriangle, Loader2, Info, Calendar, UserCheck, Camera, Plus, Save, RotateCcw
} from 'lucide-react';

// Other Imports
import { supabase } from '@/utils/supabaseClient';
import checklistData from '@/data/checklistData.json'; // ✅ Impor checklistData.json

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
    case 'approved':
      return 'default'; // atau 'success' jika kamu tambahkan di shadcn
    case 'rejected':
      return 'destructive';
    case 'pending':
      return 'secondary';
    case 'submitted':
      return 'default';
    default:
      return 'outline';
  }
};

const getSimakSectionTitle = (sectionCode) => {
  // ✅ Ambil judul bagian dari checklistData.json berdasarkan section_code
  const section = checklistData.checklist_templates.find(t => t.id === 'simak_lamp_a_t');
  if (section && section.subsections) {
    const subsection = section.subsections.find(s => s.id === sectionCode);
    return subsection ? subsection.title : `Bagian ${sectionCode}`;
  }
  return `Bagian ${sectionCode}`;
};

// --- Main Component ---
const SimakForms = ({ userRole, userId, projectId, inspectionId }) => { // ✅ Terima props
  const { toast } = useToast();
  const [loading, setLoading] = useState({ items: true, responses: true });
  const [error, setError] = useState(null);

  // States untuk data
  const [simakItems, setSimakItems] = useState([]); // ✅ Data dari tabel `simak_items`
  const [simakResponses, setSimakResponses] = useState([]); // ✅ Data dari tabel `simak_responses`
  const [groupedItems, setGroupedItems] = useState({}); // ✅ Item yang dikelompokkan berdasarkan section_code

  // States untuk filter & search
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSection, setSelectedSection] = useState('all');
  const [filteredItems, setFilteredItems] = useState([]);

  // --- 1. HOOKS: Fetch Data Simak Items & Responses ---
  useEffect(() => {
    const fetchData = async () => {
      if (!userId || !projectId || !inspectionId) {
        console.warn('[SimakForms] Missing userId, projectId, or inspectionId.');
        setLoading({ items: false, responses: false });
        return;
      }

      setLoading({ items: true, responses: true });
      setError(null);

      try {
        // --- Ambil semua item Daftar Simak (LAMP A-T) dari tabel `simak_items` ---
        const {  items, error: itemsErr } = await supabase
          .from('simak_items')
          .select('*')
          .order('section_code', { ascending: true })
          .order('item_number', { ascending: true });

        if (itemsErr) throw itemsErr;
        setSimakItems(Array.isArray(items) ? items : []);
        console.log('[SimakForms] Fetched simak_items:', items?.length || 0);

        // --- Ambil respons inspector untuk item-item tersebut dari tabel `simak_responses` ---
        const {  responses, error: respErr } = await supabase
          .from('simak_responses')
          .select(`
            id,
            item_id,
            response_value,
            photo_url,
            inspector_id,
            created_at
          `)
          .eq('inspection_id', inspectionId) // ✅ Filter berdasarkan inspection_id
          .eq('inspector_id', userId); // ✅ Filter berdasarkan inspector ID

        if (respErr) throw respErr;
        setSimakResponses(Array.isArray(responses) ? responses : []);
        console.log('[SimakForms] Fetched simak_responses:', responses?.length || 0);

      } catch (err) {
        console.error('[SimakForms] Fetch data error:', err);
        const errorMessage = err.message || "Gagal memuat data Daftar Simak.";
        setError(errorMessage);
        toast({
          title: 'Gagal memuat data Daftar Simak.',
          description: errorMessage,
          variant: "destructive",
        });
        setSimakItems([]);
        setSimakResponses([]);
      } finally {
        setLoading({ items: false, responses: false });
      }
    };

    fetchData();
  }, [userId, projectId, inspectionId, toast]); // ✅ Tambahkan toast ke dependency

  // --- 2. HOOKS: Group & Filter Items ---
  useEffect(() => {
    if (simakItems.length === 0) {
      setGroupedItems({});
      setFilteredItems([]);
      return;
    }

    // --- Kelompokkan item berdasarkan section_code ---
    const grouped = simakItems.reduce((acc, item) => {
      const section = item.section_code;
      if (!acc[section]) {
        acc[section] = [];
      }
      acc[section].push(item);
      return acc;
    }, {});
    setGroupedItems(grouped);

    // --- Terapkan filter ---
    let result = simakItems;

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(item =>
        item.item_label?.toLowerCase().includes(term) ||
        item.section_name?.toLowerCase().includes(term) ||
        item.section_code?.toLowerCase().includes(term)
      );
    }

    if (selectedSection && selectedSection !== 'all') {
      result = result.filter(item => item.section_code === selectedSection);
    }

    setFilteredItems(result);
  }, [simakItems, searchTerm, selectedSection]);

  // --- Helpers ---
  const isItemCompleted = (itemId) => {
    return simakResponses.some(r => r.item_id === itemId);
  };

  const getItemResponse = (itemId) => {
    return simakResponses.find(r => r.item_id === itemId);
  };

  // --- Handlers ---
  const handleSaveResponse = async (item, responseValue, photoUrl = null) => {
    if (!userId || !inspectionId) return;

    try {
      const existingResponse = getItemResponse(item.id);

      let error;
      if (existingResponse) {
        // Jika sudah ada, update
        const { error: updateError } = await supabase
          .from('simak_responses')
          .update({
            response_value: responseValue,
            photo_url: photoUrl,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingResponse.id);
        error = updateError;
        console.log('[SimakForms] Updated simak_responses:', item.id);
      } else {
        // Jika belum ada, insert baru
        const { error: insertError } = await supabase
          .from('simak_responses')
          .insert([{
            item_id: item.id,
            response_value: responseValue,
            photo_url: photoUrl,
            inspector_id: userId,
            inspection_id: inspectionId, // ✅ Sertakan inspection_id
            project_id: projectId, // ✅ Sertakan project_id
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }]);
        error = insertError;
        console.log('[SimakForms] Inserted simak_responses:', item.id);
      }

      if (error) throw error;

      toast({
        title: 'Respons Simak tersimpan!',
        description: `Item ${item.item_number} berhasil disimpan.`,
        variant: "default",
      });

      // Refresh simak responses
      const {  refreshed } = await supabase
        .from('simak_responses')
        .select(`
          id,
          item_id,
          response_value,
          photo_url,
          inspector_id,
          created_at
        `)
        .eq('inspection_id', inspectionId) // ✅ Filter berdasarkan inspection_id
        .eq('inspector_id', userId); // ✅ Filter berdasarkan inspector ID

      setSimakResponses(Array.isArray(refreshed) ? refreshed : []);

    } catch (err) {
      console.error('[SimakForms] Save response error:', err);
      toast({
        title: 'Gagal menyimpan Respons Simak.',
        description: err.message || 'Terjadi kesalahan saat menyimpan.',
        variant: "destructive",
      });
    }
  };

  const resetFilters = () => {
    setSearchTerm('');
    setSelectedSection('all');
  };

  // --- Render Logic ---
  if (loading.items || loading.responses) {
    return (
      <Card className="border-border">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
            Memuat Daftar Simak Kelaikan Fungsi Bangunan Gedung (LAMP A-T)...
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-24 w-full rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-border">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-foreground">Daftar Simak (LAMP A-T)</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Gagal memuat data</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  const sections = Object.keys(groupedItems);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      <Card className="border-border">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-foreground">
            Daftar Simak Kelaikan Fungsi Bangunan Gedung (LAMP A-T)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Isi Daftar Simak sesuai dengan format LAMP Kabupaten Pati untuk inspeksi ini.
          </p>

          {/* Filter & Search */}
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Cari item, bagian, atau kode..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-background"
              />
            </div>

            <Select value={selectedSection} onValueChange={setSelectedSection}>
              <SelectTrigger className="w-full md:w-[200px] bg-background">
                <SelectValue placeholder="Filter Bagian" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Bagian</SelectItem>
                {sections.map(section => (
                  <SelectItem key={section} value={section}>
                    {section}. {getSimakSectionTitle(section)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              onClick={resetFilters}
              variant="outline"
              size="icon"
              title="Reset Filter"
              className="bg-background"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          <Separator className="bg-border my-4" />

          {/* Daftar Item Simak */}
          {Object.keys(groupedItems).length > 0 ? (
            Object.entries(groupedItems).map(([sectionCode, items]) => {
              // Filter berdasarkan hasil pencarian/filter global
              const sectionItems = items.filter(item => filteredItems.includes(item));
              if (sectionItems.length === 0) return null; // Jangan tampilkan bagian kosong

              return (
                <Card key={sectionCode} className="border-border mb-6 last:mb-0">
                  <CardHeader className="bg-muted/50">
                    <CardTitle className="text-md font-semibold text-foreground">
                      {sectionCode}. {getSimakSectionTitle(sectionCode)}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-foreground w-[80px]">No.</TableHead>
                          <TableHead className="text-foreground">Item</TableHead>
                          <TableHead className="text-foreground w-[150px]">Respons</TableHead>
                          <TableHead className="text-foreground w-[120px] text-center">Status</TableHead>
                          <TableHead className="text-foreground w-[150px] text-center">Aksi</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {sectionItems.map((item) => {
                          const isCompleted = isItemCompleted(item.id);
                          const response = getItemResponse(item.id);
                          return (
                            <TableRow key={item.id} className="hover:bg-accent/50">
                              <TableCell className="font-medium text-foreground">
                                {item.item_number}
                              </TableCell>
                              <TableCell className="text-foreground">
                                <p className="font-medium">{item.item_label}</p>
                                {item.description && (
                                  <p className="text-xs text-muted-foreground mt-1">
                                    {item.description}
                                  </p>
                                )}
                              </TableCell>
                              <TableCell className="text-foreground">
                                {isCompleted ? (
                                  <Badge variant={getStatusColor(response?.response_value)} className="capitalize">
                                    {response?.response_value || 'N/A'}
                                  </Badge>
                                ) : (
                                  <Badge variant="outline">Belum Diisi</Badge>
                                )}
                              </TableCell>
                              <TableCell className="text-center">
                                <Badge variant={isCompleted ? "default" : "secondary"}>
                                  {isCompleted ? 'Selesai' : 'Belum'}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-center">
                                <div className="flex justify-center gap-2">
                                  {isCompleted ? (
                                    <>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="flex items-center gap-2"
                                        onClick={() => {
                                          // Misalnya, buka modal untuk melihat/edit respons
                                          alert(`Respons untuk item ${item.item_number}: ${JSON.stringify(response?.response_value)}`);
                                        }}
                                      >
                                        <Eye className="w-4 h-4" />
                                        Lihat
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        className="flex items-center gap-2 text-destructive hover:text-destructive"
                                        onClick={async () => {
                                          if (confirm("Hapus respons untuk item ini?")) {
                                            try {
                                              const { error } = await supabase
                                                .from('simak_responses')
                                                .delete()
                                                .eq('id', response.id);

                                              if (error) throw error;

                                              toast({
                                                title: 'Respons dihapus',
                                                description: `Respons untuk item ${item.item_number} telah dihapus.`,
                                                variant: "default",
                                              });

                                              // Refresh responses
                                              const {  refreshed } = await supabase
                                                .from('simak_responses')
                                                .select(`
                                                  id,
                                                  item_id,
                                                  response_value,
                                                  photo_url,
                                                  inspector_id,
                                                  created_at
                                                `)
                                                .eq('inspection_id', inspectionId)
                                                .eq('inspector_id', userId);

                                              setSimakResponses(Array.isArray(refreshed) ? refreshed : []);
                                            } catch (err) {
                                              console.error('[SimakForms] Delete response error:', err);
                                              toast({
                                                title: 'Gagal menghapus respons.',
                                                description: err.message || 'Terjadi kesalahan.',
                                                variant: "destructive",
                                              });
                                            }
                                          }
                                        }}
                                      >
                                        <X className="w-4 h-4" />
                                        Hapus
                                      </Button>
                                    </>
                                  ) : (
                                    <Button
                                      size="sm"
                                      variant="default"
                                      className="flex items-center gap-2"
                                      onClick={() => {
                                        // Misalnya, buka modal untuk mengisi respons
                                        const newValue = prompt(`Masukkan respons untuk item ${item.item_number} (${item.item_label}):`, '');
                                        if (newValue !== null) {
                                          handleSaveResponse(item, newValue);
                                        }
                                      }}
                                    >
                                      <Plus className="w-4 h-4" />
                                      Isi
                                    </Button>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              );
            })
          ) : (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertTitle>Daftar Simak Kosong</AlertTitle>
              <AlertDescription>
                Tidak ditemukan item Daftar Simak (LAMP A–T) di database atau sesuai filter.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default SimakForms;