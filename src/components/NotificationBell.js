// FILE: src/components/NotificationBell.js
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { Bell, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from '@/utils/supabaseClient';
import { getUserAndProfile } from '@/utils/auth';
import { markNotificationAsRead } from '@/utils/notificationHelpers';

const NotificationBell = () => {
  const router = useRouter();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUnreadNotifications();
    
    // Setup real-time subscription
    const subscription = supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications'
        },
        () => {
          loadUnreadNotifications();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const loadUnreadNotifications = async () => {
    try {
      const { profile } = await getUserAndProfile();
      if (!profile) return;

      const { data, error } = await supabase
        .from('notifications')
        .select('id, type, message, created_at, read_at')
        .eq('recipient_id', profile.id)
        .is('read_at', null)
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;
      
      setNotifications(data || []);
      setUnreadCount(data?.length || 0);
    } catch (error) {
      console.error('Notification bell error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleNotificationClick = async (notificationId) => {
    // Tandai sebagai dibaca ketika diklik
    await markNotificationAsRead(notificationId);
    loadUnreadNotifications(); // Reload notifications
  };

  const handleViewAll = () => {
    router.push('/dashboard/notifications');
  };

  if (loading) {
    return (
      <Button variant="ghost" size="icon" className="relative">
        <Loader2 className="h-5 w-5 animate-spin" />
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel>
          Notifikasi {unreadCount > 0 && `(${unreadCount})`}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        {notifications.length > 0 ? (
          notifications.map((notification) => (
            <DropdownMenuItem 
              key={notification.id} 
              className="flex flex-col items-start p-3 cursor-pointer"
              onClick={() => handleNotificationClick(notification.id)}
            >
              <div className="text-sm font-medium line-clamp-2">{notification.message}</div>
              <div className="text-xs text-muted-foreground mt-1">
                {new Date(notification.created_at).toLocaleDateString('id-ID', {
                  day: 'numeric',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </div>
            </DropdownMenuItem>
          ))
        ) : (
          <DropdownMenuItem disabled className="text-center py-4">
            Tidak ada notifikasi baru
          </DropdownMenuItem>
        )}
        
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleViewAll} className="text-center cursor-pointer">
          Lihat semua notifikasi
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default NotificationBell;