import { test, expect, describe } from 'bun:test';
import { mapRemotiveType, parseRemotiveJobs, parseGreenhouseJobs, isUSOrRemote } from './scraper';

describe('isUSOrRemote', () => {
  test('accepts US locations and US state names', () => {
    expect(isUSOrRemote('San Francisco, CA')).toBe(true);
    expect(isUSOrRemote('USA')).toBe(true);
    expect(isUSOrRemote('Remote - California; Remote - New York')).toBe(true);
  });
  test('accepts purely generic remote', () => {
    expect(isUSOrRemote('Worldwide')).toBe(true);
    expect(isUSOrRemote('Anywhere')).toBe(true);
    expect(isUSOrRemote('Remote')).toBe(true);
  });
  test('rejects non-US locations even when remote (Nordic leak regression)', () => {
    expect(isUSOrRemote('Finland; Remote - Denmark; Stockholm, Sweden')).toBe(false);
    expect(isUSOrRemote('London, UK')).toBe(false);
    expect(isUSOrRemote('Remote - Berlin')).toBe(false);
  });
});

describe('mapRemotiveType', () => {
  test('maps explicit job_type values', () => {
    expect(mapRemotiveType('full_time')).toBe('full-time');
    expect(mapRemotiveType('contract')).toBe('contract');
    expect(mapRemotiveType('freelance')).toBe('contract');
    expect(mapRemotiveType('internship')).toBe('internship');
  });
  test('returns null for unmapped / missing types', () => {
    expect(mapRemotiveType('part_time')).toBeNull();
    expect(mapRemotiveType('other')).toBeNull();
    expect(mapRemotiveType(undefined)).toBeNull();
  });
});

describe('parseRemotiveJobs', () => {
  const data = {
    jobs: [
      { title: 'Senior Backend Engineer', company_name: 'Acme', candidate_required_location: 'USA', job_type: 'full_time', url: 'https://x/1' },
      { title: 'Freelance React Dev', company_name: 'Beta', candidate_required_location: 'Worldwide', job_type: 'contract', url: 'https://x/2' },
      { title: 'Data Engineer', company_name: 'Gamma', candidate_required_location: 'Europe', job_type: 'full_time', url: 'https://x/3' },
      { title: 'ML Intern', company_name: 'Delta', candidate_required_location: 'Anywhere', job_type: 'internship', url: 'https://x/4' },
    ],
  };
  const jobs = parseRemotiveJobs(data, 'https://remotive.com');

  test('excludes non-US/non-remote locations (Europe dropped)', () => {
    expect(jobs.length).toBe(3);
    expect(jobs.find((j) => j.company === 'Gamma')).toBeUndefined();
  });
  test('maps employment type from job_type', () => {
    expect(jobs.find((j) => j.role === 'Senior Backend Engineer')!.employmentType).toBe('full-time');
    expect(jobs.find((j) => j.role === 'Freelance React Dev')!.employmentType).toBe('contract');
    expect(jobs.find((j) => j.role === 'ML Intern')!.employmentType).toBe('internship');
  });
  test('carries the source through', () => {
    expect(jobs[0]!.source).toBe('https://remotive.com');
  });
});

describe('parseGreenhouseJobs', () => {
  const data = {
    jobs: [
      { title: 'Senior Software Engineer', location: { name: 'San Francisco, CA' }, absolute_url: 'https://g/1' },
      { title: 'Data Engineering Intern', location: { name: 'New York, NY' }, absolute_url: 'https://g/2' },
      { title: 'Staff Engineer', location: { name: 'London, UK' }, absolute_url: 'https://g/3' },
      { title: 'Contract Recruiter', location: { name: 'Remote, US' }, absolute_url: 'https://g/4' },
    ],
  };
  const jobs = parseGreenhouseJobs(data, 'Databricks', 'https://boards.greenhouse.io/databricks');

  test('excludes non-US locations (London dropped)', () => {
    expect(jobs.length).toBe(3);
    expect(jobs.find((j) => j.role === 'Staff Engineer')).toBeUndefined();
  });
  test('defaults to full-time but lets explicit titles win', () => {
    expect(jobs.find((j) => j.role === 'Senior Software Engineer')!.employmentType).toBe('full-time');
    expect(jobs.find((j) => j.role === 'Data Engineering Intern')!.employmentType).toBe('internship');
    expect(jobs.find((j) => j.role === 'Contract Recruiter')!.employmentType).toBe('contract');
  });
  test('stamps the company name on every listing', () => {
    expect(jobs.every((j) => j.company === 'Databricks')).toBe(true);
  });
});
