// FILE: src/pages/dashboard/client/messages/index.js
import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/router";
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { toast } from "sonner";

// Components
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Alert,
  AlertDescription,
} from "@/components/ui/alert";

// Icons
import { 
  MessageCircle, Search, RefreshCw, Building, Clock, 
  Send, Loader2, AlertTriangle, CheckCircle, Eye
} from "lucide-react";

// Utils & Context
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { supabase } from "@/utils/supabaseClient";
import { useAuth } from "@/context/AuthContext";
import { 
  fetchProjectMessages, 
  fetchConversations as fetchConversationsFromService, 
  sendMessage as sendMessageService, 
  markMessagesAsRead 
} from "@/utils/messageService";

const formatDateSafely = (dateString) => {
  if (!dateString) return "-";
  try {
    return format(new Date(dateString), 'dd MMM yyyy HH:mm', { locale: localeId });
  } catch (e) {
    return dateString;
  }
};

const formatRelativeTime = (dateString) => {
  if (!dateString) return "";
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Baru saja";
    if (diffMins < 60) return `${diffMins} menit lalu`;
    if (diffHours < 24) return `${diffHours} jam lalu`;
    if (diffDays < 7) return `${diffDays} hari lalu`;
    return format(date, 'dd MMM yyyy', { locale: localeId });
  } catch (e) {
    return dateString;
  }
};

