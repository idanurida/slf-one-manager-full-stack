import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/router';
import { cn } from '@/lib/utils'; // Utilitas untuk Tailwind CSS

// Impor komponen shadcn/ui
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator'; // Mengganti Divider
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'; // Mengganti Alert
import { Loader2, AlertTriangle, XCircle } from 'lucide-react'; // Ikon untuk loading, error

// --- Komponen yang Dihilangkan/Diganti ---
// Box, Heading, Text, FormControl, FormLabel, VStack, HStack, Grid, GridItem,
// NumberInput, Radio, Checkbox dll. digantikan oleh <div> dengan kelas Tailwind.

// Mock data untuk pengguna
const mockUsers = [
  { id: 1, name: 'Inspector A', email: 'inspectorA@example.com', role: 'inspector' },
  { id: 2, name: 'Inspector B', email: 'inspectorB@example.com', role: 'inspector' },
  { id: 3, name: 'Drafter X', email: 'drafterX@example.com', role: 'drafter' },
  { id: 4, name: 'Drafter Y', email: 'drafterY@example.com', role: 'drafter' },
];

// Komponen Helper untuk Form Control
const FormControlWrapper = ({ label, isRequired, isInvalid, errorMessage, htmlFor, children }) => (
  <div className="space-y-2">
    {label && (
      <Label htmlFor={htmlFor} className={cn(isRequired && "after:content-['*'] after:ml-0.5 after:text-red-500", isInvalid && "text-destructive")}>
        {label}
      </Label>
    )}
    {children}
    {isInvalid && <p className="text-sm font-medium text-destructive mt-1">{errorMessage}</p>}
  </div>
);

