// FILE: src/components/notifications/NotificationCenter.js
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { useToast } from '@/components/ui/use-toast';

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
import { Separator } from '@/components/ui/separator';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Lucide Icons
import {
  Bell, Check, Eye, Trash2, ChevronDown, AlertTriangle, Loader2, Info
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
    return format(date, 'dd MMM yyyy HH:mm', { locale: localeId });
  } catch (e) {
    console.error("Date formatting error:", e);
    return dateString;
  }
};

const getStatusColor = (isRead) => {
  return isRead ? 'default' : 'secondary';
};

const getPriorityColor = (priority) => {
  switch (priority?.toLowerCase()) {
    case 'urgent': return 'destructive';
    case 'high': return 'default';
    case 'medium': return 'secondary';
    case 'low': return 'outline';
    default: return 'outline';
  }
};

// Helper functions untuk notifications
const getNotificationTitle = (type) => {
  const titles = {
    'document_approval': 'Permintaan Approval Dokumen',
    'task_assigned': 'Task Baru Ditetapkan',
    'inspection_scheduled': 'Jadwal Inspeksi',
    'comment': 'Komentar Baru',
    'system': 'Notifikasi Sistem',
    'document_upload': 'Dokumen Baru Diupload',
    'approval_required': 'Perlu Approval',
    'project_assigned': 'Penugasan Proyek Baru'
  };
  return titles[type] || 'Notifikasi';
};

const getNotificationPriority = (type) => {
  const priorities = {
    'document_approval': 'high',
    'approval_required': 'high',
    'task_assigned': 'medium', 
    'inspection_scheduled': 'medium',
    'project_assigned': 'medium',
    'document_upload': 'low',
    'comment': 'low',
    'system': 'low'
  };
  return priorities[type] || 'medium';
};

const getActionUrl = (type, relatedId) => {
  const urls = {
    'document_approval': `/dashboard/drafter/documents/${relatedId}`,
    'document_upload': `/dashboard/drafter/documents/${relatedId}`,
    'task_assigned': `/dashboard/drafter/tasks`,
    'inspection_scheduled': `/dashboard/drafter/inspections`,
    'comment': `/dashboard/drafter/documents/${relatedId}`,
    'approval_required': `/dashboard/drafter/approvals`,
    'project_assigned': `/dashboard/drafter/projects/${relatedId}`
  };
  return urls[type];
};

