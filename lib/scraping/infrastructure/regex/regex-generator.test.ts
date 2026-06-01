import { generateRegex } from './regex-generator';

describe('generateRegex', () => {
  it('generates price regex for dollar values', () => {
    const r = generateRegex('$299.99');
    expect(new RegExp(r, 'i').test('$299.99')).toBe(true);
    expect(new RegExp(r, 'i').test('$1,200.00')).toBe(true);
  });

  it('generates price regex for euro values', () => {
    const r = generateRegex('€45.00');
    expect(new RegExp(r, 'i').test('€45.00')).toBe(true);
  });

  it('generates rating regex', () => {
    const r = generateRegex('4.5 stars');
    expect(new RegExp(r, 'i').test('4.5 stars')).toBe(true);
    expect(new RegExp(r, 'i').test('3.8 stars')).toBe(true);
  });

  it('generates count regex', () => {
    const r = generateRegex('1,234 reviews');
    expect(new RegExp(r, 'i').test('1,234 reviews')).toBe(true);
    expect(new RegExp(r, 'i').test('56 reviews')).toBe(true);
  });

  it('generates availability regex', () => {
    const r = generateRegex('En stock');
    expect(new RegExp(r, 'i').test('En stock')).toBe(true);
    expect(new RegExp(r, 'i').test('Out of stock')).toBe(true);
  });

  it('generates percentage regex', () => {
    const r = generateRegex('25%');
    expect(new RegExp(r, 'i').test('25%')).toBe(true);
    expect(new RegExp(r, 'i').test('10.5%')).toBe(true);
  });

  it('generates anchor+variable regex for text with numbers', () => {
    const r = generateRegex('Quedan 3 unidades');
    expect(new RegExp(r, 'i').test('Quedan 3 unidades')).toBe(true);
    expect(new RegExp(r, 'i').test('Quedan 12 unidades')).toBe(true);
  });

  it('generates anchor regex for pure text', () => {
    const r = generateRegex('Nike Air Max 90');
    expect(new RegExp(r, 'i').test('Nike Air Max 90')).toBe(true);
  });

  it('returns .* for empty value', () => {
    expect(generateRegex('')).toBe('.*');
  });
});
