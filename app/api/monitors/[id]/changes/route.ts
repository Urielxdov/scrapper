import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/shared/prisma';

type Params = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const url = new URL(req.url);
  const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '50'), 100);
  const offset = parseInt(url.searchParams.get('offset') ?? '0');

  const monitor = await prisma.monitor.findUnique({ where: { id }, select: { targetId: true } });
  if (!monitor) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const [data, total] = await Promise.all([
    prisma.change.findMany({
      where: { targetId: monitor.targetId },
      orderBy: { detectedAt: 'desc' },
      take: limit,
      skip: offset,
    }),
    prisma.change.count({ where: { targetId: monitor.targetId } }),
  ]);

  return NextResponse.json({
    data: data.map(c => ({
      id: c.id,
      type: c.type,
      diff: c.diff,
      detectedAt: c.detectedAt.toISOString(),
    })),
    total,
  });
}
