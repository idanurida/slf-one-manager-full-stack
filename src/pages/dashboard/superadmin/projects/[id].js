"use client";

import React, { useEffect, useState } from "react";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { supabase } from "@/utils/supabaseClient";
import { getUserAndProfile } from "@/utils/auth";

// Fungsi untuk mendapatkan project by ID
const getProjectById = async (id) => {
  try {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching project:', error);
    throw error;
  }
};

// Fungsi untuk update project
const updateProject = async (id, formData) => {
  try {
    const updateData = {
      name: formData.name,
      address: formData.address,
      city: formData.city,
      status: formData.status,
      project_lead_id: formData.project_lead_id || null,
      client_id: formData.client_id || null,
      start_date: formData.start_date || null,
      due_date: formData.due_date || null,
      description: formData.description || null,
      application_type: formData.application_type || null,
      building_function: formData.building_function || null,
      request_type: formData.request_type || null,
      floors: formData.floors ? parseInt(formData.floors) : null,
      building_height: formData.building_height ? parseFloat(formData.building_height) : null,
      building_area: formData.building_area ? parseFloat(formData.building_area) : null,
      location: formData.location || null,
      imb_number: formData.imb_number || null,
      imb_date: formData.imb_date || null,
      previous_slf_number: formData.previous_slf_number || null,
      previous_slf_date: formData.previous_slf_date || null,
      is_special_function: formData.is_special_function || false,
      special_function_type: formData.special_function_type || null,
      special_building_type: formData.special_building_type || null,
      compliance_status: formData.compliance_status || null,
      region_name: formData.region_name || null,
      authority_title: formData.authority_title || null,
      department_name: formData.department_name || null,
      region_id: formData.region_id || null,
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('projects')
      .update(updateData)
      .eq('id', id)
      .select();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error updating project:', error);
    throw error;
  }
};

// Fungsi untuk delete project
const deleteProject = async (id) => {
  try {
    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error deleting project:', error);
    throw error;
  }
};

// Fungsi untuk mendapatkan profiles by role
const getProfilesByRole = async (role) => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .eq('role', role);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching profiles:', error);
    throw error;
  }
};

// Fungsi untuk mendapatkan clients
const getClients = async () => {
  try {
    const { data, error } = await supabase
      .from('clients')
      .select('id, name, email');

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching clients:', error);
    throw error;
  }
};

