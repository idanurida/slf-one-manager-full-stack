// FILE: src/pages/dashboard/project-lead/team.js
import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/router";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

// Components
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

// Icons
import {
  Users, Building, User, Mail, Phone, MessageSquare, Search, Filter, RefreshCw, ArrowLeft, Info, MoreHorizontal, Github, Linkedin, Briefcase
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
  visible: { y: 0, opacity: 1, transition: { duration: 0.4, ease: "easeOut" } }
};

export default function TeamLeaderTeamPage() {
  const router = useRouter();
  const { user, profile, loading: authLoading, isProjectLead, isTeamLeader } = useAuth();
  const hasAccess = isProjectLead || isTeamLeader;

  const [loading, setLoading] = useState(true);
  const [teamMembers, setTeamMembers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [projectFilter, setProjectFilter] = useState('all');

  // Fetch data tim proyek yang ditangani oleh saya (project_lead)
  const fetchData = useCallback(async () => {
    if (!user?.id) return;

    setLoading(true);

    try {
      // 1. Fetch assignments via project_teams
      const teamQuery = supabase
        .from('project_teams')
        .select(`
          project_id,
          projects!inner(id, name, status)
        `)
        .eq('user_id', user.id)
        .eq('role', 'project_lead');

      // 2. Fetch assignments via project_lead_id
      const legacyQuery = supabase
        .from('projects')
        .select('id, name, status')
        .eq('project_lead_id', user.id);

      const [teamRes, legacyRes] = await Promise.all([teamQuery, legacyQuery]);

      if (teamRes.error) throw teamRes.error;
      if (legacyRes.error) throw legacyRes.error;

      // Process Team Results
      const teamProjects = (teamRes.data || []).map(a => a.projects);

      // Process Legacy Results
      const legacyProjects = legacyRes.data || [];

      // Merge and Deduplicate by ID
      const allProjects = [...teamProjects, ...legacyProjects];
      const projectList = Array.from(new Map(allProjects.map(item => [item.id, item])).values());

      setProjects(projectList);

      // 2. Ambil semua anggota tim dari proyek-proyek tersebut
      const projectIds = projectList.map(p => p.id);
      let allTeamMembers = [];
      if (projectIds.length > 0) {
        const { data: members, error: membersErr } = await supabase
          .from('project_teams')
          .select(`
            id,
            project_id,
            user_id,
            role,
            assigned_at,
            profiles!inner(full_name, email, specialization)
          `)
          .in('project_id', projectIds)
          .order('assigned_at', { ascending: false });

        if (membersErr) throw membersErr;

        allTeamMembers = members.map(m => ({
          ...m,
          full_name: m.profiles?.full_name,
          email: m.profiles?.email,
          // phone: m.profiles?.phone, // Removed due to column missing error
          specialization: m.profiles?.specialization,
          project_name: projectList.find(p => p.id === m.project_id)?.name || 'Proyek Tidak Diketahui'
        }));
      }

      setTeamMembers(allTeamMembers);

    } catch (err) {
      console.error('Error fetching team data:', err);
      toast.error('Gagal memuat data tim');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (router.isReady && !authLoading && user && hasAccess) {
      fetchData();
    } else if (!authLoading && user && !hasAccess) {
      router.replace('/dashboard');
    }
  }, [router.isReady, authLoading, user, hasAccess, fetchData]);

  // Filter team members
  const filteredTeamMembers = teamMembers.filter(member => {
    const matchesSearch = member.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.specialization?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.project_name?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesRole = roleFilter === 'all' || member.role === roleFilter;
    const matchesProject = projectFilter === 'all' || member.project_id === projectFilter;

    return matchesSearch && matchesRole && matchesProject;
  });

  const availableRoles = [...new Set(teamMembers.map(m => m.role))];

  if (authLoading || (user && !hasAccess)) return null;

  return (
    <DashboardLayout>
      <motion.div
        className="space-y-10 pb-10"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <motion.div variants={itemVariants}>
            <h1 className="text-2xl md:text-3xl font-black tracking-tighter text-gray-900 dark:text-white">
              Tim <span className="text-primary">proyek</span>
            </h1>
            <p className="text-muted-foreground font-medium">Kelola dan pantau kinerja anggota tim Anda.</p>
          </motion.div>
          <motion.div variants={itemVariants} className="flex gap-3">
            <Button variant="outline" size="sm" onClick={fetchData} className="rounded-xl h-10 px-4">
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh data
            </Button>
          </motion.div>
        </div>

        {/* Filters */}
        <motion.div variants={itemVariants} className="bg-card p-6 rounded-[2rem] shadow-xl shadow-slate-200/50 dark:shadow-none border border-border flex flex-col md:flex-row gap-4 relative z-10">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <Input
              placeholder="Cari anggota tim berdasarkan nama, email, atau proyek..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-12 h-12 bg-muted/50 border-transparent focus:border-primary rounded-xl text-base"
            />
          </div>
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-full md:w-[200px] h-12 bg-muted/50 border-transparent focus:border-primary rounded-xl">
              <SelectValue placeholder="Semua role" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="all">Semua role</SelectItem>
              {availableRoles.map(role => (
                <SelectItem key={role} value={role}>{role.replace(/_/g, ' ')}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={projectFilter} onValueChange={setProjectFilter}>
            <SelectTrigger className="w-full md:w-[200px] h-12 bg-muted/50 border-transparent focus:border-primary rounded-xl">
              <SelectValue placeholder="Semua proyek" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="all">Semua proyek</SelectItem>
              {projects.map(project => (
                <SelectItem key={project.id} value={project.id}>{project.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </motion.div>

        {/* Team Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {loading ? (
            [1, 2, 3, 4, 5, 6].map(i => <div key={i} className="h-64 bg-slate-100 dark:bg-slate-900 rounded-[2rem] animate-pulse" />)
          ) : filteredTeamMembers.length === 0 ? (
            <div className="col-span-full py-20 text-center">
              <div className="size-24 rounded-full bg-slate-50 dark:bg-slate-900 flex items-center justify-center mx-auto mb-6">
                <Users className="size-12 text-slate-300" />
              </div>
              <h3 className="text-xl font-black tracking-tight text-slate-900 dark:text-white mb-2">Tidak ditemukan</h3>
              <p className="text-slate-400">Tidak ada anggota tim yang cocok dengan kriteria pencarian.</p>
            </div>
          ) : (
            filteredTeamMembers.map((member) => (
              <motion.div
                key={member.id}
                variants={itemVariants}
                className="group relative bg-card rounded-[2rem] p-6 border border-border shadow-sm hover:shadow-md hover:border-primary/30 transition-all duration-300 flex flex-col"
              >
                <div className="flex items-start justify-between mb-6">
                  <div className="size-16 rounded-2xl bg-muted overflow-hidden relative">
                    {/* Placeholder Avatar */}
                    <div className="absolute inset-0 flex items-center justify-center text-muted-foreground font-black text-xl bg-gradient-to-br from-muted to-muted/80">
                      {member.full_name?.charAt(0) || 'U'}
                    </div>
                  </div>
                  <Badge className="bg-muted text-muted-foreground hover:bg-muted/80 border-none px-3 py-1 rounded-full text-xs font-bold tracking-widest">
                    {getRoleLabel(member.role)}
                  </Badge>
                </div>

                <div className="mb-6 flex-1">
                  <h3 className="text-lg font-black tracking-tight text-foreground mb-1 group-hover:text-primary transition-colors">{member.full_name}</h3>
                  <p className="text-xs text-muted-foreground font-bold tracking-wider mb-4">{member.specialization || 'Generalist'}</p>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium bg-muted/50 p-2 rounded-lg truncate">
                      <Mail size={14} className="shrink-0 text-primary" />
                      <span className="truncate">{member.email}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium bg-muted/50 p-2 rounded-lg truncat">
                      <Briefcase size={14} className="shrink-0 text-primary" />
                      <span className="truncate">{member.project_name}</span>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 mt-auto">
                  <Button
                    className="flex-1 rounded-xl font-bold tracking-widest text-xs"
                    variant="outline"
                    onClick={() => toast.info('Fitur chat akan segera tersedia')}
                  >
                    Pesan
                  </Button>
                  {/* Phone button removed as column is missing */}
                </div>
              </motion.div>
            ))
          )}
        </div>

      </motion.div>
    </DashboardLayout>
  );
}

const getRoleLabel = (role) => {
  const cleanRole = role?.replace(/_/g, ' ');
  return cleanRole === 'project lead' ? 'Team Leader' : cleanRole;
}

