import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/infrastructure/adapters/authjs.config';
import { MongooseScrapedDocumentRepository } from '@/lib/scraping/infrastructure/repositories/mongoose-scraped-document.repository';

type Params = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  await auth();
  const { id } = await params;
  const url = new URL(req.url);
  const limit = parseInt(url.searchParams.get('limit') ?? '20');
  const offset = parseInt(url.searchParams.get('offset') ?? '0');

  const repo = new MongooseScrapedDocumentRepository();
  const docs = await repo.findByTargetId(id, limit, offset);
  return NextResponse.json(docs);
}
