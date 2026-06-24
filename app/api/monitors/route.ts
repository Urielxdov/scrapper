import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/shared/prisma';
import { makeMonitoringUseCases } from '@/lib/monitoring/infrastructure/container';
import { monitorLogger } from '@/lib/shared/logger';

export async function GET() {
  const monitors = await prisma.monitor.findMany({
    include: { target: true },
    orderBy: { createdAt: 'desc' },
  });
  return NextResponse.json(monitors);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { url, selectors, frequencyMinutes, name, userId } = body;

  if (!url || !selectors || !frequencyMinutes || !userId) {
    return NextResponse.json({ error: 'url, selectors, frequencyMinutes and userId required' }, { status: 400 });
  }

  try {
    const { create } = makeMonitoringUseCases();
    const monitor = await create.execute({ userId, url, selectors, frequencyMinutes, name });
    monitorLogger.info({ userId, monitorId: monitor.id, url, frequencyMinutes }, 'monitor created');
    return NextResponse.json(monitor, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error';
    const status = message === 'Monitor already exists' ? 409 : 500;
    if (status === 500) monitorLogger.error({ userId, url, err: message }, 'monitor creation failed');
    return NextResponse.json({ error: message }, { status });
  }
}
