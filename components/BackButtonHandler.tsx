// components/BackButtonHandler.tsx
'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';

export default function BackButtonHandler() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Verificar si estamos en Capacitor (entorno móvil)
    const isNative = typeof window !== 'undefined' && 
                     (window as any).Capacitor?.isNativePlatform();

    if (!isNative) return;

    let backButtonListener: any = null;

    const setupBackButtonHandler = async () => {
      const { App } = await import('@capacitor/app');
      
      const handleBackButton = async () => {
        // Historial de navegación de Next.js
        if (window.history.length > 1) {
          // Ir a la página anterior dentro de la app
          router.back();
        } else {
          // Opcional: mostrar mensaje o salir de la app
          // await App.exitApp();
        }
      };
      
      backButtonListener = await App.addListener('backButton', handleBackButton);
    };

    setupBackButtonHandler();

    return () => {
      if (backButtonListener) {
        backButtonListener.remove();
      }
    };
  }, [router, pathname]);

  return null;
}