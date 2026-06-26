import { appendFileSync } from 'node:fs';
import db from '../db';
import { classifyEmploymentType, type EmploymentType } from '../utils/employmentType';
import { parseAgeInDays } from '../utils/age';

function logDebug(message: string) {
  appendFileSync('scraper_debug.log', message + '\n');
}

interface JobListing {
  company: string;
  role: string;
  location: string;
  terms: string;
  employmentType: EmploymentType;
  applicationLink: string;
  age: string;
  dateAdded: string;
  source: string;
  parsedDate?: Date;
}

const CONFIG = {
  MAX_AGE_DAYS: 30,
  BASE_YEAR: new Date().getFullYear(),
  GITHUB_SOURCES: [
    {
      name: "summerInternships",
      urlTemplate: "https://raw.githubusercontent.com/SimplifyJobs/Summer{YEAR}-Internships/dev/README.md",
      displayUrlTemplate: "https://github.com/SimplifyJobs/Summer{YEAR}-Internships/blob/dev/README.md",
    },
    {
      name: "newGrad",
      urlTemplate: "https://raw.githubusercontent.com/SimplifyJobs/New-Grad-Positions/dev/README.md",
      displayUrlTemplate: "https://github.com/SimplifyJobs/New-Grad-Positions",
    },
    {
      name: "offSeason",
      urlTemplate: "https://raw.githubusercontent.com/SimplifyJobs/Summer{YEAR}-Internships/dev/README-Off-Season.md",
      displayUrlTemplate: "https://github.com/SimplifyJobs/Summer{YEAR}-Internships/blob/dev/README-Off-Season.md",
    },
  ],
  JOBRIGHT_AI_SOURCES: [
    {
      name: "softwareEngineerNewGrad",
      urlTemplate: "https://raw.githubusercontent.com/jobright-ai/{YEAR}-Software-Engineer-New-Grad/master/README.md",
      displayUrlTemplate: "https://github.com/jobright-ai/{YEAR}-Software-Engineer-New-Grad",
    },
    {
      name: "engineeringNewGrad",
      urlTemplate: "https://raw.githubusercontent.com/jobright-ai/{YEAR}-Engineering-New-Grad/master/README.md",
      displayUrlTemplate: "https://github.com/jobright-ai/{YEAR}-Engineering-New-Grad",
    },
    {
      name: "dataAnalysisNewGrad",
      urlTemplate: "https://raw.githubusercontent.com/jobright-ai/{YEAR}-Data-Analysis-New-Grad/master/README.md",
      displayUrlTemplate: "https://github.com/jobright-ai/{YEAR}-Data-Analysis-New-Grad",
    },
    {
      name: "designNewGrad",
      urlTemplate: "https://raw.githubusercontent.com/jobright-ai/{YEAR}-Design-New-Grad/master/README.md",
      displayUrlTemplate: "https://github.com/jobright-ai/{YEAR}-Design-New-Grad",
    },
    {
      name: "productManagementNewGrad",
      urlTemplate: "https://raw.githubusercontent.com/jobright-ai/{YEAR}-Product-Management-New-Grad/master/README.md",
      displayUrlTemplate: "https://github.com/jobright-ai/{YEAR}-Product-Management-New-Grad",
    },
    {
      name: "softwareEngineerInternship",
      urlTemplate: "https://raw.githubusercontent.com/jobright-ai/{YEAR}-Software-Engineer-Internship/master/README.md",
      displayUrlTemplate: "https://github.com/jobright-ai/{YEAR}-Software-Engineer-Internship",
    },
    {
      name: "engineerInternship",
      urlTemplate: "https://raw.githubusercontent.com/jobright-ai/{YEAR}-Engineer-Internship/master/README.md",
      displayUrlTemplate: "https://github.com/jobright-ai/{YEAR}-Engineer-Internship",
    },
    {
      name: "dataAnalysisInternship",
      urlTemplate: "https://raw.githubusercontent.com/jobright-ai/{YEAR}-Data-Analysis-Internship/master/README.md",
      displayUrlTemplate: "https://github.com/jobright-ai/{YEAR}-Data-Analysis-Internship",
    },
    {
      name: "designInternship",
      urlTemplate: "https://raw.githubusercontent.com/jobright-ai/{YEAR}-Design-Internship/master/README.md",
      displayUrlTemplate: "https://github.com/jobright-ai/{YEAR}-Design-Internship",
    },
    {
      name: "productManagementInternship",
      urlTemplate: "https://raw.githubusercontent.com/jobright-ai/{YEAR}-Product-Management-Internship/master/README.md",
      displayUrlTemplate: "https://github.com/jobright-ai/{YEAR}-Product-Management-Internship",
    },
  ],
};

