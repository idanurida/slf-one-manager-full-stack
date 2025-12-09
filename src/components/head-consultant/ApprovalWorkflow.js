import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
// --- Supabase ---
import { supabase } from '@/utils/supabaseClient';
import { getUserAndProfile } from '@/utils/auth';

import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';

// Icons
import {
  Search, Eye, Check, X, Filter, FileText, Clock, Trash2,
  AlertTriangle, CheckCircle, XCircle, Info, Loader2, Users, Briefcase, User, Calendar
} from 'lucide-react';

// --- Mock Toast & Router ---
const useMockToast = () => {
  return (options) => {
    console.log(`[Toast ${options.status?.toUpperCase()}] ${options.title}: ${options.description || ''}`);
  };
};

const useMockRouter = () => {
  return {
    push: (path) => {
      console.log(`[Router] Navigating to: ${path}`);
    }
  };
};

// --- Status Colors ---
const statusColors = {
  submitted: { badge: 'bg-yellow-100 text-yellow-800', text: 'Kuning' },
  project_lead_review: { badge: 'bg-orange-100 text-orange-800', text: 'Jingga' },
  project_lead_approved: { badge: 'bg-blue-100 text-blue-800', text: 'Biru' },
  head_consultant_review: { badge: 'bg-purple-100 text-purple-800', text: 'Ungu' },
  head_consultant_approved: { badge: 'bg-green-100 text-green-800', text: 'Hijau' },
  client_review: { badge: 'bg-pink-100 text-pink-800', text: 'Merah Jambu' },
  government_submitted: { badge: 'bg-cyan-100 text-cyan-800', text: 'Sian' },
  slf_issued: { badge: 'bg-indigo-100 text-indigo-800', text: 'Nila' },
  rejected: { badge: 'bg-red-100 text-red-800', text: 'Merah' },
};

