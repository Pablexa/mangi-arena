import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Missing credentials' }, { status: 400 });
    }

    const user = await prisma.user.findFirst({
      where: {
        OR: [{ email }, { username: email }]
      },
      include: {
        inventory: true
      }
    });

    if (!user || user.password !== password) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const purchasedItems = user.inventory.filter(item => item.type === 'PURCHASE').map(item => parseInt(item.name));
    const equippedColorItem = user.inventory.find(item => item.type === 'EQUIPPED_COLOR');
    const equippedColor = equippedColorItem ? equippedColorItem.name : '#ffffff';

    const equippedItems: Record<string, number> = {};
    user.inventory.filter(item => item.type.startsWith('EQUIPPED_') && item.type !== 'EQUIPPED_COLOR').forEach(item => {
      const cat = item.type.replace('EQUIPPED_', '').toLowerCase();
      // Capitalize first letter to match frontend (Trails, Explosions, etc.)
      const category = cat.charAt(0).toUpperCase() + cat.slice(1);
      equippedItems[category] = parseInt(item.name);
    });

    // Retorna los datos del usuario. En produccion usariamos JWT o cookies de sesion segura.
    return NextResponse.json({ 
      success: true, 
      user: { 
        id: user.id, 
        username: user.username, 
        level: user.level,
        coins: user.coins,
        xp: user.xp,
        inventory: purchasedItems,
        equippedColor: equippedColor,
        equippedItems: equippedItems
      } 
    });
    
  } catch (error) {
    console.error('[API_LOGIN_ERROR]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
