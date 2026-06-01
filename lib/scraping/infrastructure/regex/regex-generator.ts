type KnownType = 'price' | 'rating' | 'count' | 'availability' | 'percentage' | 'unknown';

function inferType(value: string): KnownType {
  if (/^[$€£¥]\s*[\d,]/.test(value) || /[\d,]+\s*(usd|eur|mxn|cop|gbp)\b/i.test(value)) return 'price';
  if (/[\d.]+\s*(\/\s*\d+|stars?|estrellas?)/i.test(value)) return 'rating';
  if (/[\d,]+\s*(reviews?|reseñas?|items?|resultados?|productos?|opiniones?)/i.test(value)) return 'count';
  if (/(en stock|out of stock|agotado|available|unavailable|in stock)/i.test(value)) return 'availability';
  if (/[\d.]+\s*%/.test(value)) return 'percentage';
  return 'unknown';
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function buildAnchorRegex(value: string): string {
  const parts = value.split(/(\d[\d,]*\.?\d*)/).map((token) => {
    if (/^\d[\d,]*\.?\d*$/.test(token)) return '[\\d,]+\\.?\\d*';
    if (token === '') return '';
    return escapeRegex(token).replace(/\s+/g, '\\s+');
  });
  return parts.filter(Boolean).join('');
}

export function generateRegex(value: string): string {
  if (!value) return '.*';

  const type = inferType(value);

  switch (type) {
    case 'price':        return '[$€£¥]\\s*[\\d,]+\\.?\\d*';
    case 'rating':       return '[\\d.]+\\s*(\\/\\s*\\d+|stars?|estrellas?)';
    case 'count':        return '[\\d,]+\\s*(reviews?|reseñas?|items?|resultados?|productos?|opiniones?)';
    case 'availability': return '(en stock|out of stock|agotado|available|unavailable|in stock)';
    case 'percentage':   return '[\\d.]+\\s*%';
    default: {
      if (/\d/.test(value)) return buildAnchorRegex(value);
      const words = value.trim().split(/\s+/).slice(0, 3);
      return words.map(escapeRegex).join('\\s+') + '.*';
    }
  }
}