// --- Modal ---
const AlertDialogMock = ({ isOpen, onClose, onConfirm, title, children, confirmText, cancelRef, confirmDisabled = false, isLoading = false }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" aria-modal="true">
      <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true"></div>
        <span className="hidden sm:inline-block sm:align-middle sm:h-screen">&#8203;</span>
        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="sm:flex sm:items-start">
              <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                <h3 className="text-lg leading-6 font-bold text-red-600 border-b pb-2 mb-4">{title}</h3>
                <div className="mt-2">{children}</div>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
            <button
              type="button"
              className={`w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 text-base font-medium text-white sm:ml-3 sm:w-auto sm:text-sm 
                ${confirmDisabled ? 'bg-red-300 cursor-not-allowed' : 'bg-red-600 hover:bg-red-700'}
              `}
              onClick={onConfirm}
              disabled={confirmDisabled || isLoading}
            >
              {isLoading ? <Loader2 className="animate-spin w-5 h-5 mr-2" /> : null}
              {confirmText}
            </button>
            <button
              type="button"
              className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
              onClick={onClose}
              ref={cancelRef}
            >
              Batal
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- Main Component ---
const ApprovalWorkflow = () => {
  const router = useMockRouter();
  const toast = useMockToast();

  const [user, setUser] = useState(null);
  const [approvals, setApprovals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState({});

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('project_lead_approved');
  const [selectedInspector, setSelectedInspector] = useState('');
  const [selectedProject, setSelectedProject] = useState('');
  const [inspectors, setInspectors] = useState([]);
  const [projects, setProjects] = useState([]);

  // Stats
  const [stats, setStats] = useState({ total: 0, pending: 0, approved: 0, rejected: 0 });

  // Reject modal
  const [isRejectAlertOpen, setIsRejectAlertOpen] = useState(false);
  const cancelRef = useRef();
  const [rejectId, setRejectId] = useState(null);
  const [rejectionNotes, setRejectionNotes] = useState('');

  const onCloseRejectAlert = () => setIsRejectAlertOpen(false);
  const onOpenRejectAlert = () => setIsRejectAlertOpen(true);

  // ✅ Fetch data from Supabase
const fetchData = useCallback(async () => {
  try {
    setLoading(true);

    const { user: authUser, profile } = await getUserAndProfile();
    if (!authUser || !profile || profile.role !== 'head_consultant') {
      console.warn('Bukan head consultant');
      return;
    }
    setUser(profile);

    // Ambil data dengan join ke inspections, projects (tanpa client_name), dan profiles
    const { data, error } = await supabase
      .from('checklist_responses')
      .select(`
        id,
        item_id,
        status,
        responded_at,
        rejection_notes,
        inspection_id,
        inspections (
          id,
          project_id,
          assigned_to,
          projects (
            id,
            name
            -- ❌ TIDAK ADA client_name
          ),
          profiles (
            id,
            full_name,
            email,
            specialization
          )
        )
      `)
      .in('status', ['project_lead_approved', 'head_consultant_approved', 'rejected']);

    if (error) throw error;

    // Siapkan data untuk filter
    const allInspectors = Array.from(
      new Map(
        data
          .filter(a => a.inspections?.profiles)
          .map(a => [a.inspections.profiles.id, a.inspections.profiles])
      ).values()
    );

    const allProjects = Array.from(
      new Map(
        data
          .filter(a => a.inspections?.projects)
          .map(a => [a.inspections.projects.id, a.inspections.projects])
      ).values()
    );

    setInspectors(allInspectors);
    setProjects(allProjects);
    setApprovals(data);

    // Hitung statistik
    const total = data.length;
    const pending = data.filter(a => a.status === 'project_lead_approved').length;
    const approved = data.filter(a => a.status === 'head_consultant_approved').length;
    const rejected = data.filter(a => a.status === 'rejected').length;

    setStats({ total, pending, approved, rejected });

  } catch (err) {
    console.error('[HeadConsultantApprovals] Fetch data error:', err);
    toast({
      title: 'Gagal memuat data.',
      description: err.message || 'Cek koneksi atau konfigurasi Supabase.',
      status: 'error',
    });
    setApprovals([]);
    setInspectors([]);
    setProjects([]);
    setStats({ total: 0, pending: 0, approved: 0, rejected: 0 });
  } finally {
    setLoading(false);
  }
}, [toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ✅ Filter approvals
  const filteredApprovals = useMemo(() => {
    let result = approvals;

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(a =>
        a.inspections?.projects?.name?.toLowerCase().includes(term) ||
        // ❌ TIDAK CARI client_name
        a.inspections?.profiles?.full_name?.toLowerCase().includes(term) ||
        a.inspections?.profiles?.email?.toLowerCase().includes(term) ||
        a.item_id?.toLowerCase().includes(term)
      );
    }

    if (selectedStatus) {
      result = result.filter(a => a.status === selectedStatus);
    }

    if (selectedInspector) {
      result = result.filter(a => a.inspections?.profiles?.id === selectedInspector);
    }

    if (selectedProject) {
      result = result.filter(a => a.inspections?.projects?.id === selectedProject);
    }

    return result;
  }, [searchTerm, selectedStatus, selectedInspector, selectedProject, approvals]);

  // ✅ Approve
  const handleApprove = async (approvalId) => {
    setActionLoading(prev => ({ ...prev, [`approve-${approvalId}`]: true }));
    try {
      const { error } = await supabase
        .from('checklist_responses')
        .update({ status: 'head_consultant_approved', rejection_notes: null })
        .eq('id', approvalId);

      if (error) throw error;

      toast({ title: 'Disetujui', status: 'success' });
      fetchData();
    } catch (err) {
      console.error('Approve error:', err);
      toast({ title: 'Gagal menyetujui', description: err.message, status: 'error' });
    } finally {
      setActionLoading(prev => ({ ...prev, [`approve-${approvalId}`]: false }));
    }
  };

  // ✅ Reject
  const onOpenReject = (approvalId) => {
    setRejectId(approvalId);
    setRejectionNotes('');
    onOpenRejectAlert();
  };

  const onRejectConfirm = async () => {
    if (!rejectionNotes.trim()) {
      toast({ title: 'Catatan wajib diisi', status: 'warning' });
      return;
    }

    const approvalId = rejectId;
    setActionLoading(prev => ({ ...prev, [`reject-${approvalId}`]: true }));
    onCloseRejectAlert();

    try {
      const { error } = await supabase
        .from('checklist_responses')
        .update({ status: 'rejected', rejection_notes: rejectionNotes })
        .eq('id', approvalId);

      if (error) throw error;

      toast({ title: 'Ditolak', status: 'warning' });
      fetchData();
    } catch (err) {
      console.error('Reject error:', err);
      toast({ title: 'Gagal menolak', description: err.message, status: 'error' });
    } finally {
      setActionLoading(prev => ({ ...prev, [`reject-${approvalId}`]: false }));
      setRejectId(null);
      setRejectionNotes('');
    }
  };

  const handleViewDetail = (approvalId) => {
    router.push(`/dashboard/head-consultant/approvals/${approvalId}`);
  };

  const resetFilters = () => {
    setSearchTerm('');
    setSelectedStatus('project_lead_approved');
    setSelectedInspector('');
    setSelectedProject('');
  };

  // --- Helper Components ---
  const StatCard = ({ label, value, icon: Icon, colorClass }) => (
    <div className="bg-white shadow-lg rounded-xl p-4 border border-gray-100">
      <div className="flex items-center space-x-4">
        <div className={`p-3 rounded-full ${colorClass}`}>
          <Icon className="w-6 h-6" />
        </div>
        <div>
          <p className="text-sm text-gray-500">{label}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
        </div>
      </div>
    </div>
  );

  const StatusBadge = ({ status }) => {
    const statusText = status?.replace(/_/g, ' ') || 'N/A';
    const { badge } = statusColors[status] || { badge: 'bg-gray-100 text-gray-800' };
    return (
      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full capitalize ${badge}`}>
        {statusText}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center p-10 min-h-screen bg-gray-50">
        <Loader2 className="animate-spin w-10 h-10 text-blue-500" />
        <p className="ml-3 text-lg text-gray-600">Memuat data...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8 font-sans">
      <script src="https://cdn.tailwindcss.com"></script>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap');
        .font-sans { font-family: 'Inter', sans-serif; }
      `}</style>

      <div className="max-w-7xl mx-auto space-y-6">
        <h1 className="text-3xl font-extrabold text-gray-900 border-b pb-2 mb-4">
          Alur Persetujuan Laporan (Head Consultant)
        </h1>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Total Laporan" value={stats.total} icon={FileText} colorClass="text-blue-600 bg-blue-100" />
          <StatCard label="Menunggu Review" value={stats.pending} icon={Clock} colorClass="text-yellow-600 bg-yellow-100" />
          <StatCard label="Disetujui" value={stats.approved} icon={CheckCircle} colorClass="text-green-600 bg-green-100" />
          <StatCard label="Ditolak" value={stats.rejected} icon={XCircle} colorClass="text-red-600 bg-red-100" />
        </div>

        {/* Filter */}
        <div className="bg-white shadow-lg rounded-xl p-5 border border-gray-100">
          <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
            <Filter className="w-5 h-5 mr-2 text-gray-500" /> Filter Laporan
          </h2>
          <div className="flex flex-wrap gap-4 items-end">
            <div className="relative flex-grow min-w-[200px] max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Cari proyek, inspector, atau item..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 shadow-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <select
              className="px-3 py-2 border border-gray-300 rounded-lg bg-white focus:ring-blue-500 focus:border-blue-500 shadow-sm min-w-[200px]"
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
            >
              <option value="project_lead_approved">Project Lead Approved (Pending)</option>
              <option value="head_consultant_approved">Head Consultant Approved</option>
              <option value="rejected">Rejected</option>
            </select>

            <select
              className="px-3 py-2 border border-gray-300 rounded-lg bg-white focus:ring-blue-500 focus:border-blue-500 shadow-sm min-w-[200px]"
              value={selectedInspector}
              onChange={(e) => setSelectedInspector(e.target.value)}
            >
              <option value="">Filter Inspector</option>
              {inspectors.map(inspector => (
                <option key={inspector.id} value={inspector.id}>
                  {inspector.full_name || inspector.email} ({inspector.specialization?.replace(/_/g, ' ') || '-'})
                </option>
              ))}
            </select>

            <select
              className="px-3 py-2 border border-gray-300 rounded-lg bg-white focus:ring-blue-500 focus:border-blue-500 shadow-sm min-w-[200px]"
              value={selectedProject}
              onChange={(e) => setSelectedProject(e.target.value)}
            >
              <option value="">Filter Proyek</option>
              {projects.map(project => (
                <option key={project.id} value={project.id}>
                  {project.name}
                  {/* ❌ TIDAK TAMPILKAN client_name */}
                </option>
              ))}
            </select>

            <button
              className="p-2.5 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition duration-150 shadow-sm disabled:opacity-50"
              onClick={resetFilters}
              disabled={!searchTerm && selectedStatus === 'project_lead_approved' && !selectedInspector && !selectedProject}
              title="Reset Semua Filter"
            >
              <Filter className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white shadow-lg rounded-xl overflow-hidden border border-gray-100">
          <div className="p-5 border-b">
            <h2 className="text-xl font-semibold text-gray-800">Daftar Laporan ({filteredApprovals.length})</h2>
          </div>

          {filteredApprovals.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Proyek</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Inspector</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tanggal</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Aksi</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredApprovals.map((approval) => (
                    <tr key={approval.id} className="hover:bg-blue-50">
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900 max-w-[200px] truncate">
                          {approval.inspections?.projects?.name || 'N/A'}
                        </div>
                        {/* ❌ TIDAK TAMPILKAN client_name */}
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">
                          {approval.inspections?.profiles?.full_name || approval.inspections?.profiles?.email || 'N/A'}
                        </div>
                        {approval.inspections?.profiles?.specialization && (
                          <span className="px-2 inline-flex text-xs rounded-full bg-purple-100 text-purple-800 capitalize">
                            {approval.inspections.profiles.specialization.replace(/_/g, ' ')}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700 max-w-[150px] truncate">
                        {approval.item_id}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {approval.responded_at ? format(new Date(approval.responded_at), 'dd MMM yyyy HH:mm', { locale: localeId }) : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <StatusBadge status={approval.status} />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <button
                            className="text-blue-600 hover:text-blue-900 p-1 rounded hover:bg-blue-100"
                            onClick={() => handleViewDetail(approval.id)}
                          >
                            <Eye className="w-5 h-5" />
                          </button>
                          {approval.status === 'project_lead_approved' && (
                            <>
                              <button
                                className="text-green-600 hover:text-green-900 p-1 rounded hover:bg-green-100 disabled:opacity-50"
                                onClick={() => handleApprove(approval.id)}
                                disabled={actionLoading[`approve-${approval.id}`]}
                              >
                                {actionLoading[`approve-${approval.id}`] ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
                              </button>
                              <button
                                className="text-red-600 hover:text-red-900 p-1 rounded hover:bg-red-100 disabled:opacity-50"
                                onClick={() => onOpenReject(approval.id)}
                                disabled={actionLoading[`reject-${approval.id}`]}
                              >
                                {actionLoading[`reject-${approval.id}`] ? <Loader2 className="w-5 h-5 animate-spin" /> : <X className="w-5 h-5" />}
                              </button>
                            </>
                          )}
                          {approval.status === 'rejected' && approval.rejection_notes && (
                            <span className="px-2 inline-flex text-xs rounded-full bg-red-100 text-red-800 cursor-help" title={`Catatan: ${approval.rejection_notes}`}>
                              Catatan
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-6 bg-blue-50 border-l-4 border-blue-500 text-blue-800 rounded-b-lg">
              <div className="flex items-start">
                <Info className="w-5 h-5 mr-3 mt-1" />
                <div>
                  <h3 className="text-lg font-semibold">Tidak Ada Laporan</h3>
                  <p className="text-sm">
                    {selectedStatus === 'project_lead_approved'
                      ? 'Tidak ada laporan menunggu review.'
                      : 'Tidak ada laporan sesuai filter.'}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Reject Modal */}
      <AlertDialogMock
        isOpen={isRejectAlertOpen}
        onClose={onCloseRejectAlert}
        onConfirm={onRejectConfirm}
        title="Tolak Laporan Checklist"
        confirmText="Tolak Sekarang"
        cancelRef={cancelRef}
        confirmDisabled={!rejectionNotes.trim()}
        isLoading={actionLoading[`reject-${rejectId}`]}
      >
        <p className="text-sm text-gray-500 mb-4">
          Apakah Anda yakin ingin menolak laporan ini? Sertakan catatan penolakan.
        </p>
        <textarea
          placeholder="Catatan Penolakan (Wajib)"
          value={rejectionNotes}
          onChange={(e) => setRejectionNotes(e.target.value)}
          className="w-full p-2 border border-gray-300 rounded-lg focus:ring-red-500 focus:border-red-500 min-h-[100px]"
        />
      </AlertDialogMock>
    </div>
  );
};

export default ApprovalWorkflow;
