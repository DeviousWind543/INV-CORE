import { google } from 'googleapis';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const userId = url.searchParams.get('userId');

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_OAUTH_CLIENT_ID,
    process.env.GOOGLE_OAUTH_CLIENT_SECRET,
    process.env.GOOGLE_OAUTH_REDIRECT_URI
  );

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',   // ← indispensable
    scope: ['https://www.googleapis.com/auth/drive.file'],
    prompt: 'consent',        // ← fuerza pantalla de consentimiento (para obtener refresh_token)
    state: userId || '',
  });

  return NextResponse.redirect(authUrl);
}