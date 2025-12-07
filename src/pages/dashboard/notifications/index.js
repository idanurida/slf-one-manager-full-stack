// FILE: src/pages/dashboard/notifications/index.js
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { useToast } from '@/components/ui/use-toast';

// shadcn/ui Components
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

// Lucide Icons
import {
  Bell, Eye, Search, X, AlertTriangle, Loader2, Info, CheckCircle,
  Clock, Mail, User, FileText, Building, Calendar
} from 'lucide-react';

// Other Imports
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { supabase } from '@/utils/supabaseClient';
import { useAuth } from '@/context/AuthContext';

// Utility function untuk class names
const cn = (...classes) => classes.filter(Boolean).join(' ');

const getNotificationTypeBadge = (type) => {
  const typeClasses = {
    info: "bg-blue-100 text-blue-800 border border-blue-300",
    warning: "bg-yellow-100 text-yellow-800 border border-yellow-300",
    error: "bg-red-100 text-red-800 border border-red-300",
    success: "bg-green-100 text-green-800 border border-green-300",
  };

  return (
    <Badge
      variant="outline"
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize",
        typeClasses[type] || "bg-gray-100 text-gray-800 border border-gray-300"
      )}
    >
      {type || 'info'}
    </Badge>
  );
};

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

// --- Main Component ---
export default function NotificationCenter() {
  const router = useRouter();
  const { toast } = useToast();
  const { user, profile, loading: authLoading } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [debugInfo, setDebugInfo] = useState('');

  // States untuk data
  const [notifications, setNotifications] = useState([]);
  const [filteredNotifications, setFilteredNotifications] = useState([]);

  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');

  // --- Data Fetching ---
  useEffect(() => {
    const loadNotifications = async () => {
      if (!user?.id) return;

      setLoading(true);
      setError(null);
      setDebugInfo('Memulai load notifications...');

      try {
        console.log("[NotificationCenter] Fetching notifications for user:", user.id);

        if (!user || !profile) {
          console.warn('[NotificationCenter] User atau profile tidak tersedia.');
          return;
        }

        // Query sederhana tanpa join yang bermasalah
        console.log("📨 Mengambil notifications...");
        const { data: notifData, error: notifError } = await supabase
          .from('notifications')
          .select(`
            id,
            title,
            message,
            type,
            is_read,
            recipient_id,
            created_at
          `)
          .eq('recipient_id', user.id)
          .order('created_at', { ascending: false });

        if (notifError) {
          console.error('❌ Error notifications:', notifError);
          
          // Jika error karena RLS, coba query tanpa filter recipient_id
          if (notifError.code === 'PGRST200' || notifError.message.includes('relationship')) {
            console.log("🔄 Coba query tanpa recipient filter...");
            const { data: notifData2, error: notifError2 } = await supabase
              .from('notifications')
              .select('*')
              .order('created_at', { ascending: false })
              .limit(50);

            if (notifError2) {
              throw notifError2;
            }
            
            console.log("✅ Notifications data (without filter):", notifData2);
            setNotifications(notifData2 || []);
            setFilteredNotifications(notifData2 || []);
            setDebugInfo(`Found ${notifData2?.length || 0} notifications (no filter)`);
          } else {
            throw notifError;
          }
        } else {
          console.log("✅ Notifications data:", notifData);
          setNotifications(notifData || []);
          setFilteredNotifications(notifData || []);
          setDebugInfo(`Found ${notifData?.length || 0} notifications`);
        }

        console.log("🎉 Notifications berhasil di-load");

      } catch (err) {
        console.error('💥 [NotificationCenter] Fetch error:', err);
        const errorMessage = err.message || "Gagal memuat notifikasi.";
        setError(errorMessage);
        setDebugInfo(`Error: ${errorMessage}`);
        
        toast({
          title: "Gagal memuat notifikasi",
          description: errorMessage,
          variant: "destructive",
        });
        
        setNotifications([]);
        setFilteredNotifications([]);
      } finally {
        setLoading(false);
      }
    };

    if (user && profile) {
      loadNotifications();
    }
  }, [user, profile, toast]);

  // --- Filter Notifications ---
  useEffect(() => {
    let result = [...notifications];

    // Filter by type
    if (selectedType !== 'all') {
      result = result.filter(notif => notif.type === selectedType);
    }

    // Filter by status
    if (selectedStatus !== 'all') {
      if (selectedStatus === 'read') {
        result = result.filter(notif => notif.is_read === true);
      } else if (selectedStatus === 'unread') {
        result = result.filter(notif => notif.is_read === false);
      }
    }

    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(notif =>
        notif.title?.toLowerCase().includes(term) ||
        notif.message?.toLowerCase().includes(term) ||
        notif.type?.toLowerCase().includes(term)
      );
    }

    setFilteredNotifications(result);
  }, [searchTerm, selectedType, selectedStatus, notifications]);

  // --- Stats ---
  const notificationStats = useMemo(() => {
    if (!notifications.length) return { total: 0, unread: 0, read: 0 };
    
    const total = notifications.length;
    const unread = notifications.filter(n => !n.is_read).length;
    const read = notifications.filter(n => n.is_read).length;
    
    return { total, unread, read };
  }, [notifications]);

  // --- Handlers ---
  const handleMarkAsRead = async (notificationId) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId);

      if (error) throw error;

      // Update local state
      setNotifications(prev => 
        prev.map(notif => 
          notif.id === notificationId ? { ...notif, is_read: true } : notif
        )
      );

      toast({
        title: "Notifikasi ditandai sebagai dibaca",
        variant: "default",
      });
    } catch (err) {
      console.error('Error marking notification as read:', err);
      toast({
        title: "Gagal menandai notifikasi",
        description: err.message,
        variant: "destructive",
      });
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      const unreadIds = notifications.filter(n => !n.is_read).map(n => n.id);
      
      if (unreadIds.length === 0) {
        toast({
          title: "Tidak ada notifikasi yang belum dibaca",
          variant: "default",
        });
        return;
      }

      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .in('id', unreadIds);

      if (error) throw error;

      // Update local state
      setNotifications(prev => 
        prev.map(notif => 
          !notif.is_read ? { ...notif, is_read: true } : notif
        )
      );

      toast({
        title: "Semua notifikasi ditandai sebagai dibaca",
        variant: "default",
      });
    } catch (err) {
      console.error('Error marking all notifications as read:', err);
      toast({
        title: "Gagal menandai semua notifikasi",
        description: err.message,
        variant: "destructive",
      });
    }
  };

  const resetFilters = () => {
    setSearchTerm('');
    setSelectedType('all');
    setSelectedStatus('all');
  };

  // --- Loading State ---
  if (authLoading || loading) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center min-h-[400px] p-8">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="mt-4 text-muted-foreground">Memuat notifikasi...</p>
          {debugInfo && (
            <p className="mt-2 text-xs text-muted-foreground">Debug: {debugInfo}</p>
          )}
        </div>
      </DashboardLayout>
    );
  }

  // --- Auth Check ---
  if (!user || !profile) {
    return (
      <DashboardLayout>
        <div className="p-4 md:p-6">
          <Alert variant="destructive">
            <Info className="h-4 w-4" />
            <AlertTitle>Akses Ditolak</AlertTitle>
            <AlertDescription>
              Anda harus login untuk mengakses halaman ini.
            </AlertDescription>
          </Alert>
          <Button
            onClick={() => router.push('/login')}
            className="mt-4"
          >
            Login
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  // Debug info untuk development
  const showDebugInfo = process.env.NODE_ENV === 'development';

  return (
    <DashboardLayout>
      <div className="p-4 md:p-6 space-y-6">
        {/* Debug Info */}
        {showDebugInfo && debugInfo && (
          <Alert className="bg-yellow-50 border-yellow-200">
            <Info className="h-4 w-4 text-yellow-600" />
            <AlertTitle className="text-yellow-800">Debug Info</AlertTitle>
            <AlertDescription className="text-yellow-700">
              {debugInfo} | User: {user?.id}
            </AlertDescription>
          </Alert>
        )}

        {/* Action Buttons */}
        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleMarkAllAsRead}
            disabled={notificationStats.unread === 0}
          >
            <CheckCircle className="w-4 h-4 mr-2" />
            Tandai Semua Dibaca
          </Button>
            <Button
            variant="outline"
            size="sm"
            onClick={() => router.push('/dashboard')}
          >
            Kembali
          </Button>
        </div>

        <Separator className="bg-border" />

        {/* Stats Cards */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Card className="border-border hover:shadow-md transition-shadow duration-300">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Notifikasi</p>
                  <p className="text-2xl font-bold text-foreground">{notificationStats.total}</p>
                </div>
                <div className="p-2 bg-blue-100 rounded-full">
                  <Bell className="w-5 h-5 text-blue-600" />
                </div>
              </div>
              <div className="mt-3">
                <div className="w-full bg-gray-200 rounded-full h-1.5">
                  <div
                    className="bg-blue-600 h-1.5 rounded-full"
                    style={{ width: '100%' }}
                  ></div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border hover:shadow-md transition-shadow duration-300">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Belum Dibaca</p>
                  <p className="text-2xl font-bold text-foreground">{notificationStats.unread}</p>
                </div>
                <div className="p-2 bg-orange-100 rounded-full">
                  <Clock className="w-5 h-5 text-orange-600" />
                </div>
              </div>
              <div className="mt-3">
                <div className="w-full bg-gray-200 rounded-full h-1.5">
                  <div
                    className="bg-orange-600 h-1.5 rounded-full"
                    style={{ width: `${notificationStats.total > 0 ? (notificationStats.unread / notificationStats.total) * 100 : 0}%` }}
                  ></div>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {notificationStats.total > 0 ? Math.round((notificationStats.unread / notificationStats.total) * 100) : 0}% dari total
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border hover:shadow-md transition-shadow duration-300">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Sudah Dibaca</p>
                  <p className="text-2xl font-bold text-foreground">{notificationStats.read}</p>
                </div>
                <div className="p-2 bg-green-100 rounded-full">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                </div>
              </div>
              <div className="mt-3">
                <div className="w-full bg-gray-200 rounded-full h-1.5">
                  <div
                    className="bg-green-600 h-1.5 rounded-full"
                    style={{ width: `${notificationStats.total > 0 ? (notificationStats.read / notificationStats.total) * 100 : 0}%` }}
                  ></div>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {notificationStats.total > 0 ? Math.round((notificationStats.read / notificationStats.total) * 100) : 0}% dari total
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filter Section */}
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Search className="w-5 h-5" />
              Filter Notifikasi
            </CardTitle>
            <CardDescription>
              Saring notifikasi berdasarkan kriteria tertentu
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="search-notifications">Cari Notifikasi</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="search-notifications"
                    placeholder="Cari judul, pesan, atau tipe notifikasi..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 bg-background"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="type-filter">Filter Tipe</Label>
                <Select value={selectedType} onValueChange={setSelectedType}>
                  <SelectTrigger id="type-filter" className="w-full bg-background">
                    <SelectValue placeholder="Semua Tipe" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Tipe</SelectItem>
                    <SelectItem value="info">Info</SelectItem>
                    <SelectItem value="warning">Warning</SelectItem>
                    <SelectItem value="error">Error</SelectItem>
                    <SelectItem value="success">Success</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="status-filter">Filter Status</Label>
                <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                  <SelectTrigger id="status-filter" className="w-full bg-background">
                    <SelectValue placeholder="Semua Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Status</SelectItem>
                    <SelectItem value="unread">Belum Dibaca</SelectItem>
                    <SelectItem value="read">Sudah Dibaca</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="mt-4 flex justify-end">
              <Button
                variant="outline"
                onClick={resetFilters}
                disabled={!searchTerm && selectedType === 'all' && selectedStatus === 'all'}
                className="flex items-center gap-2 bg-background"
              >
                <X className="w-4 h-4" />
                Reset Filter
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Notifications Table */}
        {notifications.length === 0 ? (
          <Card className="border-border">
            <CardContent className="p-8 text-center">
              <Bell className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Tidak Ada Notifikasi</h3>
              <p className="text-muted-foreground mb-4">
                Anda belum memiliki notifikasi.
              </p>
            </CardContent>
          </Card>
        ) : filteredNotifications.length > 0 ? (
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Bell className="w-5 h-5" />
                Daftar Notifikasi
              </CardTitle>
              <CardDescription>
                Menampilkan {filteredNotifications.length} dari {notifications.length} notifikasi
                {selectedType !== 'all' && ` • Tipe: ${selectedType}`}
                {selectedStatus !== 'all' && ` • Status: ${selectedStatus === 'read' ? 'Sudah Dibaca' : 'Belum Dibaca'}`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="w-full overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-foreground">Status</TableHead>
                      <TableHead className="text-foreground">Judul</TableHead>
                      <TableHead className="text-foreground">Pesan</TableHead>
                      <TableHead className="text-foreground">Tipe</TableHead>
                      <TableHead className="text-foreground">Tanggal</TableHead>
                      <TableHead className="text-center text-foreground">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredNotifications.map((notif) => (
                      <TableRow 
                        key={notif.id} 
                        className={cn(
                          "hover:bg-accent/50",
                          !notif.is_read && "bg-blue-50"
                        )}
                      >
                        <TableCell>
                          {!notif.is_read ? (
                            <Badge variant="default" className="bg-blue-500">
                              Baru
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-muted-foreground">
                              Dibaca
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="font-medium">
                          <p className="text-sm font-semibold text-foreground">{notif.title}</p>
                        </TableCell>
                        <TableCell className="text-foreground">
                          <p className="text-sm line-clamp-2">{notif.message}</p>
                        </TableCell>
                        <TableCell>
                          {getNotificationTypeBadge(notif.type)}
                        </TableCell>
                        <TableCell className="text-foreground">
                          {formatDateSafely(notif.created_at)}
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex justify-center gap-2">
                            {!notif.is_read && (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handleMarkAsRead(notif.id)}
                                    >
                                      <CheckCircle className="w-4 h-4 mr-1" />
                                      Tandai Dibaca
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Tandai sebagai sudah dibaca</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertTitle>Tidak ada notifikasi</AlertTitle>
            <AlertDescription>
              Tidak ditemukan notifikasi yang sesuai dengan filter.
            </AlertDescription>
          </Alert>
        )}
      </div>
    </DashboardLayout>
  );
}