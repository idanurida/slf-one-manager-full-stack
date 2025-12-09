// FILE: src/components/common/NotifikasiBell.jsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/router';
import { Bell, Check, CheckCheck, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { supabase } from '@/utils/supabaseClient';
import { useAuth } from '@/context/AuthContext';

const NotifikasiBell = () => {
  const router = useRouter();
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  const fetchNotifications = useCallback(async () => {
    if (!user?.id) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select(`
          id,
          type,
          message,
          read,
          created_at,
          project_id,
          data
        `)
        .eq('recipient_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;

      const formattedNotifications = (data || []).map(notif => ({
        id: notif.id,
        judul: getNotificationTitle(notif.type),
        pesan: notif.message,
        status: notif.read ? 'dibaca' : 'belum_dibaca',
        tipe: notif.type,
        created_at: notif.created_at,
        project_id: notif.project_id,
        data: notif.data
      }));

      setNotifications(formattedNotifications);
      setUnreadCount(formattedNotifications.filter(n => n.status === 'belum_dibaca').length);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const markAsRead = async (notificationId) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId);

      if (error) throw error;
      
      setNotifications(prev => prev.map(notif => 
        notif.id === notificationId ? { ...notif, status: 'dibaca' } : notif
      ));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    if (!user?.id) return;
    
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('recipient_id', user.id)
        .eq('read', false);

      if (error) throw error;
      
      setNotifications(prev => prev.map(notif => ({ ...notif, status: 'dibaca' })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const handleNotificationClick = (notification) => {
    markAsRead(notification.id);
    
    // Navigate based on notification type
    if (notification.project_id) {
      router.push(`/dashboard/client/projects/${notification.project_id}`);
    }
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="p-3 border-b border-border">
          <div className="flex justify-between items-center">
            <h3 className="font-semibold text-foreground">Notifikasi</h3>
            {unreadCount > 0 && (
              <Button 
                variant="ghost" 
                size="sm"
                onClick={markAllAsRead}
                className="text-xs h-7"
              >
                <CheckCheck className="w-3 h-3 mr-1" />
                Tandai semua dibaca
              </Button>
            )}
          </div>
        </div>

        <ScrollArea className="h-[300px]">
          {loading ? (
            <div className="p-4 text-center text-muted-foreground">
              Memuat notifikasi...
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-8 text-center">
              <Bell className="w-12 h-12 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">Tidak ada notifikasi</p>
            </div>
          ) : (
            notifications.map(notification => (
              <div 
                key={notification.id}
                className={`p-3 border-b border-border cursor-pointer hover:bg-accent/50 transition-colors ${
                  notification.status === 'belum_dibaca' ? 'bg-primary/5' : ''
                }`}
                onClick={() => handleNotificationClick(notification)}
              >
                <div className="flex gap-2">
                  <div className={`w-2 h-2 mt-2 rounded-full flex-shrink-0 ${
                    notification.status === 'belum_dibaca' ? 'bg-primary' : 'bg-muted'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm text-foreground">{notification.judul}</div>
                    <div className="text-sm text-muted-foreground line-clamp-2">{notification.pesan}</div>
                    <div className="flex justify-between items-center text-xs text-muted-foreground mt-1">
                      <span>{formatTimeAgo(notification.created_at)}</span>
                      <Badge variant="outline" className="text-xs">
                        {getNotificationTypeLabel(notification.tipe)}
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </ScrollArea>

        <Separator />
        <div className="p-2">
          <Button 
            variant="ghost" 
            className="w-full text-sm"
            onClick={() => {
              router.push('/dashboard/notifications');
              setOpen(false);
            }}
          >
            Lihat semua notifikasi
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
};

// Helper functions
const formatTimeAgo = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Baru saja';
  if (diffMins < 60) return `${diffMins} menit lalu`;
  if (diffHours < 24) return `${diffHours} jam lalu`;
  if (diffDays < 7) return `${diffDays} hari lalu`;
  return date.toLocaleDateString('id-ID');
};

const getNotificationTitle = (type) => {
  const titles = {
    'document_uploaded': 'Dokumen Diupload',
    'document_verified': 'Dokumen Diverifikasi',
    'document_rejected': 'Dokumen Ditolak',
    'project_approved': 'Proyek Disetujui',
    'project_updated': 'Proyek Diupdate',
    'revision_requested': 'Revisi Diminta',
    'payment_received': 'Pembayaran Diterima',
    'schedule_created': 'Jadwal Dibuat',
    'message_received': 'Pesan Baru'
  };
  return titles[type] || 'Notifikasi';
};

const getNotificationTypeLabel = (type) => {
  const labels = {
    'document_uploaded': 'Dokumen',
    'document_verified': 'Verifikasi',
    'document_rejected': 'Revisi',
    'project_approved': 'Approval',
    'project_updated': 'Update',
    'revision_requested': 'Revisi',
    'payment_received': 'Pembayaran',
    'schedule_created': 'Jadwal',
    'message_received': 'Pesan'
  };
  return labels[type] || type;
};

export default NotifikasiBell;
