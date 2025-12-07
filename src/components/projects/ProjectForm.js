// FILE: client/src/components/projects/ProjectForm.js
"use client";

import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { useRouter } from 'next/navigation'; // ✅ Gunakan next/navigation
import { motion } from 'framer-motion';

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
import { useToast } from '@/components/ui/use-toast'; // ✅ Gunakan useToast dari shadcn/ui

// Lucide Icons
import {
  FileText, Clock, Activity, CheckCircle, XCircle, Bell, Eye, Search, X,
  CheckSquare, AlertTriangle, Loader2, Info, Calendar, UserCheck, Plus, Save, RotateCcw
} from 'lucide-react';

// Other Imports
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { supabase } from '@/utils/supabaseClient';
import { getUserAndProfile } from '@/utils/auth';

// --- Mock data untuk pengguna ---
const mockUsers = [
  { id: 1, name: 'John Doe', email: 'john@example.com', role: 'project_lead' },
  { id: 2, name: 'Jane Smith', email: 'jane@example.com', role: 'project_lead' },
  { id: 3, name: 'Client A', email: 'clienta@example.com', role: 'client' },
  { id: 4, name: 'Client B', email: 'clientb@example.com', role: 'client' },
  // Tambahkan lebih banyak mock user jika diperlukan
];