// Remotive remote-job API categories (https://remotive.com/api/remote-jobs?category=...).
const REMOTIVE_CATEGORIES = ['software-dev', 'data'];

// Verified-live Greenhouse company boards (data/infra/SWE-heavy), for experienced
// full-time roles. Each is fetched from boards-api.greenhouse.io/v1/boards/{slug}/jobs.
const GREENHOUSE_COMPANIES: { slug: string; name: string }[] = [
  { slug: 'databricks', name: 'Databricks' },
  { slug: 'stripe', name: 'Stripe' },
  { slug: 'mongodb', name: 'MongoDB' },
  { slug: 'datadog', name: 'Datadog' },
  { slug: 'anthropic', name: 'Anthropic' },
  { slug: 'cloudflare', name: 'Cloudflare' },
  { slug: 'elastic', name: 'Elastic' },
  { slug: 'fivetran', name: 'Fivetran' },
  { slug: 'amplitude', name: 'Amplitude' },
  { slug: 'scaleai', name: 'Scale AI' },
  { slug: 'airbnb', name: 'Airbnb' },
  { slug: 'reddit', name: 'Reddit' },
  { slug: 'pinterest', name: 'Pinterest' },
  { slug: 'figma', name: 'Figma' },
  { slug: 'instacart', name: 'Instacart' },
  { slug: 'gitlab', name: 'GitLab' },
  { slug: 'robinhood', name: 'Robinhood' },
  { slug: 'coinbase', name: 'Coinbase' },
  { slug: 'affirm', name: 'Affirm' },
  { slug: 'twilio', name: 'Twilio' },
];

function isUSLocation(location: string): boolean {
  const usStates = /\b(AL|AK|AZ|AR|CA|CO|CT|DE|FL|GA|HI|ID|IL|IN|IA|KS|KY|LA|ME|MD|MA|MI|MN|MS|MO|MT|NE|NV|NH|NJ|NM|NY|NC|ND|OH|OK|OR|PA|RI|SC|SD|TN|TX|UT|VT|VA|WA|WV|WI|WY|DC|PR|VI|GU|AS|MP)\b/i;
  const usPatterns = /\b(USA|United States|U\.S\.|Remote.*USA?|Nationwide)\b/i;
  const nonUSPatterns = /\b(UK|United Kingdom|Canada|Germany|France|India|China|Japan|Australia|Europe|Asia|EMEA|London|Toronto|Vancouver|Berlin|Paris|Munich|Bangalore|Beijing|Shanghai|Tokyo|Sydney|Melbourne|Edinburgh|Banbury)\b/i;
  if (nonUSPatterns.test(location)) return false;
  return usStates.test(location) || usPatterns.test(location);
}

// Full US state names, to catch multi-location remote strings like
// "Remote - California; Remote - New York" that the abbreviation check misses.
const US_STATE_NAMES = /\b(Alabama|Alaska|Arizona|Arkansas|California|Colorado|Connecticut|Delaware|Florida|Georgia|Hawaii|Idaho|Illinois|Indiana|Iowa|Kansas|Kentucky|Louisiana|Maine|Maryland|Massachusetts|Michigan|Minnesota|Mississippi|Missouri|Montana|Nebraska|Nevada|New Hampshire|New Jersey|New Mexico|New York|North Carolina|North Dakota|Ohio|Oklahoma|Oregon|Pennsylvania|Rhode Island|South Carolina|South Dakota|Tennessee|Texas|Utah|Vermont|Virginia|Washington|West Virginia|Wisconsin|Wyoming)\b/i;

