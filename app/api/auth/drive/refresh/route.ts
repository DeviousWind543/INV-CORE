import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin'; // ← Usar supabaseAdmin, no supabase
import { google } from 'googleapis';

export async function POST() {
  try {
    console.log('🔄 Refrescando token de Drive...');
    
    // Usar supabaseAdmin para evitar problemas de RLS
    const { data, error } = await supabaseAdmin
      .from('drive_config')
      .select('refresh_token, access_token')
      .eq('id', 1)
      .single();

    if (error) {
      console.error('❌ Error consultando DB:', error);
      return NextResponse.json({ 
        error: 'Error al consultar configuración',
        details: error.message
      }, { status: 500 });
    }

    if (!data?.refresh_token) {
      console.error('❌ No refresh_token en la respuesta');
      return NextResponse.json({ 
        error: 'No hay refresh token, reconecta Google Drive'
      }, { status: 401 });
    }

    console.log('✅ Refresh token encontrado (primeros 20 chars):', data.refresh_token.substring(0, 20));

    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_OAUTH_CLIENT_ID,
      process.env.GOOGLE_OAUTH_CLIENT_SECRET,
      process.env.GOOGLE_OAUTH_REDIRECT_URI
    );
    
    oauth2Client.setCredentials({ 
      refresh_token: data.refresh_token 
    });
    
    console.log('🔄 Llamando a Google para refrescar...');
    const { credentials } = await oauth2Client.refreshAccessToken();
    
    if (!credentials.access_token) {
      throw new Error('No se obtuvo access_token de Google');
    }

    console.log('✅ Nuevo access_token obtenido');

    // Actualizar solo el access_token
    const { error: updateError } = await supabaseAdmin
      .from('drive_config')
      .update({
        access_token: credentials.access_token,
        updated_at: new Date().toISOString(),
      })
      .eq('id', 1);

    if (updateError) {
      console.error('❌ Error actualizando token:', updateError);
    }

    return NextResponse.json({ 
      success: true,
      access_token: credentials.access_token,
      expires_in: credentials.expiry_date
    });
    
  } catch (error) {
    console.error('❌ Error en refresh:', error);
    return NextResponse.json({ 
      error: 'Failed to refresh token',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}