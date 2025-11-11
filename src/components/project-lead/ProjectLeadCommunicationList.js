// FILE: src/components/project-lead/ProjectLeadCommunicationList.js
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { MessageCircle, Building, User, Clock, Mail, ExternalLink } from "lucide-react";

const ProjectLeadCommunicationList = ({ conversations, loading, onOpenChat }) => {
  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <Card key={i} className="border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-3 w-32" />
                </div>
              </div>
              <Skeleton className="h-8 w-20" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="text-center py-8">
        <MessageCircle className="w-12 h-12 mx-auto text-slate-400 dark:text-slate-500 mb-4" />
        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">Tidak Ada Percakapan</h3>
        <p className="text-slate-600 dark:text-slate-400">
          Belum ada komunikasi dengan client untuk proyek Anda.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {conversations.map((conv) => (
        <Card key={conv.id} className="border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors cursor-pointer"
              onClick={() => onOpenChat(conv.project_id, conv.client_id)}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-full">
                  <User className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h4 className="font-semibold text-slate-900 dark:text-slate-100">{conv.client_name}</h4>
                  <div className="flex items-center text-sm text-slate-600 dark:text-slate-400 space-x-4 mt-1">
                    <span className="flex items-center gap-1">
                      <Building className="w-3 h-3" />
                      {conv.project_name}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(conv.last_message_at).toLocaleDateString('id-ID')}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={conv.has_unread ? 'default' : 'secondary'}>
                  {conv.has_unread ? 'Baru' : 'Terakhir'}
                </Badge>
                <Button variant="outline" size="sm">
                  <Mail className="w-4 h-4 mr-2" />
                  Buka Chat
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default ProjectLeadCommunicationList;