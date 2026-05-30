import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
  try {
    // Actualiza a TODOS los usuarios sumándoles 10,000 monedas
    const result = await prisma.user.updateMany({
      data: {
        coins: {
          increment: 10000
        }
      }
    });

    return NextResponse.json({ 
      success: true, 
      message: `Se entregaron 10,000 monedas a ${result.count} cuentas exitosamente.` 
    });
    
  } catch (error) {
    console.error('[ADMIN_UPDATE_ERROR]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
