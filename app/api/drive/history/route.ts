import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function GET() {
  try {
    const { data: driveData, error: driveError } = await supabaseAdmin
      .from('drive_config')
      .select('access_token, refresh_token')
      .eq('id', 1)
      .single();

    if (driveError || !driveData?.access_token) {
      return NextResponse.json({ files: [] });
    }

    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_OAUTH_CLIENT_ID!,
      process.env.GOOGLE_OAUTH_CLIENT_SECRET!,
      process.env.GOOGLE_OAUTH_REDIRECT_URI!
    );

    oauth2Client.setCredentials({
      access_token: driveData.access_token,
      refresh_token: driveData.refresh_token,
    });

    // refrescar si es necesario
    try {
      await oauth2Client.getAccessToken();
    } catch (err) {
      if (driveData.refresh_token) {
        const { credentials } = await oauth2Client.refreshAccessToken();
        await supabaseAdmin.from('drive_config').upsert({
          id: 1,
          access_token: credentials.access_token!,
          refresh_token: credentials.refresh_token || driveData.refresh_token,
          updated_at: new Date().toISOString(),
        });
        oauth2Client.setCredentials(credentials);
      } else {
        return NextResponse.json({ files: [] });
      }
    }

    const drive = google.drive({ version: 'v3', auth: oauth2Client });
    const historyFolderId = process.env.DRIVE_HISTORY_FOLDER_ID || '1aUgKjH8Zb49hhM5zyR32_nNVjAJLtHSx';
    const response = await drive.files.list({
      q: `'${historyFolderId}' in parents and mimeType='application/pdf' and trashed=false`,
      fields: 'files(id, name, createdTime, webViewLink, webContentLink, size)',
      orderBy: 'createdTime desc',
      pageSize: 50,
    });

    const files = (response.data.files || []).map(file => ({
      id: file.id,
      name: file.name,
      createdTime: file.createdTime,
      webViewLink: file.webViewLink,
      webContentLink: file.webContentLink,
      size: file.size ? `${(parseInt(file.size) / 1024).toFixed(1)} KB` : 'Desconocido',
    }));

    return NextResponse.json({ files });
  } catch (error) {
    console.error('❌ Error en historial:', error);
    return NextResponse.json({ files: [] });
  }
}