// --- Main Component ---
const NotificationCenter = () => {
  const router = useRouter();
  const { toast } = useToast();
  
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [markingAsRead, setMarkingAsRead] = useState(false);
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState(null);

  // Ambil data user saat komponen dimuat
  useEffect(() => {
    const loadUser = async () => {
      try {
        const { user: authUser, profile: userProfile } = await getUserAndProfile();
        if (!authUser || !userProfile) {
          console.warn('[NotificationCenter] Tidak ada sesi pengguna atau profil tidak ditemukan.');
          router.push('/login');
          return;
        }
        setUser(authUser);
        setProfile(userProfile);
      } catch (err) {
        console.error('[NotificationCenter] Load user error:', err);
        const errorMessage = err.message || 'Terjadi kesalahan saat memuat data pengguna.';
        toast({
          title: 'Gagal memuat data pengguna.',
          description: errorMessage,
          variant: "destructive",
        });
        router.push('/login');
      }
    };

    loadUser();
  }, []);

  // Ambil data notifikasi saat user siap
  useEffect(() => {
    const loadNotifications = async () => {
      if (!profile?.id) return;

      try {
        setLoading(true);
        setError(null);

        // Query notifikasi dari tabel notifications
        const { data: notificationsData, error: notificationsError } = await supabase
          .from('notifications')
          .select(`
            id,
            type,
            message,
            read_at,
            created_at,
            related_id,
            related_type,
            recipient_id,
            actor_id,
            actors:actor_id (
              full_name,
              email
            )
          `)
          .eq('recipient_id', profile.id)
          .order('created_at', { ascending: false })
          .limit(50);

        if (notificationsError) throw notificationsError;

        // Format data notifications
        const formattedNotifications = (notificationsData || []).map(notif => ({
          id: notif.id,
          title: getNotificationTitle(notif.type),
          message: notif.message,
          created_at: notif.created_at,
          is_read: !!notif.read_at,
          read_at: notif.read_at,
          author: notif.actors?.full_name || notif.actors?.email || 'System',
          priority: getNotificationPriority(notif.type),
          type: notif.type,
          action_required: !notif.read_at,
          action_url: getActionUrl(notif.type, notif.related_id),
          related_id: notif.related_id
        }));

        setNotifications(formattedNotifications);
        setUnreadCount(formattedNotifications.filter(n => !n.is_read).length);

      } catch (err) {
        console.error('[NotificationCenter] Fetch notifications error:', err);
        const errorMessage = err.message || 'Terjadi kesalahan saat mengambil data notifikasi.';
        setError(errorMessage);
        toast({
          title: 'Gagal memuat notifikasi.',
          description: errorMessage,
          variant: "destructive",
        });
        setNotifications([]);
        setUnreadCount(0);
      } finally {
        setLoading(false);
      }
    };

    if (profile?.id) {
      loadNotifications();
    }
  }, [profile]);

  // Tandai notifikasi sebagai dibaca
  const markAsRead = async (notificationId) => {
    try {
      setMarkingAsRead(true);
      
      // Update di database
      const { error } = await supabase
        .from('notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('id', notificationId);

      if (error) throw error;

      // Update state lokal
      setNotifications(prev =>
        prev.map(n =>
          n.id === notificationId ? { ...n, is_read: true, read_at: new Date().toISOString() } : n
        )
      );

      setUnreadCount(prev => prev > 0 ? prev - 1 : 0);

      toast({
        title: 'Berhasil',
        description: 'Notifikasi ditandai sebagai telah dibaca',
        variant: "default",
      });
    } catch (err) {
      console.error('[NotificationCenter] Mark as read error:', err);
      const errorMessage = err.message || 'Gagal menandai notifikasi';
      toast({
        title: 'Gagal',
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setMarkingAsRead(false);
    }
  };

  // Tandai semua sebagai dibaca
  const markAllAsRead = async () => {
    setMarkingAsRead(true);
    try {
      // Update semua di database
      const { error } = await supabase
        .from('notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('recipient_id', profile.id)
        .is('read_at', null);

      if (error) throw error;

      // Update state lokal
      setNotifications(prev =>
        prev.map(n => ({ ...n, is_read: true, read_at: new Date().toISOString() }))
      );

      setUnreadCount(0);

      toast({
        title: 'Berhasil',
        description: 'Semua notifikasi ditandai sebagai telah dibaca',
        variant: "default",
      });
    } catch (err) {
      console.error('[NotificationCenter] Mark all as read error:', err);
      const errorMessage = err.message || 'Gagal menandai semua notifikasi';
      toast({
        title: 'Gagal',
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setMarkingAsRead(false);
    }
  };

  // Hapus notifikasi
  const deleteNotification = async (notificationId) => {
    if (!window.confirm('Apakah Anda yakin ingin menghapus notifikasi ini?')) {
      return;
    }

    try {
      // Hapus dari database
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId);

      if (error) throw error;

      // Update state lokal
      const deletedNotification = notifications.find(n => n.id === notificationId);
      setNotifications(prev => prev.filter(n => n.id !== notificationId));

      // Update unread count
      if (deletedNotification && !deletedNotification.is_read) {
        setUnreadCount(prev => prev > 0 ? prev - 1 : 0);
      }

      toast({
        title: 'Berhasil',
        description: 'Notifikasi dihapus',
        variant: "default",
      });
    } catch (err) {
      console.error('[NotificationCenter] Delete notification error:', err);
      const errorMessage = err.message || 'Gagal menghapus notifikasi';
      toast({
        title: 'Gagal',
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  // Handle action button click
  const handleActionClick = (notification) => {
    if (notification.action_url) {
      router.push(notification.action_url);
    }
    
    // Tandai sebagai dibaca jika belum
    if (!notification.is_read) {
      markAsRead(notification.id);
    }
  };

  // Format date
  const formatDate = (dateString) => {
    return formatDateSafely(dateString);
  };

  // --- Loading State ---
  if (loading) {
    return (
      <DashboardLayout user={user} title="Pusat Notifikasi & Komunikasi">
        <div className="flex flex-col items-center justify-center min-h-[400px] p-8">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="mt-4 text-muted-foreground">Memverifikasi sesi dan memuat data...</p>
        </div>
      </DashboardLayout>
    );
  }

  // --- Error State ---
  if (error || !user || !profile) {
    return (
      <DashboardLayout user={user} title="Pusat Notifikasi & Komunikasi">
        <div className="p-4 md:p-6">
          <Alert variant="destructive" className="m-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Terjadi Kesalahan</AlertTitle>
            <AlertDescription>
              {error || "Akses Ditolak. Silakan login kembali."}
            </AlertDescription>
          </Alert>
        </div>
      </DashboardLayout>
    );
  }

  // --- Render Utama ---
  return (
    <DashboardLayout user={user} title="Pusat Notifikasi & Komunikasi">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="p-4 md:p-6 space-y-6"
      >
        <Card className="border-border">
          <CardContent className="p-6">
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h1 className="text-xl md:text-2xl font-semibold text-foreground">
                    Pusat Notifikasi & Komunikasi
                  </h1>
                  <p className="text-sm text-muted-foreground">
                    {unreadCount} pesan belum dibaca dari total {notifications.length} notifikasi
                  </p>
                </div>

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={markAllAsRead}
                    disabled={markingAsRead || unreadCount === 0}
                    className="flex items-center gap-2"
                  >
                    {markingAsRead ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Menandai...
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        Tandai Semua Dibaca
                      </>
                    )}
                  </Button>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex items-center gap-2"
                      >
                        <ChevronDown className="w-4 h-4" />
                        Filter
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                      <DropdownMenuLabel>Filter Notifikasi</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => {/* Filter semua */}}>
                        Semua Notifikasi
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => {/* Filter belum dibaca */}}>
                        Belum Dibaca
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => {/* Filter sudah dibaca */}}>
                        Sudah Dibaca
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              <Separator className="bg-border" />

              {notifications && notifications.length > 0 ? (
                <div className="w-full overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[50px] text-foreground">Status</TableHead>
                        <TableHead className="text-foreground">Tipe</TableHead>
                        <TableHead className="text-foreground">Pesan</TableHead>
                        <TableHead className="text-foreground">Pengirim</TableHead>
                        <TableHead className="w-[150px] text-foreground">Tanggal</TableHead>
                        <TableHead className="w-[120px] text-foreground">Prioritas</TableHead>
                        <TableHead className="w-[100px] text-center text-foreground">Aksi</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {notifications.map((notification) => (
                        <TableRow
                          key={notification.id}
                          className={`hover:bg-accent/50 ${
                            !notification.is_read 
                              ? 'bg-blue-50 dark:bg-blue-900/20 border-l-4 border-l-blue-500' 
                              : ''
                          }`}
                        >
                          <TableCell>
                            <Badge variant={getStatusColor(notification.is_read)}>
                              {notification.is_read ? 'Dibaca' : 'Baru'}
                            </Badge>
                          </TableCell>

                          <TableCell className="font-medium">
                            <p className="text-sm font-bold text-foreground">
                              {notification.title}
                            </p>
                          </TableCell>

                          <TableCell className="text-foreground">
                            <div className="max-w-md">
                              {notification.message}
                            </div>
                          </TableCell>

                          <TableCell className="text-foreground">
                            <span className="text-sm">{notification.author}</span>
                          </TableCell>

                          <TableCell className="text-foreground">
                            <span className="text-sm">
                              {formatDate(notification.created_at)}
                            </span>
                          </TableCell>

                          <TableCell>
                            <Badge variant={getPriorityColor(notification.priority)}>
                              {notification.priority}
                            </Badge>
                          </TableCell>

                          <TableCell className="text-center">
                            <div className="flex justify-center gap-1">
                              {!notification.is_read && (
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        className="h-8 w-8 p-0 text-green-600 hover:text-green-700"
                                        onClick={() => markAsRead(notification.id)}
                                        disabled={markingAsRead}
                                      >
                                        <Check className="w-4 h-4" />
                                        <span className="sr-only">Tandai sebagai dibaca</span>
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>Tandai sebagai dibaca</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              )}

                              {notification.action_url && (
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700"
                                        onClick={() => handleActionClick(notification)}
                                      >
                                        <Eye className="w-4 h-4" />
                                        <span className="sr-only">Lihat Detail</span>
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>Lihat Detail</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              )}

                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                                      onClick={() => deleteNotification(notification.id)}
                                    >
                                      <Trash2 className="w-4 h-4" />
                                      <span className="sr-only">Hapus</span>
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Hapus</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertTitle>Tidak Ada Notifikasi</AlertTitle>
                  <AlertDescription>
                    Belum ada komunikasi atau notifikasi untuk Anda.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </DashboardLayout>
  );
};

export default NotificationCenter;