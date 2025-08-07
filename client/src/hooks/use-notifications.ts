import { useEffect } from 'react';
import { usePermissions } from './use-permissions';
import type { MessageWithUser, User } from '@shared/schema';

export function useNotifications(currentUser?: User) {
  const { permissions, showNotification } = usePermissions();

  useEffect(() => {
    // Request notification permission when component mounts
    if ('Notification' in window && Notification.permission === 'default') {
      // Don't auto-request, let user choose via modal
    }
  }, []);

  const sendMessageNotification = (message: MessageWithUser) => {
    // Don't notify for own messages
    if (!currentUser || message.userId === currentUser.id) {
      return;
    }

    // Don't notify if user doesn't have permission
    if (permissions.notifications !== 'granted') {
      return;
    }

    // Don't notify if tab is focused
    if (!document.hidden) {
      return;
    }

    const title = `${message.user.username}`;
    const body = message.content || 
      (message.messageType === 'image' ? '🖼️ Resim gönderdi' : 
       message.messageType === 'file' ? '📁 Dosya gönderdi' :
       message.messageType === 'voice' ? '🎤 Sesli mesaj gönderdi' : 
       'Yeni mesaj');

    showNotification(title, {
      body,
      icon: message.user.profileImage || '/favicon.ico',
      tag: `message-${message.id}`,
      badge: '/favicon.ico',
      silent: false,
      requireInteraction: false,
      timestamp: Date.now()
    });
  };

  const sendSystemNotification = (title: string, body: string) => {
    if (permissions.notifications !== 'granted') {
      return;
    }

    showNotification(title, {
      body,
      icon: '/favicon.ico',
      tag: 'system',
      badge: '/favicon.ico',
      silent: false
    });
  };

  return {
    sendMessageNotification,
    sendSystemNotification,
    hasPermission: permissions.notifications === 'granted'
  };
}