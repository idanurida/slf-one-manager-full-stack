// client/src/components/inspections/InspectionList.js

// Import utama React
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search } from 'lucide-react'; // Mengganti ikon

// --- UTILITY: cn function (Dipindahkan ke sini agar self-contained) ---
const cn = (...classes) => {
  return classes.filter(Boolean).join(' ');
};

// --- ENVIRONMENT/SHADCN UI MOCKS (Mengatasi error resolusi impor) ---

// 1. Mock useRouter (Mengatasi 'next/router' error)
const mockRouter = {
  push: (path) => {
    console.log("Simulasi Navigasi ke:", path);
  },
};
const useRouter = () => mockRouter;

// 2. Mock useToast (Mengatasi '@/components/ui/use-toast' error)
const useToast = () => ({
  toast: ({ title, description, variant }) => {
    const message = `[Toast Simulasi - ${variant || 'default'}] ${title}: ${description}`;
    console.log(message);
    // Di lingkungan nyata, ini akan menampilkan notifikasi. Output konsol digunakan untuk simulasi.
  }
});

// 3. Simplified Component Mocks (Mengatasi semua '@/components/ui/*' alias error)

// Button Mock
const Button = ({ children, className = "", variant, size, onClick, ...props }) => (
    <button
        onClick={onClick}
        className={cn(
            "px-4 py-2 font-semibold rounded-lg transition duration-150 active:scale-[0.98]",
            (variant === "secondary" && "bg-gray-200 text-gray-800 hover:bg-gray-300"),
            (variant === "outline" && "border border-gray-300 text-gray-800 hover:bg-gray-50"),
            (!variant && "bg-blue-600 text-white hover:bg-blue-700"),
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
    <div className={cn("rounded-xl border bg-white text-gray-800 shadow-md", className)} {...props}>
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
        className={cn("flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-colors", className)}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        {...props}
    />
);
const Label = ({ children, className = "" }) => <label className={cn("text-sm font-medium leading-none text-gray-700", className)}>{children}</label>;
const Skeleton = ({ className = "" }) => <div className={cn("animate-pulse rounded-md bg-gray-200", className)} />;

// Select component mocks (simplified)
const Select = ({ value, onValueChange, children }) => (
    <select
        value={value}
        onChange={(e) => onValueChange(e.target.value)}
        className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-colors appearance-none pr-8"
    >
        {children}
    </select>
);
// Karena kita menggunakan tag <select> langsung, komponen-komponen ini hanya menjadi placeholder
const SelectTrigger = ({ children, id }) => <div className="hidden">{children}</div>;
const SelectValue = ({ placeholder }) => <option value="" disabled hidden>{placeholder}</option>;
const SelectContent = ({ children }) => children;
const SelectItem = ({ value, children }) => <option value={value}>{children}</option>;

// Table component mocks (simplified)
const Table = ({ children }) => <div className="w-full overflow-auto"><table className="w-full caption-bottom text-sm border-collapse">{children}</table></div>;
const TableHeader = ({ children, className = "" }) => <thead className={cn("[&_tr]:border-b bg-gray-50", className)}>{children}</thead>;
const TableBody = ({ children }) => <tbody className="[&_tr:last-child]:border-0">{children}</tbody>;
const TableRow = ({ children, className = "" }) => <tr className={cn("border-b transition-colors hover:bg-gray-50/50", className)}>{children}</tr>;
const TableHead = ({ children, className = "" }) => <th className={cn("h-12 px-4 text-left align-middle font-medium text-gray-700", className)}>{children}</th>;
const TableCell = ({ children, className = "" }) => <td className={cn("p-4 align-middle", className)}>{children}</td>;


// --- LOGIC DARI FILE ASLI (InspectionList Component) ---

// Mock data untuk pengujian frontend
const mockUser = {
  id: 1,
  name: 'Inspector Mock User',
  email: 'inspector@mock.com',
  role: 'inspector'
};

// Fungsi untuk menghasilkan mock data inspeksi
const mockInspections = (projectId) => [
  {
    id: 1,
    project_id: projectId || 1,
    scheduled_date: '2023-07-15T10:00:00Z',
    status: 'scheduled',
    inspector: { id: 1, name: 'Inspector A' },
    drafter: { id: 3, name: 'Drafter X' }
  },
  {
    id: 2,
    project_id: projectId || 1,
    scheduled_date: '2023-07-20T14:00:00Z',
    status: 'in_progress',
    inspector: { id: 2, name: 'Inspector B' },
    drafter: { id: 4, name: 'Drafter Y' }
  },
  {
    id: 3,
    project_id: projectId || 1,
    scheduled_date: '2023-06-28T09:00:00Z',
    status: 'completed',
    inspector: { id: 1, name: 'Inspector A' },
    drafter: { id: 3, name: 'Drafter X' }
  },
  {
    id: 4,
    project_id: projectId || 1,
    scheduled_date: '2023-08-05T11:00:00Z',
    status: 'scheduled',
    inspector: { id: 2, name: 'Inspector B' },
    drafter: { id: 4, name: 'Drafter Y' }
  }
];

// Helper function untuk Badge/Status style
const getStatusBadge = (status) => {
  const statusClasses = {
    scheduled: "bg-yellow-100 text-yellow-800 border border-yellow-300",
    in_progress: "bg-orange-100 text-orange-800 border border-orange-300",
    completed: "bg-green-100 text-green-800 border border-green-300",
    cancelled: "bg-red-100 text-red-800 border border-red-300"
  };

  const statusText = status.replace(/_/g, ' ');

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
const InspectionList = ({ projectId = 123 }) => { // Set default projectId agar bisa dijalankan
  const [user, setUser] = useState(mockUser);
  const [inspections, setInspections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const { toast } = useToast();
  const router = useRouter();

  // Modifikasi useEffect untuk fetchInspections agar menggunakan mock data
  useEffect(() => {
    // Simulasi loading data
    const fetchInspections = async () => {
      if (!projectId) return;

      try {
        setLoading(true);

        // Simulasi delay API call
        await new Promise(resolve => setTimeout(resolve, 800));

        // Gunakan mock data
        setInspections(mockInspections(projectId));

        toast({
            title: "Data Mock Inspeksi Dimuat",
            description: "Menggunakan data simulasi untuk Project ID: " + projectId,
            variant: "default",
        });

      } catch (err) {
        console.error('Error fetching inspections (Mock):', err);
        toast({
          title: 'Error',
          description: 'Gagal memuat data inspeksi (Mock)',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    fetchInspections();
  }, [projectId]); 

  const handleViewInspection = (inspectionId) => {
    router.push(`/dashboard/projects/${projectId}/inspections/${inspectionId}`);
  };

  const handleScheduleInspection = () => {
    router.push(`/dashboard/projects/${projectId}/inspections/schedule`);
  };

  // Filter inspections
  const filteredInspections = inspections.filter(inspection => {
    const matchesSearch = inspection.id.toString().includes(searchTerm) ||
                          (inspection.inspector?.name && inspection.inspector.name.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus = statusFilter ? inspection.status === statusFilter : true;

    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        {/* Header Skeleton */}
        <div className="flex justify-between items-center mb-6">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-10 w-52" />
        </div>

        {/* Filters Skeleton */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-4">
              <Skeleton className="h-10 w-full sm:w-[300px]" />
              <Skeleton className="h-10 w-full sm:w-[200px]" />
            </div>
          </CardContent>
        </Card>

        {/* Table Skeleton */}
        <Card>
          <CardContent className="p-4">
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

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
            <h1 className="text-3xl font-bold tracking-tight text-blue-700">
              Daftar Inspeksi
            </h1>
            <p className="text-sm text-muted-foreground mt-1 text-gray-600">
              Proyek: <span className="font-medium">{projectId ? `ID ${projectId} (Mock)` : 'Semua Proyek (Mock)'}</span>
            </p>
          </div>
          <Button
            className="mt-4 sm:mt-0 bg-green-600 hover:bg-green-700"
            onClick={handleScheduleInspection}
            size="lg"
          >
            Jadwalkan Inspeksi Baru (Mock)
          </Button>
        </div>

        {/* Filters Card */}
        <Card className="shadow-lg">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              {/* Search Input */}
              <div className="relative w-full sm:max-w-xs">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground text-gray-400" />
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
                    <SelectItem value="">Semua Status</SelectItem>
                    <SelectItem value="scheduled">Scheduled</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
                {/* Visual arrow for select */}
                <svg xmlns="http://www.w3.org/2000/svg" className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 pointer-events-none text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
              </div>

              {/* Reset Button */}
              {(searchTerm || statusFilter) && (
                <Button
                  onClick={() => {
                    setSearchTerm('');
                    setStatusFilter('');
                  }}
                  variant="outline"
                  className="border-red-500 text-red-500 hover:bg-red-50 hover:text-red-600 w-full sm:w-auto"
                >
                  Reset Filter (Mock)
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Inspections Table Card */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl font-semibold">
                Inspeksi Proyek {projectId}
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
                            className="bg-blue-500 hover:bg-blue-600 text-white"
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

export default InspectionList;
