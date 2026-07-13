import { describe, expect, it } from 'vitest';
import { CallDetail } from '../../core/services/sales-calls.service';
import {
  callContactSubtitle,
  callContactTitle,
  callDataEntries,
  callFieldLabel,
  callOriginLabel,
  callStatusLabel,
  clientInterested,
  endedReasonLabel,
  formatCallValue,
  identityVerified,
  isCallProcessing,
  isCallQualifiedForPipeline,
  isCallSuccess,
  isCallTerminal,
  isManualCall,
  manualNotesPreview,
  noInterestReason,
  readCallVar,
} from './call-display.util';

function baseCall(overrides: Partial<CallDetail> = {}): CallDetail {
  return {
    id: 'c1',
    agentId: 'agent-1',
    phoneNumber: '+573001234567',
    variables: {},
    status: 'completed',
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
    ...overrides,
  };
}

describe('call-display.util', () => {
  describe('formatCallValue', () => {
    it('formats nullish and booleans', () => {
      expect(formatCallValue(null)).toBe('—');
      expect(formatCallValue(true)).toBe('Sí');
      expect(formatCallValue(false)).toBe('No');
    });

    it('formats string truthiness aliases', () => {
      expect(formatCallValue('si')).toBe('Sí');
      expect(formatCallValue('no')).toBe('No');
    });

    it('formats arrays and objects', () => {
      expect(formatCallValue(['a', 'b'])).toBe('a, b');
      expect(formatCallValue({ foo: 'bar' })).toContain('Foo');
      expect(formatCallValue({})).toBe('—');
    });

    it('formats numbers', () => {
      expect(formatCallValue(42)).toBe('42');
    });
  });

  describe('callFieldLabel', () => {
    it('returns known labels and title-cases unknown keys', () => {
      expect(callFieldLabel('customerName')).toBe('Contacto');
      expect(callFieldLabel('custom_field')).toBe('Custom Field');
    });
  });

  describe('endedReasonLabel', () => {
    it('maps known reasons and falls back', () => {
      expect(endedReasonLabel('asesor-manual')).toBe('Registro manual del asesor');
      expect(endedReasonLabel(null)).toBe('—');
      expect(endedReasonLabel('custom_reason')).toContain('Custom');
    });
  });

  describe('callStatusLabel', () => {
    it('maps statuses', () => {
      expect(callStatusLabel('completed')).toBe('Completada');
      expect(callStatusLabel('failed')).toBe('Fallida');
    });
  });

  describe('manual call helpers', () => {
    it('detects manual calls', () => {
      expect(isManualCall(baseCall({ agentId: 'asesor-manual' }))).toBe(true);
      expect(isManualCall(baseCall({ variables: { canal: 'manual' } }))).toBe(true);
      expect(callOriginLabel(baseCall({ agentId: 'asesor-manual' }))).toBe('Registro del asesor');
    });
  });

  describe('isCallSuccess', () => {
    it('accepts boolean and string variants', () => {
      expect(isCallSuccess(true)).toBe(true);
      expect(isCallSuccess('true')).toBe(true);
      expect(isCallSuccess('Verdadero')).toBe(true);
      expect(isCallSuccess(false)).toBe(false);
    });
  });

  describe('readCallVar and derived flags', () => {
    it('reads from outputVariables and structuredData', () => {
      const call = baseCall({
        outputVariables: { identidad_verificada: 'si' },
        structuredData: { cliente_interesado: 'no' },
      });
      expect(readCallVar(call, ['identidad_verificada'])).toBe('Sí');
      expect(identityVerified(call)).toBe(true);
      expect(clientInterested(call)).toBe(false);
    });

    it('returns null for missing or dash values', () => {
      const call = baseCall();
      expect(identityVerified(call)).toBeNull();
      expect(noInterestReason(call)).toBeNull();
    });

    it('returns no interest reason when present', () => {
      const call = baseCall({
        structuredData: { motivo_no_interes: 'Precio alto' },
      });
      expect(noInterestReason(call)).toBe('Precio alto');
      expect(noInterestReason(baseCall({ structuredData: { motivo_no_interes: 'no aplica' } }))).toBeNull();
    });
  });

  describe('callDataEntries', () => {
    it('filters hidden and headline keys', () => {
      const entries = callDataEntries(
        {
          customerName: 'Ana',
          fonemaCallId: 'x',
          identidad_verificada: true,
        },
        { excludeHeadlines: true },
      );
      expect(entries.some((e) => e.key === 'fonemaCallId')).toBe(false);
      expect(entries.some((e) => e.key === 'identidad_verificada')).toBe(false);
      expect(entries.some((e) => e.key === 'customerName')).toBe(true);
    });

    it('returns empty for undefined data', () => {
      expect(callDataEntries(undefined)).toEqual([]);
    });
  });

  describe('callContactTitle and subtitle', () => {
    it('prefers manual customer name', () => {
      expect(
        callContactTitle(baseCall({ agentId: 'asesor-manual', customerName: '  Juan  ' })),
      ).toBe('Juan');
    });

    it('builds subtitle from variables', () => {
      const sub = callContactSubtitle(
        baseCall({
          variables: { empresa: 'ACME', nit: '900' },
          phoneNumber: '+573001234567',
        }),
      );
      expect(sub).toContain('ACME');
      expect(sub).toContain('NIT 900');
    });
  });

  describe('processing and terminal states', () => {
    it('detects processing completed calls without analysis', () => {
      expect(isCallProcessing(baseCall({ status: 'completed', summary: undefined }))).toBe(true);
      expect(isCallProcessing(baseCall({ status: 'completed', summary: 'ok' }))).toBe(false);
    });

    it('detects terminal statuses', () => {
      expect(isCallTerminal({ status: 'completed' })).toBe(true);
      expect(isCallTerminal({ status: 'queued' })).toBe(false);
    });
  });

  describe('qualification and notes', () => {
    it('qualifies by success evaluation or identity+interest', () => {
      expect(isCallQualifiedForPipeline(baseCall({ successEvaluation: true }))).toBe(true);
      expect(
        isCallQualifiedForPipeline(
          baseCall({
            structuredData: { identidad_verificada: 'si', cliente_interesado: 'si' },
          }),
        ),
      ).toBe(true);
    });

    it('previews manual notes with truncation', () => {
      const long = 'x'.repeat(80);
      expect(manualNotesPreview(baseCall({ agentId: 'asesor-manual', summary: long }), 60)).toMatch(/…$/);
      expect(manualNotesPreview(baseCall({ summary: 'short' }))).toBeNull();
    });
  });
});
