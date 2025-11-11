// FILE: client/src/components/schedules/ScheduleRequestForm.js
"use client";

import React, { useState } from 'react';
import { useToast } from '@/components/ui/use-toast'; // ✅ Gunakan useToast dari shadcn/ui

// shadcn/ui Components
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

// Lucide Icons
import { AlertTriangle, Loader2, X } from 'lucide-react';

// Other Imports
import { supabase } from '@/utils/supabaseClient';
import { getUserAndProfile } from '@/utils/auth';

const ScheduleRequestForm = ({ isOpen, onClose, projectId, onScheduleCreated }) => {
  const { toast } = useToast(); // ✅ Gunakan useToast dari shadcn/ui
  const [title, setTitle] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [notes, setNotes] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(''); // ✅ State untuk error spesifik form ini

  // ✅ Fungsi untuk mereset form ke nilai awal
  const resetForm = () => {
    setTitle('');
    setScheduledDate('');
    setNotes('');
    setError('');
    setIsLoading(false);
  };

  // ✅ Fungsi yang dipanggil saat modal ditutup
  const handleClose = () => {
    resetForm();
    onClose(); // ✅ Pastikan onClose dari props dipanggil
  };

  const onSubmit = async (e) => {
    e.preventDefault(); // ✅ Mencegah perilaku default form submission
    if (!projectId) {
      const errorMsg = 'ID Proyek tidak ditemukan.';
      setError(errorMsg);
      toast({
        title: 'Error',
        description: errorMsg,
        variant: "destructive", // ✅ Gunakan variant shadcn/ui
      });
      return;
    }

    if (!title.trim() || !scheduledDate) {
      const errorMsg = 'Harap isi Judul dan Tanggal/Jam.';
      setError(errorMsg);
      toast({
        title: 'Data tidak lengkap',
        description: errorMsg,
        variant: "destructive", // ✅ Gunakan variant shadcn/ui
      });
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // 1. Dapatkan user & profile yang terautentikasi
      const { user: authUser, profile } = await getUserAndProfile();
      if (!authUser || !profile) {
        throw new Error('Pengguna tidak terautentikasi.');
      }

      // 2. Siapkan data untuk dimasukkan ke tabel 'schedules'
      const newSchedule = {
        project_id: projectId,
        title: title.trim(),
        scheduled_date: scheduledDate, // Format datetime-local sudah sesuai dengan TIMESTAMPTZ Postgres
        notes: notes.trim() || null,
        status: 'requested', // Status awal permintaan
        requested_by: profile.id, // ID profil pengguna yang membuat permintaan
        // created_at akan diisi otomatis oleh Postgres jika ada DEFAULT now()
        // requester_name, requester_email, dll. bisa diisi oleh trigger atau diabaikan jika tidak diperlukan
      };

      // 3. Masukkan data ke tabel 'schedules' menggunakan Supabase client
      const { data, error: insertError } = await supabase
        .from('schedules')
        .insert([newSchedule])
        .select() // ✅ Mengambil data yang baru saja dimasukkan
        .single(); // ✅ Karena hanya satu baris yang dimasukkan, gunakan single()

      if (insertError) throw insertError;

      // 4. Tampilkan pesan sukses
      toast({
        title: 'Permintaan Jadwal Dikirim',
        description: 'Permintaan jadwal baru telah dikirim untuk persetujuan klien.',
        variant: "default", // ✅ Gunakan variant shadcn/ui
      });

      // 5. Reset form dan tutup modal
      resetForm();

      // 6. Panggil callback untuk memberi tahu komponen induk (misalnya, untuk me-refresh daftar)
      if (onScheduleCreated) {
        // Anda bisa memilih untuk meneruskan `data` (jadwal yang baru saja dibuat)
        // atau tidak, tergantung kebutuhan parent component.
        onScheduleCreated(data);
      }

      handleClose(); // ✅ Tutup modal setelah berhasil

    } catch (error) {
      console.error('[ScheduleRequestForm] Create schedule error:', error);
      const errorMsg = error.message || 'Gagal membuat permintaan jadwal.';
      setError(errorMsg);
      toast({
        title: 'Error',
        description: errorMsg,
        variant: "destructive", // ✅ Gunakan variant shadcn/ui
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) handleClose(); // ✅ Pastikan resetForm dipanggil saat dialog ditutup
    }}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Permintaan Jadwal Baru</DialogTitle>
          <DialogDescription>
            Isi detail permintaan jadwal Anda.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit}> {/* ✅ Bungkus dengan tag <form> dan gunakan onSubmit */}
          <div className="grid gap-4 py-4">
            {/* ✅ Tampilkan error spesifik untuk form ini jika ada */}
            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="title" className="text-right">
                Judul *
              </Label>
              <div className="col-span-3">
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Kick-off Meeting"
                  disabled={isLoading} // ✅ Gunakan disabled
                />
              </div>
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="scheduled-date" className="text-right">
                Tanggal dan Jam *
              </Label>
              <div className="col-span-3">
                <Input
                  id="scheduled-date"
                  type="datetime-local"
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                  disabled={isLoading} // ✅ Gunakan disabled
                />
              </div>
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="notes" className="text-right">
                Catatan
              </Label>
              <div className="col-span-3">
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g., Diskusikan jadwal proyek dan deliverables."
                  disabled={isLoading} // ✅ Gunakan disabled
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button" // ✅ Tipe button untuk tombol Batal
              variant="outline"
              onClick={handleClose} // ✅ Gunakan handleClose untuk reset dan tutup
              disabled={isLoading} // ✅ Gunakan disabled
            >
              Batal
            </Button>
            <Button
              type="submit" // ✅ Tipe submit untuk form
              disabled={isLoading} // ✅ Gunakan disabled
              className="flex items-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Mengirim...
                </>
              ) : (
                'Kirim Permintaan'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ScheduleRequestForm;