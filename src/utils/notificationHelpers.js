// FILE: src/utils/notificationHelpers.js
import { supabase } from './supabaseClient';

/**
 * Membuat notifikasi baru
 */
export const createNotification = async ({
  recipient_id,
  type,
  message,
  related_id = null,
  related_type = null,
  actor_id = null
}) => {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .insert({
        recipient_id,
        type,
        message,
        related_id,
        related_type,
        actor_id,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('Create notification error:', error);
    return { success: false, error };
  }
};

/**
 * Buat notifikasi untuk berbagai kejadian
 */
export const createDocumentApprovalNotification = async (documentId, drafterId, projectLeadId) => {
  return await createNotification({
    recipient_id: projectLeadId,
    type: 'document_approval',
    message: 'Dokumen baru memerlukan approval',
    related_id: documentId,
    related_type: 'document',
    actor_id: drafterId
  });
};

export const createTaskAssignmentNotification = async (taskId, assigneeId, assignerId) => {
  return await createNotification({
    recipient_id: assigneeId,
    type: 'task_assigned',
    message: 'Anda mendapatkan task baru',
    related_id: taskId,
    related_type: 'task',
    actor_id: assignerId
  });
};

export const createProjectAssignmentNotification = async (projectId, drafterId, projectLeadId) => {
  return await createNotification({
    recipient_id: drafterId,
    type: 'project_assigned',
    message: 'Anda ditugaskan ke proyek baru',
    related_id: projectId,
    related_type: 'project',
    actor_id: projectLeadId
  });
};

/**
 * Tandai notifikasi sebagai dibaca
 */
export const markNotificationAsRead = async (notificationId) => {
  try {
    const { error } = await supabase
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('id', notificationId);

    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Mark as read error:', error);
    return { success: false, error };
  }
};
