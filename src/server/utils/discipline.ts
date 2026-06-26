/**
 * Discipline classification for job listings.
 *
 * Unlike `extractRoleKeywords` (which returns every matching keyword for filter
 * suggestions), this returns a single canonical discipline per role so analytics
 * can count each listing exactly once. Patterns are evaluated in priority order:
 * the most specific discipline wins (e.g. "full-stack" before generic "software").
 */

export type Discipline =
  | 'data-engineering'
  | 'data-science'
  | 'ml-ai'
  | 'full-stack'
  | 'frontend'
  | 'backend'
  | 'mobile'
  | 'devops'
  | 'security'
  | 'qa'
  | 'hardware'
  | 'product'
  | 'design'
  | 'software'
  | 'other';

interface DisciplineRule {
  discipline: Discipline;
  pattern: RegExp;
}

// Order matters — first match wins. Specific disciplines precede generic ones.
const RULES: DisciplineRule[] = [
  { discipline: 'data-engineering', pattern: /\bdata engineer|\betl\b|\bdata platform|\bdata infra/i },
  { discipline: 'data-science', pattern: /\bdata scien|\bdata analyst|\banalytics\b/i },
  { discipline: 'ml-ai', pattern: /\bmachine learning\b|\bml\b|\bai\b|\bdeep learning\b|\bnlp\b|\bcomputer vision\b/i },
  { discipline: 'full-stack', pattern: /\bfull[-\s]?stack\b/i },
  { discipline: 'frontend', pattern: /\bfront[-\s]?end\b|\bui engineer\b/i },
  { discipline: 'backend', pattern: /\bback[-\s]?end\b/i },
  { discipline: 'mobile', pattern: /\bmobile\b|\bios\b|\bandroid\b/i },
  { discipline: 'devops', pattern: /\bdevops\b|\bsre\b|\bsite reliability\b|\bplatform engineer\b|\binfrastructure\b/i },
  { discipline: 'security', pattern: /\bsecurity\b|\bappsec\b|\binfosec\b/i },
  { discipline: 'qa', pattern: /\bqa\b|\bquality assurance\b|\btest engineer\b|\bsdet\b/i },
  { discipline: 'hardware', pattern: /\bembedded\b|\bfirmware\b|\bhardware\b|\basic\b|\bfpga\b/i },
  { discipline: 'product', pattern: /\bproduct manager\b|\bproduct management\b/i },
  { discipline: 'design', pattern: /\bdesigner\b|\bux\b|\bui\/ux\b/i },
  { discipline: 'software', pattern: /\bsoftware engineer\b|\bsoftware developer\b|\bswe\b|\bprogrammer\b/i },
];

/** Classify a role into a single canonical discipline. */
export function classifyDiscipline(role: string): Discipline {
  for (const rule of RULES) {
    if (rule.pattern.test(role)) return rule.discipline;
  }
  return 'other';
}

/** Human-friendly label for a discipline. */
export function disciplineLabel(discipline: Discipline): string {
  const labels: Record<Discipline, string> = {
    'data-engineering': 'Data Engineering',
    'data-science': 'Data Science',
    'ml-ai': 'ML / AI',
    'full-stack': 'Full Stack',
    frontend: 'Frontend',
    backend: 'Backend',
    mobile: 'Mobile',
    devops: 'DevOps / SRE',
    security: 'Security',
    qa: 'QA / Test',
    hardware: 'Hardware / Embedded',
    product: 'Product',
    design: 'Design',
    software: 'Software (General)',
    other: 'Other',
  };
  return labels[discipline];
}
