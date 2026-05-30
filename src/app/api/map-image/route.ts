import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const map = searchParams.get('map');
  
  // Usar los mapas generados de alta calidad guardados en tu espacio de trabajo local
  let imagePath = '';
  
  if (map === 'arena') {
    imagePath = 'C:/Users/Administrator/.gemini/antigravity/brain/0e3f72ae-a30f-450a-80d5-47e1fd3534bf/map_arena_clasica_1780106939770.png';
  } else if (map === 'cyberpunk') {
    imagePath = 'C:/Users/Administrator/.gemini/antigravity/brain/0e3f72ae-a30f-450a-80d5-47e1fd3534bf/map_cyberpunk_city_1780106954802.png';
  } else if (map === 'lava') {
    imagePath = 'C:/Users/Administrator/.gemini/antigravity/brain/0e3f72ae-a30f-450a-80d5-47e1fd3534bf/map_lava_volcano_1780106968374.png';
  }

  try {
    if (imagePath && fs.existsSync(imagePath)) {
      const buffer = fs.readFileSync(imagePath);
      return new NextResponse(buffer, {
        headers: {
          'Content-Type': 'image/png',
          'Cache-Control': 'public, max-age=86400',
        },
      });
    } else {
      return new NextResponse('Not found', { status: 404 });
    }
  } catch (error) {
    return new NextResponse('Server Error', { status: 500 });
  }
}
