// FILE: src/pages/dashboard/admin-lead/clients/[id].js
import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/router";
import { motion } from "framer-motion";
import { toast } from "sonner";

// Components
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { TooltipProvider, Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Icons
import {
  User, Building, Mail, Phone, Calendar, MapPin, ArrowLeft,
  AlertCircle, RefreshCw, MessageCircle, Crown, Users, FileText,
  Clock, CheckCircle2, XCircle, Eye, Loader2, Briefcase
} from "lucide-react";

// Utils & Context
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { supabase } from "@/utils/supabaseClient";
import { useAuth } from "@/context/AuthContext";

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
};
const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { duration: 0.5, ease: "easeOut" } }
};

// Helper functions
const getStatusColor = (status) => {
  const colors = {
    'draft': 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400',
    'submitted': 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400',
    'project_lead_review': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400',
    'inspection_scheduled': 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400',
    'inspection_in_progress': 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400',
    'report_draft': 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400',
    'head_consultant_review': 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/20 dark:text-indigo-400',
    'client_review': 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/20 dark:text-cyan-400',
    'government_submitted': 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
    'slf_issued': 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-400',
    'completed': 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
    'cancelled': 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400',
    'active': 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
    'in_progress': 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400'
  };
  return colors[status] || 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
};

const getStatusLabel = (status) => {
  const labels = {
    'draft': 'Draft',
    'submitted': 'Submitted',
    'project_lead_review': 'Project Lead Review',
    'inspection_scheduled': 'Inspection Scheduled',
    'inspection_in_progress': 'Inspection In Progress',
    'report_draft': 'Report Draft',
    'head_consultant_review': 'Head Consultant Review',
    'client_review': 'Client Review',
    'government_submitted': 'Government Submitted',
    'slf_issued': 'SLF Issued',
    'completed': 'Completed',
    'cancelled': 'Cancelled',
    'active': 'Active',
    'in_progress': 'In Progress'
  };
  return labels[status] || status;
};

const getStatusIcon = (status) => {
  const icons = {
    'draft': Clock,
    'submitted': FileText,
    'project_lead_review': Users,
    'inspection_scheduled': Calendar,
    'inspection_in_progress': Clock,
    'report_draft': FileText,
    'head_consultant_review': Users,
    'client_review': Eye,
    'government_submitted': FileText,
    'slf_issued': CheckCircle2,
    'completed': CheckCircle2,
    'cancelled': XCircle,
    'active': CheckCircle2,
    'in_progress': Clock
  };
  return icons[status] || Clock;
};

