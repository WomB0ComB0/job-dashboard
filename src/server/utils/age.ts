/**
 * Age-text parsing shared by the scraper (freshness filter) and the DB layer
 * (backfilling a posting date for time-range filtering).
 */

/** Parse a relative age string ("3d", "2 weeks", "1mo") into a number of days. */
export function parseAgeInDays(ageText: string): number | null {
  const trimmed = ageText.trim().toLowerCase();
  const match = /(\d+)\s*(d|day|days|mo|month|months|w|week|weeks)/i.exec(trimmed);
  if (!match || !match[1] || !match[2]) return null;
  const value = Number.parseInt(match[1], 10);
  const unit = match[2].toLowerCase();
  if (unit.startsWith('d')) return value;
  if (unit.startsWith('mo')) return value * 30;
  if (unit.startsWith('w')) return value * 7;
  return null;
}

/**
 * Infer an absolute posting date from a relative age and a reference timestamp
 * (typically when the listing was scraped). Returns an ISO-8601 string or null
 * when the age cannot be parsed.
 */
export function postedDateFromAge(ageText: string, referenceISO: string): string | null {
  const days = parseAgeInDays(ageText);
  if (days === null) return null;
  const ref = Date.parse(referenceISO);
  if (Number.isNaN(ref)) return null;
  return new Date(ref - days * 86_400_000).toISOString();
}
