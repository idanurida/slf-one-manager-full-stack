// src/components/comments/CommentSection.js
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/utils/supabaseClient';
import { getUserAndProfile } from '@/utils/auth';
import { useToast } from '@/components/ui/use-toast'; 

// =========================================================================
// INLINE UTILS (Menggantikan impor dari '@/lib/utils')
// Catatan: Ini adalah implementasi sederhana untuk menggabungkan kelas.
// Jika Anda membutuhkan fitur canggih seperti "tailwind-merge", Anda harus
// memindahkan implementasi penuh yang menggunakan 'clsx' dan 'tailwind-merge'
// ke path utilitas baru (misalnya '@/utils/cn.js') dan mengimpor dari sana.
// =========================================================================
const cn = (...inputs) => {
  // Implementasi sederhana untuk menggabungkan string kelas
  return inputs.filter(Boolean).join(' ');
};


// shadcn/ui Components
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'; 

// Icons from lucide-react
import { Loader2, AlertTriangle, Info, MessageSquare, RotateCw } from 'lucide-react';

const CommentSection = ({ projectId = null, inspectionId = null }) => {
  const { toast } = useToast();
  const [user, setUser] = useState(null);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [localError, setLocalError] = useState('');

  // Tentukan warna latar belakang komentar
  const commentBgClass = "bg-gray-50 dark:bg-gray-800/50";
  const cardBgClass = "bg-white dark:bg-gray-900";


  // Fungsi untuk memformat tanggal
  const formatCommentDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Fungsi untuk mendapatkan inisial
  const getInitials = (fullName) => {
    if (!fullName) return 'U';
    return fullName.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
  };


  // Fungsi untuk memuat komentar
  const loadComments = useCallback(async () => {
    if (!projectId && !inspectionId) {
      setLoading(false);
      setComments([]);
      return;
    }

    setLoading(true);
    setLocalError('');
    try {
      const { user: authUser, profile } = await getUserAndProfile();
      if (!authUser || !profile) {
        console.warn('[CommentSection] Pengguna tidak terautentikasi.');
        setComments([]);
        return;
      }
      setUser(profile);

      let query = supabase
        .from('comments')
        .select(`
          id,
          content,
          created_at,
          author_id,
          profiles!author_id(full_name, email, avatar_url)
        `)
        .order('created_at', { ascending: false });

      // Filter berdasarkan project_id atau inspection_id
      if (projectId) {
        query = query.eq('project_id', projectId);
      } else if (inspectionId) {
        query = query.eq('inspection_id', inspectionId);
      }

      const { data, error } = await query;

      if (error) throw error;
      setComments(data || []);
    } catch (err) {
      console.error('[CommentSection] Fetch comments error:', err);
      const errorMsg = err.message || 'Terjadi kesalahan saat mengambil data komentar.';
      setLocalError(errorMsg);
      toast({
        title: 'Gagal memuat komentar.',
        description: errorMsg,
        variant: 'destructive',
      });
      setComments([]);
    } finally {
      setLoading(false);
    }
  }, [projectId, inspectionId, toast]); 

  useEffect(() => {
    loadComments();
  }, [loadComments]);

  const handlePostComment = async () => {
    if (!user) {
      toast({
        title: 'Autentikasi Diperlukan',
        description: 'Silakan login untuk menulis komentar.',
        variant: 'warning',
      });
      return;
    }

    if (!newComment.trim()) {
      toast({
        title: 'Komentar kosong',
        description: 'Silakan tulis komentar terlebih dahulu.',
        variant: 'warning',
      });
      return;
    }

    if (!projectId && !inspectionId) {
      toast({
        title: 'Konteks Tidak Ditemukan',
        description: 'Tidak dapat memposting komentar tanpa konteks proyek atau inspeksi.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setPosting(true);
      setLocalError('');

      const newCommentData = {
        content: newComment.trim(),
        author_id: user.id,
        ...(projectId && { project_id: projectId }),
        ...(inspectionId && { inspection_id: inspectionId }),
      };

      const { error } = await supabase.from('comments').insert([newCommentData]);

      if (error) throw error;

      setNewComment('');
      toast({
        title: 'Komentar berhasil diposting!',
        variant: 'default',
      });

      // Refresh komentar setelah berhasil memposting
      await loadComments();

    } catch (err) {
      console.error('[CommentSection] Post comment error:', err);
      const errorMsg = err.message || 'Terjadi kesalahan saat memposting komentar.';
      setLocalError(errorMsg);
      toast({
        title: 'Gagal memposting komentar.',
        description: errorMsg,
        variant: 'destructive',
      });
    } finally {
      setPosting(false);
    }
  };

  // Tampilkan loading state
  if (loading) {
    return (
      <div className="flex justify-center items-center p-10">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  // Tampilkan error spesifik komponen
  if (localError && !loading) {
    return (
      <Alert variant="destructive" className="border-red-500">
        <AlertTriangle className="h-4 w-4" />
        <div className="flex-1">
          <AlertTitle>Gagal Memuat Komentar</AlertTitle>
          <AlertDescription>
            {localError}
            <Button
              size="sm"
              variant="outline"
              className="mt-2 text-red-600 border-red-300 hover:bg-red-50"
              onClick={loadComments}
            >
              <RotateCw className="h-3 w-3 mr-2" />
              Coba Lagi
            </Button>
          </AlertDescription>
        </div>
      </Alert>
    );
  }

  // Jika tidak ada konteks
  if (!projectId && !inspectionId) {
    return (
      <Alert variant="default" className="border-blue-500 bg-blue-50/50 text-blue-800">
        <Info className="h-4 w-4" />
        <AlertTitle>Area Komentar</AlertTitle>
        <AlertDescription>
          Komentar akan muncul setelah konteks proyek atau inspeksi dipilih.
        </AlertDescription>
      </Alert>
    );
  }


  return (
    <div className="flex flex-col space-y-4">
      <h2 className="text-lg font-semibold text-blue-600 flex items-center gap-2">
        <MessageSquare className="h-5 w-5" />
        Diskusi & Komentar
      </h2>

      {comments.length > 0 ? (
        <div className="flex flex-col space-y-4">
          {comments.map((comment) => (
            <Card key={comment.id} className={cn("p-4 border", commentBgClass)}>
              <div className="flex space-x-3 items-start">
                <Avatar className="h-8 w-8">
                  {/* Avatar Image dari Supabase Storage */}
                  <AvatarImage 
                    src={comment.profiles?.avatar_url 
                      ? supabase.storage.from('avatars').getPublicUrl(comment.profiles.avatar_url).data?.publicUrl 
                      : undefined
                    }
                    alt={comment.profiles?.full_name || 'User'}
                  />
                  {/* Avatar Fallback (Inisial) */}
                  <AvatarFallback className="bg-blue-100 text-blue-600 text-sm font-medium">
                    {getInitials(comment.profiles?.full_name || comment.profiles?.email)}
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex flex-col space-y-1 flex-1">
                  <div className="flex justify-between items-center flex-wrap">
                    <p className="font-bold text-sm text-gray-800 dark:text-gray-100">
                      {comment.profiles?.full_name || comment.profiles?.email || 'User'}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {formatCommentDate(comment.created_at)}
                    </p>
                  </div>
                  <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                    {comment.content}
                  </p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Alert variant="default" className="border-gray-300 bg-gray-50/50 text-gray-700">
          <Info className="h-4 w-4" />
          <div className="flex flex-col">
            <AlertTitle>Belum ada komentar</AlertTitle>
            <AlertDescription>
              Jadilah yang pertama menulis komentar di sini.
            </AlertDescription>
          </div>
        </Alert>
      )}

      {/* Formulir Komentar */}
      <Card className={cn("mt-4 p-4 border", commentBgClass)}>
        <CardContent className="p-0">
          <Textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Tulis komentar..."
            className="mb-3 resize-none min-h-[80px]"
            disabled={posting || !user}
          />
          <div className="flex justify-end">
            <Button
              onClick={handlePostComment}
              disabled={!newComment.trim() || posting || !user}
              className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2"
              size="sm"
            >
              {posting && <Loader2 className="h-4 w-4 animate-spin" />}
              Posting Komentar
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CommentSection;
