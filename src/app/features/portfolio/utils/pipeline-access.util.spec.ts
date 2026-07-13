import { describe, expect, it } from 'vitest';
import { CompanyPipeline } from '../models/portfolio-company.model';
import {
  canOpenPowerApp,
  effectiveCurrentStageId,
  isCallsStageComplete,
  isStageReachable,
} from './pipeline-access.util';
import { buildStages } from './pipeline-builder';

function pipeline(overrides: Partial<CompanyPipeline> = {}): CompanyPipeline {
  return {
    id: '901183139',
    name: 'Test Co',
    nit: '901183139',
    clienteId: '901183139',
    currentStageId: 'calls',
    currentStageLabel: 'Llamadas',
    progressPercent: 10,
    stages: buildStages('calls'),
    ...overrides,
  };
}

describe('pipeline-access.util', () => {
  describe('effectiveCurrentStageId', () => {
    it('uses backend stage when present', () => {
      expect(
        effectiveCurrentStageId(pipeline({ pipelineCaseStage: 'power_apps', currentStageId: 'calls' })),
      ).toBe('power_app');
    });

    it('falls back to currentStageId', () => {
      expect(effectiveCurrentStageId(pipeline())).toBe('calls');
    });
  });

  describe('isStageReachable', () => {
    it('allows stages up to current', () => {
      const p = pipeline({ currentStageId: 'power_app', pipelineCaseStage: 'power_apps' });
      expect(isStageReachable('calls', p)).toBe(true);
      expect(isStageReachable('follow_up', p)).toBe(false);
    });
  });

  describe('canOpenPowerApp', () => {
    it('requires backend stage at or after power_apps', () => {
      expect(canOpenPowerApp(pipeline())).toBe(false);
      expect(canOpenPowerApp(pipeline({ pipelineCaseStage: 'power_apps' }))).toBe(true);
      expect(canOpenPowerApp(pipeline({ pipelineCaseStage: 'delivery_confirmation' }))).toBe(true);
    });
  });

  describe('isCallsStageComplete', () => {
    it('checks calls stage status', () => {
      const p = pipeline();
      expect(isCallsStageComplete(p)).toBe(false);
      p.stages.find((s) => s.id === 'calls')!.status = 'completed';
      expect(isCallsStageComplete(p)).toBe(true);
    });
  });
});
