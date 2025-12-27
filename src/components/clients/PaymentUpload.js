import React, { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { toast } from "sonner";

// shadcn/ui Components
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Lucide Icons
import { Upload, FileText, CheckCircle, XCircle, Clock, Eye, Building, User, FolderOpen } from "lucide-react";

// Supabase
import { supabase } from "@/utils/supabaseClient";
import { useAuth } from "@/context/AuthContext";

export const PaymentUpload = ({ projects, onPaymentUpload }) => {
  const router = useRouter();
  const { user } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [selectedProject, setSelectedProject] = useState("");
  const [amount, setAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Fetch payments data based on selected project - REVISED QUERY
  const fetchPayments = async (projectId = null) => {
    try {
      setLoading(true);
      let query = supabase
        .from('payments')
        .select(`
          *,
          projects (
            id,
            name,
            application_type,
            status,
            created_at
          )
        `)
        .order('created_at', { ascending: false });

      // Filter by project if specified
      if (projectId === 'new' || (!projectId && selectedProject === 'new')) {
        query = query.is('project_id', null);
      } else if (projectId) {
        query = query.eq('project_id', projectId);
      } else if (selectedProject) {
        query = query.eq('project_id', selectedProject);
      } else if (projects.length > 0) {
        const firstProjectId = projects[0]?.id;
        if (firstProjectId) {
          query = query.eq('project_id', firstProjectId);
          setSelectedProject(firstProjectId);
        }
      } else {
        // Default catch-all: if no projects and no specific selection, maybe show nothing or new?
        // But useEffect handles the default to 'new', so we should rely on that or default to null check
        query = query.is('project_id', null);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Payment fetch error:', error);
        throw error;
      }

      console.log('Fetched payments:', data);
      setPayments(data || []);
    } catch (error) {
      console.error('Error fetching payments:', error);
      toast.error('Gagal memuat data pembayaran');
    } finally {
      setLoading(false);
    }
  };

  // Get current project details
  const getCurrentProject = () => {
    if (selectedProject === 'new') return { name: 'Pengajuan Baru', application_type: 'New Application' };
    return projects.find(project => project.id === selectedProject) || projects[0];
  };

  // Handle project change
  const handleProjectChange = (projectId) => {
    setSelectedProject(projectId);
    fetchPayments(projectId);
  };

  // Handle file selection
  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
      if (!allowedTypes.includes(file.type)) {
        toast.error('Hanya file JPG, PNG, atau PDF yang diizinkan');
        return;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Ukuran file maksimal 5MB');
        return;
      }

      setSelectedFile(file);
    }
  };

  // Handle payment upload - REVISED TO MATCH ADMIN STRUCTURE
  const handlePaymentUpload = async () => {
    if (!selectedProject || !amount || !paymentDate || !selectedFile) {
      toast.error('Harap lengkapi semua field');
      return;
    }

    if (parseFloat(amount) <= 0) {
      toast.error('Jumlah pembayaran harus lebih dari 0');
      return;
    }

    setUploading(true);

    try {
      // Upload file to storage
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `payments/${selectedProject}_${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(fileName, selectedFile, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('documents')
        .getPublicUrl(fileName);

      const { data: paymentData, error: paymentError } = await supabase
        .from('payments')
        .insert([
          {
            project_id: selectedProject === 'new' ? null : selectedProject,
            amount: parseFloat(amount),
            payment_date: paymentDate,
            proof_url: urlData.publicUrl,
            verification_status: 'pending', // Match admin lead status
            client_id: user?.id // Use user ID as client_id
          }
        ])
        .select(`
          *,
          projects (
            id,
            name,
            application_type
          )
        `)
        .single();

      if (paymentError) {
        console.error('Payment insert error:', paymentError);
        throw paymentError;
      }

      // Create notification for admin_lead
      await createNotification(
        selectedProject === 'new' ? null : selectedProject,
        'payment_uploaded',
        `Bukti pembayaran sebesar Rp ${parseFloat(amount).toLocaleString('id-ID')} telah diupload untuk ${selectedProject === 'new' ? 'Pengajuan Baru' : getCurrentProject()?.name}`,
        user?.id
      );

      // Reset form
      setAmount("");
      setPaymentDate("");
      setSelectedFile(null);
      setDialogOpen(false);

      // Refresh payments list for current project
      await fetchPayments(selectedProject);

      // Call callback if provided
      if (onPaymentUpload) {
        onPaymentUpload(paymentData);
      }

      toast.success('Bukti pembayaran berhasil diupload dan menunggu verifikasi');
    } catch (error) {
      console.error('Upload error:', error);
      toast.error(`Gagal mengupload bukti pembayaran: ${error.message}`);
    } finally {
      setUploading(false);
    }
  };

  // Create notification function
  const createNotification = async (projectId, type, message, senderId) => {
    try {
      // Get admin_lead users
      const { data: adminLeads, error: adminError } = await supabase
        .from('profiles')
        .select('id')
        .eq('role', 'admin_lead');

      if (adminError) throw adminError;

      if (adminLeads && adminLeads.length > 0) {
        const notifications = adminLeads.map(admin => ({
          project_id: projectId,
          type: type,
          message: message,
          sender_id: senderId,
          recipient_id: admin.id,
          is_read: false,
          created_at: new Date().toISOString()
        }));

        const { error: notifError } = await supabase
          .from('notifications')
          .insert(notifications);

        if (notifError) throw notifError;
      }
    } catch (error) {
      console.error('Error creating notification:', error);
    }
  };

  // Get status badge - MATCH ADMIN LEAD STYLING
  const getStatusBadge = (status) => {
    const statusConfig = {
      pending: {
        variant: 'secondary',
        icon: Clock,
        text: 'Menunggu',
        color: 'text-yellow-600'
      },
      verified: {
        variant: 'default',
        icon: CheckCircle,
        text: 'Terverifikasi',
        color: 'text-green-600'
      },
      rejected: {
        variant: 'destructive',
        icon: XCircle,
        text: 'Ditolak',
        color: 'text-red-600'
      }
    };

    const config = statusConfig[status] || statusConfig.pending;
    const IconComponent = config.icon;

    return (
      <Badge variant={config.variant} className="capitalize">
        <IconComponent className={`w-3 h-3 mr-1 ${config.color}`} />
        {config.text}
      </Badge>
    );
  };

  // Format currency - MATCH ADMIN LEAD FORMAT
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount || 0);
  };

  // Format date - MATCH ADMIN LEAD FORMAT
  const formatDate = (dateString) => {
    if (!dateString) return '-';
    try {
      return new Date(dateString).toLocaleDateString('id-ID', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch {
      return 'Invalid Date';
    }
  };

  // Calculate payment statistics for current project
  const getPaymentStats = () => {
    const projectPayments = payments.filter(p => p.project_id === selectedProject);
    const totalPayments = projectPayments.length;
    const verifiedPayments = projectPayments.filter(p => p.verification_status === 'verified').length;
    const pendingPayments = projectPayments.filter(p => p.verification_status === 'pending').length;
    const totalAmount = projectPayments.reduce((sum, payment) => sum + parseFloat(payment.amount || 0), 0);
    const verifiedAmount = projectPayments
      .filter(p => p.verification_status === 'verified')
      .reduce((sum, payment) => sum + parseFloat(payment.amount || 0), 0);

    return {
      totalPayments,
      verifiedPayments,
      pendingPayments,
      totalAmount,
      verifiedAmount
    };
  };

  // Load payments on component mount and when projects change
  // Load payments on component mount and when projects change
  useEffect(() => {
    if (projects.length > 0) {
      // If we have projects, prioritize the selected one or the first one
      if (!selectedProject || selectedProject === 'new') {
        const firstId = projects[0]?.id;
        setSelectedProject(firstId);
        fetchPayments(firstId);
      }
    } else {
      // If no projects, default to 'new' (Application)
      if (selectedProject !== 'new') {
        setSelectedProject('new');
        fetchPayments('new');
      }
    }
  }, [projects]);

  const currentProject = getCurrentProject();
  const stats = getPaymentStats();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="w-5 h-5" />
          Manajemen Pembayaran
        </CardTitle>
        <CardDescription>
          Kelola pembayaran untuk setiap proyek Anda. Upload bukti pembayaran dan pantau status verifikasi oleh Admin Lead.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">

        {/* Project Selection */}
        <div className="space-y-4">
          <Label>Pilih Proyek</Label>
          <Select value={selectedProject} onValueChange={handleProjectChange}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Pilih proyek..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="new">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 text-blue-500" />
                  {/* Using generic div or imported icon if available, FolderOpen is better */}
                  <span>Pengajuan Baru (Pending)</span>
                </div>
              </SelectItem>
              {projects.map((project) => (
                <SelectItem key={project.id} value={project.id}>
                  <div className="flex items-center gap-2">
                    <Building className="w-4 h-4" />
                    <div>
                      <div className="font-medium">{project.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {project.application_type} • {project.status}
                      </div>
                    </div>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Payment Statistics */}
        {currentProject && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="text-center p-4">
              <div className="text-2xl font-bold text-blue-600">{stats.totalPayments}</div>
              <div className="text-sm text-muted-foreground">Total Pembayaran</div>
            </Card>
            <Card className="text-center p-4">
              <div className="text-2xl font-bold text-green-600">{stats.verifiedPayments}</div>
              <div className="text-sm text-muted-foreground">Terverifikasi</div>
            </Card>
            <Card className="text-center p-4">
              <div className="text-2xl font-bold text-yellow-600">{stats.pendingPayments}</div>
              <div className="text-sm text-muted-foreground">Menunggu</div>
            </Card>
            <Card className="text-center p-4">
              <div className="text-2xl font-bold text-purple-600">
                {formatCurrency(stats.verifiedAmount)}
              </div>
              <div className="text-sm text-muted-foreground">Total Terverifikasi</div>
            </Card>
          </div>
        )}

        {/* Upload Section */}
        <div className="grid gap-4">
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="w-full" disabled={!selectedProject}>
                <Upload className="w-4 h-4 mr-2" />
                Upload Bukti Pembayaran Baru
                {currentProject && ` - ${currentProject.name}`}
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Upload Bukti Pembayaran</DialogTitle>
                <DialogDescription>
                  Lengkapi informasi pembayaran untuk proyek {currentProject?.name}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                {/* Project Info */}
                {currentProject && (
                  <div className="p-3 bg-muted rounded-md">
                    <p className="font-medium">{currentProject.name}</p>
                    <p className="text-sm text-muted-foreground">{currentProject.application_type}</p>
                  </div>
                )}

                {/* Amount */}
                <div className="space-y-2">
                  <Label htmlFor="amount">Jumlah Pembayaran (Rp)</Label>
                  <Input
                    id="amount"
                    type="number"
                    placeholder="1000000"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    min="0"
                    step="1000"
                    required
                  />
                </div>

                {/* Payment Date */}
                <div className="space-y-2">
                  <Label htmlFor="paymentDate">Tanggal Pembayaran</Label>
                  <Input
                    id="paymentDate"
                    type="date"
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    max={new Date().toISOString().split('T')[0]}
                    required
                  />
                </div>

                {/* File Upload */}
                <div className="space-y-2">
                  <Label htmlFor="proof">Bukti Pembayaran</Label>
                  <Input
                    id="proof"
                    type="file"
                    accept=".jpg,.jpeg,.png,.pdf"
                    onChange={handleFileSelect}
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Format: JPG, PNG, PDF (maks. 5MB)
                  </p>
                  {selectedFile && (
                    <div className="flex items-center gap-2 p-2 bg-muted rounded-md">
                      <FileText className="w-4 h-4" />
                      <span className="text-sm">{selectedFile.name}</span>
                    </div>
                  )}
                </div>

                {/* Upload Button */}
                <Button
                  onClick={handlePaymentUpload}
                  disabled={uploading || !selectedProject}
                  className="w-full"
                >
                  {uploading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                      Mengupload...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-2" />
                      Upload Bukti Pembayaran
                    </>
                  )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Payments History */}
        <div className="space-y-4">
          <h3 className="font-semibold">
            Riwayat Pembayaran - {currentProject?.name || 'Pilih Proyek'}
          </h3>

          {loading ? (
            <div className="text-center py-8">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Memuat data pembayaran...</p>
            </div>
          ) : payments.length === 0 ? (
            <Card className="text-center py-8">
              <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Belum ada riwayat pembayaran untuk proyek ini</p>
            </Card>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Jumlah</TableHead>
                    <TableHead>Tanggal Bayar</TableHead>
                    <TableHead>Tanggal Upload</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-center">Bukti</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell className="font-medium">
                        {formatCurrency(payment.amount)}
                      </TableCell>
                      <TableCell>
                        {formatDate(payment.payment_date)}
                      </TableCell>
                      <TableCell>
                        {formatDate(payment.created_at)}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(payment.verification_status)}
                      </TableCell>
                      <TableCell className="text-center">
                        {payment.proof_url && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => window.open(payment.proof_url, '_blank')}
                            title="Lihat Bukti"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
