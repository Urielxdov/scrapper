import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/shared/prisma';
import { makeMonitoringUseCases } from '@/lib/monitoring/infrastructure/container';
import { monitorLogger } from '@/lib/shared/logger';

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const monitor = await prisma.monitor.findUnique({ where: { id }, include: { target: true } });
  if (!monitor) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(monitor);
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const body = await req.json();
  const { update } = makeMonitoringUseCases();
  try {
    const monitor = await prisma.monitor.findUnique({ where: { id } });
    if (!monitor) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    const updated = await update.execute(id, monitor.userId, body);
    monitorLogger.info({ monitorId: id, changes: body }, 'monitor updated');
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const { delete: del } = makeMonitoringUseCases();
  try {
    const monitor = await prisma.monitor.findUnique({ where: { id } });
    if (!monitor) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    await del.execute(id, monitor.userId);
    monitorLogger.info({ monitorId: id }, 'monitor deleted');
    return new NextResponse(null, { status: 204 });
  } catch {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
}
