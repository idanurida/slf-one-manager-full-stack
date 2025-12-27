import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/utils/supabaseClient";
import { toast } from "sonner";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { MessageCircle, Mail, Phone, MessageSquare, HelpCircle } from "lucide-react";

export const ContactSupport = () => {
  const { user } = useAuth();
  const [contactDialogOpen, setContactDialogOpen] = useState(false);
  const [contactType, setContactType] = useState('general');
  const [contactMessage, setContactMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleContactSupport = async () => {
    if (!contactMessage.trim()) {
      toast.error('Harap isi pesan terlebih dahulu');
      return;
    }

    setSubmitting(true);

    try {
      // Create support request
      const { data, error } = await supabase
        .from('support_requests')
        .insert([
          {
            user_id: user.id,
            request_type: contactType,
            message: contactMessage.trim(),
            status: 'open',
            priority: contactType === 'technical' ? 'high' : 'normal'
          }
        ])
        .select()
        .single();

      if (error) {
        console.error('Error sending support request:', error);

        // Jika table support_requests tidak ada, buat notifikasi alternatif
        if (error.code === '42P01') {
          await createAlternativeSupportNotification();
        } else {
          throw error;
        }
      } else {
        // Create notification for admin_lead
        await createSupportNotification(data.id);
      }

      toast.success('Permintaan bantuan telah dikirim. Tim SLF akan menghubungi Anda dalam 1x24 jam.');
      setContactDialogOpen(false);
      setContactMessage('');
      setContactType('general');

    } catch (error) {
      console.error('Error sending support request:', error);
      toast.error('Gagal mengirim permintaan bantuan. Silakan coba lagi.');
    } finally {
      setSubmitting(false);
    }
  };

  // Alternative method jika table support_requests tidak ada
  const createAlternativeSupportNotification = async () => {
    try {
      // Get admin_lead users
      const { data: adminLeads, error: adminError } = await supabase
        .from('profiles')
        .select('id')
        .eq('role', 'admin_lead');

      if (adminError) throw adminError;

      if (adminLeads && adminLeads.length > 0) {
        const notifications = adminLeads.map(admin => ({
          project_id: null,
          type: 'support_request',
          message: `Support Request [${contactType}]: ${contactMessage.trim()}`,
          sender_id: user.id,
          recipient_id: admin.id,
          is_read: false,
          created_at: new Date().toISOString()
        }));

        const { error: notifError } = await supabase
          .from('notifications')
          .insert(notifications);

        if (notifError) throw notifError;
      }
    } catch (error) {
      console.error('Error creating alternative notification:', error);
      throw error;
    }
  };

  // Create notification for support request
  const createSupportNotification = async (supportRequestId) => {
    try {
      // Get admin_lead users
      const { data: adminLeads, error: adminError } = await supabase
        .from('profiles')
        .select('id')
        .eq('role', 'admin_lead');

      if (adminError) throw adminError;

      if (adminLeads && adminLeads.length > 0) {
        const notifications = adminLeads.map(admin => ({
          project_id: null,
          type: 'support_request',
          message: `Support Request #${supportRequestId} [${contactType}]: ${contactMessage.substring(0, 100)}...`,
          sender_id: user.id,
          recipient_id: admin.id,
          is_read: false,
          metadata: {
            support_request_id: supportRequestId,
            request_type: contactType
          },
          created_at: new Date().toISOString()
        }));

        const { error: notifError } = await supabase
          .from('notifications')
          .insert(notifications);

        if (notifError) throw notifError;
      }
    } catch (error) {
      console.error('Error creating support notification:', error);
      // Jangan throw error di sini, karena support request sudah berhasil dibuat
    }
  };

  const getRequestTypeLabel = (type) => {
    const types = {
      general: 'Pertanyaan Umum',
      technical: 'Bantuan Teknis',
      document: 'Konsultasi Dokumen',
      schedule: 'Jadwal & Timeline',
      other: 'Lainnya'
    };
    return types[type] || type;
  };

  return (
    <>
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-green-500" />
            Hubungi Tim SLF
          </CardTitle>
          <CardDescription>
            Butuh bantuan? Hubungi tim SLF untuk konsultasi dan dukungan teknis
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Button
              variant="outline"
              className="flex flex-col items-center justify-center h-20 p-2 hover:bg-blue-50 transition-colors"
              onClick={() => setContactDialogOpen(true)}
            >
              <MessageCircle className="w-6 h-6 mb-2 text-blue-500" />
              <span className="text-sm font-medium">Kirim Pesan</span>
              <span className="text-xs text-muted-foreground mt-1">Support Ticket</span>
            </Button>

            <Button
              variant="outline"
              className="flex flex-col items-center justify-center h-20 p-2 hover:bg-green-50 transition-colors"
              asChild
            >
              <a href="mailto:support@slf-system.com" className="text-center">
                <Mail className="w-6 h-6 mb-2 text-green-500" />
                <span className="text-sm font-medium">Email</span>
                <span className="text-xs text-muted-foreground mt-1">support@slf-system.com</span>
              </a>
            </Button>

            <Button
              variant="outline"
              className="flex flex-col items-center justify-center h-20 p-2 hover:bg-red-50 transition-colors"
              asChild
            >
              <a href="tel:+62215555555" className="text-center">
                <Phone className="w-6 h-6 mb-2 text-red-500" />
                <span className="text-sm font-medium">Telepon</span>
                <span className="text-xs text-muted-foreground mt-1">(021) 555-5555</span>
              </a>
            </Button>
          </div>

          {/* Additional Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <HelpCircle className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
              <div className="space-y-1">
                <p className="text-sm font-medium text-blue-900">Jam Operasional Support</p>
                <p className="text-xs text-blue-700">
                  Senin - Jumat: 08:00 - 17:00 WIB<br />
                  Sabtu: 08:00 - 12:00 WIB
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Contact Dialog */}
      <Dialog open={contactDialogOpen} onOpenChange={setContactDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-blue-500" />
              Kirim Pesan ke Tim SLF
            </DialogTitle>
            <DialogDescription>
              Jelaskan pertanyaan atau kendala yang Anda hadapi. Tim support akan merespons dalam 1x24 jam.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="contact-type" className="text-sm font-medium">
                Jenis Permintaan <span className="text-red-500">*</span>
              </Label>
              <Select value={contactType} onValueChange={setContactType}>
                <SelectTrigger id="contact-type">
                  <SelectValue placeholder="Pilih jenis permintaan" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">
                    <div className="flex items-center gap-2">
                      <MessageCircle className="w-4 h-4" />
                      Pertanyaan Umum
                    </div>
                  </SelectItem>
                  <SelectItem value="technical">
                    <div className="flex items-center gap-2">
                      <HelpCircle className="w-4 h-4" />
                      Bantuan Teknis
                    </div>
                  </SelectItem>
                  <SelectItem value="document">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="w-4 h-4" />
                      Konsultasi Dokumen
                    </div>
                  </SelectItem>
                  <SelectItem value="schedule">
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4" />
                      Jadwal & Timeline
                    </div>
                  </SelectItem>
                  <SelectItem value="other">
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4" />
                      Lainnya
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="contact-message" className="text-sm font-medium">
                Pesan Detail <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="contact-message"
                placeholder="Jelaskan secara detail pertanyaan atau kendala yang Anda hadapi. Semakin detail penjelasan Anda, semakin cepat kami dapat membantu..."
                value={contactMessage}
                onChange={(e) => setContactMessage(e.target.value)}
                rows={5}
                className="resize-none"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Minimal 10 karakter</span>
                <span>{contactMessage.length}/1000</span>
              </div>
            </div>

            {/* Selected Type Badge */}
            <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
              <Badge variant="outline" className="capitalize">
                {getRequestTypeLabel(contactType)}
              </Badge>
              <span className="text-sm text-muted-foreground">
                {contactType === 'technical' && 'Prioritas Tinggi - Respons Cepat'}
                {contactType === 'document' && 'Konsultasi Dokumen SLF'}
                {contactType === 'schedule' && 'Koordinasi Jadwal & Timeline'}
                {contactType === 'general' && 'Pertanyaan Umum & Informasi'}
                {contactType === 'other' && 'Permintaan Lainnya'}
              </span>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setContactDialogOpen(false);
                setContactMessage('');
                setContactType('general');
              }}
              disabled={submitting}
            >
              Batal
            </Button>
            <Button
              onClick={handleContactSupport}
              disabled={!contactMessage.trim() || contactMessage.length < 10 || submitting}
              className="min-w-24"
            >
              {submitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Mengirim...
                </>
              ) : (
                'Kirim Pesan'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
