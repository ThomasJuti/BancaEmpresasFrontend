import { describe, expect, it } from 'vitest';
import {
  POWER_APP_FIELD_ENTRIES,
  formatPowerAppFieldValue,
  powerAppSectionTitle,
} from './power-app-field-labels.util';

describe('power-app-field-labels.util', () => {
  it('formats currency and punto entrega', () => {
    const currencyEntry = POWER_APP_FIELD_ENTRIES.find((e) => e.format === 'currency')!;
    expect(formatPowerAppFieldValue(currencyEntry, 1000000)).toContain('$');
    const puntoEntry = POWER_APP_FIELD_ENTRIES.find((e) => e.format === 'puntoEntrega')!;
    expect(formatPowerAppFieldValue(puntoEntry, 'PUNTO_ENTREGA_A_COMERCIAL')).toContain('comercial');
  });

  it('returns dash for empty values', () => {
    expect(formatPowerAppFieldValue(POWER_APP_FIELD_ENTRIES[0], null)).toBe('—');
  });

  it('returns string for plain values', () => {
    expect(formatPowerAppFieldValue(POWER_APP_FIELD_ENTRIES[0], 'Pyme')).toBe('Pyme');
  });

  it('returns section titles', () => {
    expect(powerAppSectionTitle('cliente')).toBe('Cliente');
    expect(powerAppSectionTitle('documentos')).toBe('Documentos');
  });
});
