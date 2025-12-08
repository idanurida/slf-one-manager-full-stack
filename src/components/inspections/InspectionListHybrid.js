// client/src/components/inspections/InspectionListHybrid.js

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, Loader2 } from 'lucide-react'; 

// =================================================================
// 1. ENVIRONMENT/SHADCN UI MOCKS (Disesuaikan dari InspectionList.js)
// =================================================================

const cn = (...classes) => {
  return classes.filter(Boolean).join(' ');
};

// Mock useRouter (Mengatasi 'next/router' error)
const mockRouter = {
  push: (path) => {
    console.log("Simulasi Navigasi ke:", path);
  },
};
const useRouter = () => mockRouter;

// Mock useToast 
const useToast = () => ({
  toast: ({ title, description, variant }) => {
    const message = `[Toast Simulasi - ${variant || 'default'}] ${title}: ${description}`;
    console.log(message);
  }
});

// Button Mock
const Button = ({ children, className = "", variant, size, onClick, disabled, ...props }) => (
    <button
        onClick={onClick}
        disabled={disabled}
        className={cn(
            "px-4 py-2 font-semibold rounded-lg transition duration-150 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none",
            (variant === "secondary" && "bg-gray-200 text-gray-800 hover:bg-gray-300"),
            (variant === "outline" && "border border-gray-300 text-gray-800 hover:bg-gray-50"),
            // Default primary color changed from blue to slate-900
            (!variant && "bg-slate-900 text-white hover:bg-slate-700"),
            (size === "lg" && "px-6 py-3 text-lg"),
            className
        )}
        {...props}
    >
        {children}
    </button>
);

// Card Mocks
const Card = ({ children, className = "", ...props }) => (
    <div className={cn("rounded-xl border bg-white text-gray-800 shadow-lg", className)} {...props}>
        {children}
    </div>
);
const CardHeader = ({ children, className = "" }) => <div className={cn("flex flex-col space-y-1.5 p-6", className)}>{children}</div>;
const CardTitle = ({ children, className = "" }) => <h3 className={cn("text-xl font-semibold leading-none tracking-tight", className)}>{children}</h3>;
const CardContent = ({ children, className = "" }) => <div className={cn("p-6 pt-0", className)}>{children}</div>;

// Input Mock
const Input = ({ className = "", value, onChange, placeholder, type = 'text', ...props }) => (
    <input
        type={type}
        // Focus color changed from blue-500 to slate-500
        className={cn("flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-slate-500 focus:ring-1 focus:ring-slate-500 outline-none transition-colors", className)}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        {...props}
    />
);
const Label = ({ children, className = "" }) => <label className={cn("text-sm font-medium leading-none text-gray-700", className)}>{children}</label>;
const Skeleton = ({ className = "" }) => <div className={cn("animate-pulse rounded-md bg-gray-200", className)} />;

// Select component mocks (simplified to native select)
const Select = ({ value, onValueChange, children, id }) => (
    <select
        id={id}
        value={value}
        onChange={(e) => onValueChange(e.target.value)}
        // Focus color changed from blue-500 to slate-500
        className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-slate-500 focus:ring-1 focus:ring-slate-500 outline-none transition-colors appearance-none pr-8"
    >
        {children}
    </select>
);
// Mock helper components for Select
const SelectTrigger = ({ children, id }) => <div className="hidden">{children}</div>;
const SelectValue = ({ placeholder }) => <option value="null" disabled hidden>{placeholder}</option>;
const SelectContent = ({ children }) => children;
const SelectItem = ({ value, children }) => <option value={value}>{children}</option>;

// Table component mocks 
const Table = ({ children }) => <div className="w-full overflow-auto"><table className="w-full caption-bottom text-sm border-collapse">{children}</table></div>;
const TableHeader = ({ children, className = "" }) => <thead className={cn("[&_tr]:border-b bg-gray-50", className)}>{children}</thead>;
const TableBody = ({ children }) => <tbody className="[&_tr:last-child]:border-0">{children}</tbody>;
const TableRow = ({ children, className = "" }) => <tr className={cn("border-b transition-colors hover:bg-gray-50/50", className)}>{children}</tr>;
const TableHead = ({ children, className = "" }) => <th className={cn("h-12 px-4 text-left align-middle font-medium text-gray-700", className)}>{children}</th>;
const TableCell = ({ children, className = "" }) => <td className={cn("p-4 align-middle", className)}>{children}</td>;


// =================================================================
// 2. SUPABASE INTEGRATION (Direct & Mocked for Self-Contained Demo)
// =================================================================

// Mock Data for Supabase Fallback/Simulation
const mockInspections = (projectId) => [
  {
    id: `mock-insp-${projectId}-1`,
    project_id: projectId || 1,
    scheduled_date: '2024-07-15T10:00:00Z',
    status: 'scheduled',
    inspector: { id: 1, name: 'Inspector Mock A' },
    drafter: { id: 3, name: 'Drafter Mock X' }
  },
  {
    id: `mock-insp-${projectId}-2`,
    project_id: projectId || 1,
    scheduled_date: '2024-07-20T14:00:00Z',
    status: 'in_progress',
    inspector: { id: 2, name: 'Inspector Mock B' },
    drafter: { id: 4, name: 'Drafter Mock Y' }
  },
  {
    id: `mock-insp-${projectId}-3`,
    project_id: projectId || 1,
    scheduled_date: '2024-06-28T09:00:00Z',
    status: 'completed',
    inspector: { id: 1, name: 'Inspector Mock A' },
    drafter: { id: 3, name: 'Drafter Mock X' }
  },
];

