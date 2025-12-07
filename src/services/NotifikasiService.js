// FILE: src/services/NotifikasiService.js
import { supabase } from '@/utils/supabaseClient';

/**
 * NotifikasiService - Service untuk mengelola notifikasi
 * Digunakan untuk mengirim notifikasi ke berbagai role (client, admin_team, admin_lead)
 */
class NotifikasiService {
  /**
   * Kirim notifikasi saat dokumen diupload oleh client
   * @param {string} proyekId - ID proyek
   * @param {string} dokumenId - ID dokumen
   * @param {string} userId - ID user yang upload
   * @param {string} namaDocument - Nama dokumen yang diupload
   */
  static async kirimNotifikasiDokumenDiupload(proyekId, dokumenId, userId, namaDocument = 'Dokumen') {
    try {
      // Get admin_team users for this project
      const { data: adminTeams, error: teamError } = await supabase
        .from('profiles')
        .select('id')
        .eq('role', 'admin_team');

      if (teamError) throw teamError;

      // Create notifications for all admin_team members
      const notifications = (adminTeams || []).map(admin => ({
        type: 'document_uploaded',
        message: `${namaDocument} telah diupload oleh client untuk proyek`,
        project_id: proyekId,
        sender_id: userId,
        recipient_id: admin.id,
        read: false,
        data: {
          document_id: dokumenId,
          action_required: true,
          target_url: `/dashboard/admin-team/documents?project=${proyekId}`
        }
      }));

      if (notifications.length > 0) {
        const { error } = await supabase
          .from('notifications')
          .insert(notifications);

        if (error) throw error;
      }

      return { success: true };
    } catch (error) {
      console.error('Error sending document upload notification:', error);
      return { success: false, error };
    }
  }

  /**
   * Kirim notifikasi saat dokumen diverifikasi/ditolak
   * @param {string} proyekId - ID proyek
   * @param {string} dokumenId - ID dokumen
   * @param {string} status - Status verifikasi (verified/rejected)
   * @param {string} adminId - ID admin yang verifikasi
   * @param {string} clientId - ID client pemilik proyek
   * @param {string} catatan - Catatan revisi (optional)
   */
  static async kirimNotifikasiDokumenDiverifikasi(proyekId, dokumenId, status, adminId, clientId, catatan = '') {
    try {
      const isVerified = status === 'verified';
      
      // Notify client
      const clientNotification = {
        type: isVerified ? 'document_verified' : 'document_rejected',
        message: isVerified 
          ? 'Dokumen Anda telah diverifikasi' 
          : `Dokumen Anda perlu direvisi: ${catatan}`,
        project_id: proyekId,
        sender_id: adminId,
        recipient_id: clientId,
        read: false,
        data: {
          document_id: dokumenId,
          status: status,
          action_required: !isVerified,
          revision_notes: catatan,
          target_url: `/dashboard/client/projects/${proyekId}/upload`
        }
      };

      const { error: clientError } = await supabase
        .from('notifications')
        .insert(clientNotification);

      if (clientError) throw clientError;

      // Check if all documents are verified
      if (isVerified) {
        const allVerified = await this.cekSemuaDokumenTerverifikasi(proyekId);
        
        if (allVerified) {
          await this.kirimNotifikasiKeAdminLead(proyekId, adminId);
        }
      }

      return { success: true };
    } catch (error) {
      console.error('Error sending document verification notification:', error);
      return { success: false, error };
    }
  }

  /**
   * Kirim notifikasi ke Admin Lead ketika semua dokumen terverifikasi
   */
  static async kirimNotifikasiKeAdminLead(proyekId, senderId) {
    try {
      const { data: adminLeads, error: leadError } = await supabase
        .from('profiles')
        .select('id')
        .eq('role', 'admin_lead');

      if (leadError) throw leadError;

      const notifications = (adminLeads || []).map(admin => ({
        type: 'project_ready_approval',
        message: 'Semua dokumen proyek sudah diverifikasi, menunggu approval',
        project_id: proyekId,
        sender_id: senderId,
        recipient_id: admin.id,
        read: false,
        data: {
          action_required: true,
          target_url: `/dashboard/admin-lead/projects/${proyekId}`
        }
      }));

      if (notifications.length > 0) {
        const { error } = await supabase
          .from('notifications')
          .insert(notifications);

        if (error) throw error;
      }

      return { success: true };
    } catch (error) {
      console.error('Error sending admin lead notification:', error);
      return { success: false, error };
    }
  }

  /**
   * Kirim notifikasi saat proyek disetujui oleh Admin Lead
   */
  static async kirimNotifikasiProyekDisetujui(proyekId, adminLeadId, clientId) {
    try {
      // Notify client
      const clientNotification = {
        type: 'project_approved',
        message: 'Selamat! Semua dokumen proyek Anda telah disetujui',
        project_id: proyekId,
        sender_id: adminLeadId,
        recipient_id: clientId,
        read: false,
        data: {
          status: 'approved',
          target_url: `/dashboard/client/projects/${proyekId}`
        }
      };

      await supabase.from('notifications').insert(clientNotification);

      // Notify admin_team
      const { data: adminTeams } = await supabase
        .from('profiles')
        .select('id')
        .eq('role', 'admin_team');

      const teamNotifications = (adminTeams || []).map(admin => ({
        type: 'project_approved',
        message: 'Proyek telah disetujui oleh Admin Lead',
        project_id: proyekId,
        sender_id: adminLeadId,
        recipient_id: admin.id,
        read: false,
        data: {
          status: 'approved'
        }
      }));

      if (teamNotifications.length > 0) {
        await supabase.from('notifications').insert(teamNotifications);
      }

      return { success: true };
    } catch (error) {
      console.error('Error sending project approval notification:', error);
      return { success: false, error };
    }
  }

  /**
   * Cek apakah semua dokumen wajib sudah diverifikasi
   */
  static async cekSemuaDokumenTerverifikasi(proyekId) {
    try {
      // Get all required documents for this project
      const { data: documents, error } = await supabase
        .from('project_documents')
        .select('id, status, template:template_id(required)')
        .eq('project_id', proyekId);

      if (error) throw error;

      // Check if all required documents are verified
      const requiredDocs = (documents || []).filter(d => d.template?.required);
      const allVerified = requiredDocs.every(d => d.status === 'verified');

      return allVerified && requiredDocs.length > 0;
    } catch (error) {
      console.error('Error checking document verification:', error);
      return false;
    }
  }

  /**
   * Kirim notifikasi revisi diminta
   */
  static async kirimNotifikasiRevisi(proyekId, dokumenId, clientId, senderId, catatan) {
    try {
      const notification = {
        type: 'revision_requested',
        message: `Revisi diminta: ${catatan}`,
        project_id: proyekId,
        sender_id: senderId,
        recipient_id: clientId,
        read: false,
        data: {
          document_id: dokumenId,
          action_required: true,
          revision_notes: catatan,
          target_url: `/dashboard/client/projects/${proyekId}/upload`
        }
      };

      const { error } = await supabase
        .from('notifications')
        .insert(notification);

      if (error) throw error;

      return { success: true };
    } catch (error) {
      console.error('Error sending revision notification:', error);
      return { success: false, error };
    }
  }
}

export default NotifikasiService;