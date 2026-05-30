import { NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const type = formData.get('type') as string; // 'pfp' or 'hitsound'

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Save to public/uploads
    const uploadDir = join(process.cwd(), 'public/uploads', type);
    
    try {
      await mkdir(uploadDir, { recursive: true });
    } catch (e) {
      // Ignorar error si ya existe
    }

    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const filename = `${uniqueSuffix}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    const path = join(uploadDir, filename);

    await writeFile(path, buffer);

    // Retornar la URL pública
    const url = `/uploads/${type}/${filename}`;

    return NextResponse.json({ success: true, url });
  } catch (error) {
    console.error('[UPLOAD_ERROR]', error);
    return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 });
  }
}
