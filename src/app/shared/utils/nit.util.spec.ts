import { describe, expect, it } from 'vitest';
import { matchesNit, normalizeNit } from './nit.util';

describe('nit.util', () => {
  describe('normalizeNit', () => {
    it('returns empty for falsy values', () => {
      expect(normalizeNit(null)).toBe('');
      expect(normalizeNit(undefined)).toBe('');
      expect(normalizeNit('')).toBe('');
    });

    it('strips separators and trims', () => {
      expect(normalizeNit(' 901.183-139 ')).toBe('901183139');
    });
  });

  describe('matchesNit', () => {
    it('matches normalized NITs', () => {
      expect(matchesNit('901.183-139', '901183139')).toBe(true);
    });

    it('returns false when either side is empty', () => {
      expect(matchesNit('', '901183139')).toBe(false);
      expect(matchesNit('901183139', null)).toBe(false);
    });

    it('returns false for different NITs', () => {
      expect(matchesNit('901183139', '800123456')).toBe(false);
    });
  });
});
