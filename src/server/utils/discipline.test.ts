import { test, expect, describe } from 'bun:test';
import { classifyDiscipline } from './discipline';

describe('classifyDiscipline', () => {
  test('data engineering', () => {
    expect(classifyDiscipline('Data Engineer')).toBe('data-engineering');
    expect(classifyDiscipline('Senior ETL Developer')).toBe('data-engineering');
  });

  test('data science', () => {
    expect(classifyDiscipline('Data Scientist')).toBe('data-science');
    expect(classifyDiscipline('Data Analyst, Growth')).toBe('data-science');
  });

  test('machine learning / ai', () => {
    expect(classifyDiscipline('Machine Learning Engineer')).toBe('ml-ai');
    expect(classifyDiscipline('AI Research Engineer')).toBe('ml-ai');
  });

  test('full stack', () => {
    expect(classifyDiscipline('Full Stack Engineer')).toBe('full-stack');
    expect(classifyDiscipline('Fullstack Developer')).toBe('full-stack');
    expect(classifyDiscipline('Software Engineer - Full-Stack')).toBe('full-stack');
  });

  test('frontend', () => {
    expect(classifyDiscipline('Frontend Engineer')).toBe('frontend');
    expect(classifyDiscipline('Front-End Developer')).toBe('frontend');
  });

  test('backend', () => {
    expect(classifyDiscipline('Backend Engineer')).toBe('backend');
    expect(classifyDiscipline('Back End Software Engineer')).toBe('backend');
  });

  test('mobile', () => {
    expect(classifyDiscipline('iOS Engineer')).toBe('mobile');
    expect(classifyDiscipline('Android Developer')).toBe('mobile');
  });

  test('devops', () => {
    expect(classifyDiscipline('DevOps Engineer')).toBe('devops');
    expect(classifyDiscipline('Site Reliability Engineer')).toBe('devops');
  });

  test('security', () => {
    expect(classifyDiscipline('Security Engineer')).toBe('security');
  });

  test('priority: data engineering before generic software', () => {
    expect(classifyDiscipline('Software Engineer, Data Engineering')).toBe('data-engineering');
  });

  test('priority: full-stack before backend when both present', () => {
    expect(classifyDiscipline('Full Stack Engineer (Backend Heavy)')).toBe('full-stack');
  });

  test('generic software fallback', () => {
    expect(classifyDiscipline('Software Engineer')).toBe('software');
    expect(classifyDiscipline('Software Developer')).toBe('software');
  });

  test('other fallback', () => {
    expect(classifyDiscipline('Technical Program Manager')).toBe('other');
  });
});