// Configuration placeholder (In a real app, this would use environment variables)
const SUPABASE_URL = 'https://mocked.supabase.co';
const SUPABASE_ANON_KEY = 'mocked-anon-key-12345';

// Mock Supabase Client and createClient function
// This simulates the Supabase client logic directly for self-contained execution.
const createClient = (supabaseUrl, supabaseAnonKey) => {
    // A simplified mock of the Supabase query builder chain
    const mockSupabase = {
        from: (table) => ({
            select: (columns = '*') => ({
                // Simulating query filters
                eq: (column, value) => ({
                    // Simulating ordering (can be ignored for this mock but kept for structure)
                    order: (col) => ({
                        // The core async function that resolves data
                        async then(resolve, reject) {
                            await new Promise(r => setTimeout(r, 800)); // Simulate network delay

                            // SIMULATION: If projectId is 999, simulate an API error
                            if (value === 999) {
                                console.error("[Supabase Mock] Simulated server error for ID 999");
                                reject({ error: new Error("Simulated Supabase server error") });
                                return;
                            }
                            
                            const data = mockInspections(value);
                            const error = data.length === 0 ? new Error("No data found") : null;
                            
                            // Supabase response structure: { data: [...], error: null }
                            resolve({ data: data, error: error });
                        }
                    }),
                    // Fallback resolve without order()
                    async then(resolve, reject) {
                        await new Promise(r => setTimeout(r, 800));
                        const data = mockInspections(value);
                        const error = data.length === 0 ? new Error("No data found") : null;
                        resolve({ data: data, error: error });
                    }
                })
            }),
        }),
    };
    console.log(`[Supabase Mock] Client initialized for: ${supabaseUrl.substring(0, 30)}...`);
    return mockSupabase;
};

// Initialize the mock client
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// =================================================================
// 3. COMPONENT LOGIC
// =================================================================

// Helper function untuk Badge/Status style
const getStatusBadge = (status) => {
  // Color scheme for status remains non-slate for clear distinction (Yellow, Orange, Green, Red)
  const statusClasses = {
    scheduled: "bg-yellow-100 text-yellow-800 border border-yellow-300",
    in_progress: "bg-orange-100 text-orange-800 border border-orange-300",
    completed: "bg-green-100 text-green-800 border border-green-300",
    cancelled: "bg-red-100 text-red-800 border border-red-300"
  };

  const statusText = (status || 'unknown').replace(/_/g, ' ');

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize",
        statusClasses[status] || "bg-gray-100 text-gray-800 border border-gray-300"
      )}
    >
      {statusText}
    </span>
  );
};

