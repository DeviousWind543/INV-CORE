// components/BackButtonHandlerWithConfirm.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';

export default function BackButtonHandlerWithConfirm() {
  const router = useRouter();
  const pathname = usePathname();
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  useEffect(() => {
    const isNative = typeof window !== 'undefined' && 
                     (window as any).Capacitor?.isNativePlatform();

    if (!isNative) return;

    let backButtonListener: any = null;

    const setupBackButtonHandler = async () => {
      const { App } = await import('@capacitor/app');
      
      const handleBackButton = async () => {
        // Si hay historial, navegar hacia atrás
        if (window.history.length > 1) {
          router.back();
        } else {
          // Mostrar modal de confirmación antes de salir
          setShowExitConfirm(true);
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

  // Modal de confirmación
  if (!showExitConfirm) return null;

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl p-6 max-w-sm mx-4">
        <h3 className="text-lg font-bold text-[#2D1B69] mb-2">Salir de la app</h3>
        <p className="text-slate-600 mb-6">¿Estás seguro que deseas salir?</p>
        <div className="flex justify-end gap-3">
          <button
            onClick={async () => {
              setShowExitConfirm(false);
              const { App } = await import('@capacitor/app');
              // No hacer nada, cancelar salida
            }}
            className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold"
          >
            Cancelar
          </button>
          <button
            onClick={async () => {
              const { App } = await import('@capacitor/app');
              await App.exitApp();
            }}
            className="px-4 py-2 rounded-xl bg-red-600 text-white font-bold"
          >
            Salir
          </button>
        </div>
      </div>
    </div>
  );
}