const InspectionForm = ({ inspection, projectId, onSave, isEditing = false }) => {
  const [formData, setFormData] = useState({
    scheduled_date: '',
    inspector_id: '',
    drafter_id: '',
    notes: '',
    status: 'scheduled',
    ...inspection
  });
  
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const { toast } = useToast(); // Menggunakan useToast shadcn/ui
  const router = useRouter();

  // Handle form input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };
  
  // Handle select component changes (khusus untuk shadcn/ui Select)
  const handleSelectChange = (name, value) => {
    setFormData(prev => ({
        ...prev,
        [name]: value
    }));
    if (errors[name]) {
        setErrors(prev => ({
            ...prev,
            [name]: ''
        }));
    }
  };

  // Handle number input changes (dihapus karena tidak ada NumberInput di form ini)
  /*
  const handleNumberChange = (name, value) => {
    // ... logic
  };
  */

  // Validate form before submission
  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.scheduled_date) {
      newErrors.scheduled_date = 'Tanggal jadwal wajib diisi';
    }
    
    if (!formData.inspector_id) {
      newErrors.inspector_id = 'Inspektor wajib dipilih';
    }
    
    if (!formData.drafter_id) {
      newErrors.drafter_id = 'Drafter wajib dipilih';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission (Mock)
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast({
        title: 'Form Tidak Valid',
        description: 'Silakan perbaiki kesalahan pada form',
        variant: 'destructive',
        duration: 5000,
      });
      return;
    }
    
    setLoading(true);
    
    try {
      // Simulasi delay API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Buat objek data yang akan dikembalikan (simulasi response API)
      const responseData = {
        ...formData,
        id: inspection?.id || Math.floor(Math.random() * 10000),
        project_id: projectId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      toast({
        title: 'Berhasil',
        description: isEditing ? 'Data inspeksi berhasil diperbarui (Mock)' : 'Inspeksi baru berhasil dibuat (Mock)',
        variant: 'default',
        duration: 3000,
      });
      
      if (onSave) {
        onSave({ data: responseData });
      }
      
      if (responseData.id && projectId) {
        // Navigasi setelah berhasil disimpan
        router.push(`/dashboard/projects/${projectId}/inspections/${responseData.id}`);
      }
      
    } catch (error) {
      console.error('Inspection form error (Mock):', error);
      toast({
        title: 'Error',
        description: 'Gagal menyimpan data inspeksi (Mock)',
        variant: 'destructive',
        duration: 5000,
      });
    } finally {
      setLoading(false);
    }
  };

  // Get filtered users by role (dari mock data)
  const getUsersByRole = (role) => {
    return mockUsers.filter(user => user.role === role);
  };

  // Get inspection status options
  const getStatusOptions = () => {
    return [
      { value: 'scheduled', label: 'Scheduled' },
      { value: 'in_progress', label: 'In Progress' },
      { value: 'completed', label: 'Completed' },
      { value: 'cancelled', label: 'Cancelled' }
    ];
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Card
        className="shadow-md border-gray-200" // Mengganti Card styling
        as={motion.div}
        whileHover={{ boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)' }} // Simulasi boxShadow: 'lg'
        transition={{ duration: 0.2 }}
      >
        {/* CardBody -> CardContent */}
        <CardContent className="p-6"> 
          {/* VStack spacing={6} align="stretch" -> div flex flex-col space-y-6 */}
          <div className="flex flex-col space-y-6">
            
            {/* Box -> div */}
            <div>
              {/* Heading size="md" color="blue.600" -> h2 dengan kelas Tailwind */}
              <h2 className="text-xl font-semibold text-blue-600">
                {isEditing ? 'Edit Inspeksi' : 'Jadwalkan Inspeksi Baru'} (Mock Mode)
              </h2>
              {/* Text fontSize="sm" color="gray.500" mt={1} -> p dengan kelas Tailwind */}
              <p className="text-sm text-gray-500 mt-1">
                {isEditing
                  ? 'Perbarui informasi inspeksi (Mock)'
                  : 'Buat jadwal inspeksi baru untuk proyek (Mock)'}
              </p>
            </div>
            
            {/* Divider -> Separator */}
            <Separator />
            
            <form onSubmit={handleSubmit}>
              {/* VStack spacing={6} align="stretch" -> div flex flex-col space-y-6 */}
              <div className="flex flex-col space-y-6">
                
                {/* Schedule Information Box */}
                <div>
                  {/* Heading size="sm" mb={4} color="gray.700" -> h3 dengan kelas Tailwind */}
                  <h3 className="text-lg font-semibold mb-4 text-gray-700">
                    Informasi Jadwal Inspeksi (Mock)
                  </h3>
                  
                  {/* Grid templateColumns="repeat(2, 1fr)" gap={6} -> div grid grid-cols-1 md:grid-cols-2 gap-6 */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* GridItem colSpan={{ base: 2, md: 1 }} -> div col-span-1 */}
                    <div className="col-span-1">
                      <FormControlWrapper
                        label="Tanggal Jadwal (Mock)"
                        htmlFor="scheduled_date"
                        isRequired={true}
                        isInvalid={!!errors.scheduled_date}
                        errorMessage={errors.scheduled_date}
                      >
                        <Input
                          type="date"
                          id="scheduled_date"
                          name="scheduled_date"
                          value={formData.scheduled_date}
                          onChange={handleChange}
                          disabled={loading}
                          className={cn(!!errors.scheduled_date && "border-destructive focus:border-destructive")}
                        />
                      </FormControlWrapper>
                    </div>
                    
                    {/* GridItem colSpan={{ base: 2, md: 1 }} -> div col-span-1 */}
                    <div className="col-span-1">
                      <FormControlWrapper
                        label="Status (Mock)"
                        htmlFor="status"
                        isRequired={true}
                        isInvalid={!!errors.status}
                        errorMessage={errors.status}
                      >
                        {/* Selectshadcn/ui */}
                        <Select
                            name="status"
                            value={formData.status}
                            onValueChange={(v) => handleSelectChange('status', v)}
                            disabled={loading}
                        >
                            <SelectTrigger className={cn(!!errors.status && "border-destructive focus:ring-destructive ring-offset-destructive")}>
                                <SelectValue placeholder="Pilih Status" />
                            </SelectTrigger>
                            <SelectContent>
                                {getStatusOptions().map((option) => (
                                    <SelectItem key={option.value} value={option.value}>
                                        {option.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                      </FormControlWrapper>
                    </div>
                  </div>
                </div>
                
                {/* Divider -> Separator */}
                <Separator />
                
                {/* Team Assignment Box */}
                <div>
                  <h3 className="text-lg font-semibold mb-4 text-gray-700">
                    Penugasan Tim (Mock)
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Inspektor Select */}
                    <div className="col-span-1">
                      <FormControlWrapper
                        label="Inspektor (Mock)"
                        htmlFor="inspector_id"
                        isRequired={true}
                        isInvalid={!!errors.inspector_id}
                        errorMessage={errors.inspector_id}
                      >
                        {/* Select shadcn/ui */}
                        <Select
                            name="inspector_id"
                            value={formData.inspector_id}
                            onValueChange={(v) => handleSelectChange('inspector_id', v)}
                            disabled={loading}
                        >
                            <SelectTrigger className={cn(!!errors.inspector_id && "border-destructive focus:ring-destructive ring-offset-destructive")}>
                                <SelectValue placeholder="Pilih Inspektor (Mock)" />
                            </SelectTrigger>
                            <SelectContent>
                                {getUsersByRole('inspector').map((user) => (
                                    <SelectItem key={user.id} value={String(user.id)}>
                                        {user.name} ({user.email})
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                      </FormControlWrapper>
                    </div>
                    
                    {/* Drafter Select */}
                    <div className="col-span-1">
                      <FormControlWrapper
                        label="Drafter (Mock)"
                        htmlFor="drafter_id"
                        isRequired={true}
                        isInvalid={!!errors.drafter_id}
                        errorMessage={errors.drafter_id}
                      >
                        {/* Select shadcn/ui */}
                        <Select
                            name="drafter_id"
                            value={formData.drafter_id}
                            onValueChange={(v) => handleSelectChange('drafter_id', v)}
                            disabled={loading}
                        >
                            <SelectTrigger className={cn(!!errors.drafter_id && "border-destructive focus:ring-destructive ring-offset-destructive")}>
                                <SelectValue placeholder="Pilih Drafter (Mock)" />
                            </SelectTrigger>
                            <SelectContent>
                                {getUsersByRole('drafter').map((user) => (
                                    <SelectItem key={user.id} value={String(user.id)}>
                                        {user.name} ({user.email})
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                      </FormControlWrapper>
                    </div>
                  </div>
                </div>
                
                {/* Divider -> Separator */}
                <Separator />
                
                {/* Notes Box */}
                <div>
                  <h3 className="text-lg font-semibold mb-4 text-gray-700">
                    Catatan Tambahan (Mock)
                  </h3>
                  
                  <FormControlWrapper
                    label="Catatan (Mock)"
                    htmlFor="notes"
                    isInvalid={!!errors.notes}
                    errorMessage={errors.notes}
                  >
                    <Textarea
                      id="notes"
                      name="notes"
                      value={formData.notes}
                      onChange={handleChange}
                      placeholder="Masukkan catatan tambahan untuk inspeksi... (Mock)"
                      rows={4} // minHeight="100px"
                      disabled={loading}
                      className={cn(!!errors.notes && "border-destructive focus:border-destructive")}
                    />
                  </FormControlWrapper>
                </div>
                
                {/* Action Buttons HStack -> div flex justify-end space-x-4 pt-2 */}
                <div className="flex justify-end space-x-4 pt-2">
                  <Button
                    variant="outline"
                    onClick={() => router.push(`/dashboard/projects/${projectId}/inspections`)}
                    disabled={loading}
                  >
                    Batal (Mock)
                  </Button>
                  
                  <Button
                    type="submit"
                    disabled={loading}
                  >
                    {/* Icon Loading */}
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {isEditing ? "Perbarui Inspeksi (Mock)" : "Jadwalkan Inspeksi (Mock)"}
                  </Button>
                </div>
              </div>
            </form>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default InspectionForm;