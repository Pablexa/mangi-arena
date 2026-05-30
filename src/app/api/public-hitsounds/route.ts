import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
  try {
    const hitsounds = await prisma.hitsound.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100
    });
    return NextResponse.json({ hitsounds });
  } catch (error) {
    console.error('[GET_HITSOUNDS]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { name, url, uploaderId, isPublic } = await req.json();

    if (!name || !url || !uploaderId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const hitsound = await prisma.hitsound.create({
      data: {
        name,
        url,
        uploaderId,
        isPublic: isPublic !== undefined ? isPublic : true
      }
    });

    return NextResponse.json({ success: true, hitsound });
  } catch (error) {
    console.error('[POST_HITSOUNDS]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
