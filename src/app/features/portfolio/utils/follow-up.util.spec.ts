import { describe, expect, it } from 'vitest';
import { stepStatusLabel } from './follow-up.util';

describe('follow-up.util', () => {
  it('maps known statuses', () => {
    expect(stepStatusLabel('pending')).toBe('Pendiente');
    expect(stepStatusLabel('in_progress')).toBe('En curso');
    expect(stepStatusLabel('completed')).toBe('Completado');
    expect(stepStatusLabel('blocked')).toBe('Pendiente');
    expect(stepStatusLabel('failed')).toBe('No detectado');
  });

  it('returns raw status for unknown values', () => {
    expect(stepStatusLabel('custom')).toBe('custom');
  });
});
