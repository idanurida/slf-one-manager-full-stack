// FILE: client/src/pages/dashboard/admin-lead/team.js
import React, { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { motion } from "framer-motion";
import { toast } from "sonner";

// Components
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// Icons
import {
  ArrowLeft, Plus, Users, UserPlus, Search, Filter,
  Mail, Phone, MapPin, Calendar, Edit, Trash2,
  UserCheck, UserX, Shield, Star, MoreVertical,
  Building, FileText, CheckCircle2, X, Eye,
  Download, Upload, RefreshCw, AlertTriangle
} from "lucide-react";

// Utils & Context
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { supabase } from "@/utils/supabaseClient";
import { useAuth } from "@/context/AuthContext";

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      duration: 0.5,
      ease: "easeOut"
    }
  }
};

// Helper function untuk getRoleLabel (dipindah ke atas agar bisa digunakan di semua komponen)
const getRoleLabel = (role) => {
  const labels = {
    admin_lead: 'Admin Lead',
    project_lead: 'Project Lead',
    inspector: 'Inspector',
    head_consultant: 'Head Consultant',
    drafter: 'Drafter',
    client: 'Client',
    superadmin: 'Super Admin'
  };
  return labels[role] || role;
};

// Team Assignment Card Component
const TeamAssignmentCard = ({ assignment, onEdit, onRemove, onView }) => {
  const getRoleColor = (role) => {
    const colors = {
      admin_lead: 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400',
      project_lead: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400',
      inspector: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
      head_consultant: 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400',
      drafter: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/20 dark:text-cyan-400',
      client: 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400',
      superadmin: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
    };
    return colors[role] || 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
  };

  const getSpecializationColor = (specialization) => {
    const colors = {
      'struktur': 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400',
      'arsitektur': 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
      'mep': 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400',
      'listrik': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400',
      'mekanikal': 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400',
      'plumbing': 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/20 dark:text-cyan-400',
      'umum': 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400'
    };
    return colors[specialization] || 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
  };

  return (
    <Card className="border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:shadow-lg transition-all">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold">
              {assignment.profiles?.full_name?.charAt(0) || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                  {assignment.profiles?.full_name || 'Unknown User'}
                </h3>
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
                {assignment.profiles?.email || 'No email'}
              </p>
              <div className="flex flex-wrap gap-2">
                <Badge className={getRoleColor(assignment.role)}>
                  {getRoleLabel(assignment.role)}
                </Badge>
                {assignment.role === 'inspector' && assignment.profiles?.specialization && (
                  <Badge variant="outline" className={getSpecializationColor(assignment.profiles.specialization)}>
                    {assignment.profiles.specialization}
                  </Badge>
                )}
                <Badge variant="outline" className="bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400">
                  Active
                </Badge>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onView(assignment)}
                  className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
                >
                  <Eye className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Lihat Detail</TooltipContent>
            </Tooltip>
            
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onEdit(assignment)}
                  className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
                >
                  <Edit className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Edit Assignment</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onRemove(assignment)}
                  className="text-slate-600 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Hapus Assignment</TooltipContent>
            </Tooltip>
          </div>
        </div>

        <Separator className="my-4" />

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
            <Building className="w-4 h-4" />
            <span className="truncate">{assignment.projects?.name || 'No Project'}</span>
          </div>
          <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
            <Calendar className="w-4 h-4" />
            <span>{new Date(assignment.assigned_at).toLocaleDateString('id-ID')}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Confirmation Dialog untuk Delete - ✅ PERBAIKAN: Dialog dengan Description yang tepat