export default function ClientMessagesPage() {
  const router = useRouter();
  const { user, profile, loading: authLoading, isClient } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [projects, setProjects] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterProject, setFilterProject] = useState('all');

  // Fetch projects
  const fetchProjects = useCallback(async () => {
    try {
      let query = supabase
        .from('projects')
        .select('id, name, status, created_at')
        .order('created_at', { ascending: false });

      if (profile?.client_id) {
        query = query.eq('client_id', profile.client_id);
      }

      const { data, error } = await query;
      if (error) throw error;
      setProjects(data || []);
      return data || [];
    } catch (err) {
      console.error('Error fetching projects:', err);
      return [];
    }
  }, [profile?.client_id]);

  // Fetch conversations (grouped by project) - menggunakan messageService
  const fetchConversations = useCallback(async (projectsList) => {
    if (!projectsList || projectsList.length === 0) {
      setConversations([]);
      return;
    }

    try {
      const projectIds = projectsList.map(p => p.id);
      
      // Gunakan messageService untuk konsistensi
      const { data: convData, error: convError } = await fetchConversationsFromService(user?.id, projectIds);

      if (convError) {
        console.error('Conversations error:', convError);
      }

      // Merge dengan project data
      const conversationsList = projectsList.map(project => {
        const conv = convData?.find(c => c.project_id === project.id);
        return {
          project,
          lastMessage: conv?.lastMessage || null,
          unreadCount: conv?.unreadCount || 0,
          messages: conv?.messages || []
        };
      }).sort((a, b) => {
        const dateA = a.lastMessage?.created_at || a.project.created_at;
        const dateB = b.lastMessage?.created_at || b.project.created_at;
        return new Date(dateB) - new Date(dateA);
      });

      setConversations(conversationsList);
    } catch (err) {
      console.error('Error fetching conversations:', err);
      setError('Gagal memuat percakapan');
    }
  }, [user?.id]);

  // Fetch messages for selected project - menggunakan messageService
  const fetchMessages = useCallback(async (projectId) => {
    if (!projectId) return;

    try {
      // Gunakan messageService untuk konsistensi
      const { data: messagesData, error: messagesError } = await fetchProjectMessages(projectId, user?.id);

      if (messagesError) throw messagesError;

      setMessages(messagesData || []);

      // Mark messages as read
      const unreadIds = (messagesData || [])
        .filter(m => !m.is_read && m.sender_id !== user?.id)
        .map(m => m.id);
      
      if (unreadIds.length > 0) {
        await markMessagesAsRead(unreadIds, user?.id);
      }
    } catch (err) {
      console.error('Error fetching messages:', err);
      toast.error('Gagal memuat pesan');
    }
  }, [user?.id]);

  // Send message - menggunakan messageService
  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedProject) return;

    setSending(true);
    try {
      // Gunakan messageService untuk konsistensi
      const { error } = await sendMessageService({
        projectId: selectedProject.id,
        senderId: user.id,
        message: newMessage.trim(),
      });

      if (error) throw error;

      setNewMessage('');
      await fetchMessages(selectedProject.id);
      toast.success('Pesan terkirim');
    } catch (err) {
      console.error('Error sending message:', err);
      toast.error('Gagal mengirim pesan');
    } finally {
      setSending(false);
    }
  };

  // Initial fetch
  useEffect(() => {
    const loadData = async () => {
      if (!user || authLoading) return;
      
      setLoading(true);
      try {
        const projectsList = await fetchProjects();
        await fetchConversations(projectsList);
      } catch (err) {
        setError('Gagal memuat data');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [user, authLoading, fetchProjects, fetchConversations]);

  // Fetch messages when project selected
  useEffect(() => {
    if (selectedProject) {
      fetchMessages(selectedProject.id);
    }
  }, [selectedProject, fetchMessages]);

  // Auth check
  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/login');
    } else if (!authLoading && user && !isClient) {
      router.replace('/dashboard');
    }
  }, [authLoading, user, isClient, router]);

  const handleRefresh = async () => {
    setLoading(true);
    const projectsList = await fetchProjects();
    await fetchConversations(projectsList);
    if (selectedProject) {
      await fetchMessages(selectedProject.id);
    }
    setLoading(false);
    toast.success('Data diperbarui');
  };

  // Filter conversations
  const filteredConversations = conversations.filter(conv => {
    const matchesSearch = conv.project.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterProject === 'all' || conv.project.id === filterProject;
    return matchesSearch && matchesFilter;
  });

  if (authLoading) {
    return (
      <DashboardLayout title="Messages">
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Messages" user={user} profile={profile}>
      <div className="p-4 md:p-6 space-y-6">
        {/* Action Buttons */}
        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Conversations List */}
          <div className="lg:col-span-1 space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <MessageCircle className="w-5 h-5" />
                  Percakapan
                </CardTitle>
                <div className="flex gap-2 mt-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Cari proyek..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {loading ? (
                  <div className="p-4 space-y-3">
                    {[1, 2, 3].map(i => (
                      <Skeleton key={i} className="h-16 w-full" />
                    ))}
                  </div>
                ) : filteredConversations.length === 0 ? (
                  <div className="p-8 text-center">
                    <MessageCircle className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                    <p className="text-muted-foreground">Belum ada percakapan</p>
                  </div>
                ) : (
                  <div className="divide-y">
                    {filteredConversations.map(conv => (
                      <button
                        key={conv.project.id}
                        onClick={() => setSelectedProject(conv.project)}
                        className={`w-full p-4 text-left hover:bg-muted/50 transition-colors ${
                          selectedProject?.id === conv.project.id ? 'bg-muted' : ''
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <Building className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                              <span className="font-medium truncate">{conv.project.name}</span>
                            </div>
                            {conv.lastMessage && (
                              <p className="text-sm text-muted-foreground truncate mt-1">
                                {conv.lastMessage.message}
                              </p>
                            )}
                            <p className="text-xs text-muted-foreground mt-1">
                              <Clock className="w-3 h-3 inline mr-1" />
                              {formatRelativeTime(conv.lastMessage?.created_at || conv.project.created_at)}
                            </p>
                          </div>
                          {conv.unreadCount > 0 && (
                            <Badge variant="default" className="flex-shrink-0">
                              {conv.unreadCount}
                            </Badge>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Message Thread */}
          <div className="lg:col-span-2">
            <Card className="h-[600px] flex flex-col">
              {selectedProject ? (
                <>
                  <CardHeader className="border-b pb-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-lg">{selectedProject.name}</CardTitle>
                        <CardDescription>Percakapan dengan Tim SLF</CardDescription>
                      </div>
                      <Badge variant="outline">{selectedProject.status}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="flex-1 overflow-y-auto p-4 space-y-3">
                    {messages.length === 0 ? (
                      <div className="h-full flex items-center justify-center">
                        <div className="text-center">
                          <MessageCircle className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                          <p className="text-muted-foreground">Belum ada pesan</p>
                          <p className="text-sm text-muted-foreground">Mulai percakapan dengan mengirim pesan</p>
                        </div>
                      </div>
                    ) : (
                      messages.map(msg => (
                        <div
                          key={msg.id}
                          className={`flex ${msg.sender_id === user.id ? 'justify-end' : 'justify-start'}`}
                        >
                          <div
                            className={`max-w-[80%] rounded-lg p-3 ${
                              msg.sender_id === user.id
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-muted'
                            }`}
                          >
                            <p className="text-sm">{msg.message}</p>
                            <p className={`text-xs mt-1 ${
                              msg.sender_id === user.id ? 'text-primary-foreground/70' : 'text-muted-foreground'
                            }`}>
                              {msg.profiles?.full_name || 'Anda'} • {formatDateSafely(msg.created_at)}
                            </p>
                          </div>
                        </div>
                      ))
                    )}
                  </CardContent>
                  <div className="border-t p-4">
                    <div className="flex gap-2">
                      <Input
                        placeholder="Ketik pesan..."
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSendMessage();
                          }
                        }}
                        disabled={sending}
                      />
                      <Button onClick={handleSendMessage} disabled={sending || !newMessage.trim()}>
                        {sending ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Send className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="h-full flex items-center justify-center">
                  <div className="text-center">
                    <MessageCircle className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium mb-2">Pilih Percakapan</h3>
                    <p className="text-muted-foreground">
                      Pilih proyek dari daftar untuk melihat pesan
                    </p>
                  </div>
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
