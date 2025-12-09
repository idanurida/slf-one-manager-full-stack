// client\src\components\client\ClientSchedules.js

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar, MapPin, FileText, Users, CheckCircle2, Clock } from "lucide-react";

export const ClientSchedules = ({ schedules, loading }) => {
  if (loading) {
    return (
      <Card className="p-6 border-border bg-card">
        <CardHeader>
          <Skeleton className="h-6 w-40" />
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="flex-1">
                <Skeleton className="h-4 w-3/4 mb-1" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  const formatScheduleDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getScheduleColor = (type) => {
    const colors = {
      inspection: 'bg-red-100 text-red-600 border-red-200',
      review: 'bg-blue-100 text-blue-600 border-blue-200',
      meeting: 'bg-green-100 text-green-600 border-green-200',
      submission: 'bg-purple-100 text-purple-600 border-purple-200',
      deadline: 'bg-orange-100 text-orange-600 border-orange-200'
    };
    return colors[type] || 'bg-gray-100 text-gray-600 border-gray-200';
  };

  const getScheduleIcon = (type) => {
    switch (type) {
      case 'inspection': return <MapPin className="w-4 h-4" />;
      case 'review': return <FileText className="w-4 h-4" />;
      case 'meeting': return <Users className="w-4 h-4" />;
      case 'submission': return <CheckCircle2 className="w-4 h-4" />;
      case 'deadline': return <Clock className="w-4 h-4" />;
      default: return <Calendar className="w-4 h-4" />;
    }
  };

  return (
    <Card className="border-border bg-card">
      <CardHeader>
        <CardTitle className="flex items-center">
          <Calendar className="w-5 h-5 mr-2 text-blue-500" />
          Jadwal Project Anda
        </CardTitle>
        <CardDescription>
          Jadwal inspeksi, meeting, dan deadline yang ditetapkan oleh tim SLF
        </CardDescription>
      </CardHeader>
      <CardContent>
        {schedules.length === 0 ? (
          <div className="text-center py-6">
            <Calendar className="w-12 h-12 mx-auto text-gray-400 mb-3" />
            <p className="text-gray-500">Belum ada jadwal yang ditetapkan</p>
          </div>
        ) : (
          <div className="space-y-3">
            {schedules.map((schedule) => (
              <div key={schedule.id} className={`flex items-center justify-between p-3 border rounded-lg ${getScheduleColor(schedule.schedule_type)}`}>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center">
                    {getScheduleIcon(schedule.schedule_type)}
                  </div>
                  <div>
                    <p className="font-medium text-sm">{schedule.title}</p>
                    <p className="text-xs text-gray-500">
                      {formatScheduleDate(schedule.schedule_date)}
                    </p>
                    {schedule.description && (
                      <p className="text-xs text-gray-600 mt-1">{schedule.description}</p>
                    )}
                  </div>
                </div>
                <Badge 
                  variant={
                    schedule.status === 'completed' ? 'default' :
                    schedule.status === 'in_progress' ? 'secondary' :
                    schedule.status === 'cancelled' ? 'destructive' : 'outline'
                  }
                  className="capitalize"
                >
                  {schedule.status === 'scheduled' ? 'Terjadwal' : schedule.status}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
