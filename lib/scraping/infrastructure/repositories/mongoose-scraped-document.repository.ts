import { connectMongoDB } from '@/lib/shared/mongose';
import { ScrapedDocumentModel } from '../schemas/scraped-document.schema';
import { IScrapedDocumentRepository, ScrapedDocument } from '../../domain/ports/scraped-document-repository.port';

export class MongooseScrapedDocumentRepository implements IScrapedDocumentRepository {
  async save(doc: Omit<ScrapedDocument, 'id'>): Promise<ScrapedDocument> {
    await connectMongoDB();
    const created = await ScrapedDocumentModel.create(doc);
    return { ...doc, id: created._id.toString() };
  }

  async findLatestByTargetId(targetId: string): Promise<ScrapedDocument | null> {
    await connectMongoDB();
    const doc = await ScrapedDocumentModel
      .findOne({ targetId })
      .sort({ scrapedAt: -1 });
    if (!doc) return null;
    return {
      id: doc._id.toString(), targetId: doc.targetId, url: doc.url,
      rawHTML: doc.rawHTML, extractedData: doc.extractedData,
      scrapeStrategy: doc.scrapeStrategy, scrapedAt: doc.scrapedAt,
    };
  }

  async findByTargetId(targetId: string, limit: number, offset: number): Promise<ScrapedDocument[]> {
    await connectMongoDB();
    const docs = await ScrapedDocumentModel
      .find({ targetId })
      .sort({ scrapedAt: -1 })
      .skip(offset)
      .limit(limit);
    return docs.map(d => ({
      id: d._id.toString(), targetId: d.targetId, url: d.url,
      rawHTML: d.rawHTML, extractedData: d.extractedData,
      scrapeStrategy: d.scrapeStrategy, scrapedAt: d.scrapedAt,
    }));
  }
}