const ProjectForm = ({ project, onSave, onCancel, isEditing = false }) => {
  const router = useRouter();
  const { toast } = useToast(); // ✅ Gunakan useToast dari shadcn/ui

  const [formData, setFormData] = useState({
    name: '',
    owner_name: '',
    address: '',
    building_function: '',
    floors: 1,
    height: '',
    area: '',
    location: '',
    coordinates: '',
    request_type: 'baru',
    project_lead_id: '',
    client_id: '',
    ...project // Jika ada data proyek yang sudah ada
  });

  const [loading, setLoading] = useState(false);
  // Gunakan mockUsers langsung, tidak perlu state untuk users
  // const [users, setUsers] = useState([]);
  const [errors, setErrors] = useState({});

  // Hilangkan useEffect untuk fetchUsers karena kita menggunakan mock data
  /*
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get('/api/users', {
          headers: { Authorization: `Bearer ${token}` }
        });

        setUsers(response.data.users || response.data);
      } catch (error) {
        console.error('Error fetching users:', error);
        toast({
          title: 'Error',
          description: 'Gagal memuat daftar pengguna',
          status: 'error', // ✅ Gunakan variant shadcn/ui
          duration: 5000,
          isClosable: true,
          position: 'top-right'
        });
      }
    };

    fetchUsers();
  }, [toast]);
  */

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

  // Handle number input changes
  const handleNumberChange = (name, value) => {
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

  // Validate form before submission
  const validateForm = () => {
    const newErrors = {};

    if (!formData.name?.trim()) {
      newErrors.name = 'Nama proyek wajib diisi';
    }

    if (!formData.owner_name?.trim()) {
      newErrors.owner_name = 'Nama pemilik wajib diisi';
    }

    if (!formData.address?.trim()) {
      newErrors.address = 'Alamat proyek wajib diisi';
    }

    if (!formData.building_function?.trim()) {
      newErrors.building_function = 'Fungsi bangunan wajib diisi';
    }

    if (!formData.floors || formData.floors < 1) {
      newErrors.floors = 'Jumlah lantai minimal 1';
    }

    if (!formData.request_type) {
      newErrors.request_type = 'Jenis permohonan wajib dipilih';
    }

    if (!formData.project_lead_id) {
      newErrors.project_lead_id = 'Project Lead wajib dipilih';
    }

    if (!formData.client_id) {
      newErrors.client_id = 'Klien wajib dipilih';
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
        variant: "destructive", // ✅ Gunakan variant shadcn/ui
        duration: 5000,
        isClosable: true,
        position: 'top-right'
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
        id: project?.id || Math.floor(Math.random() * 10000), // Gunakan ID yang ada atau buat mock ID
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      if (isEditing && project?.id) {
        toast({
          title: 'Berhasil',
          description: 'Data proyek berhasil diperbarui (Mock)',
          variant: "default", // ✅ Gunakan variant shadcn/ui
          duration: 3000,
          isClosable: true,
          position: 'top-right'
        });
      } else {
        toast({
          title: 'Berhasil',
          description: 'Proyek baru berhasil dibuat (Mock)',
          variant: "default", // ✅ Gunakan variant shadcn/ui
          duration: 3000,
          isClosable: true,
          position: 'top-right'
        });
      }

      // Call onSave callback if provided
      if (onSave) {
        // Simulate API response structure
        onSave({ data: responseData });
      }

      // Redirect to project detail page (Mock)
      // Kita tidak bisa melakukan redirect nyata karena ini mock, jadi kita bisa memanggil onCancel atau hanya menampilkan pesan
      // Untuk tujuan testing, kita bisa memanggil onCancel untuk kembali ke halaman sebelumnya
      // atau menggunakan router.push jika benar-benar diperlukan, tapi pastikan itu juga mock.
      // Dalam konteks komponen form, biasanya parent page yang menangani redirect setelah onSave.

    } catch (error) {
      console.error('Project form error (Mock):', error);
      toast({
        title: 'Error',
        description: 'Gagal menyimpan data proyek (Mock)',
        variant: "destructive", // ✅ Gunakan variant shadcn/ui
        duration: 5000,
        isClosable: true,
        position: 'top-right'
      });
    } finally {
      setLoading(false);
    }
  };

  // Get filtered users by role (dari mock data)
  const getUsersByRole = (role) => {
    // Sesuaikan role 'klien' dengan 'client' dari mock data jika perlu
    const normalizedRole = role === 'klien' ? 'client' : role;
    return mockUsers.filter(user => user.role === normalizedRole);
  };

  // Get building function options
  const getBuildingFunctionOptions = () => {
    return [
      'Rumah Tinggal',
      'Gedung Kantor',
      'Mall/Perbelanjaan',
      'Rumah Sakit',
      'Sekolah',
      'Hotel',
      'Apartemen',
      'Industri',
      'Gudang',
      'Terminal',
      'Bandara',
      'Pelabuhan',
      'Tempat Ibadah',
      'Tempat Rekreasi',
      'Fasilitas Umum',
      'Lainnya'
    ];
  };

  // Get request type options
  const getRequestTypeOptions = () => {
    return [
      { value: 'baru', label: 'SLF Baru' },
      { value: 'perpanjangan_slf', label: 'Perpanjangan SLF' },
      { value: 'perubahan_fungsi', label: 'Perubahan Fungsi' },
      { value: 'pascabencana', label: 'Pasca Bencana' }
    ];
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-6" // ✅ Ganti VStack dengan div space-y-6
    >
      <Card className="border-border"> {/* ✅ Ganti Card dengan Card shadcn/ui */}
        <CardContent className="p-6"> {/* ✅ Ganti CardBody dengan CardContent shadcn/ui */}
          <div className="space-y-6"> {/* ✅ Ganti VStack dengan div space-y-6 */}
            <div> {/* ✅ Ganti Box dengan div */}
              <h1 className="text-2xl font-bold text-blue-600"> {/* ✅ Ganti Heading dengan h1 */}
                {isEditing ? 'Edit Proyek' : 'Buat Proyek Baru'} (Mock Mode)
              </h1>
              <p className="text-muted-foreground"> {/* ✅ Ganti Text dengan p */}
                {isEditing
                  ? 'Perbarui informasi proyek (Mock)'
                  : 'Buat proyek baru untuk permohonan SLF (Mock)'}
              </p>
            </div>

            <Separator className="bg-border" /> {/* ✅ Ganti Divider dengan Separator shadcn/ui */}

            <form onSubmit={handleSubmit}>
              <div className="space-y-6"> {/* ✅ Ganti VStack dengan div space-y-6 */}
                {/* Basic Information Section */}
                <div> {/* ✅ Ganti Box dengan div */}
                  <h2 className="text-xl font-semibold text-gray-700 mb-4"> {/* ✅ Ganti Heading dengan h2 */}
                    Informasi Dasar Proyek
                  </h2>

                  <div className="grid grid-cols-1 gap-6 md:grid-cols-2"> {/* ✅ Ganti Grid dengan div grid */}
                    <div className="md:col-span-1"> {/* ✅ Ganti GridItem dengan div */}
                      <div className="space-y-2"> {/* ✅ Ganti FormControl dengan div space-y-2 */}
                        <Label htmlFor="name" className="text-sm font-medium text-foreground"> {/* ✅ Ganti FormLabel dengan Label */}
                          Nama Proyek *
                        </Label>
                        <Input
                          id="name"
                          name="name"
                          value={formData.name}
                          onChange={handleChange}
                          placeholder="Masukkan nama proyek"
                          disabled={loading} // ✅ Ganti isDisabled dengan disabled
                          className="bg-background" // ✅ Tambahkan class bg-background
                        />
                        {errors.name && <p className="text-sm text-destructive">{errors.name}</p>} {/* ✅ Ganti FormErrorMessage dengan p */}
                      </div>
                    </div>

                    <div className="md:col-span-1"> {/* ✅ Ganti GridItem dengan div */}
                      <div className="space-y-2"> {/* ✅ Ganti FormControl dengan div space-y-2 */}
                        <Label htmlFor="owner_name" className="text-sm font-medium text-foreground"> {/* ✅ Ganti FormLabel dengan Label */}
                          Nama Pemilik *
                        </Label>
                        <Input
                          id="owner_name"
                          name="owner_name"
                          value={formData.owner_name}
                          onChange={handleChange}
                          placeholder="Masukkan nama pemilik"
                          disabled={loading} // ✅ Ganti isDisabled dengan disabled
                          className="bg-background" // ✅ Tambahkan class bg-background
                        />
                        {errors.owner_name && <p className="text-sm text-destructive">{errors.owner_name}</p>} {/* ✅ Ganti FormErrorMessage dengan p */}
                      </div>
                    </div>

                    <div className="col-span-2"> {/* ✅ Ganti GridItem dengan div */}
                      <div className="space-y-2"> {/* ✅ Ganti FormControl dengan div space-y-2 */}
                        <Label htmlFor="address" className="text-sm font-medium text-foreground"> {/* ✅ Ganti FormLabel dengan Label */}
                          Alamat Proyek *
                        </Label>
                        <Textarea
                          id="address"
                          name="address"
                          value={formData.address}
                          onChange={handleChange}
                          placeholder="Masukkan alamat lengkap proyek"
                          rows={3}
                          disabled={loading} // ✅ Ganti isDisabled dengan disabled
                          className="bg-background min-h-[100px]" // ✅ Tambahkan class bg-background dan min-h
                        />
                        {errors.address && <p className="text-sm text-destructive">{errors.address}</p>} {/* ✅ Ganti FormErrorMessage dengan p */}
                      </div>
                    </div>
                  </div>
                </div>

                <Separator className="bg-border" /> {/* ✅ Ganti Divider dengan Separator shadcn/ui */}

                {/* Building Specifications Section */}
                <div> {/* ✅ Ganti Box dengan div */}
                  <h2 className="text-xl font-semibold text-gray-700 mb-4"> {/* ✅ Ganti Heading dengan h2 */}
                    Spesifikasi Bangunan
                  </h2>

                  <div className="grid grid-cols-1 gap-6 md:grid-cols-4"> {/* ✅ Ganti Grid dengan div grid */}
                    <div className="md:col-span-2"> {/* ✅ Ganti GridItem dengan div */}
                      <div className="space-y-2"> {/* ✅ Ganti FormControl dengan div space-y-2 */}
                        <Label htmlFor="building_function" className="text-sm font-medium text-foreground"> {/* ✅ Ganti FormLabel dengan Label */}
                          Fungsi Bangunan *
                        </Label>
                        <Select
                          name="building_function"
                          value={formData.building_function}
                          onValueChange={(value) => handleChange({ target: { name: 'building_function', value } })} // ✅ Sesuaikan dengan onValueChange shadcn
                        >
                          <SelectTrigger id="building_function" className="bg-background"> {/* ✅ Tambahkan class bg-background */}
                            <SelectValue placeholder="Pilih fungsi bangunan" />
                          </SelectTrigger>
                          <SelectContent>
                            {getBuildingFunctionOptions().map((option) => (
                              <SelectItem key={option} value={option}>
                                {option}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {errors.building_function && <p className="text-sm text-destructive">{errors.building_function}</p>} {/* ✅ Ganti FormErrorMessage dengan p */}
                      </div>
                    </div>

                    <div className="md:col-span-1"> {/* ✅ Ganti GridItem dengan div */}
                      <div className="space-y-2"> {/* ✅ Ganti FormControl dengan div space-y-2 */}
                        <Label htmlFor="floors" className="text-sm font-medium text-foreground"> {/* ✅ Ganti FormLabel dengan Label */}
                          Jumlah Lantai *
                        </Label>
                        <Input
                          id="floors"
                          name="floors"
                          type="number"
                          value={formData.floors}
                          onChange={(e) => handleNumberChange('floors', parseInt(e.target.value) || 1)}
                          min={1}
                          max={100}
                          disabled={loading} // ✅ Ganti isDisabled dengan disabled
                          className="bg-background" // ✅ Tambahkan class bg-background
                        />
                        {errors.floors && <p className="text-sm text-destructive">{errors.floors}</p>} {/* ✅ Ganti FormErrorMessage dengan p */}
                      </div>
                    </div>

                    <div className="md:col-span-1"> {/* ✅ Ganti GridItem dengan div */}
                      <div className="space-y-2"> {/* ✅ Ganti FormControl dengan div space-y-2 */}
                        <Label htmlFor="height" className="text-sm font-medium text-foreground"> {/* ✅ Ganti FormLabel dengan Label */}
                          Tinggi Bangunan (meter)
                        </Label>
                        <Input
                          id="height"
                          name="height"
                          type="number"
                          value={formData.height || ''}
                          onChange={(e) => handleNumberChange('height', parseFloat(e.target.value) || '')}
                          min={0}
                          step="0.01"
                          disabled={loading} // ✅ Ganti isDisabled dengan disabled
                          className="bg-background" // ✅ Tambahkan class bg-background
                          placeholder="0.00"
                        />
                        {errors.height && <p className="text-sm text-destructive">{errors.height}</p>} {/* ✅ Ganti FormErrorMessage dengan p */}
                      </div>
                    </div>

                    <div className="md:col-span-2"> {/* ✅ Ganti GridItem dengan div */}
                      <div className="space-y-2"> {/* ✅ Ganti FormControl dengan div space-y-2 */}
                        <Label htmlFor="area" className="text-sm font-medium text-foreground"> {/* ✅ Ganti FormLabel dengan Label */}
                          Luas Bangunan (m²)
                        </Label>
                        <Input
                          id="area"
                          name="area"
                          type="number"
                          value={formData.area || ''}
                          onChange={(e) => handleNumberChange('area', parseFloat(e.target.value) || '')}
                          min={0}
                          step="0.01"
                          disabled={loading} // ✅ Ganti isDisabled dengan disabled
                          className="bg-background" // ✅ Tambahkan class bg-background
                          placeholder="0.00"
                        />
                        {errors.area && <p className="text-sm text-destructive">{errors.area}</p>} {/* ✅ Ganti FormErrorMessage dengan p */}
                      </div>
                    </div>

                    <div className="md:col-span-2"> {/* ✅ Ganti GridItem dengan div */}
                      <div className="space-y-2"> {/* ✅ Ganti FormControl dengan div space-y-2 */}
                        <Label htmlFor="location" className="text-sm font-medium text-foreground"> {/* ✅ Ganti FormLabel dengan Label */}
                          Lokasi
                        </Label>
                        <Input
                          id="location"
                          name="location"
                          value={formData.location || ''}
                          onChange={handleChange}
                          placeholder="Masukkan lokasi proyek"
                          disabled={loading} // ✅ Ganti isDisabled dengan disabled
                          className="bg-background" // ✅ Tambahkan class bg-background
                        />
                        {errors.location && <p className="text-sm text-destructive">{errors.location}</p>} {/* ✅ Ganti FormErrorMessage dengan p */}
                      </div>
                    </div>

                    <div className="col-span-4"> {/* ✅ Ganti GridItem dengan div */}
                      <div className="space-y-2"> {/* ✅ Ganti FormControl dengan div space-y-2 */}
                        <Label htmlFor="coordinates" className="text-sm font-medium text-foreground"> {/* ✅ Ganti FormLabel dengan Label */}
                          Koordinat GPS
                        </Label>
                        <Input
                          id="coordinates"
                          name="coordinates"
                          value={formData.coordinates || ''}
                          onChange={handleChange}
                          placeholder="Contoh: -6.123456, 106.789012"
                          disabled={loading} // ✅ Ganti isDisabled dengan disabled
                          className="bg-background" // ✅ Tambahkan class bg-background
                        />
                        {errors.coordinates && <p className="text-sm text-destructive">{errors.coordinates}</p>} {/* ✅ Ganti FormErrorMessage dengan p */}
                      </div>
                    </div>
                  </div>
                </div>

                <Separator className="bg-border" /> {/* ✅ Ganti Divider dengan Separator shadcn/ui */}

                {/* Request Type Section */}
                <div> {/* ✅ Ganti Box dengan div */}
                  <h2 className="text-xl font-semibold text-gray-700 mb-4"> {/* ✅ Ganti Heading dengan h2 */}
                    Jenis Permohonan SLF
                  </h2>

                  <div className="grid grid-cols-1 gap-6 md:grid-cols-3"> {/* ✅ Ganti Grid dengan div grid */}
                    <div className="md:col-span-2"> {/* ✅ Ganti GridItem dengan div */}
                      <div className="space-y-2"> {/* ✅ Ganti FormControl dengan div space-y-2 */}
                        <Label htmlFor="request_type" className="text-sm font-medium text-foreground"> {/* ✅ Ganti FormLabel dengan Label */}
                          Jenis Permohonan *
                        </Label>
                        <Select
                          name="request_type"
                          value={formData.request_type}
                          onValueChange={(value) => handleChange({ target: { name: 'request_type', valu