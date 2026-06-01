export type ScrapedDocument = {
  id?: string;
  targetId: string;
  url: string;
  rawHTML: string;
  extractedData: Record<string, string>;
  scrapeStrategy: string;
  scrapedAt: Date;
};

export interface IScrapedDocumentRepository {
  save(doc: Omit<ScrapedDocument, 'id'>): Promise<ScrapedDocument>;
  findLatestByTargetId(targetId: string): Promise<ScrapedDocument | null>;
  findByTargetId(targetId: string, limit: number, offset: number): Promise<ScrapedDocument[]>;
}
