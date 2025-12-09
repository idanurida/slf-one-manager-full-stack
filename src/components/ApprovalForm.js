// FILE: client/src/components/approvals/ApprovalForm.js
import React, { useState } from 'react';
import { useToast } from '@/components/ui/use-toast';

// shadcn/ui Components
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

// Other Imports
import axios from 'axios';

const ApprovalForm = ({ reportId, role, currentStatus, onApprovalChange }) => {
  const { toast } = useToast(); // ✅ Gunakan useToast dari shadcn
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);

  const handleApprove = async () => {
    if (!reportId) return;
    setLoading(true);
    try {
      let endpoint = '';
      let message = '';

      switch (role) {
        case 'project_lead':
          endpoint = `/api/approvals/reports/${reportId}/approve/project_lead`;
          message = 'Laporan disetujui oleh Project Lead';
          break;
        case 'head_consultant':
          endpoint = `/api/approvals/reports/${reportId}/approve/head_consultant`;
          message = 'Laporan disetujui oleh Head Consultant';
          break;
        case 'klien':
          endpoint = `/api/approvals/reports/${reportId}/approve/client`;
          message = 'Laporan disetujui oleh Klien';
          break;
        default:
          throw new Error('Role tidak valid');
      }

      await axios.post(endpoint, { comment });

      toast({
        title: 'Berhasil',
        description: message,
        variant: 'default', // ✅ Gunakan variant shadcn
      });

      if (onApprovalChange) {
        onApprovalChange();
      }

      setComment('');
    } catch (error) {
      toast({
        title: 'Error',
        description: error.response?.data?.error || 'Gagal menyetujui laporan',
        variant: 'destructive', // ✅ Gunakan variant shadcn
      });
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    if (!reportId) return;
    setLoading(true);
    try {
      let endpoint = '';
      let message = '';

      switch (role) {
        case 'project_lead':
          endpoint = `/api/approvals/reports/${reportId}/reject/project_lead`;
          message = 'Laporan ditolak oleh Project Lead';
          break;
        case 'head_consultant':
          endpoint = `/api/approvals/reports/${reportId}/reject/head_consultant`;
          message = 'Laporan ditolak oleh Head Consultant';
          break;
        case 'klien':
          endpoint = `/api/approvals/reports/${reportId}/reject/client`;
          message = 'Laporan ditolak oleh Klien';
          break;
        default:
          throw new Error('Role tidak valid');
      }

      await axios.post(endpoint, { comment });

      toast({
        title: 'Berhasil',
        description: message,
        variant: 'default', // ✅ Gunakan variant shadcn (shadcn toast bisa untuk success, warning, error)
      });

      if (onApprovalChange) {
        onApprovalChange();
      }

      setComment('');
    } catch (error) {
      toast({
        title: 'Error',
        description: error.response?.data?.error || 'Gagal menolak laporan',
        variant: 'destructive', // ✅ Gunakan variant shadcn
      });
    } finally {
      setLoading(false);
    }
  };

  // ✅ Fungsi untuk mendapatkan variant Badge berdasarkan status
  const getStatusVariant = (status) => {
    switch (status?.toLowerCase()) {
      case 'approved':
        return 'default'; // atau 'success' jika kamu tambahkan
      case 'rejected':
        return 'destructive';
      case 'pending':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  return (
    <Card className="border-border"> {/* ✅ Gunakan Card shadcn */}
      <CardContent className="p-6"> {/* ✅ Gunakan CardContent shadcn */}
        <div className="flex flex-col space-y-4"> {/* ✅ Ganti VStack dengan div flex-col space-y-4 */}
          <div className="space-y-2"> {/* ✅ Ganti Box dengan div space-y-2 */}
            <h3 className="text-lg font-medium text-foreground">Persetujuan Internal</h3> {/* ✅ Ganti Heading dengan h3 */}
            <p className="text-sm text-muted-foreground"> {/* ✅ Ganti Text dengan p */}
              Role: <Badge variant={getStatusVariant(role)} className="capitalize">{role}</Badge> {/* ✅ Gunakan Badge shadcn */}
            </p>
            <p className="text-sm text-muted-foreground"> {/* ✅ Ganti Text dengan p */}
              Status: <Badge variant={getStatusVariant(currentStatus)} className="capitalize">{currentStatus}</Badge> {/* ✅ Gunakan Badge shadcn */}
            </p>
          </div>

          <div className="space-y-2"> {/* ✅ Ganti FormControl dengan div space-y-2 */}
            <Label htmlFor="approval-comment">Komentar (Opsional)</Label> {/* ✅ Ganti FormLabel dengan Label */}
            <Textarea
              id="approval-comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Masukkan komentar..."
              rows={4}
            />
          </div>

          <div className="flex justify-end space-x-4"> {/* ✅ Ganti HStack dengan div flex justify-end space-x-4 */}
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={loading || !reportId}
            >
              {loading ? 'Menolak...' : 'Tolak Laporan'}
            </Button>
            <Button
              variant="default"
              onClick={handleApprove}
              disabled={loading || !reportId}
            >
              {loading ? 'Menyetujui...' : 'Setujui Laporan'}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ApprovalForm;
