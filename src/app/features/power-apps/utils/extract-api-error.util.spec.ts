import { describe, expect, it } from 'vitest';
import { extractApiErrorMessage, humanizeRuesError } from './extract-api-error.util';

describe('extract-api-error.util', () => {
  describe('extractApiErrorMessage', () => {
    it('returns fallback when no body', () => {
      expect(extractApiErrorMessage({}, 'fallback')).toBe('fallback');
    });

    it('parses string body', () => {
      expect(extractApiErrorMessage({ error: 'plain error' }, 'fb')).toBe('plain error');
    });

    it('parses nested JSON string', () => {
      expect(
        extractApiErrorMessage({ error: '{"detail":"nested detail"}' }, 'fb'),
      ).toBe('nested detail');
    });

    it('reads issues array', () => {
      expect(
        extractApiErrorMessage({ error: { issues: [{ message: 'issue msg' }] } }, 'fb'),
      ).toBe('issue msg');
    });

    it('reads nested error object and detail/message', () => {
      expect(extractApiErrorMessage({ error: { error: 'err' } }, 'fb')).toBe('err');
      expect(extractApiErrorMessage({ error: { error: { message: 'nested' } } }, 'fb')).toBe('nested');
      expect(extractApiErrorMessage({ error: { detail: 'detail msg' } }, 'fb')).toBe('detail msg');
      expect(extractApiErrorMessage({ error: { message: 'message msg' } }, 'fb')).toBe('message msg');
    });
  });

  describe('humanizeRuesError', () => {
    it('replaces mock missing hint', () => {
      expect(humanizeRuesError('JSON mock en salidas')).toContain('No hay datos de prueba');
      expect(humanizeRuesError('other')).toBe('other');
    });
  });
});
