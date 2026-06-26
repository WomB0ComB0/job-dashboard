/**
 * Employment type classification for job listings.
 *
 * The upstream sources expose a free-text "terms" column that is inconsistent
 * (sometimes a work model like "Remote", sometimes a season, often "N/A"), so we
 * derive a single normalized employment type from the role text, the terms text,
 * and the source URL. Precedence is intentional: internship > contract > full-time.
 */

export type EmploymentType = 'internship' | 'contract' | 'full-time' | 'unknown';

const INTERN_RE = /\bintern(ship)?s?\b|\bco-?op\b|\bapprentice(ship)?\b/i;
const CONTRACT_RE = /\bcontract(or)?\b|\bc2c\b|corp[-\s]?to[-\s]?corp|\b1099\b|\btemporary\b|\btemp\b|\bfreelance\b/i;
const FULLTIME_RE = /\bfull[-\s]?time\b|\bfulltime\b|\bpermanent\b|\bnew[-\s]?grad(uate)?\b|\bentry[-\s]?level\b/i;

/**
 * Classify a listing into a normalized employment type.
 *
 * @param role  The job title text.
 * @param terms The free-text terms/work-model column from the source (may be empty or "N/A").
 * @param source The source URL the listing was scraped from.
 * @param fallback Type to return when no signal is found. Sources with a known bias
 *   (e.g. company career boards, which are overwhelmingly full-time) can default to
 *   that type while still letting explicit internship/contract titles win.
 */
export function classifyEmploymentType(
  role: string,
  terms: string,
  source: string,
  fallback: EmploymentType = 'unknown'
): EmploymentType {
  const text = `${role} ${terms}`.toLowerCase();
  const src = source.toLowerCase();

  // Source-based hints: the aggregators are organized into internship vs new-grad repos.
  const internSource = src.includes('intern');
  const newGradSource = src.includes('new-grad') || src.includes('new grad');

  if (INTERN_RE.test(text) || internSource) return 'internship';
  if (CONTRACT_RE.test(text)) return 'contract';
  if (FULLTIME_RE.test(text) || newGradSource) return 'full-time';
  return fallback;
}

/** Human-friendly label for an employment type. */
export function employmentTypeLabel(type: EmploymentType): string {
  switch (type) {
    case 'internship':
      return 'Internship';
    case 'contract':
      return 'Contract';
    case 'full-time':
      return 'Full-time';
    default:
      return 'Unknown';
  }
}
