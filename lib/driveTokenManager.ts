// lib/capacitor/driveTokenManager.native.ts (para móvil)
import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences'; // ✅ Cambiado de Storage a Preferences

let refreshPromise: Promise<string> | null = null;

// Usar Preferences nativo en lugar de Storage
async function getNativeStorage(key: string): Promise<string | null> {
  const { value } = await Preferences.get({ key });
  return value;
}

async function setNativeStorage(key: string, value: string): Promise<void> {
  await Preferences.set({ key, value });
}

// Función de refresh adaptada para móvil
async function refreshAccessToken(): Promise<string> {
  console.log('🔄 Refrescando token de Drive en móvil...');
  
  try {
    const response = await fetch('/api/auth/drive/refresh', {
      method: 'POST',
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Failed to refresh token');
    }
    
    const data = await response.json();
    const newToken = data.access_token;
    
    if (!newToken) {
      throw new Error('No access_token in response');
    }
    
    // Guardar usando Preferences nativo
    await setNativeStorage('drive_access_token', newToken);
    await setNativeStorage('drive_token_expiry', (Date.now() + 55 * 60 * 1000).toString());
    
    console.log('✅ Token refrescado exitosamente en móvil');
    return newToken;
  } catch (error) {
    console.error('Error refreshing token:', error);
    throw error;
  }
}

// Versión unificada que funciona en web y móvil
export async function getValidAccessToken(): Promise<string | null> {
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
  
  // Si no hay token o expiró
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
      // Si falla el refresh, redirigir a reconectar
      if (isNative) {
        // En móvil, abrir navegador para reconectar
        const { Browser } = await import('@capacitor/browser');
        await Browser.open({ url: `${window.location.origin}/api/auth/drive` });
      } else {
        window.location.href = '/api/auth/drive';
      }
      return null;
    }
  }
  
  return token;
}

// Auto-refresh adaptado para móvil
export function startAutoRefresh(
  callback?: (success: boolean, message?: string) => void, 
  intervalMinutes: number = 50
): NodeJS.Timeout {
  console.log('🔄 Iniciando auto-refresh de token cada', intervalMinutes, 'minutos');
  
  const intervalId = setInterval(async () => {
    // Solo refrescar si la app está activa
    const isActive = Capacitor.isNativePlatform() ? true : document.visibilityState === 'visible';
    
    if (isActive) {
      try {
        const newToken = await refreshAccessToken();
        console.log('✅ Token de Drive renovado automáticamente');
        
        if (callback) callback(true, 'Conexión con Drive renovada automáticamente');
        
        const event = new CustomEvent('drive-token-refreshed', {
          detail: { success: true, message: 'Conexión con Drive renovada' }
        });
        window.dispatchEvent(event);
      } catch (error) {
        console.error('Auto-refresh falló:', error);
        if (callback) callback(false, 'Conexión con Drive expirada, reconecta manualmente');
        
        const event = new CustomEvent('drive-token-refreshed', {
          detail: { success: false, message: 'Conexión con Drive expirada' }
        });
        window.dispatchEvent(event);
      }
    }
  }, intervalMinutes * 60 * 1000);
  
  return intervalId;
}

// Función para limpiar tokens
export async function clearDriveTokens(): Promise<void> {
  const isNative = Capacitor.isNativePlatform();
  
  if (isNative) {
    await Preferences.remove({ key: 'drive_access_token' });
    await Preferences.remove({ key: 'drive_token_expiry' });
  } else {
    localStorage.removeItem('drive_access_token');
    localStorage.removeItem('drive_token_expiry');
  }
  
  refreshPromise = null;
  console.log('🗑️ Tokens de Drive eliminados');
}