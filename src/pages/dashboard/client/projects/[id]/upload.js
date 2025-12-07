// src/pages/dashboard/client/projects/[id]/upload.js
import React from 'react';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import FormUploadDokumen from '@/components/clients/FormUploadDokumen';

export default function UploadDokumenPage() {
  return (
    <DashboardLayout title="Upload Dokumen">
      <FormUploadDokumen />
    </DashboardLayout>
  );
}
