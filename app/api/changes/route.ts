import { NextResponse } from 'next/server';
import { prisma } from '@/lib/shared/prisma';

export async function GET() {
  const changes = await prisma.change.findMany({
    take: 20,
    orderBy: { detectedAt: 'desc' },
    include: {
      target: {
        include: {
          monitors: { select: { id: true, name: true } },
        },
      },
    },
  });

  return NextResponse.json(
    changes.map(c => ({
      id: c.id,
      type: c.type,
      diff: c.diff,
      detectedAt: c.detectedAt.toISOString(),
      target: {
        url: c.target.url,
        monitors: c.target.monitors,
      },
    }))
  );
}
