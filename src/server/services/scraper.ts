import { appendFileSync } from 'node:fs';
import db from '../db';

function logDebug(message: string) {
  appendFileSync('scraper_debug.log', message + '\n');
}

interface JobListing {
  company: string;
  role: string;
  location: string;
  terms: string;
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

function parseAgeInDays(ageText: string): number | null {
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

function isUSLocation(location: string): boolean {
  const usStates = /\b(AL|AK|AZ|AR|CA|CO|CT|DE|FL|GA|HI|ID|IL|IN|IA|KS|KY|LA|ME|MD|MA|MI|MN|MS|MO|MT|NE|NV|NH|NJ|NM|NY|NC|ND|OH|OK|OR|PA|RI|SC|SD|TN|TX|UT|VT|VA|WA|WV|WI|WY|DC|PR|VI|GU|AS|MP)\b/i;
  const usPatterns = /\b(USA|United States|U\.S\.|Remote.*USA?|Nationwide)\b/i;
  const nonUSPatterns = /\b(UK|United Kingdom|Canada|Germany|France|India|China|Japan|Australia|Europe|Asia|EMEA|London|Toronto|Vancouver|Berlin|Paris|Munich|Bangalore|Beijing|Shanghai|Tokyo|Sydney|Melbourne|Edinburgh|Banbury)\b/i;
  if (nonUSPatterns.test(location)) return false;
  return usStates.test(location) || usPatterns.test(location);
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
      
      jobs.push({
        company: company || 'Unknown',
        role: role || 'Unknown Role',
        location,
        terms: termsCell ? termsCell.replaceAll(/<[^>]*>/g, '').trim() : 'N/A',
        applicationLink,
        age,
        dateAdded: new Date().toISOString(),
        source: sourceUrl,
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

  const insertJob = db.prepare(`
    INSERT OR IGNORE INTO jobs (company, role, location, terms, application_link, source, age_text, date_added, parsed_date)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const transaction = db.transaction((jobs: JobListing[]) => {
    for (const job of jobs) {
      insertJob.run(
        job.company,
        job.role,
        job.location,
        job.terms,
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