import { NextResponse } from 'next/server';
import { Readable } from 'stream';
import { google } from 'googleapis';
import { getGlobalDriveClient } from '@/lib/driveAuth';

export async function POST(req: Request) {
  try {
    // Obtener cliente Drive global (cuenta institucional)
    let oauth2Client;
    try {
      oauth2Client = await getGlobalDriveClient();
    } catch (err: any) {
      if (err.message === 'DRIVE_NOT_CONFIGURED') {
        return NextResponse.json(
          { error: 'Drive no configurado. Conecta la cuenta institucional.' },
          { status: 401 }
        );
      }
      throw err;
    }

    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const stream = Readable.from(buffer);
    const drive = google.drive({ version: 'v3', auth: oauth2Client });

    const folderId = '1uNQ8FrVoOUuli4RyMR6kn019NFtFlddn'; // Tu carpeta institucional

    const response = await drive.files.create({
      requestBody: {
        name: `${Date.now()}_${file.name}`,
        parents: [folderId],
      },
      media: {
        mimeType: file.type,
        body: stream,
      },
    });

    const fileId = response.data.id;

    if (fileId) {
      await drive.permissions.create({
        fileId,
        requestBody: {
          role: 'reader',
          type: 'anyone',
        },
      });

      const imageUrl = `https://drive.google.com/uc?id=${fileId}`;

      return NextResponse.json({
        success: true,
        url: imageUrl,
        fileId: fileId,
      });
    }

    return NextResponse.json(
      { success: false, error: 'No se pudo obtener el ID del archivo' },
      { status: 500 }
    );
  } catch (error) {
    console.error('Error en upload:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Upload failed' },
      { status: 500 }
    );
  }
}