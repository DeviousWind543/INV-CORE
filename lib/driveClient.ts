// Crea un helper en lib/driveClient.ts
async function fetchWithDriveToken(url: string, options: RequestInit = {}) {
  let accessToken = localStorage.getItem('drive_access_token');
  
  const makeRequest = async (token: string) => {
    return fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        'Authorization': `Bearer ${token}`,
      },
    });
  };

  let response = await makeRequest(accessToken || '');
  
  if (response.status === 401) {
    // Token expirado, refrescar
    const refreshRes = await fetch('/api/auth/drive/refresh', { method: 'POST' });
    
    if (refreshRes.ok) {
      const { access_token } = await refreshRes.json();
      localStorage.setItem('drive_access_token', access_token);
      response = await makeRequest(access_token);
    } else {
      // Redirigir a conectar Drive
      window.location.href = '/api/auth/drive';
      throw new Error('Sesión de Drive expirada');
    }
  }
  
  return response;
}