// FILE: src/utils/messageService.js
// Centralized message service untuk konsistensi komunikasi
// Menggunakan tabel 'messages' sebagai primary, dengan fallback ke 'notifications'

import { supabase } from './supabaseClient';

/**
 * Message types untuk kategorisasi
 */
export const MESSAGE_TYPES = {
  TEXT: 'text',
  SYSTEM: 'system',
  DOCUMENT: 'document',
  PAYMENT: 'payment',
};

/**
 * Notification types untuk komunikasi via notifications table
 */
export const NOTIFICATION_MESSAGE_TYPES = [
  'message_to_client',
  'message_from_client', 
  'message_to_admin',
  'message_from_admin',
  'project_update',
];

/**
 * Fetch messages untuk sebuah project
 * Mengambil dari tabel messages dan notifications sebagai fallback
 */
export const fetchProjectMessages = async (projectId, userId) => {
  if (!projectId) return { data: [], error: null };

  try {
    const allMessages = [];

    // 1. Fetch dari tabel messages (primary)
    const { data: messagesData, error: messagesError } = await supabase
      .from('messages')
      .select(`
        id,
        project_id,
        sender_id,
        recipient_id,
        message,
        message_type,
        read_at,
        created_at,
        profiles:sender_id(full_name, avatar_url)
      `)
      .eq('project_id', projectId)
      .order('created_at', { ascending: true });

    if (!messagesError && messagesData) {
      messagesData.forEach(msg => {
        allMessages.push({
          ...msg,
          source: 'messages',
          is_read: !!msg.read_at,
        });
      });
    }

    // 2. Fetch dari tabel notifications (fallback untuk pesan lama)
    const { data: notifsData, error: notifsError } = await supabase
      .from('notifications')
      .select('*')
      .eq('project_id', projectId)
      .in('type', NOTIFICATION_MESSAGE_TYPES)
      .order('created_at', { ascending: true });

    if (!notifsError && notifsData) {
      notifsData.forEach(notif => {
        // Hindari duplikasi jika sudah ada di messages
        const isDuplicate = allMessages.some(m => 
          m.message === notif.message && 
          m.sender_id === notif.sender_id &&
          Math.abs(new Date(m.created_at) - new Date(notif.created_at)) < 1000
        );

        if (!isDuplicate) {
          allMessages.push({
            id: `notif-${notif.id}`,
            project_id: notif.project_id,
            sender_id: notif.sender_id,
            recipient_id: notif.recipient_id,
            message: notif.message,
            message_type: 'text',
            read_at: notif.read ? notif.created_at : null,
            created_at: notif.created_at,
            source: 'notifications',
            is_read: notif.read,
          });
        }
      });
    }

    // Sort by created_at
    allMessages.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

    return { data: allMessages, error: null };
  } catch (err) {
    console.error('Error fetching project messages:', err);
    return { data: [], error: err };
  }
};

/**
 * Fetch conversations grouped by project
 * Returns list of conversations with last message and unread count
 */
export const fetchConversations = async (userId, projectIds = []) => {
  if (!userId || projectIds.length === 0) return { data: [], error: null };

  try {
    const conversationMap = {};

    // Initialize conversations for all projects
    projectIds.forEach(pid => {
      conversationMap[pid] = {
        project_id: pid,
        messages: [],
        lastMessage: null,
        unreadCount: 0,
      };
    });

    // Fetch from messages table
    const { data: messagesData } = await supabase
      .from('messages')
      .select('*')
      .in('project_id', projectIds)
      .order('created_at', { ascending: false });

    if (messagesData) {
      messagesData.forEach(msg => {
        if (conversationMap[msg.project_id]) {
          conversationMap[msg.project_id].messages.push(msg);
          if (!conversationMap[msg.project_id].lastMessage) {
            conversationMap[msg.project_id].lastMessage = msg;
          }
          if (!msg.read_at && msg.sender_id !== userId) {
            conversationMap[msg.project_id].unreadCount++;
          }
        }
      });
    }

    // Fetch from notifications table
    const { data: notifsData } = await supabase
      .from('notifications')
      .select('*')
      .in('project_id', projectIds)
      .in('type', NOTIFICATION_MESSAGE_TYPES)
      .order('created_at', { ascending: false });

    if (notifsData) {
      notifsData.forEach(notif => {
        if (conversationMap[notif.project_id]) {
          const msgObj = {
            id: `notif-${notif.id}`,
            project_id: notif.project_id,
            sender_id: notif.sender_id,
            recipient_id: notif.recipient_id,
            message: notif.message,
            created_at: notif.created_at,
            read_at: notif.read ? notif.created_at : null,
          };

          conversationMap[notif.project_id].messages.push(msgObj);
          
          // Update last message if newer
          if (!conversationMap[notif.project_id].lastMessage || 
              new Date(notif.created_at) > new Date(conversationMap[notif.project_id].lastMessage.created_at)) {
            conversationMap[notif.project_id].lastMessage = msgObj;
          }
          
          if (!notif.read && notif.recipient_id === userId) {
            conversationMap[notif.project_id].unreadCount++;
          }
        }
      });
    }

    const conversations = Object.values(conversationMap)
      .filter(conv => conv.messages.length > 0)
      .sort((a, b) => {
        const dateA = a.lastMessage?.created_at || 0;
        const dateB = b.lastMessage?.created_at || 0;
        return new Date(dateB) - new Date(dateA);
      });

    return { data: conversations, error: null };
  } catch (err) {
    console.error('Error fetching conversations:', err);
    return { data: [], error: err };
  }
};