// Remote boards (Remotive, Greenhouse) express location as remote eligibility.
// Accept only when there's a real US signal, or a purely generic remote string —
// reject anything anchored to a non-US place (e.g. "Remote - Denmark").
export function isUSOrRemote(location: string): boolean {
  const loc = location || '';
  if (isUSLocation(loc)) return true;
  if (US_STATE_NAMES.test(loc)) return true;
  if (/\b(worldwide|anywhere)\b/i.test(loc)) return true;
  if (/^\s*remote\s*$/i.test(loc)) return true; // exactly "Remote", no geography
  return false;
}

function parseHTMLTable(html: string, sourceUrl: string): JobListing[] {
  const jobs: JobListing[] = [];
  const tbodyMatch = html.match(/<tbody>([\s\S]*?)<\/tbody>/g);
  if (!tbodyMatch) return jobs;
  
  for (const tbody of tbodyMatch) {
    const rows = tbody.match(/<tr>([\s\S]*?)<\/tr>/g);
    if (!rows) continue;
    for (const row of rows) {
      const cells = row.match(/<td[^>]*>([\s\S]*?)<\/td>/g);
      if (!cells || cells.length < 5) continue;
      const cleanCells = cells.map(cell => cell.replace(/<td[^>]*>/, '').replace(/<\/td>/, '').trim());
      const hasTermsColumn = cleanCells.length >= 6;
      
      const companyCell = cleanCells[0];
      const roleCell = cleanCells[1];
      const locationCell = cleanCells[2];
      const termsCell = hasTermsColumn ? cleanCells[3] : '';
      const applicationCell = hasTermsColumn ? cleanCells[4] : cleanCells[3];
      const ageCell = hasTermsColumn ? cleanCells[5] : cleanCells[4];
      
      if (!companyCell || !roleCell || !locationCell || !ageCell || !applicationCell) continue;
      
      let company = companyCell.replaceAll(/<[^>]*>|\[([^\]]+)\]\([^)]+\)|🔥/g, (match, p1) => p1 || '').trim();
      let role = roleCell.replaceAll(/<[^>]*>|🎓|🛂|🇺🇸/g, '').trim();
      let location = locationCell.replaceAll(/<details>.*?<\/details>|<[^>]*>|<\/br>/g, (match) => match === '</br>' ? ', ' : '').trim();
      if (!isUSLocation(location)) continue;
      
      const age = ageCell.replaceAll(/<[^>]*>/g, '').trim();
      const ageInDays = parseAgeInDays(age);
      if (ageInDays !== null && ageInDays > CONFIG.MAX_AGE_DAYS) continue;
      
      const hrefMatches = Array.from(applicationCell.matchAll(/href="([^"]+)"/g));
      let applicationLink = '';
      for (const match of hrefMatches) {
        if (match[1] && !match[1].includes('simplify.jobs')) {
          applicationLink = match[1];
          break;
        }
      }
      if (!applicationLink && hrefMatches.length > 0 && hrefMatches[0]?.[1]) applicationLink = hrefMatches[0][1];
      if (!applicationLink) continue;
      
      const terms = termsCell ? termsCell.replaceAll(/<[^>]*>/g, '').trim() : 'N/A';
      jobs.push({
        company: company || 'Unknown',
        role: role || 'Unknown Role',
        location,
        terms,
        employmentType: classifyEmploymentType(role, terms, sourceUrl),
        applicationLink,
        age,
        dateAdded: new Date().toISOString(),
        source: sourceUrl,
        // Infer a posting date from the relative age so time-range filtering works.
        parsedDate: ageInDays !== null ? new Date(Date.now() - ageInDays * 86_400_000) : undefined,
      });
    }
  }
  return jobs;
}

function parseJobrightDate(dateStr: string, year: number): Date | null {
  const months: Record<string, number> = {
    jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
    jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11
  };
  const match = /^(\w{3})\s+(\d{1,2})$/i.exec(dateStr.trim());
  if (!match || !match[1] || !match[2]) return null;
  const month = months[match[1].toLowerCase()];
  const day = Number.parseInt(match[2], 10);
  if (month === undefined || Number.isNaN(day)) return null;
  return new Date(year, month, day);
}

