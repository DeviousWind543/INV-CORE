import { google } from 'googleapis';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function getGlobalDriveClient() {
  const { data, error } = await supabaseAdmin
    .from('drive_config')
    .select('access_token, refresh_token')
    .eq('id', 1)
    .maybeSingle();

  if (error || !data) {
    throw new Error('DRIVE_NOT_CONFIGURED');
  }

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_OAUTH_CLIENT_ID!,
    process.env.GOOGLE_OAUTH_CLIENT_SECRET!,
    process.env.GOOGLE_OAUTH_REDIRECT_URI!
  );

  oauth2Client.setCredentials({
    access_token: data.access_token,
    refresh_token: data.refresh_token,
  });

  try {
    const tokenResponse = await oauth2Client.getAccessToken();

    if (tokenResponse?.token) {
      await supabaseAdmin.from('drive_config').upsert({
        id: 1,
        access_token: tokenResponse.token,
        refresh_token: data.refresh_token,
        updated_at: new Date().toISOString(),
      });
    }
  } catch (err) {
    console.error('Error refreshing token:', err);
    throw new Error('DRIVE_REAUTH_REQUIRED');
  }

  return oauth2Client;
}