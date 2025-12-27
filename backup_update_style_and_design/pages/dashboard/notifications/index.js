
// FILE: src/pages/dashboard/notifications/index.js
import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/router';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

// Components
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';

// Icons
import {
  Bell, CheckCircle, Clock, Search, Filter, Trash2, X, RefreshCw,
  Info, AlertTriangle, AlertCircle, CheckCircle2, MoreHorizontal, Check
} from 'lucide-react';

// Utils & Context
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { supabase } from '@/utils/supabaseClient';
import { useAuth } from '@/context/AuthContext';

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05 } }
};
const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { duration: 0.4, ease: "easeOut" } }
};

export default function NotificationCenter() {
  const router = useRouter();
  const { user, profile, loading: authLoading } = useAuth();

  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState([]);
  const [filteredNotifications, setFilteredNotifications] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');

  // Fetch Notifications
  const fetchNotifications = async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('recipient_id', user.id)
        .order('created_at', { ascending: false }); // Latest first

      if (error) throw error;
      setNotifications(data || []);
      setFilteredNotifications(data || []);
    } catch (err) {
      console.error('Error fetching notifications:', err);
      toast.error('Gagal memuat notifikasi');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) fetchNotifications();
  }, [user]);

  // Filter Logic
  useEffect(() => {
    let result = [...notifications];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(n =>
        n.title?.toLowerCase().includes(term) ||
        n.message?.toLowerCase().includes(term)
      );
    }

    if (selectedType !== 'all') {
      result = result.filter(n => n.type === selectedType);
    }

    if (selectedStatus !== 'all') {
      if (selectedStatus === 'read') result = result.filter(n => n.is_read);
      if (selectedStatus === 'unread') result = result.filter(n => !n.is_read);
    }

    setFilteredNotifications(result);
  }, [notifications, searchTerm, selectedType, selectedStatus]);

  // Stats
  const stats = useMemo(() => {
    return {
      total: notifications.length,
      unread: notifications.filter(n => !n.is_read).length,
      read: notifications.filter(n => n.is_read).length,
    };
  }, [notifications]);

  // Handlers
  const handleMarkAsRead = async (id) => {
    try {
      const { error } = await supabase.from('notifications').update({ is_read: true }).eq('id', id);
      if (error) throw error;

      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
      toast.success('Notifikasi ditandai sudah dibaca');
    } catch (err) {
      console.error(err);
      toast.error('Gagal update status');
    }
  };

  const handleMarkAllRead = async () => {
    const unreadIds = notifications.filter(n => !n.is_read).map(n => n.id);
    if (unreadIds.length === 0) return toast.info('Semua notifikasi sudah dibaca');

    try {
      const { error } = await supabase.from('notifications').update({ is_read: true }).in('id', unreadIds);
      if (error) throw error;

      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      toast.success('Semua notifikasi ditandai sudah dibaca');
    } catch (err) {
      console.error(err);
      toast.error('Gagal update status');
    }
  };

  const handleDelete = async (id) => {
    try {
      const { error } = await supabase.from('notifications').delete().eq('id', id);
      if (error) throw error;

      setNotifications(prev => prev.filter(n => n.id !== id));
      toast.success('Notifikasi dihapus');
    } catch (err) {
      console.error(err);
      toast.error('Gagal hapus notifikasi');
    }
  };

  if (authLoading || (user && !profile)) return null;

  return (
    <DashboardLayout>
      <motion.div
        className="max-w-[1200px] mx-auto p-6 md:p-8 space-y-8"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <motion.div variants={itemVariants}>
            <h1 className="text-3xl md:text-4xl font-black uppercase tracking-tighter text-slate-900 dark:text-white">
              Pusat <span className="text-[#7c3aed]">Notifikasi</span>
            </h1>
            <p className="text-slate-500 font-medium">Pantau update terbaru seputar proyek Anda.</p>
          </motion.div>
          <motion.div variants={itemVariants} className="flex gap-3">
            <Button variant="outline" size="sm" onClick={fetchNotifications} className="rounded-xl h-10 px-4">
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button size="sm" onClick={handleMarkAllRead} className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl font-bold uppercase tracking-widest text-xs h-10 px-4">
              <CheckCircle className="w-4 h-4 mr-2" />
              Mark All Read
            </Button>
          </motion.div>
        </div>

        {/* Stats Grid */}
        <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white dark:bg-slate-950 p-6 rounded-[2rem] border border-slate-100 dark:border-white/5 shadow-xl shadow-slate-200/50 dark:shadow-none flex items-center justify-between">
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest mb-1">Total</p>
              <h3 className="text-3xl font-black text-slate-900 dark:text-white">{stats.total}</h3>
            </div>
            <div className="size-12 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
              <Bell size={24} />
            </div>
          </div>
          <div className="bg-white dark:bg-slate-950 p-6 rounded-[2rem] border border-slate-100 dark:border-white/5 shadow-xl shadow-slate-200/50 dark:shadow-none flex items-center justify-between">
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest mb-1">Unread</p>
              <h3 className="text-3xl font-black text-slate-900 dark:text-white">{stats.unread}</h3>
            </div>
            <div className="size-12 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center">
              <AlertCircle size={24} />
            </div>
          </div>
          <div className="bg-white dark:bg-slate-950 p-6 rounded-[2rem] border border-slate-100 dark:border-white/5 shadow-xl shadow-slate-200/50 dark:shadow-none flex items-center justify-between">
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest mb-1">Read</p>
              <h3 className="text-3xl font-black text-slate-900 dark:text-white">{stats.read}</h3>
            </div>
            <div className="size-12 rounded-xl bg-green-100 text-green-600 flex items-center justify-center">
              <CheckCircle2 size={24} />
            </div>
          </div>
        </motion.div>

        {/* Filters */}
        <motion.div variants={itemVariants} className="bg-white dark:bg-slate-950 p-6 rounded-[2rem] shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-100 dark:border-white/5 flex flex-col md:flex-row gap-4 relative z-10">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <Input
              placeholder="Cari notifikasi..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-12 h-12 bg-slate-50 dark:bg-slate-900/50 border-transparent focus:border-[#7c3aed] rounded-xl text-base"
            />
          </div>
          <Select value={selectedType} onValueChange={setSelectedType}>
            <SelectTrigger className="w-full md:w-[180px] h-12 bg-slate-50 dark:bg-slate-900/50 border-transparent focus:border-[#7c3aed] rounded-xl">
              <SelectValue placeholder="Tipe" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="all">Semua Tipe</SelectItem>
              <SelectItem value="info">Info</SelectItem>
              <SelectItem value="warning">Warning</SelectItem>
              <SelectItem value="success">Success</SelectItem>
              <SelectItem value="error">Error</SelectItem>
            </SelectContent>
          </Select>
          <Select value={selectedStatus} onValueChange={setSelectedStatus}>
            <SelectTrigger className="w-full md:w-[180px] h-12 bg-slate-50 dark:bg-slate-900/50 border-transparent focus:border-[#7c3aed] rounded-xl">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="all">Semua Status</SelectItem>
              <SelectItem value="unread">Belum Dibaca</SelectItem>
              <SelectItem value="read">Sudah Dibaca</SelectItem>
            </SelectContent>
          </Select>
        </motion.div>

        {/* Notifications List */}
        <div className="space-y-4">
          <AnimatePresence mode="popLayout">
            {loading ? (
              [1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24 w-full rounded-[2rem]" />)
            ) : filteredNotifications.length === 0 ? (
              <div className="py-20 text-center">
                <div className="size-24 rounded-full bg-slate-50 dark:bg-slate-900 flex items-center justify-center mx-auto mb-6">
                  <Bell className="size-12 text-slate-300" />
                </div>
                <h3 className="text-xl font-black uppercase tracking-tight text-slate-900 dark:text-white mb-2">Tidak ada notifikasi</h3>
                <p className="text-slate-400">Anda tidak memiliki notifikasi baru saat ini.</p>
              </div>
            ) : (
              filteredNotifications.map((notif) => (
                <motion.div
                  key={notif.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className={`
                    group relative p-6 rounded-[2rem] border transition-all duration-300 hover:shadow-lg
                    ${notif.is_read
                      ? 'bg-white dark:bg-slate-950 border-slate-100 dark:border-white/5 opacity-70 hover:opacity-100'
                      : 'bg-white dark:bg-slate-950 border-[#7c3aed]/20 shadow-xl shadow-[#7c3aed]/5 ring-1 ring-[#7c3aed]/10'}
                  `}
                >
                  <div className="flex items-start gap-4">
                    <div className={`
                      shrink-0 size-12 rounded-2xl flex items-center justify-center
                      ${getTypeColor(notif.type)}
                    `}>
                      {getTypeIcon(notif.type)}
                    </div>

                    <div className="flex-1 min-w-0 pr-12">
                      <div className="flex flex-col md:flex-row md:items-center gap-2 mb-1">
                        <h4 className={`text-base font-bold ${notif.is_read ? 'text-slate-600 dark:text-slate-300' : 'text-slate-900 dark:text-white'}`}>
                          {notif.title}
                        </h4>
                        {!notif.is_read && (
                          <Badge className="w-fit bg-red-100 text-red-600 hover:bg-red-200 border-none px-2 py-0.5 text-[9px] uppercase font-black tracking-widest">
                            New
                          </Badge>
                        )}
                        <span className="text-xs font-medium text-slate-400 flex items-center md:ml-auto">
                          <Clock size={12} className="mr-1" />
                          {format(new Date(notif.created_at), 'dd MMM yyyy, HH:mm', { locale: localeId })}
                        </span>
                      </div>
                      <p className="text-sm text-slate-500 font-medium leading-relaxed">
                        {notif.message}
                      </p>
                    </div>

                    <div className="absolute top-6 right-6 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      {!notif.is_read && (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 rounded-full hover:bg-[#7c3aed]/10 text-slate-400 hover:text-[#7c3aed]"
                          onClick={() => handleMarkAsRead(notif.id)}
                          title="Tandai sudah dibaca"
                        >
                          <Check size={16} />
                        </Button>
                      )}
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 rounded-full hover:bg-red-50 text-slate-400 hover:text-red-500"
                        onClick={() => handleDelete(notif.id)}
                        title="Hapus notifikasi"
                      >
                        <Trash2 size={16} />
                      </Button>
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </div>

      </motion.div>
    </DashboardLayout>
  );
}

// Helpers
const getTypeColor = (type) => {
  switch (type) {
    case 'success': return 'bg-green-100 text-green-600';
    case 'error': return 'bg-red-100 text-red-600';
    case 'warning': return 'bg-orange-100 text-orange-600';
    case 'info':
    default: return 'bg-blue-100 text-blue-600';
  }
};

const getTypeIcon = (type) => {
  switch (type) {
    case 'success': return <CheckCircle2 size={24} />;
    case 'error': return <AlertTriangle size={24} />;
    case 'warning': return <AlertCircle size={24} />;
    case 'info':
    default: return <Info size={24} />;
  }
};
