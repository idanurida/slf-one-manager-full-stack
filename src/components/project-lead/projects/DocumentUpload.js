// FILE: src/components/project-lead/projects/DocumentUpload.js
"use client";

import React, { useState, useRef } from 'react';
import { useRouter } from 'next/navigation'; // ✅ Ganti ke next/navigation
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { useToast } from '@/components/ui/use-toast'; // ✅ Gunakan useToast dari shadcn/ui

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
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

// Lucide Icons
import {
  FileText, Clock, Activity, CheckCircle, XCircle, Bell, Eye, Search, X,
  CheckSquare, AlertTriangle, Loader2, Info, Calendar, UserCheck, Camera, Plus, Save, RotateCcw,
  Upload, File, Trash2
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

const getDocumentTypeText = (type) => {
  switch (type?.toLowerCase()) {
    case 'slf': return 'SLF';
    case 'imb': return 'IMB';
    case 'laporan_inspeksi': return 'Laporan Inspeksi';
    case 'dokumen_teknis': return 'Dokumen Teknis';
    case 'foto': return 'Foto';
    case 'lainnya': return 'Lainnya';
    default: return type?.replace(/_/g, ' ') || 'N/A';
  }
};

// --- Main Component ---
const DocumentUpload = ({ projectId, onUpload, user }) => { // ✅ Tambahkan user sebagai props
  const router = useRouter();
  const { toast } = useToast(); // ✅ Gunakan useToast dari shadcn/ui

  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [documentType, setDocumentType] = useState('');
  const [caption, setCaption] = useState('');

  const fileInputRef = useRef(null); // ✅ Ganti React.useRef dengan useRef

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const handleRemoveFile = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setSelectedFile(null);
    setPreviewUrl('');
  };

  const handleUploadDocument = async () => {
    if (!selectedFile || !documentType || !projectId || !user?.id) { // ✅ Tambahkan pengecekan user.id
      toast({
        title: 'Data tidak lengkap',
        description: 'Harap pilih file, jenis dokumen, dan masukkan keterangan.',
        variant: "destructive", // ✅ Gunakan variant shadcn/ui
      });
      return;
    }

    try {
      setUploading(true);
      setProgress(20);

      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `documents/${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(fileName, selectedFile);

      if (uploadError) throw uploadError;

      const {  publicUrl } = supabase.storage
        .from('documents')
        .getPublicUrl(fileName);

      const { error: insertError } = await supabase.from('documents').insert([
        {
          project_id: projectId,
          name: selectedFile.name,
          type: documentType,
          caption: caption || '',
          url: publicUrl.publicUrl,
          uploaded_by: user.id, // ✅ Gunakan user.id dari props
        },
      ]);

      if (insertError) throw insertError;

      toast({
        title: 'Dokumen berhasil diunggah!',
        description: 'Dokumen telah berhasil diunggah ke sistem.',
        variant: "default", // ✅ Gunakan variant shadcn/ui
      });

      if (onUpload) {
        onUpload({
          name: selectedFile.name,
          type: documentType,
          caption: caption || '',
          url: publicUrl.publicUrl,
          uploaded_by: user.id, // ✅ Gunakan user.id dari props
        });
      }

      handleRemoveFile();
      setDocumentType('');
      setCaption('');
    } catch (err) {
      console.error('[DocumentUpload] Upload error:', err);
      const errorMessage = err.message || 'Terjadi kesalahan saat mengunggah dokumen.';
      toast({
        title: 'Gagal mengunggah dokumen',
        description: errorMessage,
        variant: "destructive", // ✅ Gunakan variant shadcn/ui
      });
    } finally {
      setUploading(false);
      setProgress(100);
    }
  };

  return (
    <div className="space-y-6"> {/* ✅ Ganti VStack dengan div space-y-6 */}
      <Card className="border-border"> {/* ✅ Ganti Card dengan Card shadcn/ui */}
        <CardContent className="p-6"> {/* ✅ Ganti CardBody dengan CardContent shadcn/ui */}
          <div className="space-y-4"> {/* ✅ Ganti VStack dengan div space-y-4 */}
            <div> {/* ✅ Ganti Box dengan div */}
              <h2 className="text-xl md:text-2xl font-semibold text-blue.600 mb-2"> {/* ✅ Ganti Heading dengan h2 */}
                Upload Dokumen Proyek
              </h2>
              <p className="text-sm text-muted-foreground"> {/* ✅ Ganti Text dengan p */}
                Unggah dokumen terkait proyek seperti SLF, IMB, laporan inspeksi, dll.
              </p>
            </div>

            <Separator className="bg-border" /> {/* ✅ Ganti Divider dengan Separator shadcn/ui */

            <div className="space-y-2"> {/* ✅ Ganti FormControl dengan div space-y-2 */}
              <Label htmlFor="document-type" className="text-sm font-medium text-foreground"> {/* ✅ Ganti FormLabel dengan Label */}
                Jenis Dokumen *
              </Label>
              <Select value={documentType} onValueChange={setDocumentType}> {/* ✅ Ganti Select Chakra dengan Select shadcn/ui */}
                <SelectTrigger id="document-type" className="w-full bg-background"> {/* ✅ Tambahkan id dan class Tailwind */}
                  <SelectValue placeholder="Pilih jenis dokumen..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="slf">SLF</SelectItem> {/* ✅ Ganti option dengan SelectItem shadcn/ui */}
                  <SelectItem value="imb">IMB</SelectItem>
                  <SelectItem value="laporan_inspeksi">Laporan Inspeksi</SelectItem>
                  <SelectItem value="dokumen_teknis">Dokumen Teknis</SelectItem>
                  <SelectItem value="foto">Foto</SelectItem>
                  <SelectItem value="lainnya">Lainnya</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2"> {/* ✅ Ganti FormControl dengan div space-y-2 */}
              <Label htmlFor="caption" className="text-sm font-medium text-foreground"> {/* ✅ Ganti FormLabel dengan Label */}
                Keterangan Dokumen *
              </Label>
              <Input
                id="caption"
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Masukkan keterangan dokumen..."
                className="bg-background" // ✅ Tambahkan class Tailwind
              />
            </div>

            <Input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
              className="hidden" // ✅ Ganti display="none" dengan class hidden
              onChange={handleFileSelect}
            />

            <div className="flex flex-wrap gap-3 mb-4"> {/* ✅ Ganti HStack dengan div flex flex-wrap gap-3 mb-4 */}
              <Button
                variant="default" // ✅ Ganti colorScheme="blue" dengan variant="default"
                className="flex items-center gap-2 bg-blue-600 text-white hover:bg-blue-700 dark:hover:bg-blue-800" // ✅ Tambahkan class Tailwind untuk warna biru
                onClick={() => fileInputRef.current.click()} // ✅ Ganti isDisabled dengan disabled
                disabled={uploading}
              >
                <Upload className="w-4 h-4" />
                Pilih Dokumen
              </Button>
              <Button
                variant="default" // ✅ Ganti colorScheme="green" dengan variant="default"
                className="flex items-center gap-2 bg-green-600 text-white hover:bg-green-700 dark:hover:bg-green-800" // ✅ Tambahkan class Tailwind untuk warna hijau
                onClick={handleUploadDocument}
                disabled={!selectedFile || !documentType || uploading} // ✅ Ganti isLoading dan isDisabled
              >
                {uploading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Mengunggah...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    Upload
                  </>
                )}
              </Button>
            </div>

            {previewUrl && (
              <div className="relative mb-4 p-4 border border-border rounded-md bg-card"> {/* ✅ Ganti Box dengan div relative mb-4 p-4 border border-border rounded-md bg-card */}
                <div className="flex items-center gap-3"> {/* ✅ Ganti HStack dengan div flex items-center gap-3 */}
                  <File className="w-6 h-6 text-blue.500" /> {/* ✅ Ganti FiFile dengan File lucide-react dan tambahkan class Tailwind */}
                  <p className="text-sm font-bold text-foreground"> {/* ✅ Ganti Text dengan p dan tambahkan class Tailwind */}
                    {selectedFile?.name}
                  </p>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="absolute top-2 right-2 h-8 w-8 p-0 text-destructive hover:text-destructive" // ✅ Ganti IconButton dengan Button ghost dan tambahkan class Tailwind
                          onClick={handleRemoveFile}
                        >
                          <Trash2 className="w-4 h-4" />
                          <span className="sr-only">Hapus File</span> {/* ✅ Tambahkan sr-only untuk aksesibilitas */}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Hapus File</p> {/* ✅ Tambahkan tooltip content */}
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </div>
            )}

            {uploading && (
              <div className="w-full"> {/* ✅ Ganti Box dengan div w-full */}
                <Progress value={progress} className="h-2 bg-blue.500" /> {/* ✅ Ganti Progress dengan Progress shadcn/ui dan tambahkan class Tailwind */}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DocumentUpload;
