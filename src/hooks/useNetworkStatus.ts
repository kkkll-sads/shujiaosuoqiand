import { useCallback, useEffect, useState } from 'react';

const getIsOffline = () => (typeof navigator !== 'undefined' ? !navigator.onLine : false);

export const useNetworkStatus = () => {
  const [isOffline, setIsOffline] = useState(getIsOffline);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const refreshStatus = useCallback(() => {
    setIsOffline(getIsOffline());
  }, []);

  return {
    isOffline,
    refreshStatus,
  };
};
