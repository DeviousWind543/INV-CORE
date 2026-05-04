// hooks/useCameraPermissions.ts
import { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { Camera } from '@capacitor/camera';

export const useCameraPermissions = () => {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const checkPermissions = async () => {
    if (!Capacitor.isNativePlatform()) {
      setHasPermission(true);
      setIsLoading(false);
      return true;
    }

    try {
      const status = await Camera.checkPermissions();
      
      if (status.camera === 'granted') {
        setHasPermission(true);
        setIsLoading(false);
        return true;
      } else {
        // Solicitar permisos
        const request = await Camera.requestPermissions();
        const granted = request.camera === 'granted';
        setHasPermission(granted);
        setIsLoading(false);
        return granted;
      }
    } catch (error) {
      console.error('Error checking camera permissions:', error);
      setHasPermission(false);
      setIsLoading(false);
      return false;
    }
  };

  const requestPermissions = async () => {
    setIsLoading(true);
    const granted = await checkPermissions();
    setIsLoading(false);
    return granted;
  };

  useEffect(() => {
    checkPermissions();
  }, []);

  return { hasPermission, isLoading, requestPermissions };
};