import { google } from 'googleapis';
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const userId = url.searchParams.get('state');

  if (!code) {
    console.error('❌ No code in callback');
    return NextResponse.redirect(new URL('/admin/dashboard?error=no_code', request.url));
  }

  try {
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_OAUTH_CLIENT_ID,
      process.env.GOOGLE_OAUTH_CLIENT_SECRET,
      process.env.GOOGLE_OAUTH_REDIRECT_URI
    );

    console.log('🔄 Obteniendo tokens de Google...');
    const { tokens } = await oauth2Client.getToken(code);
    
    console.log('📦 Tokens recibidos:', {
      has_access_token: !!tokens.access_token,
      has_refresh_token: !!tokens.refresh_token,
      expiry_date: tokens.expiry_date,
    });

    // 🔥 IMPORTANTE: Si no vino refresh_token, obtenerlo de un token existente
    let refreshToken = tokens.refresh_token;
    
    if (!refreshToken) {
      console.log('⚠️ No refresh_token en respuesta, verificando si ya existe en DB...');
      
      // Buscar si ya había un refresh_token guardado
      const { data: existingConfig } = await supabaseAdmin
        .from('drive_config')
        .select('refresh_token')
        .eq('id', 1)
        .single();
      
      if (existingConfig?.refresh_token) {
        console.log('✅ Usando refresh_token existente de la DB');
        refreshToken = existingConfig.refresh_token;
      } else {
        console.log('⚠️ No hay refresh_token existente. Se necesitará reconectar en el futuro.');
        // Nota: Google solo da refresh_token la primera vez que el usuario autoriza
        // Si el usuario ya había autorizado antes, no vendrá refresh_token
      }
    }

    // Guardar tokens en Supabase
    const { error: upsertError } = await supabaseAdmin
      .from('drive_config')
      .upsert({
        id: 1,
        access_token: tokens.access_token!,
        refresh_token: refreshToken, // Usar el refresh_token que tenemos (nuevo o existente)
        updated_at: new Date().toISOString(),
      });

    if (upsertError) {
      console.error('❌ Error guardando tokens:', upsertError);
      return NextResponse.redirect(new URL('/admin/dashboard?error=db_save', request.url));
    }

    // Verificar que se guardó correctamente
    const { data: savedConfig } = await supabaseAdmin
      .from('drive_config')
      .select('refresh_token')
      .eq('id', 1)
      .single();
    
    console.log('✅ Tokens guardados correctamente. Refresh token presente:', !!savedConfig?.refresh_token);
    
    return NextResponse.redirect(new URL('/admin/dashboard?drive=connected', request.url));
  } catch (error) {
    console.error('❌ Error en callback:', error);
    return NextResponse.redirect(new URL('/admin/dashboard?error=auth_failed', request.url));
  }
}