// Component utama
const InspectionListHybrid = ({ projectId = 123 }) => { 
  const [inspections, setInspections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const { toast } = useToast();
  const router = useRouter();

  // === FETCH DATA DENGAN SUPABASE (DIREKT IN KOMPONEN) === //
  useEffect(() => {
    const loadInspections = async () => {
      if (!projectId) {
        console.warn("âŒ projectId kosong â€” tidak memuat data.");
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        console.log("ðŸ“¡ Fetching inspections from Supabase (Mock) for project:", projectId);

        // Langsung menggunakan klien Supabase untuk fetching data
        const { data, error } = await supabase
            .from('vw_inspections_fixed') // Nama tabel di Supabase
            .select('*, inspector:inspector_id(id, name), drafter:drafter_id(id, name)') // Join relasi
            .eq('project_id', projectId)
            .order('scheduled_date', { ascending: false });

        if (error) {
          console.error("âŒ Supabase Error:", error);
          throw new Error(error.message || "Gagal memuat data dari Supabase.");
        }

        if (data && data.length > 0) {
          console.log("âœ… Supabase inspections loaded:", data);
          setInspections(data);
          toast({
            title: "Data Inspeksi Dimuat",
            description: `Berhasil memuat ${data.length} inspeksi dari Supabase.`,
            variant: "default",
          });
        } else {
          console.warn("âš ï¸ Supabase returned empty data, using mock fallback.");
          // Fallback ke mock data jika Supabase mengembalikan array kosong
          setInspections(mockInspections(projectId));
          toast({
            title: "Mode Mock Aktif",
            description: "Data Supabase kosong atau tidak ditemukan, menampilkan mock data.",
            variant: "warning",
          });
        }
      } catch (error) {
        console.error("âŒ General Error fetching/processing inspections:", error);
        // Fallback ke mock data jika ada error API/network
        setInspections(mockInspections(projectId));
        toast({
          title: "Kesalahan Data",
          description: `Gagal memuat dari Supabase. Menampilkan mock data. (${error.message})`,
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    loadInspections();
  }, [projectId]); 

  // === HANDLERS === //
  const handleViewInspection = (inspectionId) => {
    router.push(`/dashboard/projects/${projectId}/inspections/${inspectionId}`);
  };

  const handleScheduleInspection = () => {
    router.push(`/dashboard/projects/${projectId}/inspections/schedule`);
  };

  // === FILTER LOGIC === //
  const filteredInspections = inspections.filter(inspection => {
    // Match ID or Inspector Name
    const matchesSearch = inspection.id.toString().toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (inspection.inspector?.name && inspection.inspector.name.toLowerCase().includes(searchTerm.toLowerCase()));

    // Match Status
    const matchesStatus = statusFilter ? inspection.status === statusFilter : true;

    return matchesSearch && matchesStatus;
  });

  // === LOADING STATE === //
  if (loading) {
    return (
      <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
        <Skeleton className="h-10 w-64 mb-6" />
        <Card>
          <CardContent className="p-4 flex flex-wrap gap-4">
            <Skeleton className="h-10 w-full sm:w-[300px]" />
            <Skeleton className="h-10 w-full sm:w-[200px]" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex flex-col items-center justify-center h-48">
            {/* Spinner color changed to slate-500 */}
            <Loader2 className="h-8 w-8 text-slate-500 animate-spin" />
            <p className="mt-4 text-gray-500">Memuat data inspeksi dari Supabase...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // === MAIN RENDER === //
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="p-4 sm:p-6 min-h-screen bg-gray-50"
    >
      <div className="space-y-6">
        {/* Header and Add Button */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
          <div>
            {/* Heading color changed from blue-700 to slate-900 */}
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">
              Daftar Inspeksi
            </h1>
            <p className="text-sm text-muted-foreground mt-1 text-gray-600">
              Proyek: <span className="font-medium">ID {projectId}</span>
              <span className="text-xs ml-2 text-red-500 font-medium">(Integrasi Supabase Mock)</span>
            </p>
          </div>
          <Button
            // Button color changed from green-600 to slate-700
            className="mt-4 sm:mt-0 bg-slate-700 hover:bg-slate-800 text-white"
            onClick={handleScheduleInspection}
            size="lg"
          >
            Jadwalkan Inspeksi Baru
          </Button>
        </div>

        {/* Filters Card */}
        <Card className="shadow-lg">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              {/* Search Input */}
              <div className="relative w-full sm:max-w-xs">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input
                  placeholder="Cari ID atau nama inspektor..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Status Filter */}
              <div className="relative w-full sm:max-w-[200px]">
                <Label htmlFor="status-filter" className="sr-only">Filter Status</Label>
                <Select
                  value={statusFilter}
                  onValueChange={setStatusFilter}
                  id="status-filter"
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Filter berdasarkan status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="null">Semua Status</SelectItem>
                    <SelectItem value="scheduled">Scheduled</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
                {/* Visual arrow for select */}
                <svg xmlns="http://www.w3.org/2000/svg" className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 pointer-events-none text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
              </div>

              {/* Reset Button (Red color is kept for action clarity) */}
              {(searchTerm || statusFilter) && (
                <Button
                  onClick={() => {
                    setSearchTerm('');
                    setStatusFilter('');
                  }}
                  variant="outline"
                  className="border-red-500 text-red-500 hover:bg-red-50 hover:text-red-600 w-full sm:w-auto"
                >
                  Reset Filter
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Inspections Table Card */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl font-semibold">
                Detail Inspeksi
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="w-full overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[100px] font-semibold text-gray-700">ID</TableHead>
                    <TableHead className="font-semibold text-gray-700">Tanggal Jadwal</TableHead>
                    <TableHead className="font-semibold text-gray-700">Inspektor</TableHead>
                    <TableHead className="font-semibold text-gray-700">Drafter</TableHead>
                    <TableHead className="font-semibold text-gray-700">Status</TableHead>
                    <TableHead className="text-right font-semibold text-gray-700">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredInspections.length > 0 ? (
                    filteredInspections.map((inspection) => (
                      <TableRow key={inspection.id} className="hover:bg-gray-50/50">
                        <TableCell className="font-mono text-sm">
                          #{inspection.id}
                        </TableCell>
                        <TableCell>
                          {inspection.scheduled_date
                            ? new Date(inspection.scheduled_date).toLocaleDateString('id-ID', {
                                year: 'numeric', month: 'short', day: 'numeric'
                              })
                            : '-'}
                        </TableCell>
                        <TableCell>
                          {inspection.inspector?.name || '-'}
                        </TableCell>
                        <TableCell>
                          {inspection.drafter?.name || '-'}
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(inspection.status)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => handleViewInspection(inspection.id)}
                            // Button color changed from blue-500 to slate-500
                            className="bg-slate-500 hover:bg-slate-600 text-white"
                          >
                            Lihat Detail
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="h-24 text-center text-gray-500">
                        {searchTerm || statusFilter
                          ? 'Tidak ada inspeksi yang cocok dengan filter.'
                          : 'Belum ada inspeksi yang dijadwalkan.'}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </motion.div>
  );
};

export default InspectionListHybrid;


