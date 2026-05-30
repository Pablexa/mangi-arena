import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(req: Request) {
  try {
    const { userId, coins, items, equippedColor, equippedItems, profilePicture, hitsoundUrl } = await req.json();

    if (!userId) {
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
    }

    // Actualiza datos básicos en la base de datos
    const updateData: any = { coins };
    if (profilePicture !== undefined) updateData.profilePicture = profilePicture;
    if (hitsoundUrl !== undefined) updateData.hitsoundUrl = hitsoundUrl;

    await prisma.user.update({
      where: { id: userId },
      data: updateData
    });

    // Guardar inventario real en la DB
    if (items && Array.isArray(items)) {
      for (const itemId of items) {
        const existingItem = await prisma.item.findFirst({
          where: { userId, name: itemId.toString(), type: 'PURCHASE' }
        });

        if (!existingItem) {
          await prisma.item.create({
            data: {
              name: itemId.toString(), 
              type: 'PURCHASE',
              userId: userId
            }
          });
        }
      }
    }

    // Guardar el color equipado como un Item especial
    if (equippedColor) {
      const existingColor = await prisma.item.findFirst({
        where: { userId, type: 'EQUIPPED_COLOR' }
      });

      if (existingColor) {
        await prisma.item.update({
          where: { id: existingColor.id },
          data: { name: equippedColor }
        });
      } else {
        await prisma.item.create({
          data: {
            name: equippedColor,
            type: 'EQUIPPED_COLOR',
            userId: userId
          }
        });
      }
    }
    
    // Guardar los items equipados
    if (equippedItems && typeof equippedItems === 'object') {
      for (const [category, itemId] of Object.entries(equippedItems)) {
        const typeStr = `EQUIPPED_${category.toUpperCase()}`;
        const existingEq = await prisma.item.findFirst({
          where: { userId, type: typeStr }
        });

        if (existingEq) {
          await prisma.item.update({
            where: { id: existingEq.id },
            data: { name: String(itemId) }
          });
        } else {
          await prisma.item.create({
            data: {
              name: String(itemId),
              type: typeStr,
              userId: userId
            }
          });
        }
      }
    }

    return NextResponse.json({ success: true });
    
  } catch (error) {
    console.error('[API_SYNC_ERROR]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
