// FILE: src/pages/dashboard/simple.js
"use client";

import React from 'react';
import { useAuth } from '@/context/AuthContext';

export default function SimpleDashboard() {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return <div>Loading auth...</div>;
  }

  return (
    <div className="p-6">
      <p>User: {user?.email}</p>
      <p>Role: {profile?.role}</p>
      <p>Login berhasil! 🎉</p>
      
      <div className="mt-4">
        <button 
          onClick={() => window.location.href = '/dashboard/inspector'}
          className="bg-blue-500 text-white px-4 py-2 rounded"
        >
          Manual Go to Inspector Dashboard
        </button>
      </div>
    </div>
  );
}