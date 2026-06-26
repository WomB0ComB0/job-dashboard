import { test, expect, describe } from 'bun:test';
import { parseAgeInDays, postedDateFromAge } from './age';

describe('parseAgeInDays', () => {
  test('parses days', () => {
    expect(parseAgeInDays('3d')).toBe(3);
    expect(parseAgeInDays('1 day')).toBe(1);
  });
  test('parses weeks and months', () => {
    expect(parseAgeInDays('2w')).toBe(14);
    expect(parseAgeInDays('1mo')).toBe(30);
    expect(parseAgeInDays('2 months')).toBe(60);
  });
  test('returns null for unparseable text', () => {
    expect(parseAgeInDays('Jun 20')).toBeNull();
    expect(parseAgeInDays('')).toBeNull();
  });
});

describe('postedDateFromAge', () => {
  test('subtracts the age from the reference date', () => {
    expect(postedDateFromAge('3d', '2026-06-25T00:00:00.000Z')).toBe('2026-06-22T00:00:00.000Z');
  });
  test('returns null when age or reference is invalid', () => {
    expect(postedDateFromAge('Jun 20', '2026-06-25T00:00:00.000Z')).toBeNull();
    expect(postedDateFromAge('3d', 'not-a-date')).toBeNull();
  });
});
