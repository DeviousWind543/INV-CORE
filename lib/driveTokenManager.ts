let refreshPromise: Promise<string> | null = null;

async function refreshAccessToken(): Promise<string> {
  const response = await fetch('/api/auth/drive/refresh', {
    method: 'POST',
  });
  
  if (!response.ok) {
    throw new Error('Failed to refresh token');
  }
  
  const data = await response.json();
  const newToken = data.access_token;
  
  // Guardar en localStorage
  localStorage.setItem('drive_access_token', newToken);
  localStorage.setItem('drive_token_expiry', (Date.now() + 55 * 60 * 1000).toString()); // 55 minutos
  
  return newToken;
}

export async function getValidAccessToken(): Promise<string | null> {
  let token = localStorage.getItem('drive_access_token');
  const tokenExpiry = localStorage.getItem('drive_token_expiry');
  const now = Date.now();
  
  // Si no hay token o expiró
  if (!token || !tokenExpiry || now > parseInt(tokenExpiry)) {
    if (!refreshPromise) {
      refreshPromise = refreshAccessToken().finally(() => {
        refreshPromise = null;
      });
    }
    token = await refreshPromise;
  }
  
  return token;
}

export function startAutoRefresh(intervalMinutes: number = 50) {
  console.log('🔄 Iniciando auto-refresh de token cada 50 minutos');
  
  const intervalId = setInterval(async () => {
    // Solo refrescar si la pestaña está visible
    if (document.visibilityState === 'visible') {
      try {
        const newToken = await refreshAccessToken();
        console.log('✅ Token de Drive renovado automáticamente');
        
        // Notificar al usuario (opcional)
        const event = new CustomEvent('drive-token-refreshed', {
          detail: { success: true }
        });
        window.dispatchEvent(event);
      } catch (error) {
        console.error('Auto-refresh falló:', error);
        const event = new CustomEvent('drive-token-refreshed', {
          detail: { success: false, error: 'Conexión con Drive expirada' }
        });
        window.dispatchEvent(event);
      }
    }
  }, intervalMinutes * 60 * 1000);
  
  return intervalId;
}