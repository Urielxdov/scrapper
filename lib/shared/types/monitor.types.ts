export type SelectorConfig = { field: string; css: string; regex?: string }
export type DiffEntry = { field: string; oldValue: string; newValue: string }
export type ChangeType = 'CONTENT_DIFF' | 'SELECTOR_MISSING'
export type Role = 'ADMIN' | 'USER'

export type ScrapeResult = {
  extractedData: Record<string, string>
  rawHTML: string
  strategy: 'static' | 'dynamic'
}