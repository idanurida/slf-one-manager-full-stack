// client\src\components\client\DocumentItem.js

import React, { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Upload, FileText, CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import { toast } from "sonner";

const getDocumentStatusIcon = (status) => {
  switch (status) {
    case 'approved': return <CheckCircle2 className="w-4 h-4 text-green-500" />;
    case 'rejected': return <XCircle className="w-4 h-4 text-red-500" />;
    case 'pending': return <AlertCircle className="w-4 h-4 text-yellow-500" />;
    default: return <FileText className="w-4 h-4 text-gray-400" />;
  }
};

export const DocumentItem = ({ doc, status, onUpload, projectId, projects }) => {
  const [isUploading, setIsUploading] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState(projectId);

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file || !selectedProjectId) {
      toast.error('Pilih project terlebih dahulu');
      return;
    }

    // Validate file type
    if (doc.tipe_file && doc.tipe_file.length > 0) {
      const fileExt = file.name.split('.').pop().toLowerCase();
      if (!doc.tipe_file.includes(fileExt)) {
        toast.error(`Format file tidak didukung. Gunakan: ${doc.tipe_file.join(', ')}`);
        return;
      }
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Ukuran file maksimal 10MB');
      return;
    }

    setIsUploading(true);
    try {
      await onUpload(selectedProjectId, doc.id, file, doc);
    } catch (error) {
      // Error handling is done in the parent component
    } finally {
      setIsUploading(false);
    }
  };

  const getMappedStatus = () => {
    switch (status) {
      case 'approved': return 'approved';
      case 'rejected': return 'rejected';
      case 'compliant': return 'approved';
      case 'non-compliant': return 'rejected';
      default: return 'pending';
    }
  };

  const mappedStatus = getMappedStatus();

  return (
    <div className="flex items-center justify-between p-3 border rounded-lg bg-background hover:bg-accent/30 transition-colors">
      <div className="flex items-center gap-3 flex-1">
        {getDocumentStatusIcon(mappedStatus)}
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm text-foreground">{doc.nama_dokumen}</p>
          {doc.deskripsi && (
            <p className="text-xs text-muted-foreground mt-1">{doc.deskripsi}</p>
          )}
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            {doc.wajib && (
              <Badge variant="outline" className="text-xs bg-red-50 text-red-700 border-red-200">
                Wajib
              </Badge>
            )}
            {!doc.wajib && (
              <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                Opsional
              </Badge>
            )}
            {doc.tipe_file && (
              <span className="text-xs text-muted-foreground">
                Format: {doc.tipe_file.join(', ')}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        <Badge
          variant={
            mappedStatus === 'approved' ? 'default' :
              mappedStatus === 'rejected' ? 'destructive' : 'secondary'
          }
          className="text-xs capitalize min-w-[80px] justify-center"
        >
          {mappedStatus === 'approved' ? 'Disetujui' :
            mappedStatus === 'rejected' ? 'Ditolak' : 'Menunggu'}
        </Badge>

        {/* Project Selector for Document Upload */}
        {projects.length > 0 && (
          <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
            <SelectTrigger className="w-[180px] h-8 text-xs bg-background border-border">
              <SelectValue placeholder="Pilih Project" />
            </SelectTrigger>
            <SelectContent className="bg-popover border-border">
              {projects.map((project) => (
                <SelectItem key={project.id} value={project.id} className="text-xs">
                  {project.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <Input
          type="file"
          accept={doc.tipe_file ? doc.tipe_file.map(ext => `.${ext}`).join(',') : ".pdf,.jpg,.png,.jpeg,.dwg,.xlsx"}
          onChange={handleFileUpload}
          disabled={isUploading || !selectedProjectId}
          className="hidden"
          id={`file-upload-${doc.id}`}
        />
        <Button
          variant={mappedStatus === 'approved' ? "outline" : "default"}
          size="sm"
          disabled={isUploading || !selectedProjectId}
          onClick={() => document.getElementById(`file-upload-${doc.id}`).click()}
          className="text-xs h-8"
        >
          {isUploading ? (
            <Loader2 className="w-3 h-3 animate-spin mr-1" />
          ) : (
            <Upload className="w-3 h-3 mr-1" />
          )}
          {mappedStatus === 'approved' ? 'Ganti File' : 'Unggah'}
        </Button>
      </div>
    </div>
  );
};
