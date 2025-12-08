// FILE: src/pages/dashboard/admin-lead/ClientCommunicationList.js
import React, { useState, useEffect } from "react";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import ClientCommunicationList from "@/components/admin-lead/ClientCommunicationList";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Search, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ClientCommunicationListPage() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  
  // Simulasi data fetching
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        // Simulasi API call
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Data contoh - dalam produksi, ambil dari API
        const mockData = [
          {
            id: "1",
            name: "Proyek A",
            client_id: "client1",
            clients: { name: "Client A" },
            created_at: "2024-01-15",
            status: "active",
            has_unread_messages: true
          },
          {
            id: "2",
            name: "Proyek B", 
            client_id: "client2",
            clients: { name: "Client B" },
            created_at: "2024-01-10",
            status: "pending",
            has_unread_messages: false
          }
        ];
        
        // Pastikan data selalu array
        setProjects(Array.isArray(mockData) ? mockData : []);
      } catch (error) {
        console.error("Error fetching data:", error);
        setProjects([]); // Set ke array kosong jika error
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);
  
  const handleViewThread = (projectId, clientId) => {
    console.log("View thread:", projectId, clientId);
    // Navigasi ke halaman thread
    // router.push(`/dashboard/admin-lead/communication/${projectId}?clientId=${clientId}`);
  };
  
  // Filter data berdasarkan tab aktif
  const filteredProjects = React.useMemo(() => {
    if (!Array.isArray(projects)) return [];
    
    let filtered = [...projects];
    
    switch (activeTab) {
      case "unread":
        filtered = projects.filter(p => p?.has_unread_messages);
        break;
      case "read":
        filtered = projects.filter(p => !p?.has_unread_messages);
        break;
      default:
        filtered = [...projects];
    }
    
    // Filter berdasarkan pencarian
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
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Komunikasi Client
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Kelola semua komunikasi dengan client untuk setiap proyek
          </p>
        </div>
        
        <div className="flex flex-col md:flex-row gap-4 justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
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
        
        <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="all">Semua</TabsTrigger>
            <TabsTrigger value="unread">Belum Dibaca</TabsTrigger>
            <TabsTrigger value="read">Sudah Dibaca</TabsTrigger>
          </TabsList>
          
          <TabsContent value="all" className="mt-6">
            <ClientCommunicationList
              projects={filteredProjects}
              loading={loading}
              onViewThread={handleViewThread}
            />
          </TabsContent>
          
          <TabsContent value="unread" className="mt-6">
            <ClientCommunicationList
              projects={filteredProjects}
              loading={loading}
              unreadOnly={true}
              onViewThread={handleViewThread}
            />
          </TabsContent>
          
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

// Jika tidak menggunakan server-side rendering, hapus atau comment fungsi di bawah
/*
export async function getServerSideProps() {
  try {
    // Fetch data dari API
    // const res = await fetch('https://api.example.com/communications');
    // const data = await res.json();
    
    return {
      props: {
        // SELALU pastikan ini array, bukan undefined
        initialProjects: [] // Ganti dengan data sebenarnya
      }
    };
  } catch (error) {
    console.error("Error in getServerSideProps:", error);
    return {
      props: {
        initialProjects: [] // Return array kosong jika error
      }
    };
  }
}
*/