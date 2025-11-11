// FILE: src/pages/dashboard/superadmin/projects/index.js
import React, { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/components/ui/use-toast";
import { 
  Trash2, 
  Plus, 
  Search, 
  Eye, 
  X, 
  AlertCircle,
  Loader2
} from "lucide-react";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { supabase } from "@/utils/supabaseClient";
import { getUserAndProfile } from "@/utils/auth";
import { useRouter } from "next/router";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";

const statusVariants = {
  draft: "secondary",
  active: "default",
  in_progress: "default",
  submitted: "outline",
  project_lead_review: "default",
  head_consultant_review: "default",
  client_review: "default",
  government_submitted: "default",
  slf_issued: "default",
  completed: "default",
  rejected: "destructive",
  cancelled: "destructive",
};

export default function SuperadminProjectsPage() {
  const router = useRouter();
  const { toast } = useToast();

  const [user, setUser] = useState(null);
  const [projects, setProjects] = useState([]);
  const [filteredProjects, setFilteredProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [projectLeads, setProjectLeads] = useState([]);
  const [clients, setClients] = useState([]);

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [selectedProjectLead, setSelectedProjectLead] = useState("all");

  // === FETCH DATA ===
  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);

    try {
      console.log('🔄 Fetching superadmin projects data...');

      // 1️⃣ Fetch daftar project leads
      const { data: leadData, error: leadErr } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .eq("role", "project_lead");
      if (leadErr) throw leadErr;
      setProjectLeads(leadData || []);
      console.log('✅ Project leads loaded:', leadData?.length || 0);

      // 2️⃣ Fetch daftar klien
      const { data: clientData, error: clientErr } = await supabase
        .from("clients")
        .select("id, name")
        .order("name", { ascending: true });
      if (clientErr) throw clientErr;
      setClients(clientData || []);
      console.log('✅ Clients loaded:', clientData?.length || 0);

      // 3️⃣ Fetch daftar proyek dengan query terpisah untuk menghindari join error
      const { data: projData, error: projErr } = await supabase
        .from("projects")
        .select("*")
        .order("created_at", { ascending: false });

      if (projErr) {
        console.error('❌ Projects fetch error:', projErr);
        throw projErr;
      }

      console.log('✅ Projects loaded:', projData?.length || 0);

      // Enrich data dengan client dan project lead names
      const enrichedProjects = await Promise.all(
        (projData || []).map(async (project) => {
          // Get client name
          let clientName = "-";
          if (project.client_id) {
            const { data: client } = await supabase
              .from("clients")
              .select("name")
              .eq("id", project.client_id)
              .single();
            clientName = client?.name || "-";
          }

          // Get project lead name
          let projectLeadName = "-";
          if (project.project_lead_id) {
            const { data: lead } = await supabase
              .from("profiles")
              .select("full_name, email")
              .eq("id", project.project_lead_id)
              .single();
            projectLeadName = lead?.full_name || lead?.email || "-";
          }

          return {
            id: project.id,
            name: project.name || 'N/A',
            address: project.address || "-",
            city: project.city || "-",
            status: project.status || 'draft',
            start_date: project.start_date,
            due_date: project.due_date,
            created_at: project.created_at,
            description: project.description,
            application_type: project.application_type,
            building_function: project.building_function,
            request_type: project.request_type,
            floors: project.floors,
            building_height: project.building_height,
            building_area: project.building_area,
            location: project.location,
            imb_number: project.imb_number,
            imb_date: project.imb_date,
            previous_slf_number: project.previous_slf_number,
            previous_slf_date: project.previous_slf_date,
            clientName,
            projectLeadName,
            project_lead_id: project.project_lead_id,
            client_id: project.client_id
          };
        })
      );

      setProjects(enrichedProjects);
      setFilteredProjects(enrichedProjects);

    } catch (err) {
      console.error("❌ Fetch error:", err);
      setError(err.message || "Gagal memuat data proyek.");
      toast({
        title: "Gagal memuat proyek",
        description: err.message,
        variant: "destructive",
      });
      setProjects([]);
      setFilteredProjects([]);
    } finally {
      setLoading(false);
    }
  }, [user, toast]);

  // === LOAD USER AUTH ===
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
        console.log('✅ Superadmin user loaded:', profile.email);
      } catch (e) {
        console.error("Auth error:", e);
        setError("Gagal memuat data pengguna.");
      }
    };
    loadUser();
  }, [router]);

  useEffect(() => {
    if (user?.role === "superadmin") {
      console.log('🔄 Starting data fetch for superadmin...');
      fetchData();
    }
  }, [user, fetchData]);

  // === FILTER ===
  useEffect(() => {
    let result = projects;
    
    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (p) =>
          p.name?.toLowerCase().includes(term) ||
          p.clientName?.toLowerCase().includes(term) ||
          p.address?.toLowerCase().includes(term) ||
          p.city?.toLowerCase().includes(term) ||
          p.projectLeadName?.toLowerCase().includes(term) ||
          p.application_type?.toLowerCase().includes(term) ||
          p.building_function?.toLowerCase().includes(term)
      );
    }
    
    // Filter by status
    if (selectedStatus !== "all") {
      result = result.filter((p) => p.status === selectedStatus);
    }
    
    // Filter by project lead
    if (selectedProjectLead !== "all") {
      result = result.filter((p) => p.project_lead_id === selectedProjectLead);
    }
    
    setFilteredProjects(result);
  }, [searchTerm, selectedStatus, selectedProjectLead, projects]);

  // === EXPORT ===
  const exportCSV = () => {
    if (filteredProjects.length === 0) {
      toast({
        title: "Tidak ada data",
        description: "Tidak ada data untuk di-export",
        variant: "destructive",
      });
      return;
    }

    const headers = [
      "Nama Proyek",
      "Klien",
      "Kota",
      "Alamat",
      "Project Lead",
      "Status",
      "Jenis Aplikasi",
      "Fungsi Bangunan",
      "Lantai",
      "Tinggi Bangunan (m)",
      "Luas Bangunan (m²)",
      "Tanggal Mulai",
      "Tanggal Selesai",
      "Tanggal Dibuat",
    ];
    const rows = filteredProjects.map((p) => [
      p.name,
      p.clientName,
      p.city,
      p.address,
      p.projectLeadName,
      p.status,
      p.application_type || "-",
      p.building_function || "-",
      p.floors || "-",
      p.building_height || "-",
      p.building_area || "-",
      p.start_date || "-",
      p.due_date || "-",
      p.created_at
        ? format(new Date(p.created_at), "dd/MM/yyyy", { locale: localeId })
        : "-",
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers, ...rows].map((e) => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "daftar_proyek.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast({
      title: "Export Berhasil",
      description: "File CSV telah berhasil diunduh",
    });
  };

  const exportExcel = async () => {
    if (filteredProjects.length === 0) {
      toast({
        title: "Tidak ada data",
        description: "Tidak ada data untuk di-export",
        variant: "destructive",
      });
      return;
    }

    try {
      const XLSX = await import("xlsx");
      const ws = XLSX.utils.json_to_sheet(
        filteredProjects.map((p) => ({
          "Nama Proyek": p.name,
          "Klien": p.clientName,
          "Kota": p.city,
          "Alamat": p.address,
          "Project Lead": p.projectLeadName,
          "Status": p.status,
          "Jenis Aplikasi": p.application_type || "-",
          "Fungsi Bangunan": p.building_function || "-",
          "Lantai": p.floors || "-",
          "Tinggi Bangunan (m)": p.building_height || "-",
          "Luas Bangunan (m²)": p.building_area || "-",
          "Tanggal Mulai": p.start_date || "-",
          "Tanggal Selesai": p.due_date || "-",
          "Tanggal Dibuat": p.created_at
            ? format(new Date(p.created_at), "dd/MM/yyyy", { locale: localeId })
            : "-",
        }))
      );
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Projects");
      XLSX.writeFile(wb, "Daftar_Proyek.xlsx");
      
      toast({
        title: "Export Berhasil",
        description: "File Excel telah berhasil diunduh",
      });
    } catch (err) {
      toast({
        title: "Export Gagal",
        description: "Gagal mengunduh file Excel",
        variant: "destructive",
      });
    }
  };

  // === HANDLER ===
  const handleDelete = async (id) => {
    if (!confirm("Yakin ingin menghapus proyek ini?")) return;
    try {
      const { error } = await supabase.from("projects").delete().eq("id", id);
      if (error) throw error;
      toast({
        title: "Proyek dihapus",
        description: "Proyek berhasil dihapus dari sistem",
      });
      fetchData();
    } catch (err) {
      toast({
        title: "Gagal menghapus proyek",
        description: err.message,
        variant: "destructive",
      });
    }
  };

  const handleViewDetail = (id) =>
    router.push(`/dashboard/superadmin/projects/${id}`);

  const resetFilters = () => {
    setSearchTerm("");
    setSelectedStatus("all");
    setSelectedProjectLead("all");
  };

  const formatDateSafely = (dateString) => {
    if (!dateString) return '-';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return '-';
      return format(date, 'dd MMM yy', { locale: localeId });
    } catch (e) {
      return dateString;
    }
  };

  // === UI ===
  if (loading)
    return (
      <DashboardLayout title="Daftar Projects" user={user}>
        <div className="p-4 md:p-6 text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="mt-3 text-muted-foreground">Memuat daftar proyek...</p>
        </div>
      </DashboardLayout>
    );

  return (
    <DashboardLayout title="Daftar Projects" user={user}>
      <div className="p-4 md:p-6">
        <div className="space-y-6">
          {/* Header - JUDUL UTAMA DIHAPUS karena duplikasi */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <p className="text-sm text-muted-foreground">
                Kelola semua proyek dalam sistem
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              <Select onValueChange={(value) => {
                if (value === "csv") exportCSV();
                if (value === "excel") exportExcel();
              }}>
                <SelectTrigger className="w-full sm:w-[140px] bg-background">
                  <SelectValue placeholder="Export" />
                </SelectTrigger>
                <SelectContent className="bg-background">
                  <SelectItem value="csv">Export CSV</SelectItem>
                  <SelectItem value="excel">Export Excel</SelectItem>
                </SelectContent>
              </Select>

              <Button
                onClick={() => router.push("/dashboard/superadmin/projects/new")}
                className="gap-2 w-full sm:w-auto"
              >
                <Plus className="h-4 w-4" />
                Tambah Project
              </Button>
            </div>
          </div>

          {/* Filter Section */}
          <Card className="border-border">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">Filter Data</CardTitle>
              <CardDescription className="text-sm">
                Filter proyek berdasarkan kriteria tertentu
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Cari nama proyek, klien, lokasi, jenis aplikasi, fungsi bangunan..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 bg-background"
                  />
                </div>

                <Select
                  value={selectedStatus}
                  onValueChange={setSelectedStatus}
                >
                  <SelectTrigger className="w-full sm:w-[200px] bg-background">
                    <SelectValue placeholder="Filter Status" />
                  </SelectTrigger>
                  <SelectContent className="bg-background">
                    <SelectItem value="all">Semua Status</SelectItem>
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

                <Select
                  value={selectedProjectLead}
                  onValueChange={setSelectedProjectLead}
                >
                  <SelectTrigger className="w-full sm:w-[200px] bg-background">
                    <SelectValue placeholder="Filter Project Lead" />
                  </SelectTrigger>
                  <SelectContent className="bg-background">
                    <SelectItem value="all">Semua Project Lead</SelectItem>
                    {projectLeads.map((pl) => (
                      <SelectItem key={pl.id} value={pl.id}>
                        {pl.full_name || pl.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Button
                  onClick={resetFilters}
                  disabled={!searchTerm && selectedStatus === "all" && selectedProjectLead === "all"}
                  variant="outline"
                  className="gap-2 bg-background"
                >
                  <X className="h-4 w-4" />
                  Reset
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Table */}
          <Card className="border-border">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">Data Proyek</CardTitle>
              <CardDescription className="text-sm">
                Daftar semua proyek dalam sistem ({filteredProjects.length} items)
              </CardDescription>
            </CardHeader>
            <CardContent>
              {error ? (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    {error}
                  </AlertDescription>
                </Alert>
              ) : filteredProjects.length > 0 ? (
                <div className="border border-border rounded-lg overflow-hidden">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader className="bg-muted/50">
                        <TableRow>
                          <TableHead className="bg-background">Nama Project</TableHead>
                          <TableHead className="bg-background hidden sm:table-cell">Klien</TableHead>
                          <TableHead className="bg-background hidden md:table-cell">Kota</TableHead>
                          <TableHead className="bg-background hidden lg:table-cell">Alamat</TableHead>
                          <TableHead className="bg-background hidden lg:table-cell">Project Lead</TableHead>
                          <TableHead className="bg-background">Status</TableHead>
                          <TableHead className="bg-background hidden xl:table-cell">Jenis Aplikasi</TableHead>
                          <TableHead className="bg-background hidden xl:table-cell">Fungsi Bangunan</TableHead>
                          <TableHead className="bg-background hidden md:table-cell">Tgl Mulai</TableHead>
                          <TableHead className="bg-background hidden md:table-cell">Tgl Selesai</TableHead>
                          <TableHead className="bg-background hidden lg:table-cell">Dibuat</TableHead>
                          <TableHead className="bg-background text-right">Aksi</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredProjects.map((p) => (
                          <TableRow key={p.id} className="hover:bg-accent/50 border-border">
                            <TableCell className="font-medium">
                              <div>
                                <p className="text-foreground">{p.name}</p>
                                <p className="text-xs text-muted-foreground sm:hidden">
                                  {p.clientName} • {p.city}
                                </p>
                                <p className="text-xs text-muted-foreground lg:hidden">
                                  {p.application_type && `${p.application_type} • `}{p.building_function}
                                </p>
                              </div>
                            </TableCell>
                            <TableCell className="hidden sm:table-cell text-foreground">{p.clientName}</TableCell>
                            <TableCell className="hidden md:table-cell text-foreground">{p.city}</TableCell>
                            <TableCell className="hidden lg:table-cell text-foreground">
                              <div className="max-w-[200px] truncate" title={p.address}>
                                {p.address}
                              </div>
                            </TableCell>
                            <TableCell className="hidden lg:table-cell text-foreground">{p.projectLeadName}</TableCell>
                            <TableCell>
                              <Badge variant={statusVariants[p.status] || "outline"} className="capitalize text-xs">
                                {p.status?.replace(/_/g, " ") || "N/A"}
                              </Badge>
                            </TableCell>
                            <TableCell className="hidden xl:table-cell text-foreground">
                              {p.application_type || "-"}
                            </TableCell>
                            <TableCell className="hidden xl:table-cell text-foreground">
                              {p.building_function || "-"}
                            </TableCell>
                            <TableCell className="hidden md:table-cell text-foreground">
                              {formatDateSafely(p.start_date)}
                            </TableCell>
                            <TableCell className="hidden md:table-cell text-foreground">
                              {formatDateSafely(p.due_date)}
                            </TableCell>
                            <TableCell className="hidden lg:table-cell text-foreground">
                              {formatDateSafely(p.created_at)}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-1">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleViewDetail(p.id)}
                                  className="gap-1 h-8 bg-background"
                                >
                                  <Eye className="h-3 w-3" />
                                  <span className="hidden sm:inline">Detail</span>
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => handleDelete(p.id)}
                                  className="gap-1 h-8"
                                >
                                  <Trash2 className="h-3 w-3" />
                                  <span className="hidden sm:inline">Hapus</span>
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              ) : (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    {projects.length === 0 
                      ? "Belum ada proyek dalam sistem." 
                      : "Tidak ditemukan proyek sesuai filter."
                    }
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}