const DeleteConfirmationDialog = ({ 
  open, 
  onOpenChange, 
  assignment, 
  onConfirm 
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="sm:max-w-[425px] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
        aria-describedby="delete-confirmation-description" // ✅ PERBAIKAN: Tambah aria-describedby
      >
        <DialogHeader>
          <DialogTitle className="text-slate-900 dark:text-slate-100">
            Konfirmasi Hapus Assignment
          </DialogTitle>
          <DialogDescription id="delete-confirmation-description" className="text-slate-600 dark:text-slate-400">
            Apakah Anda yakin ingin menghapus assignment {assignment?.profiles?.full_name} dari project {assignment?.projects?.name}? Tindakan ini tidak dapat dibatalkan.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="flex items-center space-x-2 rounded-lg border border-slate-200 dark:border-slate-700 p-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold">
              {assignment?.profiles?.full_name?.charAt(0) || 'U'}
            </div>
            <div className="flex-1">
              <p className="font-medium text-slate-900 dark:text-slate-100">
                {assignment?.profiles?.full_name}
              </p>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                {assignment?.profiles?.email}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Role: {getRoleLabel(assignment?.role)}
              </p>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            className="text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700"
          >
            Batal
          </Button>
          <Button 
            variant="destructive"
            onClick={onConfirm}
          >
            Hapus Assignment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// Add/Edit Team Assignment Dialog - ✅ PERBAIKAN: Dialog dengan Description yang tepat
const TeamAssignmentDialog = ({ 
  open, 
  onOpenChange, 
  assignment, 
  projects,
  users,
  onSave 
}) => {
  const [formData, setFormData] = useState({
    project_id: '',
    user_id: '',
    role: 'inspector'
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      if (assignment) {
        setFormData({
          project_id: assignment.project_id || '',
          user_id: assignment.user_id || '',
          role: assignment.role || 'inspector'
        });
      } else {
        setFormData({
          project_id: '',
          user_id: '',
          role: 'inspector'
        });
      }
    }
  }, [open, assignment]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await onSave(formData, assignment?.id);
      onOpenChange(false);
    } catch (error) {
      toast.error(`Gagal menyimpan: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const availableUsers = users.filter(user => 
    !assignment || user.id !== assignment.user_id
  );

  // Group users by role for better organization
  const usersByRole = {
    inspector: availableUsers.filter(u => u.role === 'inspector'),
    drafter: availableUsers.filter(u => u.role === 'drafter'),
    project_lead: availableUsers.filter(u => u.role === 'project_lead'),
    head_consultant: availableUsers.filter(u => u.role === 'head_consultant'),
    admin_lead: availableUsers.filter(u => u.role === 'admin_lead')
  };

  // Group inspectors by specialization
  const inspectorsBySpecialization = usersByRole.inspector.reduce((acc, inspector) => {
    const spec = inspector.specialization || 'umum';
    if (!acc[spec]) acc[spec] = [];
    acc[spec].push(inspector);
    return acc;
  }, {});

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="sm:max-w-[500px] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
        aria-describedby="assignment-dialog-description" // ✅ PERBAIKAN: Tambah aria-describedby
      >
        <DialogHeader>
          <DialogTitle className="text-slate-900 dark:text-slate-100">
            {assignment ? 'Edit Team Assignment' : 'Tambah Team Assignment Baru'}
          </DialogTitle>
          <DialogDescription id="assignment-dialog-description" className="text-slate-600 dark:text-slate-400">
            {assignment ? 'Edit assignment tim untuk project ini' : 'Tambah anggota tim baru ke project'}
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="project_id" className="text-slate-700 dark:text-slate-300">Project</Label>
            <Select 
              value={formData.project_id} 
              onValueChange={(value) => setFormData(prev => ({ ...prev, project_id: value }))}
              required
            >
              <SelectTrigger className="bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700">
                <SelectValue placeholder="Pilih Project" />
              </SelectTrigger>
              <SelectContent className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                {projects.length > 0 ? (
                  projects.map(project => (
                    <SelectItem 
                      key={project.id} 
                      value={project.id}
                      className="text-slate-900 dark:text-slate-100 focus:bg-slate-100 dark:focus:bg-slate-700"
                    >
                      {project.name}
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="no-projects" disabled>
                    Tidak ada project tersedia
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="role" className="text-slate-700 dark:text-slate-300">Role</Label>
            <Select 
              value={formData.role} 
              onValueChange={(value) => setFormData(prev => ({ ...prev, role: value }))}
              required
            >
              <SelectTrigger className="bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700">
                <SelectValue placeholder="Pilih Role" />
              </SelectTrigger>
              <SelectContent className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                <SelectItem value="project_lead" className="text-slate-900 dark:text-slate-100 focus:bg-slate-100 dark:focus:bg-slate-700">Project Lead</SelectItem>
                <SelectItem value="inspector" className="text-slate-900 dark:text-slate-100 focus:bg-slate-100 dark:focus:bg-slate-700">Inspector</SelectItem>
                <SelectItem value="head_consultant" className="text-slate-900 dark:text-slate-100 focus:bg-slate-100 dark:focus:bg-slate-700">Head Consultant</SelectItem>
                <SelectItem value="drafter" className="text-slate-900 dark:text-slate-100 focus:bg-slate-100 dark:focus:bg-slate-700">Drafter</SelectItem>
                <SelectItem value="admin_lead" className="text-slate-900 dark:text-slate-100 focus:bg-slate-100 dark:focus:bg-slate-700">Admin Lead</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="user_id" className="text-slate-700 dark:text-slate-300">User</Label>
            <Select 
              value={formData.user_id} 
              onValueChange={(value) => setFormData(prev => ({ ...prev, user_id: value }))}
              required
            >
              <SelectTrigger className="bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700">
                <SelectValue placeholder="Pilih User" />
              </SelectTrigger>
              <SelectContent className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 max-h-[300px]">
                {/* Group inspectors by specialization */}
                {formData.role === 'inspector' && usersByRole.inspector.length > 0 && (
                  <>
                    <div className="px-2 py-1 text-xs font-semibold text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
                      Inspectors - Pilih berdasarkan spesialisasi:
                    </div>
                    
                    {Object.keys(inspectorsBySpecialization).length > 0 ? (
                      Object.entries(inspectorsBySpecialization).map(([specialization, specUsers]) => (
                        <div key={specialization}>
                          <div className="px-2 py-1 text-xs font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 capitalize">
                            {specialization === 'umum' ? 'General' : specialization}
                          </div>
                          {specUsers.map(user => (
                            <SelectItem 
                              key={user.id} 
                              value={user.id}
                              className="text-slate-900 dark:text-slate-100 focus:bg-slate-100 dark:focus:bg-slate-700 pl-4"
                            >
                              {user.full_name} - {user.email}
                              {user.specialization && user.specialization !== 'umum' && ` (${user.specialization})`}
                            </SelectItem>
                          ))}
                        </div>
                      ))
                    ) : (
                      usersByRole.inspector.map(user => (
                        <SelectItem 
                          key={user.id} 
                          value={user.id}
                          className="text-slate-900 dark:text-slate-100 focus:bg-slate-100 dark:focus:bg-slate-700"
                        >
                          {user.full_name} - {user.email}
                          {user.specialization && ` (${user.specialization})`}
                        </SelectItem>
                      ))
                    )}
                  </>
                )}
                
                {/* Other roles */}
                {formData.role !== 'inspector' && usersByRole[formData.role]?.map(user => (
                  <SelectItem 
                    key={user.id} 
                    value={user.id}
                    className="text-slate-900 dark:text-slate-100 focus:bg-slate-100 dark:focus:bg-slate-700"
                  >
                    {user.full_name} - {user.email}
                  </SelectItem>
                ))}
                
                {(!usersByRole[formData.role] || usersByRole[formData.role].length === 0) && (
                  <div className="px-2 py-2 text-sm text-slate-500 dark:text-slate-400 text-center">
                    Tidak ada user dengan role {getRoleLabel(formData.role)}
                  </div>
                )}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              className="text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700"
            >
              Batal
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Menyimpan...
                </>
              ) : (
                assignment ? 'Update Assignment' : 'Tambah Assignment'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

// Main Component
export default function TeamManagementPage() {
  const router = useRouter();
  const { user, profile, loading: authLoading, isAdminLead } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [teamAssignments, setTeamAssignments] = useState([]);
  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [projectFilter, setProjectFilter] = useState('all');
  const [specializationFilter, setSpecializationFilter] = useState('all');
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState(null);
  const [deletingAssignment, setDeletingAssignment] = useState(null);

  // Fetch data
  const fetchData = async () => {
    setLoading(true);
    setError(null);

    try {
      // Fetch team assignments with related data
      const { data: assignments, error: assignmentsError } = await supabase
        .from('project_teams')
        .select(`
          *,
          projects (
            id,
            name,
            status
          ),
          profiles (
            id,
            full_name,
            email,
            role,
            specialization
          )
        `)
        .order('assigned_at', { ascending: false });

      if (assignmentsError) throw assignmentsError;

      // Fetch projects for filters
      const { data: projectsData } = await supabase
        .from('projects')
        .select('id, name')
        .order('name');

      // Fetch users for assignment
      const { data: usersData } = await supabase
        .from('profiles')
        .select('id, full_name, email, role, specialization')
        .in('role', ['inspector', 'project_lead', 'head_consultant', 'drafter', 'admin_lead'])
        .order('full_name');

      console.log('Fetched users:', usersData);

      setTeamAssignments(assignments || []);
      setProjects(projectsData || []);
      setUsers(usersData || []);

    } catch (err) {
      console.error('Team data loading error:', err);
      setError('Gagal memuat data tim');
      toast.error('Gagal memuat data tim');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (router.isReady && !authLoading && user && isAdminLead) {
      fetchData();
    }
  }, [router.isReady, authLoading, user, isAdminLead]);

  // Filter team assignments
  const filteredAssignments = teamAssignments.filter(assignment => {
    const matchesSearch = assignment.profiles?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         assignment.profiles?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         assignment.projects?.name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesRole = roleFilter === 'all' || assignment.role === roleFilter;
    const matchesProject = projectFilter === 'all' || assignment.project_id === projectFilter;
    const matchesSpecialization = specializationFilter === 'all' || 
                                 assignment.profiles?.specialization === specializationFilter;

    return matchesSearch && matchesRole && matchesProject && matchesSpecialization;
  });

  // Get unique specializations for filter
  const specializations = [...new Set(
    teamAssignments
      .filter(a => a.role === 'inspector' && a.profiles?.specialization)
      .map(a => a.profiles.specialization)
  )];

  // Statistics for dashboard
  const stats = {
    total: teamAssignments.length,
    project_leads: teamAssignments.filter(a => a.role === 'project_lead').length,
    inspectors: teamAssignments.filter(a => a.role === 'inspector').length,
    drafters: teamAssignments.filter(a => a.role === 'drafter').length,
    head_consultants: teamAssignments.filter(a => a.role === 'head_consultant').length,
    active_projects: [...new Set(teamAssignments.map(a => a.project_id))].length,
    
    // Inspector specializations breakdown
    inspector_specializations: teamAssignments
      .filter(a => a.role === 'inspector')
      .reduce((acc, assignment) => {
        const spec = assignment.profiles?.specialization || 'umum';
        acc[spec] = (acc[spec] || 0) + 1;
        return acc;
      }, {})
  };

  // Handle assignment actions
  const handleAddAssignment = () => {
    setEditingAssignment(null);
    setDialogOpen(true);
  };

  const handleEditAssignment = (assignment) => {
    setEditingAssignment(assignment);
    setDialogOpen(true);
  };

  const handleRemoveAssignment = (assignment) => {
    setDeletingAssignment(assignment);
    setDeleteDialogOpen(true);
  };

  const handleConfirmRemove = async () => {
    if (!deletingAssignment) return;

    try {
      const { error } = await supabase
        .from('project_teams')
        .delete()
        .eq('id', deletingAssignment.id);

      if (error) throw error;

      toast.success('Assignment berhasil dihapus');
      setDeleteDialogOpen(false);
      setDeletingAssignment(null);
      fetchData(); // Refresh data
    } catch (error) {
      console.error('Error removing assignment:', error);
      toast.error('Gagal menghapus assignment');
    }
  };

  const handleSaveAssignment = async (formData, assignmentId) => {
    try {
      if (assignmentId) {
        // Update existing assignment
        const { error } = await supabase
          .from('project_teams')
          .update({
            project_id: formData.project_id,
            user_id: formData.user_id,
            role: formData.role
          })
          .eq('id', assignmentId);

        if (error) throw error;
        toast.success('Assignment berhasil diupdate');
      } else {
        // Create new assignment
        const { error } = await supabase
          .from('project_teams')
          .insert([{
            project_id: formData.project_id,
            user_id: formData.user_id,
            role: formData.role,
            assigned_by: user.id
          }]);

        if (error) throw error;
        toast.success('Assignment berhasil dibuat');
      }

      setDialogOpen(false);
      fetchData(); // Refresh data
    } catch (error) {
      console.error('Error saving assignment:', error);
      throw error;
    }
  };

  const handleViewAssignment = (assignment) => {
    router.push(`/dashboard/admin-lead/projects/${assignment.project_id}`);
  };

  if (authLoading || (user && !isAdminLead)) {
    return (
      <DashboardLayout title="Team Management">
        <div className="flex flex-col items-center justify-center min-h-[400px] p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 dark:border-blue-400"></div>
          <p className="mt-4 text-slate-600 dark:text-slate-400">Memuat...</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Team Management">
      <TooltipProvider>
        <motion.div 
          className="p-6 space-y-6 bg-white dark:bg-slate-900 min-h-screen"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* Header */}
          <motion.div variants={itemVariants} className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => router.back()}
                className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                  Team Management
                </h1>
                <p className="text-slate-600 dark:text-slate-400">
                  Kelola assignment tim untuk semua project
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                onClick={fetchData}
                disabled={loading}
                className="flex items-center gap-2 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button
                onClick={handleAddAssignment}
                className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2"
                disabled={projects.length === 0 || users.length === 0}
              >
                <UserPlus className="w-4 h-4" />
                Tambah Assignment
              </Button>
            </div>
          </motion.div>

          <Separator className="bg-slate-200 dark:bg-slate-700" />

          {/* Stats Overview */}
          <motion.div variants={itemVariants}>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <Card className="border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Total Assignments</p>
                      <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{stats.total}</p>
                    </div>
                    <Users className="w-8 h-8 text-blue-500" />
                  </div>
                </CardContent>
              </Card>

              <Card className="border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Project Leads</p>
                      <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{stats.project_leads}</p>
                    </div>
                    <Shield className="w-8 h-8 text-green-500" />
                  </div>
                </CardContent>
              </Card>

              <Card className="border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Inspectors</p>
                      <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{stats.inspectors}</p>
                    </div>
                    <UserCheck className="w-8 h-8 text-orange-500" />
                  </div>
                </CardContent>
              </Card>

              <Card className="border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Active Projects</p>
                      <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{stats.active_projects}</p>
                    </div>
                    <Building className="w-8 h-8 text-purple-500" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Inspector Specializations Breakdown */}
            {Object.keys(stats.inspector_specializations).length > 0 && (
              <Card className="border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                <CardHeader>
                  <CardTitle className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                    Breakdown Inspector Berdasarkan Spesialisasi
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                    {Object.entries(stats.inspector_specializations).map(([spec, count]) => (
                      <div key={spec} className="text-center">
                        <div className="w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center mx-auto mb-2">
                          <span className="text-xl font-bold text-blue-600 dark:text-blue-400">{count}</span>
                        </div>
                        <p className="text-sm font-medium text-slate-900 dark:text-slate-100 capitalize">
                          {spec === 'umum' ? 'General' : spec}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Inspector</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </motion.div>

          {/* Filters */}
          <motion.div variants={itemVariants}>
            <Card className="border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1">
                    <Label htmlFor="search" className="sr-only">Search</Label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                      <Input
                        id="search"
                        type="text"
                        placeholder="Cari berdasarkan nama, email, atau project..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 border-slate-200 dark:border-slate-700"
                      />
                    </div>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Select value={roleFilter} onValueChange={setRoleFilter}>
                      <SelectTrigger className="w-full sm:w-[180px] bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 border-slate-200 dark:border-slate-700">
                        <SelectValue placeholder="Filter Role" />
                      </SelectTrigger>
                      <SelectContent className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                        <SelectItem value="all">Semua Role</SelectItem>
                        <SelectItem value="project_lead">Project Lead</SelectItem>
                        <SelectItem value="inspector">Inspector</SelectItem>
                        <SelectItem value="head_consultant">Head Consultant</SelectItem>
                        <SelectItem value="drafter">Drafter</SelectItem>
                        <SelectItem value="admin_lead">Admin Lead</SelectItem>
                      </SelectContent>
                    </Select>

                    <Select value={projectFilter} onValueChange={setProjectFilter}>
                      <SelectTrigger className="w-full sm:w-[180px] bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 border-slate-200 dark:border-slate-700">
                        <SelectValue placeholder="Filter Project" />
                      </SelectTrigger>
                      <SelectContent className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                        <SelectItem value="all">Semua Project</SelectItem>
                        {projects.map(project => (
                          <SelectItem key={project.id} value={project.id}>
                            {project.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {specializations.length > 0 && (
                      <Select value={specializationFilter} onValueChange={setSpecializationFilter}>
                        <SelectTrigger className="w-full sm:w-[180px] bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 border-slate-200 dark:border-slate-700">
                          <SelectValue placeholder="Filter Spesialisasi" />
                        </SelectTrigger>
                        <SelectContent className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                          <SelectItem value="all">Semua Spesialisasi</SelectItem>
                          {specializations.map(spec => (
                            <SelectItem key={spec} value={spec} className="capitalize">
                              {spec === 'umum' ? 'General' : spec}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Team Assignments List */}
          <motion.div variants={itemVariants}>
            {loading ? (
              <div className="grid gap-4">
                {[...Array(3)].map((_, i) => (
                  <Card key={i} className="border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                    <CardContent className="p-6">
                      <div className="flex items-center space-x-4">
                        <Skeleton className="w-12 h-12 rounded-full" />
                        <div className="flex-1 space-y-2">
                          <Skeleton className="h-4 w-1/3" />
                          <Skeleton className="h-3 w-1/2" />
                          <div className="flex gap-2">
                            <Skeleton className="h-6 w-20" />
                            <Skeleton className="h-6 w-16" />
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : error ? (
              <Alert variant="destructive">
                <AlertTriangle className="w-4 h-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : filteredAssignments.length === 0 ? (
              <Card className="border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                <CardContent className="p-8 text-center">
                  <Users className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">
                    Tidak ada assignments ditemukan
                  </h3>
                  <p className="text-slate-600 dark:text-slate-400 mb-4">
                    {searchTerm || roleFilter !== 'all' || projectFilter !== 'all' || specializationFilter !== 'all'
                      ? 'Coba ubah filter pencarian Anda'
                      : 'Mulai dengan menambahkan assignment tim pertama Anda'}
                  </p>
                  <Button onClick={handleAddAssignment}>
                    <UserPlus className="w-4 h-4 mr-2" />
                    Tambah Assignment Pertama
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {filteredAssignments.map((assignment) => (
                  <TeamAssignmentCard
                    key={assignment.id}
                    assignment={assignment}
                    onEdit={handleEditAssignment}
                    onRemove={handleRemoveAssignment}
                    onView={handleViewAssignment}
                  />
                ))}
              </div>
            )}
          </motion.div>

          {/* Dialogs */}
          <TeamAssignmentDialog
            open={dialogOpen}
            onOpenChange={setDialogOpen}
            assignment={editingAssignment}
            projects={projects}
            users={users}
            onSave={handleSaveAssignment}
          />

          <DeleteConfirmationDialog
            open={deleteDialogOpen}
            onOpenChange={setDeleteDialogOpen}
            assignment={deletingAssignment}
            onConfirm={handleConfirmRemove}
          />
        </motion.div>
      </TooltipProvider>
    </DashboardLayout>
  );
}