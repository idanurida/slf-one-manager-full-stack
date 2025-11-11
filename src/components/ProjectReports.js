// FILE: src/components/ProjectReports.js
import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';

const ProjectReports = () => {
  const { user, isDrafter, isAuthenticated, userRole } = useAuth();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [generating, setGenerating] = useState({});

  const fetchProjects = async () => {
    if (!isAuthenticated || !user) return;
    
    try {
      setLoading(true);
      setError(null);
      
      console.log(`[ProjectReports] Fetching projects for: ${user.id}, role: ${userRole}`);

      const response = await fetch('/api/projects', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-User-ID': user.id,
          'X-User-Role': userRole
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log(`[ProjectReports] Received ${data.length} projects`);
      setProjects(data);
      
    } catch (error) {
      console.error('[ProjectReports] Error fetching projects:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const generateReport = async (projectId) => {
    if (!user) return;
    
    try {
      setGenerating(prev => ({ ...prev, [projectId]: true }));
      
      console.log(`[ProjectReports] Generating report for project: ${projectId}`);
      
      const response = await fetch(`/api/projects/${projectId}/generate-final-report`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: user.id })
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Gagal membuat laporan');
      }
      
      alert('Laporan berhasil dibuat!');
      console.log('Report generated:', result.report);
      
    } catch (error) {
      console.error('[ProjectReports] Generate report error:', error);
      alert(`Error: ${error.message}`);
    } finally {
      setGenerating(prev => ({ ...prev, [projectId]: false }));
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchProjects();
    }
  }, [isAuthenticated, user, userRole]);

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse text-gray-600">Memuat proyek...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h2 className="text-red-800 font-semibold mb-2">Error</h2>
          <p className="text-red-600">{error}</p>
          <button 
            onClick={fetchProjects}
            className="mt-3 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
          >
            Coba Lagi
          </button>
        </div>
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div className="p-6">
        <h2 className="text-xl font-bold mb-4">Laporan Dokumen Proyek</h2>
        
        {/* Filter Section */}
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <h3 className="font-semibold mb-2">Filter Laporan</h3>
          <p className="text-sm text-gray-600 mb-3">Pilih proyek untuk melihat ringkasan dokumen</p>
          
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Filter Proyek
              </label>
              <select 
                className="w-full p-2 border border-gray-300 rounded-md bg-white"
                disabled
              >
                <option>Pilih Proyek</option>
              </select>
            </div>
          </div>
        </div>

        {/* No Projects Message */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
          <div className="text-yellow-600 mb-2">
            <svg className="w-12 h-12 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-yellow-800 mb-2">
            Tidak ada proyek
          </h3>
          <p className="text-yellow-700 mb-4">
            Anda belum ditugaskan sebagai project lead di proyek manapun. Laporan tidak dapat dibuat.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <h2 className="text-xl font-bold mb-4">Laporan Dokumen Proyek</h2>
      
      {/* Filter Section */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <h3 className="font-semibold mb-2">Filter Laporan</h3>
        <p className="text-sm text-gray-600 mb-3">Pilih proyek untuk melihat ringkasan dokumen</p>
        
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Filter Proyek
            </label>
            <select className="w-full p-2 border border-gray-300 rounded-md bg-white">
              <option>Semua Proyek ({projects.length})</option>
              {projects.map(project => (
                <option key={project.id} value={project.id}>
                  {project.name} - {project.status}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Projects List */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-4">
          Proyek Anda ({projects.length})
        </h3>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {projects.map(project => (
            <div 
              key={project.id} 
              className="border border-gray-200 rounded-lg p-4 bg-white shadow-sm hover:shadow-md transition-shadow"
            >
              <h4 className="font-semibold text-lg mb-3 text-gray-800">{project.name}</h4>
              
              <div className="space-y-2 text-sm text-gray-600">
                <div className="flex justify-between">
                  <span className="font-medium">Alamat:</span>
                  <span className="text-right">{project.address}, {project.city}</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="font-medium">Status:</span>
                  <span className={`px-2 py-1 rounded text-xs ${
                    project.status === 'completed' ? 'bg-green-100 text-green-800' :
                    project.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                    project.status === 'draft' ? 'bg-gray-100 text-gray-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {project.status || 'draft'}
                  </span>
                </div>
                
                <div className="flex justify-between">
                  <span className="font-medium">Tipe Aplikasi:</span>
                  <span>{project.application_type || '-'}</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="font-medium">Fungsi Khusus:</span>
                  <span>{project.is_special_function ? 'Ya' : 'Tidak'}</span>
                </div>
              </div>
              
              <div className="mt-4 pt-3 border-t border-gray-100">
                <button 
                  onClick={() => generateReport(project.id)}
                  disabled={generating[project.id]}
                  className={`w-full px-3 py-2 text-sm rounded transition-colors ${
                    generating[project.id] 
                      ? 'bg-gray-400 text-gray-200 cursor-not-allowed' 
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  {generating[project.id] ? 'Membuat Laporan...' : 'Buat Laporan SLF'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ProjectReports;