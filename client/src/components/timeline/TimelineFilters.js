// components/timeline/TimelineFilters.js
import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { X } from "lucide-react";

// Fungsi helper untuk available filters
const getAvailableFilters = (currentRole = 'admin_lead') => {
  const roleFilters = {
    admin_lead: ['phase', 'status', 'project_lead', 'priority', 'duration'],
    project_lead: ['phase', 'status', 'priority'],
    consultant: ['phase', 'status'],
    client: ['phase', 'status']
  };
  
  return roleFilters[currentRole] || ['phase', 'status'];
};

// Component untuk Project Lead Filter
const ProjectLeadFilter = ({ value, onChange }) => {
  const [projectLeads, setProjectLeads] = React.useState([]);
  
  React.useEffect(() => {
    // Fetch project leads dari API atau context
    // Untuk sementara, kita gunakan data dummy
    const dummyLeads = [
      { id: '1', name: 'John Doe' },
      { id: '2', name: 'Jane Smith' },
      { id: '3', name: 'Bob Johnson' }
    ];
    setProjectLeads(dummyLeads);
  }, []);

  return (
    <Select value={value || 'all'} onValueChange={onChange}>
      <SelectTrigger className="w-48 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100">
        <SelectValue placeholder="Semua Project Lead" />
      </SelectTrigger>
      <SelectContent className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
        <SelectItem value="all" className="text-slate-900 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-700">
          Semua Project Lead
        </SelectItem>
        {projectLeads.map(lead => (
          <SelectItem 
            key={lead.id} 
            value={lead.id}
            className="text-slate-900 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-700"
          >
            {lead.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

// Component untuk Priority Filter
const PriorityFilter = ({ value, onChange }) => {
  return (
    <Select value={value || 'all'} onValueChange={onChange}>
      <SelectTrigger className="w-40 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100">
        <SelectValue placeholder="Semua Prioritas" />
      </SelectTrigger>
      <SelectContent className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
        <SelectItem value="all" className="text-slate-900 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-700">
          Semua Prioritas
        </SelectItem>
        <SelectItem value="low" className="text-slate-900 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-700">
          Rendah
        </SelectItem>
        <SelectItem value="medium" className="text-slate-900 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-700">
          Sedang
        </SelectItem>
        <SelectItem value="high" className="text-slate-900 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-700">
          Tinggi
        </SelectItem>
        <SelectItem value="urgent" className="text-slate-900 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-700">
          Mendesak
        </SelectItem>
      </SelectContent>
    </Select>
  );
};

// Component untuk Duration Filter
const DurationFilter = ({ value, onChange }) => {
  return (
    <Select value={value || 'all'} onValueChange={onChange}>
      <SelectTrigger className="w-40 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100">
        <SelectValue placeholder="Semua Durasi" />
      </SelectTrigger>
      <SelectContent className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
        <SelectItem value="all" className="text-slate-900 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-700">
          Semua Durasi
        </SelectItem>
        <SelectItem value="7" className="text-slate-900 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-700">
          ≤ 7 hari
        </SelectItem>
        <SelectItem value="30" className="text-slate-900 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-700">
          ≤ 30 hari
        </SelectItem>
        <SelectItem value="90" className="text-slate-900 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-700">
          ≤ 90 hari
        </SelectItem>
        <SelectItem value="180" className="text-slate-900 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-700">
          ≤ 6 bulan
        </SelectItem>
      </SelectContent>
    </Select>
  );
};

const TimelineFilters = ({ 
  filters = {}, 
  onFiltersChange,
  currentRole = 'admin_lead',
  className = ""
}) => {
  const availableFilters = getAvailableFilters(currentRole);

  const handleFilterChange = (key, value) => {
    const newFilters = { ...filters };
    if (value === 'all' || value === '') {
      delete newFilters[key];
    } else {
      newFilters[key] = value;
    }
    onFiltersChange?.(newFilters);
  };

  const resetFilters = () => {
    onFiltersChange?.({});
  };

  const hasActiveFilters = Object.keys(filters).length > 0;

  return (
    <Card className={`border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 ${className}`}>
      <CardContent className="p-4">
        <div className="flex flex-wrap gap-4 items-center">
          <Label className="text-slate-900 dark:text-slate-100 font-medium">Filter:</Label>
          
          {availableFilters.includes('phase') && (
            <Select 
              value={filters.phase || 'all'} 
              onValueChange={(value) => handleFilterChange('phase', value)}
            >
              <SelectTrigger className="w-48 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100">
                <SelectValue placeholder="Semua Fase" />
              </SelectTrigger>
              <SelectContent className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                <SelectItem value="all" className="text-slate-900 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-700">
                  Semua Fase
                </SelectItem>
                <SelectItem value="1" className="text-slate-900 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-700">
                  Fase 1: Persiapan
                </SelectItem>
                <SelectItem value="2" className="text-slate-900 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-700">
                  Fase 2: Inspeksi
                </SelectItem>
                <SelectItem value="3" className="text-slate-900 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-700">
                  Fase 3: Laporan
                </SelectItem>
                <SelectItem value="4" className="text-slate-900 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-700">
                  Fase 4: Approval
                </SelectItem>
                <SelectItem value="5" className="text-slate-900 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-700">
                  Fase 5: Pemerintah
                </SelectItem>
              </SelectContent>
            </Select>
          )}
          
          {availableFilters.includes('status') && (
            <Select 
              value={filters.status || 'all'} 
              onValueChange={(value) => handleFilterChange('status', value)}
            >
              <SelectTrigger className="w-48 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100">
                <SelectValue placeholder="Semua Status" />
              </SelectTrigger>
              <SelectContent className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                <SelectItem value="all" className="text-slate-900 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-700">
                  Semua Status
                </SelectItem>
                <SelectItem value="pending" className="text-slate-900 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-700">
                  Menunggu
                </SelectItem>
                <SelectItem value="in_progress" className="text-slate-900 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-700">
                  Dalam Proses
                </SelectItem>
                <SelectItem value="completed" className="text-slate-900 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-700">
                  Selesai
                </SelectItem>
                <SelectItem value="blocked" className="text-slate-900 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-700">
                  Tertahan
                </SelectItem>
                <SelectItem value="delayed" className="text-slate-900 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-700">
                  Terlambat
                </SelectItem>
              </SelectContent>
            </Select>
          )}
          
          {availableFilters.includes('project_lead') && (
            <ProjectLeadFilter
              value={filters.project_lead}
              onChange={(value) => handleFilterChange('project_lead', value)}
            />
          )}
          
          {availableFilters.includes('priority') && (
            <PriorityFilter
              value={filters.priority}
              onChange={(value) => handleFilterChange('priority', value)}
            />
          )}
          
          {availableFilters.includes('duration') && (
            <DurationFilter
              value={filters.duration}
              onChange={(value) => handleFilterChange('duration', value)}
            />
          )}
          
          <Button
            variant="outline"
            onClick={resetFilters}
            disabled={!hasActiveFilters}
            className="border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-4 h-4 mr-1" />
            Reset
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default TimelineFilters;