function parseJobrightAITable(markdown: string, sourceUrl: string, year: number): JobListing[] {
  const jobs: JobListing[] = [];
  const lines = markdown.split('\n');
  for (const line of lines) {
    if (!line.startsWith('|')) continue;
    if (line.includes('Company') && line.includes('Job Title')) continue;
    if (line.includes('-----')) continue;
    const cells = line.split('|').map(c => c.trim()).filter(c => c.length > 0);
    if (cells.length < 5) continue;
    const companyCell = cells[0];
    const roleCell = cells[1];
    const locationCell = cells[2];
    const workModelCell = cells[3];
    const dateCell = cells[4];
    
    if (!companyCell || !roleCell || !locationCell || !workModelCell || !dateCell) continue;
    if (companyCell === '↳') continue;
    
    const companyMatch = /\*\*\[([^\]]+)\]/.exec(companyCell);
    const company = companyMatch ? companyMatch[1] : companyCell.replaceAll(/\*\*/g, '').trim();
    const roleMatch = /\*\*\[([^\]]+)\]\(([^)]+)\)/.exec(roleCell);
    const role = roleMatch ? roleMatch[1] : roleCell.replaceAll(/\*\*/g, '').replaceAll(/\[([^\]]+)\]\([^)]+\)/g, '$1').trim();
    const applicationLink = roleMatch ? roleMatch[2] : '';
    const location = locationCell;
    const terms = workModelCell;
    const parsedDate = parseJobrightDate(dateCell, year);
    if (!applicationLink) continue;
    if (!isUSLocation(location)) continue;
    jobs.push({
      company: company || 'Unknown',
      role: role || 'Unknown Role',
      location,
      terms,
      employmentType: classifyEmploymentType(role || '', terms, sourceUrl),
      applicationLink,
      age: dateCell,
      dateAdded: new Date().toISOString(),
      source: sourceUrl,
      parsedDate: parsedDate ?? undefined,
    });
  }
  return jobs;
}

async function fetchWithYearFallback(urlTemplate: string, startYear: number): Promise<{content?: string, year: number}> {
  let year = startYear;
  for (let i = 0; i < 2; i++) {
    const response = await fetch(urlTemplate.replace('{YEAR}', String(year)));
    if (response.ok) {
        const text = await response.text();
        return { content: text, year };
    }
    if (response.status === 404) year++;
    else break;
  }
  return { year };
}

/** Map Remotive's explicit job_type to our normalized employment type. */
export function mapRemotiveType(jobType: string | undefined): EmploymentType | null {
  if (!jobType) return null;
  const t = jobType.toLowerCase();
  if (t.includes('intern')) return 'internship';
  if (t.includes('contract') || t.includes('freelance')) return 'contract';
  if (t.includes('full')) return 'full-time';
  return null; // part_time / other -> let the classifier decide
}

interface RemotiveJob {
  title?: string;
  company_name?: string;
  candidate_required_location?: string;
  job_type?: string;
  url?: string;
  publication_date?: string;
}

/** Parse the Remotive remote-jobs API response into listings (pure; no I/O). */
export function parseRemotiveJobs(data: { jobs?: RemotiveJob[] }, sourceUrl: string): JobListing[] {
  const jobs: JobListing[] = [];
  const now = Date.now();
  for (const j of data.jobs ?? []) {
    const role = (j.title || '').trim();
    const link = j.url;
    const location = (j.candidate_required_location || 'Remote').trim();
    if (!role || !link) continue;
    if (!isUSOrRemote(location)) continue;

    let age = '';
    let parsedDate: Date | undefined;
    if (j.publication_date) {
      const pub = new Date(j.publication_date);
      if (!Number.isNaN(pub.getTime())) {
        const days = Math.floor((now - pub.getTime()) / 86_400_000);
        if (days > CONFIG.MAX_AGE_DAYS) continue;
        age = `${days}d`;
        parsedDate = pub;
      }
    }

    const terms = j.job_type || '';
    const employmentType = mapRemotiveType(j.job_type) ?? classifyEmploymentType(role, terms, sourceUrl);
    jobs.push({
      company: (j.company_name || 'Unknown').trim(),
      role,
      location,
      terms,
      employmentType,
      applicationLink: link,
      age,
      dateAdded: new Date().toISOString(),
      source: sourceUrl,
      parsedDate,
    });
  }
  return jobs;
}

