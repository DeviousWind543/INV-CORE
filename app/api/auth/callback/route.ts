import { google } from 'googleapis';
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  
  if (!code) {
    console.error('❌ No se recibió código de autorización');
    return NextResponse.json({ error: 'No se recibió el código de autorización' }, { status: 400 });
  }

  try {
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_OAUTH_CLIENT_ID,
      process.env.GOOGLE_OAUTH_CLIENT_SECRET,
      process.env.GOOGLE_OAUTH_REDIRECT_URI
    );

    const { tokens } = await oauth2Client.getToken(code);
    
    console.log('🔑 Tokens recibidos de Google:');
    console.log('   access_token:', tokens.access_token ? '✅ Presente' : '❌ Faltante');
    console.log('   refresh_token:', tokens.refresh_token ? '✅ Presente' : '❌ Faltante');
    console.log('   expiry_date:', tokens.expiry_date ? new Date(tokens.expiry_date).toLocaleString() : 'Desconocida');
    
    // Guardar en cookies
    const response = NextResponse.redirect(new URL('/admin/dashboard', request.url));
    
    if (tokens.access_token) {
      response.cookies.set('google_access_token', tokens.access_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 60 * 60 * 24 * 30,
        path: '/',
      });
    }
    
    if (tokens.refresh_token) {
      response.cookies.set('google_refresh_token', tokens.refresh_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 60 * 60 * 24 * 365, // 1 año
        path: '/',
      });
    }

    // Guardar en base de datos
    const { error: upsertError } = await supabaseAdmin
      .from('drive_config')
      .upsert({
        id: 1,
        access_token: tokens.access_token!,
        refresh_token: tokens.refresh_token || '', // Guardar aunque sea null (se actualizará después)
        updated_at: new Date().toISOString(),
      });

    if (upsertError) {
      console.error('❌ Error guardando tokens en drive_config:', upsertError);
    } else {
      console.log('✅ Tokens guardados en drive_config correctamente');
    }

    return response;
  } catch (error) {
    console.error('❌ Error en callback:', error);
    return NextResponse.json({ 
      error: 'Falló la autenticación',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}