// Component: Project Card
const ProjectCard = ({ project, onViewProject }) => {
  const StatusIcon = getStatusIcon(project.status);

  return (
    <Card className="border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <h4 className="font-semibold text-slate-900 dark:text-slate-100">{project.name}</h4>
              <Badge className={`h-5 ${getStatusColor(project.status)}`}>
                <StatusIcon className="w-3 h-3 mr-1" />
                {getStatusLabel(project.status)}
              </Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-slate-600 dark:text-slate-400">
              <div className="flex items-center gap-2">
                <Building className="w-4 h-4" />
                <span>{project.address || 'Alamat tidak tersedia'}</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                <span>{project.city || 'Kota tidak tersedia'}</span>
              </div>
              {project.project_lead_name && (
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  <span>Project Lead: {project.project_lead_name}</span>
                </div>
              )}
              {project.created_at && (
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  <span>Dibuat: {new Date(project.created_at).toLocaleDateString('id-ID')}</span>
                </div>
              )}
            </div>

            {project.description && (
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 line-clamp-2">
                {project.description}
              </p>
            )}
          </div>

          <div className="flex space-x-2 ml-4">
            <Button variant="outline" size="sm" onClick={() => onViewProject(project)}>
              <Eye className="w-4 h-4 mr-2" />
              Detail
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Main Component
export default function AdminLeadClientDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  const { user, profile, loading: authLoading, isAdminLead } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [client, setClient] = useState(null);
  const [projects, setProjects] = useState([]);
  const [activeTab, setActiveTab] = useState('overview');

  // Fetch client detail dan projects
  if (authLoading || (user && !isAdminLead) || (loading && !client)) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] p-8">
          <Loader2 className="w-12 h-12 animate-spin text-[#7c3aed]" />
          <p className="mt-6 text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 animate-pulse">Accessing Partner Profile...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout>
        <div className="max-w-[1400px] mx-auto p-6 md:p-0 min-h-[60vh] flex items-center justify-center">
          <div className="bg-white dark:bg-[#1e293b] rounded-[3rem] p-12 border border-slate-100 dark:border-white/5 shadow-2xl max-w-md text-center">
            <div className="size-20 bg-red-500/10 rounded-[2rem] flex items-center justify-center mx-auto mb-8">
              <AlertCircle className="w-10 h-10 text-red-500" />
            </div>
            <h3 className="text-2xl font-black uppercase tracking-tighter">Access Inhibited</h3>
            <p className="text-slate-500 mt-4 font-medium mb-10">{error}</p>
            <div className="flex flex-col gap-3">
              <button onClick={fetchData} className="h-14 bg-[#7c3aed] text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-[#7c3aed]/20">Retry Connection</button>
              <button onClick={handleBack} className="h-14 bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300 rounded-2xl font-black text-[10px] uppercase tracking-widest">Return to Base</button>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

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
              <button onClick={handleBack} className="mt-2 size-12 rounded-2xl bg-white dark:bg-[#1e293b] border border-slate-100 dark:border-white/5 flex items-center justify-center text-slate-400 hover:text-[#7c3aed] hover:scale-110 transition-all shadow-xl shadow-slate-200/30 dark:shadow-none">
                <ArrowLeft size={20} />
              </button>
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <Badge className="bg-[#7c3aed]/10 text-[#7c3aed] border-none text-[8px] font-black uppercase tracking-widest">Partner Data Record</Badge>
                  <div className="w-1 h-1 rounded-full bg-slate-300" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">UID: {id?.toString().substring(0, 8)}</span>
                </div>
                <h1 className="text-4xl md:text-5xl font-black tracking-tighter leading-none uppercase">
                  {client?.company_name || 'Individual'} <span className="text-[#7c3aed]">Intelligence</span>
                </h1>
                <p className="text-slate-500 dark:text-slate-400 mt-4 text-lg font-medium max-w-2xl">Arsip terpusat untuk seluruh rincian operasional dan kolaborasi dengan {client?.name}.</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <button onClick={handleRefresh} className="size-14 bg-white dark:bg-[#1e293b] text-slate-400 rounded-2xl flex items-center justify-center hover:bg-slate-50 dark:hover:bg-white/10 transition-all border border-slate-100 dark:border-white/5 shadow-xl shadow-slate-200/30 dark:shadow-none">
                <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
              </button>
              <button
                onClick={handleSendMessage}
                className="h-14 px-8 bg-[#7c3aed] hover:bg-[#6d28d9] text-white rounded-2xl flex items-center justify-center gap-3 font-black text-[10px] uppercase tracking-widest transition-all shadow-xl shadow-[#7c3aed]/30 active:scale-95"
              >
                <MessageCircle size={18} /> Direct Messenger
              </button>
            </div>
          </motion.div>

          {/* Metrics Grid */}
          <motion.div variants={itemVariants} className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white dark:bg-[#1e293b] p-8 rounded-[2.5rem] border border-slate-100 dark:border-white/5 shadow-2xl shadow-slate-200/40 dark:shadow-none flex flex-col justify-between group overflow-hidden relative">
              <div className="absolute -top-6 -right-6 size-20 bg-[#7c3aed]/10 rounded-full blur-2xl group-hover:scale-150 transition-transform" />
              <div className="space-y-1 relative z-10">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 leading-none">Total Engagements</p>
                <p className="text-3xl font-black tracking-tighter leading-none mt-2 group-hover:text-[#7c3aed] transition-colors">{projects.length}</p>
              </div>
              <div className="mt-8 flex items-center gap-2 relative z-10">
                <div className="size-8 rounded-xl bg-[#7c3aed]/10 text-[#7c3aed] flex items-center justify-center">
                  <Briefcase size={16} />
                </div>
                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Active Lifecycle</span>
              </div>
            </div>

            <div className="bg-white dark:bg-[#1e293b] p-8 rounded-[2.5rem] border border-slate-100 dark:border-white/5 shadow-2xl shadow-slate-200/40 dark:shadow-none flex flex-col justify-between group overflow-hidden relative">
              <div className="absolute -top-6 -right-6 size-20 bg-emerald-500/10 rounded-full blur-2xl group-hover:scale-150 transition-transform" />
              <div className="space-y-1 relative z-10">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 leading-none">Completed Tasks</p>
                <p className="text-3xl font-black tracking-tighter leading-none mt-2 group-hover:text-emerald-500 transition-colors uppercase">{projects.filter(p => ['completed', 'slf_issued'].includes(p.status)).length}</p>
              </div>
              <div className="mt-8 flex items-center gap-2 relative z-10">
                <div className="size-8 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                  <CheckCircle2 size={16} />
                </div>
                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Success Quota</span>
              </div>
            </div>

            <div className="col-span-2 bg-slate-900 text-white p-8 rounded-[2.5rem] flex flex-col md:flex-row items-center gap-8 shadow-2xl shadow-slate-900/20 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-[#7c3aed]/20 to-transparent pointer-events-none" />
              <div className="flex-1 space-y-4 relative z-10">
                <div>
                  <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-[#7c3aed] mb-1">Communication Channel</h4>
                  <p className="text-2xl font-black tracking-tighter uppercase leading-none">Project Sync Terminal</p>
                </div>
                <p className="text-[10px] font-medium text-slate-400 leading-relaxed max-w-xs">
                  Aktifkan jalur komunikasi langsung dengan partner untuk koordinasi teknis dan update pengerjaan proyek.
                </p>
              </div>
              <button onClick={handleSendMessage} className="h-14 px-8 bg-white text-slate-900 rounded-2xl flex items-center justify-center gap-3 font-black text-[10px] uppercase tracking-widest shadow-xl transition-all hover:scale-105 active:scale-95 group relative z-10">
                Establish Connect <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </motion.div>

          <motion.section variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-12 gap-12">
            {/* Tab System */}
            <div className="lg:col-span-8 space-y-8">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
                <TabsList className="w-full h-16 bg-slate-100 dark:bg-white/5 rounded-[1.5rem] p-1.5 flex gap-1 border border-slate-100 dark:border-white/5">
                  <TabsTrigger value="overview" className="flex-1 rounded-2xl data-[state=active]:bg-white dark:data-[state=active]:bg-[#1e293b] data-[state=active]:shadow-lg text-[10px] font-black uppercase tracking-widest transition-all">Identity</TabsTrigger>
                  <TabsTrigger value="projects" className="flex-1 rounded-2xl data-[state=active]:bg-white dark:data-[state=active]:bg-[#1e293b] data-[state=active]:shadow-lg text-[10px] font-black uppercase tracking-widest transition-all">Assignments</TabsTrigger>
                  <TabsTrigger value="history" className="flex-1 rounded-2xl data-[state=active]:bg-white dark:data-[state=active]:bg-[#1e293b] data-[state=active]:shadow-lg text-[10px] font-black uppercase tracking-widest transition-all">Audit Trail</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-8 mt-0 focus-visible:outline-none">
                  <div className="bg-white dark:bg-[#1e293b] rounded-[3rem] p-10 border border-slate-100 dark:border-white/5 shadow-2xl shadow-slate-200/50 dark:shadow-none">
                    <div className="flex items-center gap-4 mb-10">
                      <div className="size-12 rounded-2xl bg-[#7c3aed]/10 text-[#7c3aed] flex items-center justify-center font-black">
                        ID
                      </div>
                      <div>
                        <h3 className="text-xl font-black uppercase tracking-tighter tracking-tight">Profile Credentials</h3>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Detail administratif rekanan</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                      <InfoItem icon={<User />} label="PIC Primary" value={client?.name} />
                      <InfoItem icon={<Building />} label="Enterprise Name" value={client?.company_name || 'Individual Record'} />
                      <InfoItem icon={<Mail />} label="Communication Hub" value={client?.email} lowercase />
                      <InfoItem icon={<Phone />} label="Direct Channel" value={client?.phone} />
                      <InfoItem icon={<MapPin />} label="Regional Office" value={client?.city} uppercase />
                      <InfoItem icon={<FileText />} label="Tax Compliance" value={client?.npwp} />
                    </div>

                    <div className="mt-12 pt-10 border-t border-slate-100 dark:border-white/5">
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4">Official HQ Address</p>
                      <div className="p-6 bg-slate-50 dark:bg-white/5 rounded-3xl text-sm font-medium text-slate-600 dark:text-slate-400 leading-relaxed border border-transparent hover:border-[#7c3aed]/20 transition-all">
                        {client?.address || 'No primary address recorded in central database.'}
                      </div>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="projects" className="space-y-6 mt-0 focus-visible:outline-none">
                  {projects.length === 0 ? (
                    <div className="py-32 bg-white dark:bg-[#1e293b] rounded-[3rem] border border-slate-100 dark:border-white/5 flex flex-col items-center justify-center text-center p-10">
                      <div className="size-20 bg-slate-50 dark:bg-white/5 rounded-full flex items-center justify-center mb-8">
                        <Briefcase size={32} className="text-slate-300 dark:text-slate-700" />
                      </div>
                      <h3 className="text-2xl font-black uppercase tracking-tighter">Inventory Empty</h3>
                      <p className="text-slate-500 mt-4 font-medium max-w-sm mx-auto">Client ini belum memiliki proyek yang aktif dalam pengelolaan Anda.</p>
                      <button onClick={() => router.push('/dashboard/admin-lead/projects/new')} className="mt-8 h-12 px-8 bg-[#7c3aed] text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-[#7c3aed]/20">Create Initiation</button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {projects.map((project) => (
                        <motion.div
                          key={project.id}
                          whileHover={{ x: 10 }}
                          className="bg-white dark:bg-[#1e293b] rounded-[2rem] p-8 border border-slate-100 dark:border-white/5 shadow-xl shadow-slate-200/30 dark:shadow-none group flex items-center justify-between transition-all"
                        >
                          <div className="flex items-center gap-6">
                            <div className="size-14 rounded-2xl bg-slate-50 dark:bg-white/5 flex items-center justify-center text-slate-400 group-hover:bg-[#7c3aed]/10 group-hover:text-[#7c3aed] transition-all">
                              {project.status === 'completed' ? <CheckCircle2 size={24} /> : <Clock size={24} />}
                            </div>
                            <div>
                              <div className="flex items-center gap-3 mb-1">
                                <h4 className="text-lg font-black uppercase tracking-tight group-hover:text-[#7c3aed] transition-colors">{project.name}</h4>
                                <Badge className="bg-[#7c3aed]/10 text-[#7c3aed] border-none text-[8px] font-black uppercase tracking-widest">{project.status?.replace(/_/g, ' ')}</Badge>
                              </div>
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                <MapPin size={10} /> {project.city} &bull; Created {new Date(project.created_at).toLocaleDateString('id-ID')}
                              </p>
                            </div>
                          </div>
                          <button onClick={() => handleViewProject(project)} className="size-12 rounded-2xl bg-slate-50 dark:bg-white/5 text-slate-400 hover:text-white hover:bg-slate-900 transition-all flex items-center justify-center">
                            <ArrowRight size={20} />
                          </button>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="history" className="mt-0 focus-visible:outline-none">
                  <div className="py-20 bg-white dark:bg-[#1e293b] rounded-[3rem] border border-slate-100 dark:border-white/5 flex flex-col items-center justify-center text-center p-10 grayscale opacity-40">
                    <RefreshCw size={40} className="text-slate-300 mb-6" />
                    <h3 className="text-xl font-black uppercase tracking-tighter">System Node Pending</h3>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-2 px-10">Audit trail logs currently being established in secondary backup cluster.</p>
                  </div>
                </TabsContent>
              </Tabs>
            </div>

            {/* Sidebar Overview */}
            <div className="lg:col-span-4 space-y-8">
              <div className="bg-white dark:bg-[#1e293b] rounded-[3rem] p-10 border border-slate-100 dark:border-white/5 shadow-2xl shadow-slate-200/50 dark:shadow-none space-y-8">
                <h3 className="text-xl font-black uppercase tracking-tighter">Partner <span className="text-[#7c3aed]">Snapshot</span></h3>

                <div className="space-y-6">
                  <div className="p-6 rounded-[2rem] bg-slate-50 dark:bg-white/5 border border-transparent hover:border-[#7c3aed]/20 transition-all">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Lifetime Value</p>
                    <p className="text-2xl font-black tracking-tighter">Rp --.---.---</p>
                    <div className="mt-3 flex items-center gap-2">
                      <div className="h-1 flex-1 bg-slate-200 dark:bg-white/10 rounded-full overflow-hidden">
                        <div className="h-full w-2/3 bg-[#7c3aed]" />
                      </div>
                      <span className="text-[8px] font-black text-[#7c3aed] uppercase">Strategic</span>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-white dark:bg-[#1e293b] rounded-2xl border border-slate-100 dark:border-white/5">
                      <div className="flex items-center gap-3">
                        <div className="size-10 rounded-xl bg-orange-500/10 text-orange-500 flex items-center justify-center">
                          <Clock size={16} />
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-widest">SLA Compliance</span>
                      </div>
                      <span className="text-xs font-black text-orange-500">98%</span>
                    </div>
                    <div className="flex items-center justify-between p-4 bg-white dark:bg-[#1e293b] rounded-2xl border border-slate-100 dark:border-white/5">
                      <div className="flex items-center gap-3">
                        <div className="size-10 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center">
                          <Users size={16} />
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-widest">Active Collab</span>
                      </div>
                      <span className="text-xs font-black text-blue-500">Tier 2</span>
                    </div>
                  </div>
                </div>

                <div className="pt-8 border-t border-slate-100 dark:border-white/5">
                  <button onClick={() => router.push('/dashboard/admin-lead/clients/new')} className="w-full h-14 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl transition-all hover:scale-105 active:scale-95">Update Client Record</button>
                </div>
              </div>

              <div className="bg-[#7c3aed]/5 rounded-[2.5rem] p-8 border border-[#7c3aed]/10">
                <div className="flex items-center gap-3 mb-4 text-[#7c3aed]">
                  <Crown size={18} />
                  <h4 className="text-[10px] font-black uppercase tracking-widest">Priority Account</h4>
                </div>
                <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest leading-relaxed">
                  Client ini memiliki profil kerjasama strategis. Seluruh update dokumen SLA akan diprioritaskan oleh sistem automasi.
                </p>
              </div>
            </div>
          </motion.section>
        </motion.div>
      </TooltipProvider>
    </DashboardLayout>
  );
}

// Sub-components
function InfoItem({ icon, label, value, uppercase = false, lowercase = false }) {
  return (
    <div className="space-y-2 group">
      <div className="flex items-center gap-2 text-slate-400 group-hover:text-[#7c3aed] transition-colors">
        {React.cloneElement(icon, { size: 14 })}
        <span className="text-[9px] font-black uppercase tracking-widest">{label}</span>
      </div>
      <p className={`text-sm font-bold text-slate-900 dark:text-white ${uppercase ? 'uppercase' : ''} ${lowercase ? 'lowercase' : ''}`}>
        {value || 'N/A'}
      </p>
    </div>
  );
}
