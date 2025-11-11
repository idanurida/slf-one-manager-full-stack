// src/components/head-consultant/ApprovalWorkflowTimeline.js
import React, { useState, useEffect } from 'react';
import { FiClock, FiCheck, FiX } from 'react-icons/fi';
import { supabase } from '@/utils/supabaseClient';
import { AlertTriangle, Loader2 } from 'lucide-react'; // Mengganti Spinner dengan Loader2 dari lucide-react

// Asumsi Anda telah menambahkan komponen-komponen ini ke proyek shadcn/ui Anda:
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';

const APPROVAL_STEPS = [
  { role: 'project_lead', label: 'Project Lead' },
  { role: 'head_consultant', label: 'Head Consultant' },
  { role: 'client', label: 'Client' },
  { role: 'government', label: 'Government' },
];

/**
 * Mendapatkan status persetujuan untuk sebuah peran.
 * @param {string} stepRole 
 * @param {Array} approvals 
 * @returns {'approved' | 'rejected' | 'pending'}
 */
const getStepStatus = (stepRole, approvals) => {
  const approval = approvals.find(a => a.approver_role === stepRole);
  if (!approval) return 'pending';
  return approval.status;
};

/**
 * Mendapatkan properti styling dan ikon untuk Badge berdasarkan status.
 * @param {'approved' | 'rejected' | 'pending'} status 
 * @returns {{variant: 'default' | 'secondary' | 'destructive' | 'outline', icon: JSX.Element}}
 */
const getBadgeProps = (status) => {
  switch (status) {
    // Shadcn/ui tidak memiliki "colorScheme", kita menggunakan "variant"
    // Di sini saya memetakan ke varian yang mungkin sesuai, Anda mungkin perlu menyesuaikannya
    case 'approved': return { variant: 'default', className: 'bg-green-500 hover:bg-green-500/80', icon: <FiCheck className="w-4 h-4" /> };
    case 'rejected': return { variant: 'destructive', icon: <FiX className="w-4 h-4" /> };
    default: return { variant: 'secondary', className: 'bg-yellow-500 hover:bg-yellow-500/80', icon: <FiClock className="w-4 h-4" /> };
  }
};

