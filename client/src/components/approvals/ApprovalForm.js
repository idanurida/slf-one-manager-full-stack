// FILE: client/src/components/approvals/ApprovalForm.js
"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation'; // ✅ Ganti ke next/navigation
import axios from 'axios';
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
    case 'draft': return 'secondary';
    case 'quotation_sent': return 'yellow';
    case 'quotation_accepted': return 'orange';
    case 'contract_signed': return 'purple';
    case 'spk_issued': return 'blue';
    case 'spk_accepted': return 'teal';
    case 'inspection_scheduled': return 'cyan';
    case 'inspection_in_progress': return 'orange';
    case 'inspection_done': return 'green';
    case 'report_draft': return 'yellow';
    case 'report_reviewed': return 'orange';
    case 'report_sent_to_client': return 'purple';
    case 'waiting_gov_response': return 'pink';
    case 'slf_issued': return 'green';
    case 'completed': return 'green';
    case 'cancelled': return 'red';
    case 'project_lead_approved': return 'blue';
    case 'project_lead_rejected': return 'red';
    case 'head_consultant_approved': return 'purple';
    case 'head_consultant_rejected': return 'red';
    case 'client_approved': return 'green';
    case 'client_rejected': return 'red';
    default: return 'outline';
  }
};

const getStatusText = (status) => {
  return status?.replace(/_/g, ' ') || 'N/A';
};

