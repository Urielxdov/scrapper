import { NextRequest, NextResponse } from 'next/server';
import { makeAuthUseCases } from '@/lib/auth/infrastructure/container';
import { authLogger } from '@/lib/shared/logger';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { email, password } = body;

  if (!email || !password) {
    return NextResponse.json({ error: 'Email y contraseña requeridos' }, { status: 400 });
  }

  try {
    const { register } = makeAuthUseCases();
    const user = await register.execute({ email, password });
    authLogger.info({ userId: user.id, email: user.email }, 'user registered');
    return NextResponse.json({ id: user.id, email: user.email, role: user.role }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error desconocido';
    const status = message.includes('correo') ? 409 : 500;
    if (status === 500) authLogger.error({ email, err: message }, 'register failed');
    else authLogger.warn({ email }, 'register conflict: email in use');
    return NextResponse.json({ error: message }, { status });
  }
}
