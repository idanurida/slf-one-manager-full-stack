// FILE: src/components/project-lead/ApprovalWorkflowTimeline.js
"use client";

import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';

// shadcn/ui Components
import { Badge } from '@/components/ui/badge';
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/use-toast';

// Lucide Icons
import {
  FileText, Clock, Activity, CheckCircle, XCircle, Bell, Eye, Search, X,
  CheckSquare, AlertTriangle, Loader2, Info, Calendar, UserCheck, Camera, Plus, Save, RotateCcw
} from 'lucide-react';

// Other Imports
import { supabase } from '@/utils/supabaseClient';

// --- Utility Functions ---
const formatDateSafely = (dateString) => {
  if (!dateString) return '-';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '-';
    return format(date, 'dd MMM yyyy HH:mm', { locale: localeId });
  } catch (e) {
    console.error("Date formatting error:", e);
    return dateString;
  }
};

// Definisikan urutan langkah approval berdasarkan ERD
const APPROVAL_STEPS = [
  { role: 'project_lead', label: 'Project Lead', icon: UserCheck },
  { role: 'head_consultant', label: 'Head Consultant', icon: UserCheck },
  { role: 'client', label: 'Client', icon: UserCheck },
  { role: 'government', label: 'Government', icon: UserCheck },
];

// Fungsi untuk menentukan status dari langkah tertentu berdasarkan data approval
const getStepStatus = (stepRole, approvals) => {
  const approval = approvals.find(a => a.approver_role === stepRole);
  if (!approval) return 'pending';
  return approval.status;
};

// Fungsi untuk mendapatkan props Badge berdasarkan status
const getBadgeProps = (status) => {
  switch (status?.toLowerCase()) {
    case 'approved':
      return { variant: 'default', icon: CheckCircle }; // ✅ Gunakan variant shadcn/ui
    case 'rejected':
      return { variant: 'destructive', icon: XCircle }; // ✅ Gunakan variant shadcn/ui
    case 'pending':
    default:
      return { variant: 'secondary', icon: Clock }; // ✅ Gunakan variant shadcn/ui
  }
};

const getStatusText = (status) => {
  return status?.replace(/_/g, ' ') || 'N/A';
};

const ApprovalWorkflowTimeline = ({ reportId }) => { // Terima reportId sebagai props
  const { toast } = useToast(); // ✅ Gunakan useToast dari shadcn/ui
  const [approvals, setApprovals] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch data approval berdasarkan reportId
  useEffect(() => {
    if (!reportId) return;

    const fetchApprovals = async () => {
      setLoading(true);
      setError(null);
      try {
        const {  approvalData, error: approvalError } = await supabase
          .from('report_approvals')
          .select(`
            id,
            approver_role,
            status,
            comment,
            approved_at,
            profiles!approver_id(full_name)
          `)
          .eq('report_id', reportId) // Filter berdasarkan report_id
          .order('approved_at', { ascending: true }); // Urutkan berdasarkan waktu

        if (approvalError) throw approvalError;
        setApprovals(Array.isArray(approvalData) ? approvalData : []); // ✅ Validasi array
      } catch (err) {
        console.error('[ApprovalWorkflowTimeline] Fetch approvals error:', err);
        const errorMessage = err.message || 'Gagal memuat timeline persetujuan.';
        setError(errorMessage);
        toast({
          title: 'Gagal memuat timeline persetujuan.',
          description: errorMessage,
          variant: "destructive", // ✅ Gunakan variant shadcn/ui
        });
        setApprovals([]); // ✅ Reset ke array kosong
      } finally {
        setLoading(false);
      }
    };

    fetchApprovals();
  }, [reportId, toast]); // ✅ Tambahkan toast ke dependency

  // --- Loading State ---
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[200px] p-8">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Memverifikasi sesi dan memuat data...</p>
      </div>
    );
  }

  // --- Error State ---
  if (error) {
    return (
      <Alert variant="destructive" className="m-4">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Gagal memuat timeline persetujuan.</AlertTitle>
        <AlertDescription>
          {error}
        </AlertDescription>
      </Alert>
    );
  }

  // --- Render Utama ---
  return (
    <div className="p-4 md:p-6 space-y-6"> {/* ✅ Ganti VStack dengan div space-y-6 */}
      <div className="flex items-center gap-2"> {/* ✅ Ganti HStack dengan div flex items-center gap-2 */}
        <Activity className="w-5 h-5 text-blue.500" /> {/* ✅ Ganti Icon dengan Activity lucide-react */}
        <h2 className="text-xl font-semibold text-foreground"> {/* ✅ Ganti Heading dengan h2 */}
          Timeline Approval
        </h2>
      </div>

      <div className="space-y-4 pl-2"> {/* ✅ Ganti VStack dengan div space-y-4 dan tambahkan pl-2 */}
        {APPROVAL_STEPS.map((step, index) => {
          const status = getStepStatus(step.role, approvals);
          const { variant, icon: IconComponent } = getBadgeProps(status); // ✅ Ganti colorScheme dengan variant
          const approval = approvals.find(a => a.approver_role === step.role);

          return (
            <React.Fragment key={step.role}>
              <div className="flex items-start gap-4"> {/* ✅ Ganti HStack dengan div flex items-start gap-4 */}
                <Badge variant={variant} className="p-2 rounded-md"> {/* ✅ Ganti Badge colorScheme dengan variant dan tambahkan p-2 rounded-md */}
                  <IconComponent className="w-4 h-4" /> {/* ✅ Ganti icon dengan IconComponent lucide-react */}
                </Badge>
                <div className="flex flex-col items-start space-y-1"> {/* ✅ Ganti VStack dengan div flex flex-col items-start space-y-1 */}
                  <div className="flex items-center gap-2"> {/* ✅ Ganti HStack dengan div flex items-center gap-2 */}
                    <p className="font-bold text-foreground">{step.label}</p> {/* ✅ Ganti Text dengan p dan tambahkan font-bold text-foreground */}
                    <Badge variant={variant} className="capitalize text-xs"> {/* ✅ Ganti Badge colorScheme dengan variant dan tambahkan capitalize text-xs */}
                      {getStatusText(status)}
                    </Badge>
                  </div>
                  {approval && (
                    <>
                      <p className="text-xs text-muted-foreground"> {/* ✅ Ganti Text dengan p dan tambahkan text-xs text-muted-foreground */}
                        Oleh: {approval.profiles?.full_name || 'Tidak Diketahui'} |{' '}
                        {formatDateSafely(approval.approved_at)}
                      </p>
                      {approval.comment && (
                        <p className="text-xs text-muted-foreground italic"> {/* ✅ Ganti Text dengan p dan tambahkan text-xs text-muted-foreground italic */}
                          Catatan: "{approval.comment}"
                        </p>
                      )}
                    </>
                  )}
                  {!approval && status === 'pending' && (
                    <p className="text-xs text-muted-foreground"> {/* ✅ Ganti Text dengan p dan tambahkan text-xs text-muted-foreground */}
                      Menunggu tindakan
                    </p>
                  )}
                </div>
              </div>
              {index < APPROVAL_STEPS.length - 1 && (
                <Separator className="border-border" /> // ✅ Ganti Divider dengan Separator shadcn/ui
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};

// Export default
export default ApprovalWorkflowTimeline;