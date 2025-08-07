import { useState, useEffect } from 'react';

interface PermissionState {
  notifications: NotificationPermission | null;
  storage: boolean;
}

export function usePermissions() {
  const [permissions, setPermissions] = useState<PermissionState>({
    notifications: null,
    storage: false
  });

  useEffect(() => {
    // Check existing permissions
    checkPermissions();
  }, []);

  const checkPermissions = async () => {
    // Check notification permission
    const notificationPermission = 'Notification' in window ? Notification.permission : 'denied';
    
    // Check storage permission (for PWA)
    const storagePermission = 'storage' in navigator && 'persist' in navigator.storage;

    setPermissions({
      notifications: notificationPermission as NotificationPermission,
      storage: storagePermission
    });
  };

  const requestNotificationPermission = async () => {
    if (!('Notification' in window)) {
      console.log('Bu tarayıcı bildirim desteklemiyor');
      return false;
    }

    try {
      const permission = await Notification.requestPermission();
      setPermissions(prev => ({
        ...prev,
        notifications: permission as NotificationPermission
      }));
      return permission === 'granted';
    } catch (error) {
      console.error('Bildirim izni istenemedi:', error);
      return false;
    }
  };

  const requestStoragePermission = async () => {
    if (!('storage' in navigator && 'persist' in navigator.storage)) {
      console.log('Bu tarayıcı kalıcı depolama desteklemiyor');
      return false;
    }

    try {
      const granted = await navigator.storage.persist();
      setPermissions(prev => ({
        ...prev,
        storage: granted
      }));
      return granted;
    } catch (error) {
      console.error('Depolama izni istenemedi:', error);
      return false;
    }
  };

  const requestAllPermissions = async () => {
    const notificationGranted = await requestNotificationPermission();
    const storageGranted = await requestStoragePermission();
    
    return {
      notifications: notificationGranted,
      storage: storageGranted
    };
  };

  const showNotification = (title: string, options?: NotificationOptions) => {
    if (permissions.notifications === 'granted') {
      return new Notification(title, {
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        ...options
      });
    }
    return null;
  };

  return {
    permissions,
    requestNotificationPermission,
    requestStoragePermission, 
    requestAllPermissions,
    showNotification,
    checkPermissions
  };
}