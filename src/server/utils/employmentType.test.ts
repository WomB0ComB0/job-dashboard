import { test, expect, describe } from 'bun:test';
import { classifyEmploymentType } from './employmentType';

describe('classifyEmploymentType', () => {
  describe('internship', () => {
    test('detects "Intern" in the role', () => {
      expect(classifyEmploymentType('Software Engineer Intern', '', '')).toBe('internship');
    });
    test('detects "Internship" in the terms column', () => {
      expect(classifyEmploymentType('Data Analyst', 'Internship', '')).toBe('internship');
    });
    test('detects co-op variants', () => {
      expect(classifyEmploymentType('Engineering Co-op', '', '')).toBe('internship');
      expect(classifyEmploymentType('Engineering Coop', '', '')).toBe('internship');
    });
    test('detects apprenticeship', () => {
      expect(classifyEmploymentType('Software Apprentice', '', '')).toBe('internship');
    });
    test('classifies by internship source even with a generic role', () => {
      expect(
        classifyEmploymentType('Engineer', '', 'https://github.com/jobright-ai/2026-Software-Engineer-Internship')
      ).toBe('internship');
    });
    test('does not false-positive on "International"', () => {
      expect(classifyEmploymentType('International Operations Engineer', '', '')).toBe('unknown');
    });
  });

  describe('contract', () => {
    test('detects "(Contract)" in the role', () => {
      expect(classifyEmploymentType('Software Engineer (Contract)', '', '')).toBe('contract');
    });
    test('detects contractor', () => {
      expect(classifyEmploymentType('DevOps Contractor', '', '')).toBe('contract');
    });
    test('detects C2C', () => {
      expect(classifyEmploymentType('Full Stack Developer - C2C', '', '')).toBe('contract');
    });
    test('detects 1099', () => {
      expect(classifyEmploymentType('Backend Engineer', '1099', '')).toBe('contract');
    });
    test('detects temporary', () => {
      expect(classifyEmploymentType('QA Tester', 'Temporary', '')).toBe('contract');
    });
    test('detects freelance', () => {
      expect(classifyEmploymentType('Freelance Web Developer', '', '')).toBe('contract');
    });
    test('does not false-positive on "template"', () => {
      expect(classifyEmploymentType('Template Designer', '', '')).toBe('unknown');
    });
  });

  describe('full-time', () => {
    test('detects "Full-time" in terms', () => {
      expect(classifyEmploymentType('Backend Engineer', 'Full-time', '')).toBe('full-time');
    });
    test('detects "Full time" with a space', () => {
      expect(classifyEmploymentType('Backend Engineer', 'Full time', '')).toBe('full-time');
    });
    test('detects permanent', () => {
      expect(classifyEmploymentType('Data Scientist', 'Permanent', '')).toBe('full-time');
    });
    test('detects "New Grad" in the role', () => {
      expect(classifyEmploymentType('Software Engineer, New Grad', '', '')).toBe('full-time');
    });
    test('detects entry-level', () => {
      expect(classifyEmploymentType('Entry-Level Backend Engineer', '', '')).toBe('full-time');
    });
    test('classifies by new-grad source even with a generic role', () => {
      expect(
        classifyEmploymentType('Engineer', '', 'https://github.com/SimplifyJobs/New-Grad-Positions')
      ).toBe('full-time');
    });
  });

  describe('precedence', () => {
    test('internship beats contract', () => {
      expect(classifyEmploymentType('Contract Intern', '', '')).toBe('internship');
    });
    test('contract beats full-time', () => {
      expect(classifyEmploymentType('Full-time Contractor', '', '')).toBe('contract');
    });
    test('internship source beats a full-time-looking role', () => {
      expect(
        classifyEmploymentType('New Grad', '', 'https://github.com/x/2026-Engineer-Internship')
      ).toBe('internship');
    });
  });

  describe('unknown', () => {
    test('returns unknown when terms is only a work model', () => {
      expect(classifyEmploymentType('Software Engineer', 'Remote', '')).toBe('unknown');
      expect(classifyEmploymentType('Software Engineer', 'Hybrid', '')).toBe('unknown');
    });
    test('returns unknown with no signal', () => {
      expect(classifyEmploymentType('Software Engineer', 'N/A', '')).toBe('unknown');
    });
  });

  describe('fallback', () => {
    test('uses the fallback when no signal is found', () => {
      expect(classifyEmploymentType('Senior Software Engineer', '', '', 'full-time')).toBe('full-time');
    });
    test('explicit signals still beat the fallback', () => {
      expect(classifyEmploymentType('Software Engineer Intern', '', '', 'full-time')).toBe('internship');
      expect(classifyEmploymentType('Software Engineer (Contract)', '', '', 'full-time')).toBe('contract');
    });
    test('defaults to unknown when no fallback is given', () => {
      expect(classifyEmploymentType('Senior Software Engineer', '', '')).toBe('unknown');
    });
  });
});
