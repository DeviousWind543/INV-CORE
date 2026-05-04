// components/BackButtonHandlerAdvanced.tsx
'use client';

import { useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';

export default function BackButtonHandlerAdvanced() {
  const router = useRouter();
  const pathname = usePathname();
  const historyRef = useRef<string[]>([]);
  const isNative = typeof window !== 'undefined' && 
                   (window as any).Capacitor?.isNativePlatform();

  // Guardar historial de rutas
  useEffect(() => {
    if (isNative) {
      historyRef.current = [...historyRef.current, pathname];
      // Limitar historial a 50 entradas
      if (historyRef.current.length > 50) {
        historyRef.current = historyRef.current.slice(-50);
      }
    }
  }, [pathname, isNative]);

  useEffect(() => {
    if (!isNative) return;

    let backButtonListener: any = null;

    const setupBackButtonHandler = async () => {
      const { App } = await import('@capacitor/app');
      
      const handleBackButton = async () => {
        // Verificar si hay historial personalizado
        if (historyRef.current.length > 1) {
          // Remover la ruta actual del historial
          historyRef.current.pop();
          // Obtener la ruta anterior
          const previousPath = historyRef.current[historyRef.current.length - 1];
          
          // Navegar a la ruta anterior
          if (previousPath !== pathname) {
            router.push(previousPath);
          } else {
            router.back();
          }
        } else if (window.history.length > 1) {
          // Usar historial del navegador
          router.back();
        }
        // Si no hay historial, no hacer nada (no salir de la app)
      };
      
      backButtonListener = await App.addListener('backButton', handleBackButton);
    };

    setupBackButtonHandler();

    return () => {
      if (backButtonListener) {
        backButtonListener.remove();
      }
    };
  }, [router, pathname, isNative]);

  return null;
}