export default function EditProjectPage({ params }) {
  const router = useRouter();
  const { toast } = useToast();
  const [user, setUser] = useState(null);

  // Gunakan params.id dari Next.js 15+ atau ambil dari URL
  const projectId = params?.id || (typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('id') : null);

  const [form, setForm] = useState({
    name: '',
    address: '',
    city: '',
    status: 'draft',
    project_lead_id: '',
    client_id: '',
    start_date: '',
    due_date: '',
    description: '',
    application_type: '',
    building_function: '',
    request_type: '',
    floors: '',
    building_height: '',
    building_area: '',
    location: '',
    imb_number: '',
    imb_date: '',
    previous_slf_number: '',
    previous_slf_date: '',
    is_special_function: false,
    special_function_type: '',
    special_building_type: '',
    compliance_status: '',
    region_name: '',
    authority_title: '',
    department_name: '',
    region_id: ''
  });

  const [clients, setClients] = useState([]);
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const handleChange = (name, value) => {
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  // Load user authentication
  useEffect(() => {
    const loadUser = async () => {
      try {
        const { user: authUser, profile } = await getUserAndProfile();
        if (!authUser || !profile || profile.role !== "superadmin") {
          console.warn('User bukan superadmin atau tidak ada profil');
          router.push("/login");
          return;
        }
        setUser(profile);
      } catch (e) {
        console.error("Auth error:", e);
        toast({
          title: "Gagal memuat data pengguna",
          description: "Silakan login kembali.",
          variant: "destructive",
        });
        router.push("/login");
      }
    };
    loadUser();
  }, [router, toast]);

  // Load project data
  useEffect(() => {
    if (!projectId || !user) return;

    const loadData = async () => {
      try {
        setLoading(true);
        console.log('🔄 Loading project data for ID:', projectId);

        // Load project data, clients, and project leads in parallel
        const [projectData, clientsData, leadsData] = await Promise.all([
          getProjectById(projectId),
          getClients(),
          getProfilesByRole("project_lead")
        ]);

        if (!projectData) {
          throw new Error("Proyek tidak ditemukan");
        }

        console.log('✅ Project data loaded:', projectData);
        console.log('✅ Clients loaded:', clientsData?.length);
        console.log('✅ Project leads loaded:', leadsData?.length);

        // Format dates for input fields
        const formattedProject = {
          ...projectData,
          start_date: projectData.start_date ? projectData.start_date.split('T')[0] : '',
          due_date: projectData.due_date ? projectData.due_date.split('T')[0] : '',
          imb_date: projectData.imb_date ? projectData.imb_date.split('T')[0] : '',
          previous_slf_date: projectData.previous_slf_date ? projectData.previous_slf_date.split('T')[0] : '',
          floors: projectData.floors?.toString() || '',
          building_height: projectData.building_height?.toString() || '',
          building_area: projectData.building_area?.toString() || ''
        };

        setForm(formattedProject);
        setClients(clientsData);
        setLeads(leadsData);

      } catch (error) {
        console.error("Error loading project:", error);
        toast({
          title: "Gagal memuat data proyek",
          description: error.message || "Silakan coba lagi.",
          variant: "destructive",
        });
        router.push("/dashboard/superadmin/projects");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [projectId, user, router, toast]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!projectId) return;

    setSaving(true);
    try {
      console.log('🔄 Updating project:', form);

      await updateProject(projectId, form);

      toast({
        title: "Proyek diperbarui",
        description: "Perubahan berhasil disimpan.",
        variant: "default",
      });

      router.push("/dashboard/superadmin/projects");
    } catch (error) {
      console.error("Update error:", error);
      toast({
        title: "Gagal memperbarui proyek",
        description: error.message || "Terjadi kesalahan saat menyimpan.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (
      !projectId ||
      !confirm(
        "Yakin ingin menghapus proyek ini? Tindakan ini tidak dapat dikembalikan."
      )
    )
      return;

    try {
      await deleteProject(projectId);
      toast({
        title: "Proyek dihapus",
        description: "Proyek berhasil dihapus dari sistem.",
        variant: "default",
      });
      router.push("/dashboard/superadmin/projects");
    } catch (error) {
      console.error("Delete error:", error);
      toast({
        title: "Gagal menghapus proyek",
        description: error.message || "Pastikan proyek tidak sedang digunakan.",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <DashboardLayout title="Edit Proyek" user={user}>
        <div className="flex min-h-[400px] items-center justify-center">
          <div className="text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
            <p className="mt-3 text-muted-foreground">Memuat data proyek...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Edit Proyek" user={user}>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="space-y-6"
      >
        <Card className="border-border">
          <CardHeader>
            <CardTitle>Edit Proyek</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Informasi Dasar Proyek */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Nama Proyek */}
                <div className="space-y-2">
                  <Label htmlFor="name">Nama Proyek *</Label>
                  <Input
                    id="name"
                    value={form.name || ""}
                    onChange={(e) => handleChange("name", e.target.value)}
                    required
                    className="bg-background"
                  />
                </div>

                {/* Status */}
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={form.status || "draft"}
                    onValueChange={(value) => handleChange("status", value)}
                  >
                    <SelectTrigger className="bg-background">
                      <SelectValue placeholder="Pilih Status" />
                    </SelectTrigger>
                    <SelectContent className="bg-background">
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="submitted">Submitted</SelectItem>
                      <SelectItem value="project_lead_review">Project Lead Review</SelectItem>
                      <SelectItem value="head_consultant_review">Head Consultant Review</SelectItem>
                      <SelectItem value="client_review">Client Review</SelectItem>
                      <SelectItem value="government_submitted">Government Submitted</SelectItem>
                      <SelectItem value="slf_issued">SLF Issued</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Lokasi */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="address">Alamat</Label>
                  <Textarea
                    id="address"
                    value={form.address || ""}
                    onChange={(e) => handleChange("address", e.target.value)}
                    className="bg-background"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="city">Kota</Label>
                  <Input
                    id="city"
                    value={form.city || ""}
                    onChange={(e) => handleChange("city", e.target.value)}
                    className="bg-background"
                  />
                </div>
              </div>

              {/* Tim dan Klien */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="project_lead_id">Project Lead</Label>
                  <Select
                    value={form.project_lead_id || ""}
                    onValueChange={(value) => handleChange("project_lead_id", value)}
                  >
                    <SelectTrigger className="bg-background">
                      <SelectValue placeholder="Pilih Project Lead" />
                    </SelectTrigger>
                    <SelectContent className="bg-background">
                      {leads.map((l) => (
                        <SelectItem key={l.id} value={l.id}>
                          {l.full_name || l.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="client_id">Client</Label>
                  <Select
                    value={form.client_id || ""}
                    onValueChange={(value) => handleChange("client_id", value)}
                  >
                    <SelectTrigger className="bg-background">
                      <SelectValue placeholder="Pilih Client" />
                    </SelectTrigger>
                    <SelectContent className="bg-background">
                      {clients.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name || c.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Timeline */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="start_date">Tanggal Mulai</Label>
                  <Input
                    id="start_date"
                    type="date"
                    value={form.start_date || ""}
                    onChange={(e) => handleChange("start_date", e.target.value)}
                    className="bg-background"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="due_date">Tanggal Selesai</Label>
                  <Input
                    id="due_date"
                    type="date"
                    value={form.due_date || ""}
                    onChange={(e) => handleChange("due_date", e.target.value)}
                    className="bg-background"
                  />
                </div>
              </div>

              {/* Informasi Teknis */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="application_type">Jenis Aplikasi</Label>
                  <Input
                    id="application_type"
                    value={form.application_type || ""}
                    onChange={(e) => handleChange("application_type", e.target.value)}
                    placeholder="Contoh: slf_baru"
                    className="bg-background"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="building_function">Fungsi Bangunan</Label>
                  <Input
                    id="building_function"
                    value={form.building_function || ""}
                    onChange={(e) => handleChange("building_function", e.target.value)}
                    placeholder="Contoh: PABRIK"
                    className="bg-background"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="request_type">Tipe Permintaan</Label>
                  <Input
                    id="request_type"
                    value={form.request_type || ""}
                    onChange={(e) => handleChange("request_type", e.target.value)}
                    className="bg-background"
                  />
                </div>
              </div>

              {/* Spesifikasi Bangunan */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="floors">Jumlah Lantai</Label>
                  <Input
                    id="floors"
                    type="number"
                    value={form.floors || ""}
                    onChange={(e) => handleChange("floors", e.target.value)}
                    className="bg-background"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="building_height">Tinggi Bangunan (m)</Label>
                  <Input
                    id="building_height"
                    type="number"
                    step="0.1"
                    value={form.building_height || ""}
                    onChange={(e) => handleChange("building_height", e.target.value)}
                    className="bg-background"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="building_area">Luas Bangunan (m²)</Label>
                  <Input
                    id="building_area"
                    type="number"
                    step="0.1"
                    value={form.building_area || ""}
                    onChange={(e) => handleChange("building_area", e.target.value)}
                    className="bg-background"
                  />
                </div>
              </div>

              {/* Informasi IMB */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="imb_number">Nomor IMB</Label>
                  <Input
                    id="imb_number"
                    value={form.imb_number || ""}
                    onChange={(e) => handleChange("imb_number", e.target.value)}
                    className="bg-background"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="imb_date">Tanggal IMB</Label>
                  <Input
                    id="imb_date"
                    type="date"
                    value={form.imb_date || ""}
                    onChange={(e) => handleChange("imb_date", e.target.value)}
                    className="bg-background"
                  />
                </div>
              </div>

              {/* Informasi SLF Sebelumnya */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="previous_slf_number">Nomor SLF Sebelumnya</Label>
                  <Input
                    id="previous_slf_number"
                    value={form.previous_slf_number || ""}
                    onChange={(e) => handleChange("previous_slf_number", e.target.value)}
                    className="bg-background"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="previous_slf_date">Tanggal SLF Sebelumnya</Label>
                  <Input
                    id="previous_slf_date"
                    type="date"
                    value={form.previous_slf_date || ""}
                    onChange={(e) => handleChange("previous_slf_date", e.target.value)}
                    className="bg-background"
                  />
                </div>
              </div>

              {/* Informasi Tambahan */}
              <div className="space-y-2">
                <Label htmlFor="description">Deskripsi</Label>
                <Textarea
                  id="description"
                  value={form.description || ""}
                  onChange={(e) => handleChange("description", e.target.value)}
                  className="bg-background"
                />
              </div>

              {/* Tombol Aksi */}
              <div className="flex flex-col gap-3 pt-2">
                <Button type="submit" disabled={saving} className="w-full">
                  {saving ? (
                    <>
                      <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      Menyimpan...
                    </>
                  ) : (
                    "Simpan Perubahan"
                  )}
                </Button>

                <Button
                  type="button"
                  variant="destructive"
                  onClick={handleDelete}
                  className="w-full"
                >
                  Hapus Proyek
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push("/dashboard/superadmin/projects")}
                  className="w-full bg-background"
                >
                  Kembali ke Daftar
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </DashboardLayout>
  );
}

// Handle server-side props for Next.js
export async function getServerSideProps(context) {
  return {
    props: {
      params: context.params || {}
    }
  };
}