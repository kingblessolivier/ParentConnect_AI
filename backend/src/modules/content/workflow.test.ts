import { describe, it, expect } from 'vitest';
import { assertCanTransition, findTransition } from './workflow.js';

describe('content workflow', () => {
  it('allows the happy path draft → … → published → retired', () => {
    expect(assertCanTransition('draft', 'clinical_review', 'reviewer').to).toBe('clinical_review');
    expect(assertCanTransition('clinical_review', 'cultural_review', 'reviewer').stamps).toBe(
      'clinical',
    );
    expect(assertCanTransition('cultural_review', 'approved', 'reviewer').stamps).toBe('cultural');
    expect(assertCanTransition('approved', 'published', 'admin').to).toBe('published');
    expect(assertCanTransition('published', 'retired', 'admin').to).toBe('retired');
  });

  it('allows rejection back to draft', () => {
    expect(assertCanTransition('clinical_review', 'draft', 'reviewer').to).toBe('draft');
    expect(assertCanTransition('cultural_review', 'draft', 'reviewer').to).toBe('draft');
  });

  it('rejects an illegal transition (400)', () => {
    expect(() => assertCanTransition('draft', 'published', 'admin')).toThrow(/Cannot move/);
    expect(findTransition('draft', 'published')).toBeUndefined();
  });

  it('rejects a role that may not publish (403)', () => {
    expect(() => assertCanTransition('approved', 'published', 'reviewer')).toThrow(/may not/);
    expect(() => assertCanTransition('approved', 'published', 'parent')).toThrow(/may not/);
  });
});
