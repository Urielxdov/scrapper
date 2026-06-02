import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/infrastructure/adapters/auth';
import { makeMonitoringUseCases } from '@/lib/monitoring/infrastructure/container';
import { monitorLogger } from '@/lib/shared/logger';

export async function GET() {
  const session = await auth();
  const userId = session!.user!.id!;
  const { list } = makeMonitoringUseCases();
  const monitors = await list.execute(userId);
  monitorLogger.debug({ userId, count: monitors.length }, 'monitors listed');
  return NextResponse.json(monitors);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  const userId = session!.user!.id!;
  const body = await req.json();
  const { url, selectors, frequencyMinutes, name } = body;

  if (!url || !selectors || !frequencyMinutes) {
    return NextResponse.json({ error: 'url, selectors and frequencyMinutes required' }, { status: 400 });
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