// --- Main Component ---
const ApprovalForm = ({ project, role, user, onApprovalChange }) => {
  const router = useRouter(); // ✅ Ganti ke next/navigation
  const { toast } = useToast(); // ✅ Gunakan useToast dari shadcn/ui

  const [comment, setComment] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [showRejectionForm, setShowRejectionForm] = useState(false);

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

  const handleApprove = async () => {
    setLoading(true);
    try {
      const response = await axios.post(
        `/api/approvals/projects/${project.id}/approve/${role}`,
        { comment },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      toast({
        title: 'Project Approved',
        description: response.data.message,
        variant: "default", // ✅ Gunakan variant shadcn/ui
      });

      if (onApprovalChange) {
        onApprovalChange(response.data.approval);
      }

      // Redirect ke dashboard
      router.push(`/dashboard/${user.role.replace(/_/g, '-')}`);

    } catch (error) {
      console.error('Approval error:', error);
      const errorMessage = error.response?.data?.error || 'Failed to approve project';
      toast({
        title: 'Error',
        description: errorMessage,
        variant: "destructive", // ✅ Gunakan variant shadcn/ui
      });
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      toast({
        title: 'Error',
        description: 'Rejection reason is required',
        variant: "destructive", // ✅ Gunakan variant shadcn/ui
      });
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(
        `/api/approvals/projects/${project.id}/reject/${role}`,
        { comment, rejection_reason: rejectionReason },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      toast({
        title: 'Project Rejected',
        description: response.data.message,
        variant: "destructive", // ✅ Gunakan variant shadcn/ui
      });

      if (onApprovalChange) {
        onApprovalChange(response.data.approval);
      }

      // Redirect ke dashboard
      router.push(`/dashboard/${user.role.replace(/_/g, '-')}`);

    } catch (error) {
      console.error('Rejection error:', error);
      const errorMessage = error.response?.data?.error || 'Failed to reject project';
      toast({
        title: 'Error',
        description: errorMessage,
        variant: "destructive", // ✅ Gunakan variant shadcn/ui
      });
    } finally {
      setLoading(false);
      setShowRejectionForm(false);
      setRejectionReason('');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-6" // ✅ Ganti Box dengan div space-y-6
    >
      <Card className="border-border"> {/* ✅ Ganti Card dengan Card shadcn/ui */}
        <CardContent className="p-6"> {/* ✅ Ganti CardBody dengan CardContent shadcn/ui */}
          <div className="space-y-6"> {/* ✅ Ganti VStack dengan div space-y-6 */}
            <div> {/* ✅ Ganti Box dengan div */}
              <h1 className="text-xl md:text-2xl font-semibold text-blue.600 mb-2"> {/* ✅ Ganti Heading dengan h1 */}
                Project Approval - {role?.replace(/_/g, ' ')}
              </h1>
              <p className="text-md text-muted-foreground"> {/* ✅ Ganti Text dengan p */}
                Project: {project?.name || '-'}
              </p>
              <p className="text-sm text-muted-foreground"> {/* ✅ Ganti Text dengan p */}
                Owner: {project?.owner_name || '-'}
              </p>
              <p className="text-sm text-muted-foreground"> {/* ✅ Ganti Text dengan p */}
                Status: <Badge variant={getStatusColor(project?.status)} className="capitalize"> {/* ✅ Gunakan Badge shadcn/ui */}
                  {getStatusText(project?.status)}
                </Badge>
              </p>
            </div>

            <Separator className="bg-border" /> {/* ✅ Ganti Divider dengan Separator shadcn/ui */

            <Alert> {/* ✅ Ganti Alert Chakra dengan Alert shadcn/ui */}
              <Info className="h-4 w-4" /> {/* ✅ Tambahkan ikon Info */}
              <AlertTitle>Approval Instructions</AlertTitle> {/* ✅ Ganti AlertTitle Chakra dengan AlertTitle shadcn/ui */}
              <AlertDescription> {/* ✅ Ganti AlertDescription Chakra dengan AlertDescription shadcn/ui */}
                As a {role?.replace(/_/g, ' ')}, please carefully review the project documentation 
                and provide your approval or rejection with proper justification.
              </AlertDescription>
            </Alert>

            <div className="space-y-2"> {/* ✅ Ganti FormControl dengan div space-y-2 */}
              <Label htmlFor="comment" className="text-sm font-medium text-foreground"> {/* ✅ Ganti FormLabel dengan Label */}
                Comment (Optional)
              </Label>
              <Textarea
                id="comment"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Add any additional comments..."
                rows={4}
                disabled={loading} // ✅ Ganti isDisabled dengan disabled
                className="min-h-[100px] bg-background" // ✅ Tambahkan class Tailwind
              />
            </div>

            {!showRejectionForm ? (
              <div className="flex justify-end gap-4"> {/* ✅ Ganti HStack dengan div flex justify-end gap-4 */}
                <Button
                  variant="destructive" // ✅ Ganti colorScheme="red" dengan variant="destructive"
                  onClick={() => setShowRejectionForm(true)}
                  disabled={loading} // ✅ Ganti isLoading dengan disabled
                  className="flex items-center gap-2" // ✅ Tambahkan class Tailwind
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Rejecting...
                    </>
                  ) : (
                    <>
                      <XCircle className="w-4 h-4" />
                      Reject Project
                    </>
                  )}
                </Button>

                <Button
                  variant="default" // ✅ Ganti colorScheme="green" dengan variant="default"
                  onClick={handleApprove}
                  disabled={loading} // ✅ Ganti isLoading dengan disabled
                  className="flex items-center gap-2 bg-green-600 text-white hover:bg-green-700 dark:hover:bg-green-800" // ✅ Tambahkan class Tailwind untuk warna hijau
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Approving...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      Approve Project
                    </>
                  )}
                </Button>
              </div>
            ) : (
              <div className="space-y-4"> {/* ✅ Ganti VStack dengan div space-y-4 */}
                <div className="space-y-2"> {/* ✅ Ganti FormControl dengan div space-y-2 */}
                  <Label htmlFor="rejectionReason" className="text-sm font-medium text-foreground"> {/* ✅ Ganti FormLabel dengan Label */}
                    Rejection Reason *
                  </Label>
                  <Textarea
                    id="rejectionReason"
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="Please provide detailed reason for rejection..."
                    rows={4}
                    disabled={loading} // ✅ Ganti isDisabled dengan disabled
                    className="min-h-[100px] bg-background" // ✅ Tambahkan class Tailwind
                  />
                </div>

                <div className="flex justify-end gap-4"> {/* ✅ Ganti HStack dengan div flex justify-end gap-4 */}
                  <Button
                    variant="outline" // ✅ Ganti variant="outline"
                    onClick={() => setShowRejectionForm(false)}
                    disabled={loading} // ✅ Ganti isDisabled dengan disabled
                    className="flex items-center gap-2" // ✅ Tambahkan class Tailwind
                  >
                    <X className="w-4 h-4" />
                    Cancel
                  </Button>

                  <Button
                    variant="destructive" // ✅ Ganti colorScheme="red" dengan variant="destructive"
                    onClick={handleReject}
                    disabled={loading} // ✅ Ganti isLoading dengan disabled
                    className="flex items-center gap-2" // ✅ Tambahkan class Tailwind
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Rejecting...
                      </>
                    ) : (
                      <>
                        <XCircle className="w-4 h-4" />
                        Confirm Rejection
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default ApprovalForm;