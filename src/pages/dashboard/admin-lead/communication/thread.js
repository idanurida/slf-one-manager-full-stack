// FILE: src/pages/dashboard/admin-lead/communication/thread.js
import React, { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/router";
import { toast } from "sonner";

// Components
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";

// Icons
import { Send, ArrowLeft } from "lucide-react";

// Layout & Utils
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { supabase } from "@/utils/supabaseClient";
import { useAuth } from "@/context/AuthContext";
import { fetchProjectMessages, sendMessage as sendMessageService } from "@/utils/messageService";

// Message Bubble Component - Minimalis
const MessageBubble = ({ message, isOwn, senderName, timestamp }) => {
  const time = new Date(timestamp).toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });

  return (
    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-4 animate-in fade-in`}>
      <div className={`max-w-[80%] px-4 py-3 rounded-lg ${isOwn
        ? 'bg-blue-500 text-white'
        : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100'
        }`}>
        <p className="text-sm break-words whitespace-pre-wrap">{message}</p>
        <div className="flex justify-between items-center mt-2 text-xs opacity-70">
          <span>{isOwn ? 'Anda' : senderName}</span>
          <span>{time}</span>
        </div>
      </div>
    </div>
  );
};

// Main Component - FOKUS KOMUNIKASI SAJA
export default function CommunicationThreadPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { project: projectId } = router.query;

  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef(null);

  // Scroll ke pesan terbaru
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Fetch messages - OPTIMIZED
  const fetchMessages = useCallback(async () => {
    if (!projectId || !user?.id) return;

    try {
      const { data, error } = await fetchProjectMessages(projectId, user.id);

      if (error) throw error;

      setMessages((data || []).map(msg => ({
        id: msg.id,
        message: msg.message,
        created_at: msg.created_at,
        sender_id: msg.sender_id,
        sender_name: msg.profiles?.full_name || 'Unknown'
      })));

    } catch (err) {
      console.error('Error fetching messages:', err);
      toast.error('Gagal memuat pesan');
    }
  }, [projectId, user?.id]);

  // Initial load
  useEffect(() => {
    if (projectId && user) {
      setLoading(true);
      fetchMessages().finally(() => {
        setLoading(false);
        setTimeout(scrollToBottom, 100);
      });
    }
  }, [projectId, user, fetchMessages]);

  // Auto scroll saat ada pesan baru
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Send message
  const sendMessage = async (messageText) => {
    if (!projectId || !user?.id || !messageText.trim()) return;

    try {
      const { data, error } = await sendMessageService({
        projectId,
        senderId: user.id,
        message: messageText.trim()
      });

      if (error) throw error;
      return { success: true, data };

    } catch (err) {
      console.error('Error sending message:', err);
      throw err;
    }
  };

  const handleSendMessage = async () => {
    const messageText = newMessage.trim();
    if (!messageText || sending) return;

    setSending(true);
    try {
      // Optimistic update
      const tempMessage = {
        id: `temp-${Date.now()}`,
        message: messageText,
        created_at: new Date().toISOString(),
        sender_id: user.id,
        sender_name: 'Anda'
      };

      setMessages(prev => [...prev, tempMessage]);
      setNewMessage('');
      scrollToBottom();

      // Kirim ke server
      const result = await sendMessage(messageText);

      if (result.success) {
        // Replace temporary message with real one
        setMessages(prev => prev.map(msg =>
          msg.id === tempMessage.id
            ? {
              ...msg,
              id: result.data.id,
              sender_name: 'Anda'
            }
            : msg
        ));
      } else {
        // Jika gagal, hapus temporary message
        setMessages(prev => prev.filter(msg => msg.id !== tempMessage.id));
        toast.error('Gagal mengirim pesan');
      }

    } catch (err) {
      // Jika error, hapus temporary message
      setMessages(prev => prev.filter(msg => !msg.id.startsWith('temp-')));
      toast.error('Gagal mengirim pesan');
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Loading state
  if (loading) {
    return (
      <DashboardLayout title="Percakapan">
        <div className="flex flex-col h-[calc(100vh-4rem)] max-w-3xl mx-auto p-4">
          {/* Header skeleton */}
          <div className="flex items-center gap-3 mb-6">
            <Skeleton className="h-8 w-8 rounded-full" />
            <Skeleton className="h-4 w-40" />
          </div>

          {/* Messages skeleton */}
          <div className="flex-1 overflow-hidden space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex gap-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-12 w-full" />
                </div>
              </div>
            ))}
          </div>

          {/* Input skeleton */}
          <div className="pt-4">
            <Skeleton className="h-20 w-full" />
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Percakapan">
      <div className="flex flex-col h-[calc(100vh-4rem)] max-w-3xl mx-auto">
        {/* Simple header - hanya back button */}
        <div className="flex items-center gap-3 p-4 border-b">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push('/dashboard/admin-lead/communication')}
            className="h-8 w-8"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="font-medium">Percakapan Proyek</h1>
            <p className="text-sm text-gray-500">
              {messages.length} pesan
            </p>
          </div>
        </div>

        {/* Messages container */}
        <div className="flex-1 overflow-y-auto p-4">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-500">
              <div className="text-center space-y-2">
                <p className="text-lg font-medium">Belum ada percakapan</p>
                <p className="text-sm">Mulai percakapan dengan menulis pesan di bawah</p>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {messages.map((msg) => (
                <MessageBubble
                  key={msg.id}
                  message={msg.message}
                  isOwn={msg.sender_id === user?.id}
                  senderName={msg.sender_name}
                  timestamp={msg.created_at}
                />
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Message input - tetap di bawah */}
        <div className="border-t p-4">
          <div className="flex gap-2">
            <Textarea
              placeholder="Ketik pesan..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              className="flex-1 min-h-[60px] resize-none"
              disabled={sending}
              rows={2}
            />
            <Button
              onClick={handleSendMessage}
              disabled={!newMessage.trim() || sending}
              className="h-auto px-4 self-end"
              size="lg"
            >
              {sending ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
          <p className="text-xs text-gray-500 mt-2 text-center">
            Tekan Enter untuk mengirim, Shift+Enter untuk baris baru
          </p>
        </div>
      </div>
    </DashboardLayout>
  );
}
