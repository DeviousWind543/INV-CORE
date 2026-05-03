'use client';

import { useEffect, useState, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import { connectDriveMobile, fetchWithDriveToken } from '@/lib/driveClient';
import { getValidAccessToken, startAutoRefresh } from '@/lib/capacitor/driveTokenManager';
import { Loader2, CheckCircle, AlertCircle, Link } from 'lucide-react';

export function DriveConnectionButton({ userId, onConnected }: { userId?: string; onConnected?: () => void }) {
  const [driveConnected, setDriveConnected] = useState(false);
  const [driveChecking, setDriveChecking] = useState(true);
  const isNative = Capacitor.isNativePlatform();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const checkDriveConnection = async () => {
    setDriveChecking(true);
    try {
      const token = await getValidAccessToken();
      setDriveConnected(!!token);
    } catch (error) {
      console.error('Error checking drive:', error);
      setDriveConnected(false);
    } finally {
      setDriveChecking(false);
    }
  };

  const connectToDrive = async () => {
    if (isNative) {
      await connectDriveMobile(userId);
    } else {
      window.location.href = userId 
        ? `/api/auth/drive?userId=${userId}`
        : '/api/auth/drive';
    }
  };

  useEffect(() => {
    checkDriveConnection();
    
    return () => {
      // Limpiar intervalo al desmontar
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, []);

  // Efecto separado para manejar el auto-refresh cuando cambia driveConnected
  useEffect(() => {
    if (driveConnected) {
      // Iniciar auto-refresh si está conectado
      const intervalId = startAutoRefresh((success, message) => {
        if (success) {
          setDriveConnected(true);
          if (onConnected) onConnected();
        } else {
          setDriveConnected(false);
        }
      }, 50);
      
      intervalRef.current = intervalId;
      
      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      };
    }
  }, [driveConnected, onConnected]);

  return (
    <button
      onClick={connectToDrive}
      disabled={driveChecking}
      className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
        driveChecking ? 'bg-gray-400 text-white cursor-wait' :
        driveConnected ? 'bg-green-100 text-green-700 border border-green-300' :
        'bg-red-500 text-white hover:bg-red-600'
      }`}
    >
      {driveChecking ? (
        <Loader2 size={14} className="animate-spin" />
      ) : driveConnected ? (
        <>
          <CheckCircle size={14} />
          {isNative ? 'Drive Conectado' : 'Activo'}
        </>
      ) : (
        <>
          <Link size={14} />
          Conectar Google Drive
        </>
      )}
    </button>
  );
}