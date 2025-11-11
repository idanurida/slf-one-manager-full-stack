// FILE: client/src/components/approvals/ApprovalStatus.js
"use client";

import React from 'react';
import { motion } from 'framer-motion';

// shadcn/ui Components
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
  CheckSquare, AlertTriangle, Loader2, Info, Calendar, UserCheck, Camera, Plus, Save, RotateCcw
} from 'lucide-react';

// Other Imports
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { supabase } from '@/utils/supabaseClient';
import { getUserAndProfile } from '@/utils/auth';

// --- Utility Functions ---
const formatDateSafely = (dateString) => {
  if (!dateString) return '-';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '-';
    return format(date, 'dd MMM yyyy', { locale: localeId });
  } catch (e) {
    console.error("Date formatting error:", e);
    return dateString;
  }
};

const getStatusColor = (status) => {
  switch (status?.toLowerCase()) {
    case 'pending': return 'secondary';
    case 'approved': return 'default';
    case 'rejected': return 'destructive';
    default: return 'outline';
  }
};

const getStatusText = (status) => {
  return status?.replace(/_/g, ' ') || 'N/A';
};

// --- Main Component ---
const ApprovalStatus = ({ project, approvals, loading = false }) => {
  const { toast } = useToast(); // ✅ Gunakan useToast dari shadcn/ui

  // --- Loading State ---
  if (loading) {
    return (
      <Card className="border-border">
        <CardContent className="p-6">
          <Skeleton className="h-8 w-48 mb-4" />
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="space-y-6" // ✅ Ganti Box dengan div space-y-6
    >
      <Card className="border-border">
        <CardContent className="p-6">
          <div className="space-y-4"> {/* ✅ Ganti VStack dengan div space-y-4 */}
            <h2 className="text-lg font-semibold text-gray.700"> {/* ✅ Ganti Heading dengan h2 */}
              Approval Status
            </h2>

            <Separator className="bg-border" /> {/* ✅ Ganti Divider dengan Separator shadcn/ui */

            <div className="space-y-3"> {/* ✅ Ganti VStack dengan div space-y-3 */}
              {/* Project Lead Approval */}
              <div> {/* ✅ Ganti Box dengan div */}
                <div className="flex justify-between items-center"> {/* ✅ Ganti HStack dengan div flex justify-between items-center */}
                  <p className="font-semibold text-foreground"> {/* ✅ Ganti Text dengan p */}
                    Project Lead
                  </p>
                  <Badge variant={getStatusColor(approvals?.project_lead?.status || 'pending')}> {/* ✅ Gunakan Badge shadcn/ui */}
                    {getStatusText(approvals?.project_lead?.status || 'pending')}
                  </Badge>
                </div>

                {approvals?.project_lead && (
                  <>
                    <p className="text-sm text-muted-foreground"> {/* ✅ Ganti Text dengan p */}
                      Approved by: {approvals.project_lead.approver?.name || '-'}
                    </p>
                    <p className="text-sm text-muted-foreground"> {/* ✅ Ganti Text dengan p */}
                      Date: {formatDateSafely(approvals.project_lead.approved_at || approvals.project_lead.rejected_at)}
                    </p>
                    {approvals.project_lead.comment && (
                      <p className="text-sm text-foreground"> {/* ✅ Ganti Text dengan p */}
                        Comment: {approvals.project_lead.comment}
                      </p>
                    )}
                    {approvals.project_lead.rejection_reason && (
                      <p className="text-sm text-destructive"> {/* ✅ Ganti Text dengan p dan tambahkan text-destructive */}
                        Rejection Reason: {approvals.project_lead.rejection_reason}
                      </p>
                    )}
                  </>
                )}
              </div>

              <Separator className="bg-border" /> {/* ✅ Ganti Divider dengan Separator shadcn/ui */

              {/* Head Consultant Approval */}
              <div> {/* ✅ Ganti Box dengan div */}
                <div className="flex justify-between items-center"> {/* ✅ Ganti HStack dengan div flex justify-between items-center */}
                  <p className="font-semibold text-foreground"> {/* ✅ Ganti Text dengan p */}
                    Head Consultant
                  </p>
                  <Badge variant={getStatusColor(approvals?.head_consultant?.status || 'pending')}> {/* ✅ Gunakan Badge shadcn/ui */}
                    {getStatusText(approvals?.head_consultant?.status || 'pending')}
                  </Badge>
                </div>

                {approvals?.head_consultant && (
                  <>
                    <p className="text-sm text-muted-foreground"> {/* ✅ Ganti Text dengan p */}
                      Approved by: {approvals.head_consultant.approver?.name || '-'}
                    </p>
                    <p className="text-sm text-muted-foreground"> {/* ✅ Ganti Text dengan p */}
                      Date: {formatDateSafely(approvals.head_consultant.approved_at || approvals.head_consultant.rejected_at)}
                    </p>
                    {approvals.head_consultant.comment && (
                      <p className="text-sm text-foreground"> {/* ✅ Ganti Text dengan p */}
                        Comment: {approvals.head_consultant.comment}
                      </p>
                    )}
                    {approvals.head_consultant.rejection_reason && (
                      <p className="text-sm text-destructive"> {/* ✅ Ganti Text dengan p dan tambahkan text-destructive */}
                        Rejection Reason: {approvals.head_consultant.rejection_reason}
                      </p>
                    )}
                  </>
                )}
              </div>

              <Separator className="bg-border" /> {/* ✅ Ganti Divider dengan Separator shadcn/ui */

              {/* Client Approval */}
              <div> {/* ✅ Ganti Box dengan div */}
                <div className="flex justify-between items-center"> {/* ✅ Ganti HStack dengan div flex justify-between items-center */}
                  <p className="font-semibold text-foreground"> {/* ✅ Ganti Text dengan p */}
                    Client
                  </p>
                  <Badge variant={getStatusColor(approvals?.klien?.status || 'pending')}> {/* ✅ Gunakan Badge shadcn/ui */}
                    {getStatusText(approvals?.klien?.status || 'pending')}
                  </Badge>
                </div>

                {approvals?.klien && (
                  <>
                    <p className="text-sm text-muted-foreground"> {/* ✅ Ganti Text dengan p */}
                      Approved by: {approvals.klien.approver?.name || '-'}
                    </p>
                    <p className="text-sm text-muted-foreground"> {/* ✅ Ganti Text dengan p */}
                      Date: {formatDateSafely(approvals.klien.approved_at || approvals.klien.rejected_at)}
                    </p>
                    {approvals.klien.comment && (
                      <p className="text-sm text-foreground"> {/* ✅ Ganti Text dengan p */}
                        Comment: {approvals.klien.comment}
                      </p>
                    )}
                    {approvals.klien.rejection_reason && (
                      <p className="text-sm text-destructive"> {/* ✅ Ganti Text dengan p dan tambahkan text-destructive */}
                        Rejection Reason: {approvals.klien.rejection_reason}
                      </p>
                    )}
                  </>
                )}
              </div>
            </div>

            <Separator className="bg-border" /> {/* ✅ Ganti Divider dengan Separator shadcn/ui */

            <div> {/* ✅ Ganti Box dengan div */}
              <p className="text-sm text-muted-foreground"> {/* ✅ Ganti Text dengan p */}
                <strong>Current Project Status:</strong>{' '}
                <Badge variant="default" className="capitalize"> {/* ✅ Gunakan Badge shadcn/ui dan tambahkan capitalize */}
                  {getStatusText(project?.status || 'draft')}
                </Badge>
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default ApprovalStatus;