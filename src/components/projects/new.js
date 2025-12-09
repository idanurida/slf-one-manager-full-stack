// client/src/pages/dashboard/projects/new.js
import React, { useState } from 'react';
import { useToast } from '@/components/ui/use-toast';
import DashboardLayout from '../../../components/layouts/DashboardLayout';
import ProjectForm from '../../../components/projects/ProjectForm';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { useRouter } from 'next/router';

const NewProjectPage = () => {
  const [user, setUser] = useState({});
  const { toast } = useToast();
  const router = useRouter();

  // Fetch user data
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  
  const { data: userData } = useQuery({ // ✅ Diperbaiki: userData -> data: userData
    queryKey: ['user'], // ✅ Diperbaiki: menggunakan queryKey
    queryFn: async () => {
      const response = await axios.get('/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data;
    },
    enabled: !!token,
    onSuccess: (data) => setUser(data.user) // ✅ Diperbaiki: data.user bukan data.data.user
  });

  const handleSaveProject = (projectData) => {
    // Redirect to project detail page
    if (projectData.id) {
      router.push(`/dashboard/projects/${projectData.id}`);
    }
  };

  const handleCancel = () => {
    router.push('/dashboard/projects');
  };

  return (
    <DashboardLayout user={user}>
      <div className="p-6">
        <h1 className="text-3xl font-bold mb-6 text-slate-900">
          Buat Proyek Baru
        </h1>
        
        <ProjectForm 
          onSave={handleSaveProject}
          onCancel={handleCancel}
          isEditing={false}
        />
      </div>
    </DashboardLayout>
  );
};

export default NewProjectPage;
