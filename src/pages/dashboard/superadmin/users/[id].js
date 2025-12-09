"use client";

import { useParams } from 'next/navigation';

export default function UserDetailPage() {
  const params = useParams();
  const id = params?.id;
  
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">User Details</h1>
      <div className="bg-white rounded-lg shadow p-4">
        <p><strong>User ID:</strong> {id || 'N/A'}</p>
        <p className="text-gray-600 mt-2">SuperAdmin user management page</p>
      </div>
    </div>
  );
}

export const dynamic = 'force-dynamic';
