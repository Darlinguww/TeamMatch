import { useCallback, useEffect, useState } from 'react';
import { getStoredToken } from './apiClient';
import { notificationsApi } from './projectApi';

export function useUnreadNotifications() {
  const [unreadCount, setUnreadCount] = useState(0);

  const refresh = useCallback(async () => {
    if (!getStoredToken()) {
      setUnreadCount(0);
      return;
    }
    try {
      const { notifications } = await notificationsApi.list();
      setUnreadCount((notifications ?? []).filter((n) => !n.read).length);
    } catch {
      setUnreadCount(0);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const onChanged = () => void refresh();
    window.addEventListener('teammatch:notifications-changed', onChanged);
    return () => window.removeEventListener('teammatch:notifications-changed', onChanged);
  }, [refresh]);

  return { unreadCount, refresh };
}
