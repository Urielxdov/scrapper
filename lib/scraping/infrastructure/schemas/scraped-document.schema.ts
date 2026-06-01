import mongoose, { Schema, Document } from 'mongoose';

export interface ScrapedDocumentDoc extends Document {
  targetId: string;
  url: string;
  rawHTML: string;
  extractedData: Record<string, string>;
  scrapeStrategy: string;
  scrapedAt: Date;
}

const ScrapedDocumentSchema = new Schema<ScrapedDocumentDoc>({
  targetId: { type: String, required: true, index: true },
  url: { type: String, required: true },
  rawHTML: { type: String, required: true },
  extractedData: { type: Map, of: String },
  scrapeStrategy: { type: String, required: true },
  scrapedAt: { type: Date, default: Date.now },
});

export const ScrapedDocumentModel = mongoose.models.ScrapedDocument
  ?? mongoose.model<ScrapedDocumentDoc>('ScrapedDocument', ScrapedDocumentSchema);
