// FILE: src/components/project-lead/inspections/CreateInspectionSchedule.js
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { X, MapPin, User, FileText, AlertCircle, Clock } from "lucide-react";
import { supabase } from "@/utils/supabaseClient";
import { toast } from "sonner";

// Utility function untuk class names
const cn = (...classes) => {
  return classes.filter(Boolean).join(' ');
};

const CreateInspectionSchedule = ({ 
  projects = [],
  onScheduleCreated, 
  onCancel 
}) => {
  const [loading, setLoading] = useState(false);
  const [inspectors, setInspectors] = useState([]);
  const [fetchInspectorsLoading, setFetchInspectorsLoading] = useState(true);
  
  // Form state
  const [formData, setFormData] = useState({
    project_id: "",
    assigned_to: "",
    start_date: "",
    end_date: "",
    notes: ""
  });

  // Form validation errors
  const [errors, setErrors] = useState({});

  // Fetch available inspectors - PERBAIKAN: Hapus kolom phone
  useEffect(() => {
    const fetchInspectors = async () => {
      try {
        setFetchInspectorsLoading(true);
        const { data, error } = await supabase
          .from('profiles')
          .select('id, full_name, email, specialization') // HAPUS phone
          .eq('role', 'inspector')
          .order('full_name', { ascending: true });

        if (error) throw error;
        setInspectors(data || []);
      } catch (error) {
        console.error('Error fetching inspectors:', error);
        toast.error('Gagal memuat data inspector');
      } finally {
        setFetchInspectorsLoading(false);
      }
    };

    fetchInspectors();
  }, []);

  // Validate form
  const validateForm = () => {
    const newErrors = {};

    if (!formData.project_id) {
      newErrors.project_id = 'Pilih proyek terlebih dahulu';
    }
    if (!formData.assigned_to) {
      newErrors.assigned_to = 'Pilih inspector terlebih dahulu';
    }
    if (!formData.start_date) {
      newErrors.start_date = 'Pilih tanggal mulai terlebih dahulu';
    }
    if (!formData.end_date) {
      newErrors.end_date = 'Pilih tanggal selesai terlebih dahulu';
    }
    if (formData.start_date && formData.end_date) {
      const start = new Date(formData.start_date);
      const end = new Date(formData.end_date);
      if (end < start) {
        newErrors.dates = 'Tanggal selesai harus setelah tanggal mulai';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form input changes
  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  // Handle cancel
  const handleCancel = () => {
    console.log('Tombol batal diklik - CreateInspectionSchedule');
    if (onCancel && typeof onCancel === 'function') {
      onCancel();
    } else {
      console.warn('onCancel prop tidak tersedia atau bukan function');
      // Fallback: reset form
      setFormData({
        project_id: "",
        assigned_to: "",
        start_date: "",
        end_date: "",
        notes: ""
      });
    }
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate form
    if (!validateForm()) {
      toast.error('Harap lengkapi semua field yang wajib diisi');
      return;
    }

    setLoading(true);

    try {
      // Create inspection record
      const { data, error } = await supabase
        .from('vw_inspections_fixed')
        .insert([
          {
            project_id: formData.project_id,
            assigned_to: formData.assigned_to,
            scheduled_date: formData.start_date,
            start_time: `${formData.start_date}T09:00:00`,
            end_time: `${formData.end_date}T17:00:00`,
            notes: formData.notes.trim(),
            status: 'scheduled',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
        ])
        .select(`
          *,
          projects (
            id,
            name,
            address,
            city
          ),
          profiles (
            id,
            full_name,
            email
          )
        `)
        .single();

      if (error) throw error;

      toast.success('Jadwal inspeksi berhasil dibuat!');
      
      // Reset form
      setFormData({
        project_id: "",
        assigned_to: "",
        start_date: "",
        end_date: "",
        notes: ""
      });

      // Notify parent component
      if (onScheduleCreated && typeof onScheduleCreated === 'function') {
        onScheduleCreated(data);
      } else {
        console.warn('onScheduleCreated prop tidak tersedia');
      }

    } catch (error) {
      console.error('Error creating inspection schedule:', error);
      toast.error('Gagal membuat jadwal inspeksi: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Get selected project dengan safe access
  const selectedProject = projects?.find(p => p.id === formData.project_id) || null;
  
  // Get selected inspector dengan safe access
  const selectedInspector = inspectors?.find(i => i.id === formData.assigned_to) || null;

  // Jika tidak ada projects, tampilkan pesan
  if (!projects || projects.length === 0) {
    return (
      <div className="text-center py-8">
        <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">Tidak Ada Proyek</h3>
        <p className="text-muted-foreground mb-4">
          Anda belum memiliki proyek yang dapat dijadwalkan untuk inspeksi.
        </p>
        <div className="flex justify-center gap-3">
          <Button 
            onClick={handleCancel} 
            variant="outline"
          >
            <X className="w-4 h-4 mr-2" />
            Kembali
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header dengan tombol close - TANPA JUDUL */}
      <div className="flex justify-between items-center pb-4 border-b">
        <div>
          <p className="text-muted-foreground">
            Jadwalkan inspeksi untuk proyek yang Anda kelola
          </p>
        </div>
        <Button
          onClick={handleCancel}
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-full hover:bg-accent transition-colors"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Project Selection */}
        <Card className="hover:shadow-md transition-shadow duration-200">
          <CardContent className="space-y-4 pt-6">
            <div className="space-y-2">
              <Label htmlFor="project" className="text-base font-semibold">Pilih Proyek *</Label>
              <Select 
                value={formData.project_id} 
                onValueChange={(value) => handleInputChange('project_id', value)}
              >
                <SelectTrigger className={cn(
                  "bg-white hover:bg-accent/50 transition-colors",
                  errors.project_id && "border-red-500"
                )}>
                  <SelectValue placeholder="Pilih proyek" />
                </SelectTrigger>
                <SelectContent className="bg-white border border-gray-200">
                  {projects?.map((project) => (
                    <SelectItem key={project.id} value={project.id} className="hover:bg-accent transition-colors">
                      <div className="flex flex-col">
                        <span className="font-medium">{project.name}</span>
                        <span className="text-sm text-muted-foreground flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {project.city || project.address || 'Lokasi tidak tersedia'}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.project_id && (
                <p className="text-sm text-red-500 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  {errors.project_id}
                </p>
              )}
            </div>

            {selectedProject && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors">
                <h4 className="font-semibold text-sm mb-2 text-blue-800">Proyek Terpilih:</h4>
                <p className="font-medium text-blue-900">{selectedProject.name}</p>
                <div className="flex items-center gap-1 mt-1 text-sm text-blue-700">
                  <MapPin className="w-3 h-3" />
                  <span>{selectedProject.city || selectedProject.address || 'Lokasi tidak tersedia'}</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Inspector Selection */}
        <Card className="hover:shadow-md transition-shadow duration-200">
          <CardContent className="space-y-4 pt-6">
            <div className="space-y-2">
              <Label htmlFor="inspector" className="text-base font-semibold">Pilih Inspektor *</Label>
              <Select 
                value={formData.assigned_to} 
                onValueChange={(value) => handleInputChange('assigned_to', value)}
                disabled={fetchInspectorsLoading}
              >
                <SelectTrigger className={cn(
                  "bg-white hover:bg-accent/50 transition-colors",
                  errors.assigned_to && "border-red-500"
                )}>
                  <SelectValue placeholder={
                    fetchInspectorsLoading ? "Memuat inspector..." : "Pilih inspektor"
                  } />
                </SelectTrigger>
                <SelectContent className="bg-white border border-gray-200">
                  {inspectors?.map((inspector) => (
                    <SelectItem key={inspector.id} value={inspector.id} className="hover:bg-accent transition-colors">
                      <div className="flex flex-col">
                        <span className="font-medium">{inspector.full_name}</span>
                        <span className="text-sm text-muted-foreground">{inspector.email}</span>
                        {inspector.specialization && (
                          <Badge variant="secondary" className="mt-1 text-xs capitalize">
                            {inspector.specialization.replace(/_/g, ' ')}
                          </Badge>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.assigned_to && (
                <p className="text-sm text-red-500 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  {errors.assigned_to}
                </p>
              )}
              {fetchInspectorsLoading && (
                <p className="text-sm text-muted-foreground">Memuat daftar inspector...</p>
              )}
            </div>

            {selectedInspector && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition-colors">
                <h4 className="font-semibold text-sm mb-2 text-green-800">Inspektor Terpilih:</h4>
                <p className="font-medium text-green-900">{selectedInspector.full_name}</p>
                <p className="text-sm text-green-700">{selectedInspector.email}</p>
                {selectedInspector.specialization && (
                  <Badge variant="secondary" className="mt-2 bg-green-100 text-green-800 capitalize">
                    {selectedInspector.specialization.replace(/_/g, ' ')}
                  </Badge>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Separator />

        {/* Date Selection */}
        <Card className="hover:shadow-md transition-shadow duration-200">
          <CardContent className="space-y-4 pt-6">
            <Label className="text-base font-semibold">Periode Inspeksi *</Label>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start_date">Tanggal Mulai</Label>
                <Input
                  id="start_date"
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => handleInputChange('start_date', e.target.value)}
                  className={cn(
                    "hover:border-primary/50 transition-colors",
                    errors.start_date && "border-red-500"
                  )}
                  min={new Date().toISOString().split('T')[0]}
                />
                {errors.start_date && (
                  <p className="text-sm text-red-500 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    {errors.start_date}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="end_date">Tanggal Selesai</Label>
                <Input
                  id="end_date"
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => handleInputChange('end_date', e.target.value)}
                  className={cn(
                    "hover:border-primary/50 transition-colors",
                    errors.end_date && "border-red-500"
                  )}
                  min={formData.start_date || new Date().toISOString().split('T')[0]}
                />
                {errors.end_date && (
                  <p className="text-sm text-red-500 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    {errors.end_date}
                  </p>
                )}
              </div>
            </div>
            {errors.dates && (
              <p className="text-sm text-red-500 flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />
                {errors.dates}
              </p>
            )}
          </CardContent>
        </Card>

        <Separator />

        {/* Additional Notes */}
        <Card className="hover:shadow-md transition-shadow duration-200">
          <CardContent className="pt-6">
            <div className="space-y-2">
              <Label htmlFor="notes" className="text-base font-semibold">Catatan Tambahan</Label>
              <Textarea
                id="notes"
                placeholder="Tambahkan catatan atau instruksi khusus untuk inspektor (opsional)..."
                value={formData.notes}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                rows={4}
                className="hover:border-primary/50 transition-colors"
              />
              <p className="text-sm text-muted-foreground">
                Catatan ini akan dilihat oleh inspector sebelum melakukan inspeksi.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Schedule Preview */}
        {(selectedProject || selectedInspector || formData.start_date || formData.end_date) && (
          <Card className="hover:shadow-md transition-shadow duration-200">
            <CardContent className="pt-6">
              <Label className="text-base font-semibold">Preview Jadwal</Label>
              <div className="space-y-3 mt-3">
                {selectedProject && (
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-sm font-medium">Proyek:</span>
                    <span className="text-sm text-right">{selectedProject.name}</span>
                  </div>
                )}
                {selectedInspector && (
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-sm font-medium">Inspektor:</span>
                    <span className="text-sm text-right">{selectedInspector.full_name}</span>
                  </div>
                )}
                {formData.start_date && (
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-sm font-medium">Tanggal Mulai:</span>
                    <span className="text-sm text-right">
                      {new Date(formData.start_date).toLocaleDateString('id-ID')}
                    </span>
                  </div>
                )}
                {formData.end_date && (
                  <div className="flex justify-between items-center py-2">
                    <span className="text-sm font-medium">Tanggal Selesai:</span>
                    <span className="text-sm text-right">
                      {new Date(formData.end_date).toLocaleDateString('id-ID')}
                    </span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 pt-6 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
            disabled={loading}
            className="min-w-24 hover:bg-accent transition-colors"
          >
            <X className="w-4 h-4 mr-2" />
            Batal
          </Button>
          <Button 
            type="submit" 
            disabled={loading}
            className="min-w-24 hover:bg-primary/90 transition-colors"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                Membuat...
              </>
            ) : (
              <>
                <FileText className="w-4 h-4 mr-2" />
                Buat Jadwal
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default CreateInspectionSchedule;
