// lib/driveClient.ts
import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';
import { getValidAccessToken } from './capacitor/driveTokenManager';

export async function fetchWithDriveToken(url: string, options: RequestInit = {}) {
  let accessToken = await getValidAccessToken();
  
  if (!accessToken) {
    throw new Error('No hay token de Drive válido');
  }
  
  const makeRequest = async (token: string) => {
    return fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        'Authorization': `Bearer ${token}`,
      },
    });
  };

  let response = await makeRequest(accessToken);
  
  if (response.status === 401) {
    console.log('Token inválido, refrescando...');
    
    if (Capacitor.isNativePlatform()) {
      await Preferences.remove({ key: 'drive_access_token' });
      await Preferences.remove({ key: 'drive_token_expiry' });
    } else {
      localStorage.removeItem('drive_access_token');
      localStorage.removeItem('drive_token_expiry');
    }
    
    accessToken = await getValidAccessToken();
    
    if (accessToken) {
      response = await makeRequest(accessToken);
    } else {
      throw new Error('No se pudo renovar el token de Drive');
    }
  }
  
  return response;
}

// Función simplificada sin el listener problemático
export async function connectDriveMobile(userId?: string) {
  if (typeof window === 'undefined') return;
  
  if (!Capacitor.isNativePlatform()) {
    window.location.href = userId 
      ? `/api/auth/drive?userId=${userId}`
      : '/api/auth/drive';
    return;
  }

  const { Browser } = await import('@capacitor/browser');
  const authUrl = userId
    ? `${window.location.origin}/api/auth/drive?userId=${userId}`
    : `${window.location.origin}/api/auth/drive`;

  await Browser.open({ 
    url: authUrl,
    presentationStyle: 'popover'
  });
  
  // Nota: El usuario tendrá que volver manualmente a la app
}

export function isNativePlatform(): boolean {
  return typeof window !== 'undefined' && Capacitor.isNativePlatform();
}