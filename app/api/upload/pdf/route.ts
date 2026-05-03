import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { Readable } from 'stream';

export async function POST(req: Request) {
  try {
    // 1. Obtener tokens desde Supabase
    const { data: driveData, error: driveError } = await supabaseAdmin
      .from('drive_config')
      .select('access_token, refresh_token')
      .eq('id', 1)
      .single();

    if (driveError || !driveData?.access_token) {
      console.error('❌ No hay tokens de Drive configurados');
      return NextResponse.json(
        { error: 'Drive no configurado. Conecta la cuenta institucional.' },
        { status: 401 }
      );
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

    // 2. Listener para renovación automática de tokens
    oauth2Client.on('tokens', async (tokens) => {
      if (tokens.refresh_token) {
        console.log('🔄 Nuevo refresh_token recibido. Actualizando DB...');
        await supabaseAdmin.from('drive_config').upsert({
          id: 1,
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          updated_at: new Date().toISOString(),
        });
      } else if (tokens.access_token) {
        console.log('🔄 Access_token renovado automáticamente. Actualizando DB...');
        await supabaseAdmin.from('drive_config')
          .update({
            access_token: tokens.access_token,
            updated_at: new Date().toISOString(),
          })
          .eq('id', 1);
      }
    });

    // 3. Forzar una comprobación inicial
    try {
      await oauth2Client.getAccessToken();
    } catch (err: any) {
      console.error('❌ Error al obtener token de acceso:', err.message);
      await supabaseAdmin.from('drive_config').delete().eq('id', 1);
      return NextResponse.json(
        { error: 'La conexión con Drive expiró definitivamente. Reconecta la cuenta.' },
        { status: 401 }
      );
    }

    // 4. Recibir el archivo
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const fileName = formData.get('fileName') as string;

    if (!file) {
      return NextResponse.json({ error: 'No se recibió archivo' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const stream = Readable.from(buffer);
    const drive = google.drive({ version: 'v3', auth: oauth2Client });
    
    const historyFolderId = process.env.DRIVE_HISTORY_FOLDER_ID;
    if (!historyFolderId) {
      return NextResponse.json(
        { error: 'No se ha configurado la carpeta de destino en el servidor.' },
        { status: 500 }
      );
    }

    console.log(`📄 Subiendo a carpeta ID: ${historyFolderId} - Archivo: ${fileName} (${(file.size / 1024).toFixed(1)} KB)`);

    // 5. LA PARTE IMPORTANTE: Subir el archivo con supportsAllDrives: true
    const response = await drive.files.create({
      requestBody: {
        name: fileName,
        parents: [historyFolderId],
        mimeType: 'application/pdf',
      },
      media: {
        mimeType: 'application/pdf',
        body: stream,
      },
      supportsAllDrives: true, // AÑADIDO: Necesario para trabajar con Unidades Compartidas
    });

    const fileId = response.data.id;
    if (fileId) {
      // Hacer público el archivo
      await drive.permissions.create({
        fileId,
        requestBody: { role: 'reader', type: 'anyone' },
        supportsAllDrives: true, // También necesario aquí
      });
    }

    console.log(`✅ PDF guardado en Drive: ${fileId}`);
    return NextResponse.json({
      success: true,
      fileId,
      webViewLink: `https://drive.google.com/file/d/${fileId}/view`,
      webContentLink: `https://drive.google.com/uc?export=download&id=${fileId}`,
    });
  } catch (error: any) {
    console.error('❌ Error en /api/upload/pdf:', error);
    const errorMessage = error.message?.includes('invalid_grant')
      ? 'La sesión de Google Drive ha caducado. Vuelve a conectar la cuenta.'
      : error.message || 'Error interno al subir el PDF';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}