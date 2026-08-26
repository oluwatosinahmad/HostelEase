import { useState, useEffect, useCallback } from 'react';

export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState<boolean>(() => {
    return typeof navigator !== 'undefined' ? navigator.onLine : true;
  });
  const [showReconnectedAlert, setShowReconnectedAlert] = useState<boolean>(false);

  useEffect(() => {
    let timer: NodeJS.Timeout;

    const handleOnline = () => {
      setIsOnline(true);
      setShowReconnectedAlert(true);
      timer = setTimeout(() => {
        setShowReconnectedAlert(false);
      }, 3500);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowReconnectedAlert(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (timer) clearTimeout(timer);
    };
  }, []);

  const checkConnection = useCallback(async () => {
    try {
      const response = await fetch('/api/health', { method: 'HEAD', cache: 'no-store' });
      const online = response.ok;
      setIsOnline(online);
      return online;
    } catch {
      setIsOnline(false);
      return false;
    }
  }, []);

  return { isOnline, showReconnectedAlert, checkConnection };
}
