import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/router";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { useTheme } from "next-themes";

// Components
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { TooltipProvider, Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

// Icons
import {
  User, Building, Mail, Phone, Calendar, CheckCircle2, Clock, AlertCircle, RefreshCw,
  Search, Eye, MessageCircle, ArrowLeft, MapPin, Users, Crown, Plus, FolderPlus, Rocket,
  MoreVertical, Menu, Sun, Moon, LogOut, Building2, LayoutDashboard, ChevronRight,
  PlusCircle, UserPlus, Send, Briefcase, ExternalLink, Globe, FolderOpen, Loader2, Settings, ArrowRight
} from "lucide-react";

// Utils & Context
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { supabase } from "@/utils/supabaseClient";
import { useAuth } from "@/context/AuthContext";

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05 } }
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { duration: 0.4, ease: "circOut" } }
};

// Main Component
export default function AdminLeadClientsPage() {
  const router = useRouter();
  const { user, profile, loading: authLoading, isAdminLead, logout } = useAuth();
  const { theme, setTheme } = useTheme();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [clients, setClients] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Fetch data clients
  const fetchData = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    setError(null);

    try {
      const { data: projectsData, error: projectsErr } = await supabase
        .from('projects')
        .select(`
          id, name, status, client_id, created_at,
          clients (id, name, email, phone, address, city, company_name, npwp)
        `)
        .or(`created_by.eq.${user.id},admin_lead_id.eq.${user.id}`)
        .order('created_at', { ascending: false });

      if (projectsErr) throw projectsErr;

      const clientsMap = new Map();
      projectsData.forEach(project => {
        if (project.clients?.id) {
          const clientId = project.clients.id;
          if (!clientsMap.has(clientId)) {
            clientsMap.set(clientId, {
              ...project.clients,
              project_count: 0,
              projects: []
            });
          }
          const client = clientsMap.get(clientId);
          client.project_count += 1;
          client.projects.push(project);
        }
      });

      const processedClients = Array.from(clientsMap.values()).map(client => {
        const sortedProjects = [...client.projects].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        return {
          ...client,
          latest_project_name: sortedProjects[0]?.name,
          latest_project_status: sortedProjects[0]?.status,
        };
      });

      setClients(processedClients);
    } catch (err) {
      console.error('Error fetching client data:', err);
      setError('Gagal memuat data client');
      toast.error('Gagal memuat data client');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (user && isAdminLead) {
      fetchData();
    }
  }, [user, isAdminLead, fetchData]);

  const filteredClients = clients.filter(client =>
    client.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.company_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleLogout = async () => {
    await logout();
    router.replace('/login');
  };

  const menuItems = [
    { icon: <LayoutDashboard size={20} />, label: "Dashboard", href: "/dashboard/admin-lead" },
    { icon: <Building size={20} />, label: "Proyek", href: "/dashboard/admin-lead/projects" },
    { icon: <Users size={20} />, label: "Tim", href: "/dashboard/admin-lead/team" },
    { icon: <Globe size={20} />, label: "Client", href: "/dashboard/admin-lead/clients", active: true },
    { icon: <FolderOpen size={20} />, label: "Dokumen", href: "/dashboard/admin-lead/pending-documents" },
  ];

  if (authLoading || (user && !isAdminLead) || loading) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] p-8">
          <Loader2 className="w-12 h-12 animate-spin text-[#7c3aed]" />
          <p className="mt-6 text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 animate-pulse">Syncing Client Intelligence...</p>
        </div>
      </DashboardLayout>
    );
  }

  const handleRefresh = () => {
    fetchData();
    toast.success('Client database synchronized');
  };

  return (
    <DashboardLayout>
      <TooltipProvider>
        <motion.div
          className="max-w-[1400px] mx-auto space-y-12 pb-24 p-6 md:p-0"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* Header Section */}
          <motion.div variants={itemVariants} className="flex flex-col lg:flex-row lg:items-end justify-between gap-8">
            <div className="flex items-start gap-6">
              <button type="button" onClick={() => router.back()} className="mt-2 size-12 rounded-2xl bg-white dark:bg-[#1e293b] border border-slate-100 dark:border-white/5 flex items-center justify-center text-slate-400 hover:text-[#7c3aed] hover:scale-110 transition-all shadow-xl shadow-slate-200/30 dark:shadow-none">
                <ArrowLeft size={20} />
              </button>
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <Badge className="bg-[#7c3aed]/10 text-[#7c3aed] border-none text-[8px] font-black uppercase tracking-widest">Client Management</Badge>
                  <div className="w-1 h-1 rounded-full bg-slate-300" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Database: {clients.length} Clients</span>
                </div>
                <h1 className="text-4xl md:text-5xl font-black tracking-tighter leading-none uppercase">
                  Partner <span className="text-[#7c3aed]">Intelligence</span>
                </h1>
                <p className="text-slate-500 dark:text-slate-400 mt-4 text-lg font-medium max-w-2xl">Arsip klien komprehensif dan riwayat kolaborasi proyek strategis Anda.</p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 w-full lg:w-auto">
              <div className="relative group flex-1 lg:min-w-[400px]">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#7c3aed] transition-colors" size={18} />
                <input
                  className="h-16 w-full rounded-2xl bg-white dark:bg-[#1e293b] border border-slate-100 dark:border-white/5 shadow-2xl shadow-slate-200/40 dark:shadow-none pl-12 pr-4 text-sm focus:ring-4 focus:ring-[#7c3aed]/10 outline-none transition-all placeholder-slate-400 font-medium"
                  placeholder="Query Client, Perusahaan, atau ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <button
                onClick={() => router.push('/dashboard/admin-lead/clients/new')}
                className="h-16 px-8 bg-[#7c3aed] hover:bg-[#6d28d9] text-white rounded-2xl flex items-center justify-center gap-4 font-black text-[10px] uppercase tracking-widest transition-all shadow-xl shadow-[#7c3aed]/30 active:scale-95"
              >
                <UserPlus size={18} /> Add New Partner
              </button>
            </div>
          </motion.div>

          {/* Stats Overview */}
          <motion.div variants={itemVariants} className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <StatSimple
              title="Total Clients"
              value={clients.length}
              icon={<Users size={20} />}
              color="text-[#7c3aed]"
              bg="bg-[#7c3aed]/10"
              subValue="Database Growth"
            />
            <StatSimple
              title="Project Volume"
              value={clients.reduce((acc, c) => acc + (c.project_count || 0), 0)}
              icon={<Briefcase size={20} />}
              color="text-emerald-500"
              bg="bg-emerald-500/10"
              subValue="Global Assignments"
            />
            <StatSimple
              title="Retention Rate"
              value={(clients.reduce((acc, c) => acc + (c.project_count || 0), 0) / (clients.length || 1)).toFixed(1)}
              icon={<Rocket size={20} />}
              color="text-amber-500"
              bg="bg-amber-500/10"
              subValue="Avg. Task/Partner"
            />
            <div className="bg-white dark:bg-[#1e293b] p-6 rounded-[2rem] border border-slate-100 dark:border-white/5 shadow-xl shadow-slate-200/40 dark:shadow-none flex items-center justify-between group cursor-pointer hover:border-[#7c3aed]/30 transition-all" onClick={handleRefresh}>
              <div className="space-y-1">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 leading-none">Sync Status</p>
                <p className="text-xl font-black tracking-tight leading-none text-blue-500 uppercase">Operational</p>
              </div>
              <div className={`size-12 rounded-2xl flex items-center justify-center bg-blue-500/10 text-blue-500 shadow-lg shadow-blue-500/5 group-hover:rotate-180 transition-all duration-700 ${loading ? 'animate-spin' : ''}`}>
                <RefreshCw size={20} />
              </div>
            </div>
          </motion.div>

          {/* Clients Grid Section */}
          <motion.div variants={itemVariants} className="space-y-8">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-black uppercase tracking-tighter">Directory <span className="text-slate-400">Index</span></h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Showing {filteredClients.length} of {clients.length} Partners</p>
            </div>

            <AnimatePresence mode="wait">
              {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  {Array(6).fill(0).map((_, i) => <Skeleton key={i} className="h-80 rounded-[3rem] w-full" />)}
                </div>
              ) : filteredClients.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="py-32 bg-white dark:bg-[#1e293b] rounded-[3rem] border border-slate-100 dark:border-white/5 flex flex-col items-center justify-center text-center p-10"
                >
                  <div className="size-24 bg-slate-50 dark:bg-white/5 rounded-[2.5rem] flex items-center justify-center mb-8">
                    <Users size={40} className="text-slate-300 dark:text-slate-700" />
                  </div>
                  <h3 className="text-2xl font-black uppercase tracking-tighter">No Partners Found</h3>
                  <p className="text-slate-500 mt-4 font-medium max-w-sm mx-auto">Database tidak menemukan client yang sesuai dengan kriteria pencarian Anda.</p>
                  <button onClick={() => setSearchTerm('')} className="mt-8 h-12 px-10 bg-slate-100 dark:bg-white/5 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-200 transition-all">Clear Search</button>
                </motion.div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                  {filteredClients.map((client) => (
                    <motion.div
                      key={client.id}
                      layout
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.4, ease: "circOut" }}
                      className="group bg-white dark:bg-[#1e293b] rounded-[3rem] p-10 border border-slate-100 dark:border-white/5 shadow-2xl shadow-slate-200/50 dark:shadow-none hover:border-[#7c3aed]/30 transition-all duration-500 relative overflow-hidden"
                    >
                      {/* Decorative Element */}
                      <div className="absolute -top-12 -right-12 size-40 bg-gradient-to-br from-[#7c3aed] to-blue-500 opacity-[0.03] rounded-full blur-3xl group-hover:opacity-10 transition-opacity" />

                      <div className="relative z-10 flex flex-col h-full">
                        <div className="flex justify-between items-start mb-8">
                          <div className="size-16 bg-gradient-to-br from-[#7c3aed] to-blue-600 rounded-[1.5rem] flex items-center justify-center text-white font-black text-2xl shadow-2xl shadow-[#7c3aed]/30 group-hover:scale-110 transition-transform duration-500">
                            {client.company_name?.charAt(0) || client.name?.charAt(0) || '?'}
                          </div>
                          <div className="flex gap-2">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button onClick={() => router.push(`/dashboard/admin-lead/clients/${client.id}`)} className="size-11 rounded-[1.2rem] bg-slate-50 dark:bg-white/5 text-slate-400 hover:text-[#7c3aed] transition-all flex items-center justify-center hover:scale-105 active:scale-95">
                                  <Settings size={18} />
                                </button>
                              </TooltipTrigger>
                              <TooltipContent className="bg-slate-900 border-none rounded-xl text-[9px] font-black uppercase tracking-widest p-2">Edit Partner</TooltipContent>
                            </Tooltip>
                          </div>
                        </div>

                        <div className="space-y-2 mb-8">
                          <h3 className="text-2xl font-black uppercase tracking-tighter leading-none group-hover:text-[#7c3aed] transition-colors line-clamp-1">{client.company_name || 'Personal Account'}</h3>
                          <div className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/50" />
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{client.name}</span>
                          </div>
                        </div>

                        <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-white/5">
                          <div className="flex items-center gap-4 text-slate-500">
                            <div className="size-8 rounded-xl bg-slate-50 dark:bg-white/5 flex items-center justify-center shrink-0">
                              <Mail size={14} className="text-[#7c3aed]" />
                            </div>
                            <span className="text-xs font-bold truncate lowercase">{client.email || 'no-email-recorded'}</span>
                          </div>
                          <div className="flex items-center gap-4 text-slate-500">
                            <div className="size-8 rounded-xl bg-slate-50 dark:bg-white/5 flex items-center justify-center shrink-0">
                              <Phone size={14} className="text-[#7c3aed]" />
                            </div>
                            <span className="text-xs font-bold tracking-tighter">{client.phone || 'N/A'}</span>
                          </div>
                          <div className="flex items-center gap-4 text-slate-500">
                            <div className="size-8 rounded-xl bg-slate-50 dark:bg-white/5 flex items-center justify-center shrink-0">
                              <MapPin size={14} className="text-[#7c3aed]" />
                            </div>
                            <span className="text-xs font-bold truncate uppercase tracking-tight">{client.city || 'Regional Database'}</span>
                          </div>
                        </div>

                        <div className="mt-auto pt-10 flex items-center justify-between">
                          <div className="flex flex-col">
                            <div className="flex items-baseline gap-1">
                              <span className="text-3xl font-black text-slate-900 dark:text-white leading-none tracking-tighter">{client.project_count || 0}</span>
                              <span className="text-[10px] font-black text-[#7c3aed] uppercase tracking-widest">Jobs</span>
                            </div>
                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest mt-1">Lifecycle Count</span>
                          </div>

                          <div className="flex gap-3">
                            <button
                              onClick={() => router.push(`/dashboard/admin-lead/communication?client=${client.id}`)}
                              className="h-12 px-6 rounded-2xl bg-[#7c3aed]/10 text-[#7c3aed] hover:bg-[#7c3aed] hover:text-white font-black text-[9px] uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2 group/btn shadow-inner"
                            >
                              <MessageCircle size={16} /> Link Chat
                            </button>
                            <button
                              onClick={() => router.push(`/dashboard/admin-lead/clients/${client.id}`)}
                              className="size-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center hover:scale-110 active:scale-95 transition-all shadow-xl shadow-slate-900/10"
                            >
                              <ArrowRight size={20} />
                            </button>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      </TooltipProvider>
    </DashboardLayout>
  );
}

// Sub-components
function StatSimple({ title, value, icon, color, bg, subValue }) {
  return (
    <div className="bg-white dark:bg-[#1e293b] p-8 rounded-[2.5rem] border border-slate-100 dark:border-white/5 shadow-2xl shadow-slate-200/40 dark:shadow-none flex flex-col justify-between transition-all hover:translate-y-[-8px] group">
      <div className="flex items-start justify-between mb-8">
        <div className="space-y-1">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 leading-none">{title}</p>
          <p className="text-3xl font-black tracking-tighter leading-none group-hover:text-[#7c3aed] transition-colors">{value}</p>
        </div>
        <div className={`size-14 rounded-2xl flex items-center justify-center ${bg} ${color} shadow-lg shadow-current/5 group-hover:scale-110 transition-transform`}>
          {icon}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <div className="w-1 h-1 rounded-full bg-slate-300" />
        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{subValue}</p>
      </div>
    </div>
  );
}
