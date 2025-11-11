"use client";
import React from "react";
import DashboardLayout from "@/components/layouts/DashboardLayout";

const SystemLogsPage = () => {
  return (
    <DashboardLayout>
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">System Logs</h1>
        <div className="bg-white rounded-lg shadow p-4">
          <p>System activity logs will be displayed here.</p>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default SystemLogsPage;