/**
 * Send a message
 * Menyimpan ke tabel messages (primary)
 */
export const sendMessage = async ({
  projectId,
  senderId,
  recipientId = null,
  message,
  messageType = MESSAGE_TYPES.TEXT,
}) => {
  if (!projectId || !senderId || !message?.trim()) {
    return { data: null, error: new Error('Missing required fields') };
  }

  try {
    const { data, error } = await supabase
      .from('messages')
      .insert({
        project_id: projectId,
        sender_id: senderId,
        recipient_id: recipientId,
        message: message.trim(),
        message_type: messageType,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;

    // Optionally create notification for recipient
    if (recipientId) {
      await createMessageNotification({
        projectId,
        senderId,
        recipientId,
        message: message.trim(),
      });
    }

    return { data, error: null };
  } catch (err) {
    console.error('Error sending message:', err);
    return { data: null, error: err };
  }
};

/**
 * Create notification for message (used internally)
 */
const createMessageNotification = async ({ projectId, senderId, recipientId, message }) => {
  try {
    // Get sender info
    const { data: senderData } = await supabase
      .from('profiles')
      .select('full_name, role')
      .eq('id', senderId)
      .single();

    const senderName = senderData?.full_name || 'Someone';
    const isFromClient = senderData?.role === 'client';
    const notifType = isFromClient ? 'message_from_client' : 'message_to_client';

    await supabase.from('notifications').insert({
      project_id: projectId,
      type: notifType,
      message: `Pesan dari ${senderName}: ${message.substring(0, 100)}${message.length > 100 ? '...' : ''}`,
      sender_id: senderId,
      recipient_id: recipientId,
      read: false,
      created_at: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Error creating message notification:', err);
    // Don't throw - notification is optional
  }
};

/**
 * Mark messages as read
 */
export const markMessagesAsRead = async (messageIds, userId) => {
  if (!messageIds || messageIds.length === 0) return;

  try {
    // Filter out notification IDs (they start with 'notif-')
    const realMessageIds = messageIds.filter(id => !String(id).startsWith('notif-'));
    const notifIds = messageIds
      .filter(id => String(id).startsWith('notif-'))
      .map(id => id.replace('notif-', ''));

    // Mark messages as read
    if (realMessageIds.length > 0) {
      await supabase
        .from('messages')
        .update({ read_at: new Date().toISOString() })
        .in('id', realMessageIds)
        .neq('sender_id', userId);
    }

    // Mark notifications as read
    if (notifIds.length > 0) {
      await supabase
        .from('notifications')
        .update({ read: true })
        .in('id', notifIds)
        .eq('recipient_id', userId);
    }
  } catch (err) {
    console.error('Error marking messages as read:', err);
  }
};

/**
 * Get unread message count for user
 */
export const getUnreadCount = async (userId, projectIds = []) => {
  if (!userId) return 0;

  try {
    let count = 0;

    // Count from messages table
    const messagesQuery = supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .neq('sender_id', userId)
      .is('read_at', null);

    if (projectIds.length > 0) {
      messagesQuery.in('project_id', projectIds);
    }

    const { count: msgCount } = await messagesQuery;
    count += msgCount || 0;

    // Count from notifications table
    const notifsQuery = supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('recipient_id', userId)
      .eq('is_read', false)
      .in('type', NOTIFICATION_MESSAGE_TYPES);

    if (projectIds.length > 0) {
      notifsQuery.in('project_id', projectIds);
    }

    const { count: notifCount } = await notifsQuery;
    count += notifCount || 0;

    return count;
  } catch (err) {
    console.error('Error getting unread count:', err);
    return 0;
  }
};

export default {
  fetchProjectMessages,
  fetchConversations,
  sendMessage,
  markMessagesAsRead,
  getUnreadCount,
  MESSAGE_TYPES,
  NOTIFICATION_MESSAGE_TYPES,
};
