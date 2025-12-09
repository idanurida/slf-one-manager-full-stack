// FILE: src/components/notifications/RealtimeNotificationCenter.js
"use client";

import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { useToast } from '@/components/ui/use-toast'; // ✅ Gunakan useToast dari shadcn/ui

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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

// Lucide Icons
import {
  FileText, Clock, Activity, CheckCircle, XCircle, Bell, Eye, Search, X,
  CheckSquare, AlertTriangle, Loader2, Info, Calendar, UserCheck, Camera, Plus, Save, RotateCcw
} from 'lucide-react';

// Other Imports
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

const getPriorityColor = (priority) => {
  switch (priority?.toLowerCase()) {
    case 'high': return 'destructive';
    case 'medium': return 'default';
    case 'low': return 'secondary';
    default: return 'outline';
  }
};

const getTypeColor = (type) => {
  switch (type?.toLowerCase()) {
    case 'approval': return 'default';
    case 'inspection': return 'secondary';
    case 'report': return 'outline';
    case 'payment': return 'destructive';
    case 'project': return 'blue';
    case 'client': return 'green';
    case 'system': return 'gray';
    default: return 'outline';
  }
};

// --- Main Component ---
const RealtimeNotificationCenter = () => {
  const { toast } = useToast(); // ✅ Gunakan useToast dari shadcn/ui
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  // Helper untuk format tanggal
  const formatDate = (dateString) => {
    if (!dateString) return '-';
    try {
      return format(new Date(dateString), 'dd MMM yyyy HH:mm', { locale: localeId });
    } catch (e) {
      console.error('[RealtimeNotificationCenter] Format date error:', e);
      return '-';
    }
  };

  useEffect(() => {
    let isMounted = true; // ✅ Flag untuk mencegah state update pada unmounted component

    const loadInitialNotifications = async () => {
      if (!isMounted) return;
      try {
        const { user, profile } = await getUserAndProfile(); // ✅ Gunakan getUserAndProfile
        if (!user || !profile) {
          console.warn('[RealtimeNotificationCenter] Pengguna tidak terautentikasi.');
          return;
        }

        if (isMounted) setLoading(true);

        // ✅ Ambil notifikasi awal: checklist_responses dengan status 'project_lead_approved'
        // ✅ Join dengan profiles berdasarkan assigned_to
        const {  responsesData, error: fetchError } = await supabase
          .from('checklist_responses')
          .select(`
            id,
            item_id,
            responded_at,
            status,
            assigned_to,
            profiles!assigned_to(full_name, email) // ✅ Gunakan assigned_to
          `)
          .eq('status', 'project_lead_approved') // ✅ Filter yang benar
          .order('responded_at', { ascending: false })
          .limit(10);

        if (fetchError) throw fetchError;

        // Format data ke bentuk notifikasi
        const formattedNotifications = (responsesData || []).map(response => ({
          id: response.id,
          title: 'Laporan Baru untuk Disetujui',
          // ✅ Gunakan nama inspector dari relasi yang benar
          message: `Laporan checklist ${response.item_id} dari ${response.profiles?.full_name || response.profiles?.email || 'Inspector'} siap untuk disetujui.`,
          created_at: response.responded_at,
          is_read: false, // Default belum dibaca
          priority: 'high',
          type: 'approval',
          // Tautan ke halaman detail persetujuan (pastikan route ini ada)
          action_url: `/dashboard/head-consultant/approvals/${response.id}`,
        }));

        if (isMounted) {
          setNotifications(formattedNotifications);
          setUnreadCount(formattedNotifications.length);
        }
      } catch (err) {
        console.error('[RealtimeNotificationCenter] Fetch initial notifications error:', err);
        const errorMessage = err.message || 'Terjadi kesalahan saat memuat notifikasi awal.';
        if (isMounted) {
          toast({
            title: 'Gagal memuat notifikasi.',
            description: errorMessage,
            variant: "destructive", // ✅ Gunakan variant shadcn/ui
          });
          setNotifications([]);
          setUnreadCount(0);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadInitialNotifications();

    // Cleanup function
    return () => {
      isMounted = false;
    };
  }, [toast]);

  const markAsRead = (id) => {
    setNotifications(prev =>
      prev.map(n => n.id === id ? { ...n, is_read: true } : n)
    );
    setUnreadCount(prev => prev > 0 ? prev - 1 : 0);
  };

  // --- Loading State ---
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] p-8">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Memverifikasi sesi dan memuat data...</p>
      </div>
    );
  }

  // --- Render Utama ---
  return (
    <div className="p-4 md:p-6 space-y-6">
      <h1 className="text-xl md:text-2xl font-semibold text-blue.600"> {/* ✅ Ganti Heading dengan h1 */}
        Notifikasi Terbaru
      </h1>
      {notifications.length > 0 ? (
        <div className="space-y-3"> {/* ✅ Ganti VStack dengan div space-y-3 */}
          {notifications.map(notification => (
            <Card
              key={notification.id}
              className={`border-border ${notification.is_read ? 'bg-card' : 'bg-blue.50 dark:bg-blue.900/20 border-l-4 border-l-blue.500'}`} // ✅ Ganti Card dengan Card shadcn/ui dan tambahkan class Tailwind
            >
              <CardContent className="p-6"> {/* ✅ Ganti CardBody dengan CardContent shadcn/ui */}
                <div className="space-y-2"> {/* ✅ Ganti VStack dengan div space-y-2 */}
                  <div className="flex justify-between items-center"> {/* ✅ Ganti HStack dengan div flex justify-between items-center */}
                    <p className="font-bold text-sm text-foreground"> {/* ✅ Ganti Text fontWeight="bold" fontSize="sm" dengan p font-bold text-sm text-foreground */}
                      {notification.title}
                    </p>
                    <Badge variant={notification.is_read ? 'default' : 'secondary'} className="capitalize"> {/* ✅ Ganti Badge colorScheme dengan variant dan tambahkan capitalize */}
                      {notification.is_read ? 'Dibaca' : 'Baru'}
                    </Badge>
                  </div>
                  <p className="text-sm text-foreground"> {/* ✅ Ganti Text fontSize="sm" dengan p text-sm text-foreground */}
                    {notification.message}
                  </p>
                  <div className="flex justify-between items-center text-xs text-muted-foreground"> {/* ✅ Ganti HStack justify="space-between" fontSize="xs" color="gray.500" dengan div flex justify-between items-center text-xs text-muted-foreground */}
                    <p>{formatDate(notification.created_at)}</p> {/* ✅ Ganti Text dengan p */}
                    <Button
                      size="xs"
                      variant="link"
                      className="text-blue.500 hover:text-blue.700 dark:hover:text-blue.300 flex items-center gap-2" // ✅ Ganti Button colorScheme="blue" dengan class Tailwind
                      onClick={() => {
                        markAsRead(notification.id);
                        // Arahkan ke halaman detail
                        if (notification.action_url) {
                          window.location.href = notification.action_url;
                        } else {
                          toast({
                            title: 'Tautan tidak tersedia',
                            description: 'Tautan untuk detail notifikasi ini tidak ditemukan.',
                            variant: "destructive", // ✅ Gunakan variant shadcn/ui
                          });
                        }
                      }}
                    >
                      <Eye className="w-4 h-4" />
                      Lihat Detail
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Alert> {/* ✅ Ganti Alert status="info" dengan Alert shadcn/ui */}
          <Info className="h-4 w-4" />
          <AlertTitle>Tidak ada notifikasi</AlertTitle> {/* ✅ Ganti AlertTitle dengan AlertTitle shadcn/ui */}
          <AlertDescription> {/* ✅ Ganti AlertDescription dengan AlertDescription shadcn/ui */}
            Belum ada notifikasi untuk Anda.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};

export default RealtimeNotificationCenter;
