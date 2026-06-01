import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/infrastructure/adapters/authjs.config';
import { makeMonitoringUseCases } from '@/lib/monitoring/infrastructure/container';

export async function GET() {
  const session = await auth();
  const { list } = makeMonitoringUseCases();
  const monitors = await list.execute(session!.user!.id!);
  return NextResponse.json(monitors);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  const body = await req.json();
  const { url, selectors, frequencyMinutes, name } = body;

  if (!url || !selectors || !frequencyMinutes) {
    return NextResponse.json({ error: 'url, selectors and frequencyMinutes required' }, { status: 400 });
  }

  try {
    const { create } = makeMonitoringUseCases();
    const monitor = await create.execute({
      userId: session!.user!.id!,
      url, selectors, frequencyMinutes, name,
    });
    return NextResponse.json(monitor, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error';
    const status = message === 'Monitor already exists' ? 409 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
