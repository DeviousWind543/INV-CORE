// lib/capacitor/driveTokenManager.native.ts
import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences'; // ✅ Cambiado de @capacitor/storage

let refreshPromise: Promise<string> | null = null;

async function getNativeStorage(key: string): Promise<string | null> {
  if (typeof window === 'undefined') return null; // SSR check
  
  if (Capacitor.isNativePlatform()) {
    const { value } = await Preferences.get({ key });
    return value;
  }
  return localStorage.getItem(key);
}

async function setNativeStorage(key: string, value: string): Promise<void> {
  if (typeof window === 'undefined') return; // SSR check
  
  if (Capacitor.isNativePlatform()) {
    await Preferences.set({ key, value });
  } else {
    localStorage.setItem(key, value);
  }
}

async function refreshAccessToken(): Promise<string> {
  console.log('🔄 Refrescando token de Drive...');
  
  try {
    const response = await fetch('/api/auth/drive/refresh', {
      method: 'POST',
    });
    
    if (!response.ok) {
      throw new Error('Failed to refresh token');
    }
    
    const data = await response.json();
    const newToken = data.access_token;
    
    if (!newToken) {
      throw new Error('No access_token in response');
    }
    
    await setNativeStorage('drive_access_token', newToken);
    await setNativeStorage('drive_token_expiry', (Date.now() + 55 * 60 * 1000).toString());
    
    console.log('✅ Token refrescado exitosamente');
    return newToken;
  } catch (error) {
    console.error('Error refreshing token:', error);
    throw error;
  }
}

export async function getValidAccessToken(): Promise<string | null> {
  if (typeof window === 'undefined') return null; // SSR check
  
  const isNative = Capacitor.isNativePlatform();
  
  let token: string | null = null;
  let tokenExpiry: string | null = null;
  
  if (isNative) {
    token = await getNativeStorage('drive_access_token');
    tokenExpiry = await getNativeStorage('drive_token_expiry');
  } else {
    token = localStorage.getItem('drive_access_token');
    tokenExpiry = localStorage.getItem('drive_token_expiry');
  }
  
  const now = Date.now();
  
  if (!token || !tokenExpiry || now > parseInt(tokenExpiry)) {
    console.log('Token no encontrado o expirado, refrescando...');
    
    if (!refreshPromise) {
      refreshPromise = refreshAccessToken().finally(() => {
        refreshPromise = null;
      });
    }
    
    try {
      token = await refreshPromise;
    } catch (error) {
      console.error('Error obteniendo token:', error);
      return null;
    }
  }
  
  return token;
}

export function startAutoRefresh(
  callback?: (success: boolean, message?: string) => void, 
  intervalMinutes: number = 50
): NodeJS.Timeout | null {
  if (typeof window === 'undefined') return null; // SSR check
  
  console.log('🔄 Iniciando auto-refresh de token cada', intervalMinutes, 'minutos');
  
  const intervalId = setInterval(async () => {
    const isActive = Capacitor.isNativePlatform() ? true : document.visibilityState === 'visible';
    
    if (isActive) {
      try {
        const newToken = await refreshAccessToken();
        console.log('✅ Token de Drive renovado automáticamente');
        
        if (callback) callback(true, 'Conexión con Drive renovada automáticamente');
        
        if (typeof window !== 'undefined') {
          const event = new CustomEvent('drive-token-refreshed', {
            detail: { success: true, message: 'Conexión con Drive renovada' }
          });
          window.dispatchEvent(event);
        }
      } catch (error) {
        console.error('Auto-refresh falló:', error);
        if (callback) callback(false, 'Conexión con Drive expirada, reconecta manualmente');
        
        if (typeof window !== 'undefined') {
          const event = new CustomEvent('drive-token-refreshed', {
            detail: { success: false, message: 'Conexión con Drive expirada' }
          });
          window.dispatchEvent(event);
        }
      }
    }
  }, intervalMinutes * 60 * 1000);
  
  return intervalId;
}

export async function clearDriveTokens(): Promise<void> {
  if (typeof window === 'undefined') return;
  
  if (Capacitor.isNativePlatform()) {
    await Preferences.remove({ key: 'drive_access_token' });
    await Preferences.remove({ key: 'drive_token_expiry' });
  } else {
    localStorage.removeItem('drive_access_token');
    localStorage.removeItem('drive_token_expiry');
  }
  
  refreshPromise = null;
  console.log('🗑️ Tokens de Drive eliminados');
}