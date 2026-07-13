import { describe, expect, it } from 'vitest';
import { isValidE164, toE164 } from './phone.util';

describe('phone.util', () => {
  describe('isValidE164', () => {
    it('validates E.164 numbers', () => {
      expect(isValidE164('+573001234567')).toBe(true);
      expect(isValidE164('573001234567')).toBe(false);
      expect(isValidE164(null)).toBe(false);
    });
  });

  describe('toE164', () => {
    it('returns null for empty input', () => {
      expect(toE164(null)).toBeNull();
      expect(toE164('')).toBeNull();
    });

    it('normalizes numbers already prefixed with +', () => {
      expect(toE164('+57 300 123 4567')).toBe('+573001234567');
    });

    it('converts Colombian mobile 10-digit numbers', () => {
      expect(toE164('3001234567')).toBe('+573001234567');
    });

    it('converts 12-digit numbers starting with 57', () => {
      expect(toE164('573001234567')).toBe('+573001234567');
    });

    it('returns null for invalid formats', () => {
      expect(toE164('12345')).toBeNull();
      expect(toE164('+abc')).toBeNull();
    });
  });
});
