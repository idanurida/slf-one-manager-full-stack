import React, { useState, useEffect } from "react";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import ClientCommunicationList from "@/components/admin-lead/ClientCommunicationList";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Filter } from "lucide-react";

export default function ClientCommunicationListPage() {
  const [loading, setLoading] = useState(false);
  const [projects, setProjects] = useState([]); // Default empty array
  const [activeTab, setActiveTab] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Initialize with empty data during build
  useEffect(() => {
    // For build time, ensure projects is always an array
    // In production, this would be replaced with actual data fetching
    setProjects([]);
    setLoading(false);
  }, []);

  // Handle view thread click
  const handleViewThread = (projectId, clientId) => {
    console.log("View thread:", projectId, clientId);
    // In production: router.push(`/dashboard/admin-lead/communication/${projectId}?clientId=${clientId}`);
  };

  // Filter projects based on active tab and search
  const filteredProjects = React.useMemo(() => {
    // Always ensure we're working with an array
    const safeProjects = Array.isArray(projects) ? projects : [];
    
    let filtered = [...safeProjects];
    
    // Filter by tab
    switch (activeTab) {
      case "unread":
        filtered = safeProjects.filter(p => p?.has_unread_messages);
        break;
      case "read":
        filtered = safeProjects.filter(p => !p?.has_unread_messages);
        break;
      default:
        // "all" tab - include all projects
        filtered = [...safeProjects];
    }
    
    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(p => 
        p?.name?.toLowerCase().includes(query) ||
        p?.clients?.name?.toLowerCase().includes(query)
      );
    }
    
    return filtered;
  }, [projects, activeTab, searchQuery]);

  return (
    <DashboardLayout>
      <div className="space-y-6 p-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
            Komunikasi Client
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-2">
            Kelola semua komunikasi dengan client untuk setiap proyek
          </p>
        </div>

        {/* Search and Filter Bar */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
            <Input
              placeholder="Cari proyek atau client..."
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          <Button variant="outline">
            <Filter className="w-4 h-4 mr-2" />
            Filter
          </Button>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="all">Semua</TabsTrigger>
            <TabsTrigger value="unread">Belum Dibaca</TabsTrigger>
            <TabsTrigger value="read">Sudah Dibaca</TabsTrigger>
          </TabsList>
          
          {/* All Communications Tab */}
          <TabsContent value="all" className="mt-6">
            <ClientCommunicationList
              projects={filteredProjects}
              loading={loading}
              onViewThread={handleViewThread}
            />
          </TabsContent>
          
          {/* Unread Communications Tab */}
          <TabsContent value="unread" className="mt-6">
            <ClientCommunicationList
              projects={filteredProjects}
              loading={loading}
              unreadOnly={true}
              onViewThread={handleViewThread}
            />
          </TabsContent>
          
          {/* Read Communications Tab */}
          <TabsContent value="read" className="mt-6">
            <ClientCommunicationList
              projects={filteredProjects}
              loading={loading}
              readOnly={true}
              onViewThread={handleViewThread}
            />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}

// Optional: Add getStaticProps for static generation
// Remove or comment this if you don't need static generation
/*
export async function getStaticProps() {
  try {
    // Example: Fetch data from API
    // const res = await fetch('https://api.example.com/communications');
    // const data = await res.json();
    
    return {
      props: {
        // ALWAYS ensure initialData is an array, not undefined
        initialData: [], // Replace with actual data
      },
      revalidate: 60, // Optional: Incremental Static Regeneration
    };
  } catch (error) {
    console.error("Error in getStaticProps:", error);
    return {
      props: {
        initialData: [], // Return empty array on error
      },
    };
  }
}
*/