const ApprovalWorkflowTimeline = () => {
  const [selectedReportId, setSelectedReportId] = useState('');
  const [reports, setReports] = useState([]);
  const [approvals, setApprovals] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fungsi untuk menangani perubahan Select shadcn/ui
  const handleReportChange = (value) => {
    setSelectedReportId(value);
  };

  useEffect(() => {
    const fetchReports = async () => {
      setLoading(true);
      setError(null);
      try {
        // Ambil checklist_responses
        const { data: responses, error: resError } = await supabase
          .from('checklist_responses')
          .select('id, created_at, project_id')
          .order('created_at', { ascending: false });

        if (resError) throw resError;

        // Validasi: pastikan responses adalah array
        if (!Array.isArray(responses) || responses.length === 0) {
          setReports([]);
          setSelectedReportId('');
          return;
        }

        // Ambil proyek
        const { data: projects, error: projError } = await supabase
          .from('projects')
          .select('id, name');

        if (projError) {
          console.warn('Gagal mengambil proyek:', projError);
        }

        // Gabungkan data dengan aman
        const enriched = responses.map(r => {
          const project = projects?.find(p => p.id === r.project_id);
          return {
            id: r.id,
            created_at: r.created_at,
            projectName: project?.name || (r.project_id ? 'Proyek Tidak Dikenal' : 'Tanpa Proyek')
          };
        });

        setReports(enriched);
        if (enriched.length > 0) {
          setSelectedReportId(enriched[0].id);
        }
      } catch (err) {
        console.error('Error fetching reports:', err);
        setError('Gagal memuat daftar laporan inspeksi.');
        setReports([]);
      } finally {
        setLoading(false);
      }
    };

    fetchReports();
  }, []);

  useEffect(() => {
    if (!selectedReportId) {
      setApprovals([]);
      return;
    }

    const fetchApprovals = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data, error } = await supabase
          .from('report_approvals')
          .select(`
            id,
            approver_role,
            status,
            comment,
            approved_at,
            profiles!approver_id(full_name)
          `)
          .eq('report_id', selectedReportId)
          .order('approved_at', { ascending: true });

        if (error) throw error;
        setApprovals(data || []);
      } catch (err) {
        console.error('Error fetching approvals:', err);
        setError('Gagal memuat alur persetujuan.');
      } finally {
        setLoading(false);
      }
    };

    fetchApprovals();
  }, [selectedReportId]);

  return (
    // VStack -> flex flex-col space-y-6
    <div className="flex flex-col space-y-6">
      {/* Heading -> h2 */}
      <h2 className="text-xl font-semibold tracking-tight">Timeline Persetujuan</h2>

      {/* Box -> div */}
      <div className="w-full">
        <p className="text-sm mb-2 text-gray-700">Pilih Laporan Inspeksi:</p>
        {/* Select component from shadcn/ui */}
        <Select
          value={selectedReportId}
          onValueChange={handleReportChange}
          disabled={reports.length === 0 || loading}
        >
          <SelectTrigger className="w-full max-w-sm">
            <SelectValue placeholder="Pilih Laporan" />
          </SelectTrigger>
          <SelectContent>
            {reports.length > 0 ? (
              reports.map((r) => (
                <SelectItem key={r.id} value={r.id}>
                  {r.projectName} - {new Date(r.created_at).toLocaleDateString('id-ID')}
                </SelectItem>
              ))
            ) : (
              <SelectItem value="" disabled>Tidak ada laporan</SelectItem>
            )}
          </SelectContent>
        </Select>
      </div>

      {loading && selectedReportId ? (
        // Spinner -> ikon Loader2 dan pesan
        <div className="flex items-center space-x-2 text-primary">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          <p>Memuat...</p>
        </div>
      ) : error ? (
        // Alert component menggunakan styling Tailwind biasa atau komponen Alert khusus
        <div className="flex items-start p-4 text-sm text-red-800 rounded-lg bg-red-50 dark:bg-gray-800 dark:text-red-400" role="alert">
          <AlertTriangle className="flex-shrink-0 w-4 h-4 mt-0.5" />
          <div className="ml-3 font-medium">
            {error}
          </div>
        </div>
      ) : (
        // VStack -> flex flex-col space-y-4 pl-2
        <div className="flex flex-col space-y-4 w-full border-l-2 border-gray-200 pl-4">
          {APPROVAL_STEPS.map((step, index) => {
            const status = getStepStatus(step.role, approvals);
            const { icon, className } = getBadgeProps(status);
            const approval = approvals.find(a => a.approver_role === step.role);

            const statusTextClass = status === 'approved' 
                ? 'bg-green-100 text-green-800' 
                : status === 'rejected' 
                ? 'bg-red-100 text-red-800' 
                : 'bg-yellow-100 text-yellow-800';
            
            // Konteks badge untuk ikon, menggunakan Tailwind untuk lingkaran dan posisi
            const iconWrapperClass = status === 'approved' 
                ? 'bg-green-500 text-white' 
                : status === 'rejected' 
                ? 'bg-red-500 text-white' 
                : 'bg-yellow-500 text-gray-800';

            return (
              <React.Fragment key={step.role}>
                {/* HStack -> flex items-start space-x-4 */}
                <div className="flex items-start space-x-4 relative">
                  {/* Posisikan ikon di garis timeline (simulasi) */}
                  <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center -ml-[2.5rem] mt-1 ${iconWrapperClass}`}>
                    {icon}
                  </div>

                  {/* VStack -> flex flex-col items-start space-y-1 */}
                  <div className="flex flex-col items-start space-y-1 pt-1">
                    <p className="font-bold text-gray-900">{step.label}</p>
                    {/* HStack -> flex items-center space-x-2 */}
                    <div className="flex items-center space-x-2 flex-wrap">
                      {/* Badge untuk status, menggunakan styling khusus untuk teks */}
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium uppercase ${statusTextClass}`}>
                        {status}
                      </span>
                      {approval && (
                        <>
                          <p className="text-sm text-gray-600">
                            {approval.profiles?.full_name || '—'}
                          </p>
                          <p className="text-sm text-gray-500">
                            {new Date(approval.approved_at).toLocaleString('id-ID')}
                          </p>
                        </>
                      )}
                    </div>
                    {approval?.comment && (
                      <p className="text-sm text-gray-700 italic mt-1">
                        Catatan: &quot;{approval.comment}&quot;
                      </p>
                    )}
                  </div>
                </div>
                {/* Divider -> Separator (tidak selalu ideal dalam timeline, 
                    tapi disimulasikan sebagai pemisah visual jika diperlukan di luar garis vertikal) */}
                {/* Di sini, garis vertikal yang dibuat oleh border-l-2 sudah berfungsi sebagai divider, 
                    jadi kita tidak perlu Separator horizontal yang memotong.
                    Jika ingin pemisah horizontal, gunakan: */}
                {/* {index < APPROVAL_STEPS.length - 1 && <Separator className="my-4" />} */}
              </React.Fragment>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ApprovalWorkflowTimeline;