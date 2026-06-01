import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/infrastructure/adapters/authjs.config';
import { makeMonitoringUseCases } from '@/lib/monitoring/infrastructure/container';

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const session = await auth();
  const { id } = await params;
  const { get } = makeMonitoringUseCases();
  try {
    const monitor = await get.execute(id, session!.user!.id!);
    return NextResponse.json(monitor);
  } catch {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await auth();
  const { id } = await params;
  const body = await req.json();
  const { update } = makeMonitoringUseCases();
  try {
    const monitor = await update.execute(id, session!.user!.id!, body);
    return NextResponse.json(monitor);
  } catch {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await auth();
  const { id } = await params;
  const { delete: del } = makeMonitoringUseCases();
  try {
    await del.execute(id, session!.user!.id!);
    return new NextResponse(null, { status: 204 });
  } catch {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
}
