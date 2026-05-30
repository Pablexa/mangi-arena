import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(req: Request) {
  try {
    const { username, email, password } = await req.json();

    if (!username || !email || !password) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Check if user exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ email }, { username }]
      }
    });

    if (existingUser) {
      return NextResponse.json({ error: 'Username or email already taken' }, { status: 409 });
    }

    // Emula el guardado de contraseña de forma simple para este MVP 
    // (en producción usaríamos bcrypt o argon2id)
    const newUser = await prisma.user.create({
      data: {
        username,
        email,
        password, // Reminder: Hash this in production!
        coins: 1450, // Starter pack para testing
      }
    });

    return NextResponse.json({ 
      success: true, 
      user: { 
        id: newUser.id, 
        username: newUser.username, 
        level: newUser.level,
        coins: newUser.coins
      } 
    }, { status: 201 });
    
  } catch (error) {
    console.error('[API_REGISTER_ERROR]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