interface GreenhouseJob {
  title?: string;
  absolute_url?: string;
  location?: { name?: string };
  updated_at?: string;
}

/**
 * Parse a Greenhouse company board into listings (pure; no I/O). Company career
 * boards are overwhelmingly full-time, so we default the type to full-time while
 * still letting explicit internship/contract titles win.
 */
export function parseGreenhouseJobs(
  data: { jobs?: GreenhouseJob[] },
  company: string,
  sourceUrl: string
): JobListing[] {
  const jobs: JobListing[] = [];
  const now = Date.now();
  for (const j of data.jobs ?? []) {
    const role = (j.title || '').trim();
    const link = j.absolute_url;
    const location = (j.location?.name || 'Remote').trim();
    if (!role || !link) continue;
    if (!isUSOrRemote(location)) continue;

    let age = '';
    let parsedDate: Date | undefined;
    if (j.updated_at) {
      const updated = new Date(j.updated_at);
      if (!Number.isNaN(updated.getTime())) {
        age = `${Math.max(0, Math.floor((now - updated.getTime()) / 86_400_000))}d`;
        parsedDate = updated;
      }
    }

    jobs.push({
      company,
      role,
      location,
      terms: 'Full-time',
      employmentType: classifyEmploymentType(role, '', sourceUrl, 'full-time'),
      applicationLink: link,
      age,
      dateAdded: new Date().toISOString(),
      source: sourceUrl,
      parsedDate,
    });
  }
  return jobs;
}

export async function scrapeJobs() {
  const allJobs: JobListing[] = [];
  const year = CONFIG.BASE_YEAR;

  for (const source of CONFIG.GITHUB_SOURCES) {
    const { content } = await fetchWithYearFallback(source.urlTemplate, year);
    if (content) {
      const jobs = parseHTMLTable(content, source.displayUrlTemplate);
      allJobs.push(...jobs);
    }
  }

  for (const source of CONFIG.JOBRIGHT_AI_SOURCES) {
    const { content, year: fetchedYear } = await fetchWithYearFallback(source.urlTemplate, year);
    if (content) {
      const jobs = parseJobrightAITable(content, source.displayUrlTemplate.replace('{YEAR}', String(fetchedYear)), fetchedYear);
      allJobs.push(...jobs);
    }
  }

  // Remotive (remote tech/data jobs; JSON API). Categories fetched in parallel.
  const remotiveResults = await Promise.all(
    REMOTIVE_CATEGORIES.map(async (category) => {
      try {
        const res = await fetch(`https://remotive.com/api/remote-jobs?category=${category}`);
        if (!res.ok) return [];
        const data = await res.json();
        return parseRemotiveJobs(data, 'https://remotive.com');
      } catch (e) {
        return [];
      }
    })
  );
  for (const jobs of remotiveResults) allJobs.push(...jobs);

  // Greenhouse company boards (experienced full-time roles; JSON API). Fetched in parallel.
  const greenhouseResults = await Promise.all(
    GREENHOUSE_COMPANIES.map(async ({ slug, name }) => {
      try {
        const res = await fetch(`https://boards-api.greenhouse.io/v1/boards/${slug}/jobs`);
        if (!res.ok) return [];
        const data = await res.json();
        return parseGreenhouseJobs(data, name, `https://boards.greenhouse.io/${slug}`);
      } catch (e) {
        return [];
      }
    })
  );
  for (const jobs of greenhouseResults) allJobs.push(...jobs);

  const insertJob = db.prepare(`
    INSERT OR IGNORE INTO jobs (company, role, location, terms, employment_type, application_link, source, age_text, date_added, parsed_date)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const transaction = db.transaction((jobs: JobListing[]) => {
    for (const job of jobs) {
      insertJob.run(
        job.company,
        job.role,
        job.location,
        job.terms,
        job.employmentType,
        job.applicationLink,
        job.source,
        job.age,
        job.dateAdded,
        job.parsedDate?.toISOString() || null
      );
    }
  });

  transaction(allJobs);
  return allJobs.length;
}