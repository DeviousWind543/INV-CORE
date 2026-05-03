import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { google } from 'googleapis';

export async function POST() {
  try {
    const { data } = await supabase
      .from('drive_config')
      .select('refresh_token, access_token')
      .eq('id', 1)
      .single();

    if (!data?.refresh_token) {
      return NextResponse.json({ 
        error: 'No hay refresh token, reconecta Google Drive' 
      }, { status: 401 });
    }

    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_OAUTH_CLIENT_ID,
      process.env.GOOGLE_OAUTH_CLIENT_SECRET,
      process.env.GOOGLE_OAUTH_REDIRECT_URI
    );
    
    oauth2Client.setCredentials({ refresh_token: data.refresh_token });
    const { credentials } = await oauth2Client.refreshAccessToken();

    // Actualizar solo el access_token (el refresh_token no cambia normalmente)
    await supabase
      .from('drive_config')
      .update({
        access_token: credentials.access_token,
        updated_at: new Date().toISOString(),
      })
      .eq('id', 1);

    // 🔥 Devolver el nuevo token al cliente
    return NextResponse.json({ 
      success: true,
      access_token: credentials.access_token,
      expires_in: credentials.expiry_date
    });
  } catch (error) {
    console.error('Error refreshing token:', error);
    return NextResponse.json({ error: 'Failed to refresh token' }, { status: 500 });
  }
}