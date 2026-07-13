import { describe, expect, it } from 'vitest';
import { CompanyPipeline } from '../models/portfolio-company.model';
import {
  advanceStage,
  applyCallState,
  applyPipelineAction,
  buildStages,
  computeProgress,
  defaultSubSteps,
  resolveStageActions,
  stageActions,
  summaryFromPipeline,
} from './pipeline-builder';

function basePipeline(
  stageId: CompanyPipeline['currentStageId'] = 'calls',
  options: { pipelineCaseStage?: CompanyPipeline['pipelineCaseStage'] } = {},
): CompanyPipeline {
  const stages = buildStages(stageId);
  return {
    id: '901183139',
    name: 'ACME',
    nit: '901183139',
    clienteId: '901183139',
    currentStageId: stageId,
    currentStageLabel: 'Llamadas',
    progressPercent: computeProgress(stageId),
    pipelineCaseStage: options.pipelineCaseStage,
    stages,
  };
}

describe('pipeline-builder', () => {
  it('returns stage actions per stage', () => {
    expect(stageActions('calls')).toEqual([]);
    expect(stageActions('power_app').length).toBeGreaterThan(0);
  });

  it('builds default substeps for completed and in_progress', () => {
    const completed = defaultSubSteps('calls', 'completed');
    expect(completed.every((s) => s.status === 'completed')).toBe(true);
    const inProgressCalls = defaultSubSteps('calls', 'in_progress');
    expect(inProgressCalls[0].status).toBe('in_progress');
    const inProgressOps = defaultSubSteps('operations', 'in_progress');
    expect(inProgressOps[1].status).toBe('in_progress');
  });

  it('builds stages with overrides', () => {
    const stages = buildStages('power_app', { power_app: { title: 'Custom' } });
    expect(stages.find((s) => s.id === 'power_app')?.title).toBe('Custom');
    expect(stages.find((s) => s.id === 'calls')?.status).toBe('completed');
  });

  it('computes progress', () => {
    expect(computeProgress('calls')).toBeGreaterThan(0);
    expect(computeProgress('follow_up')).toBe(90);
  });

  it('resolves stage actions based on pipeline state', () => {
    const p = basePipeline('power_app', { pipelineCaseStage: 'power_apps' });
    expect(resolveStageActions(p.stages.find((s) => s.id === 'power_app')!, p).length).toBeGreaterThan(0);

    p.powerAppSubmittedAt = '2026-01-01';
    const submitted = resolveStageActions(p.stages.find((s) => s.id === 'power_app')!, p);
    expect(submitted.every((a) => a.id === 'view_power_app_result')).toBe(true);

    const followUp = basePipeline('follow_up');
    followUp.stages.find((s) => s.id === 'follow_up')!.status = 'completed';
    expect(resolveStageActions(followUp.stages.find((s) => s.id === 'follow_up')!, followUp)).toEqual([]);
  });

  it('returns empty power_app actions when cannot open', () => {
    const p = basePipeline('calls');
    const stage = p.stages.find((s) => s.id === 'power_app')!;
    expect(resolveStageActions(stage, p)).toEqual([]);
  });

  it('summarizes pipeline without stages', () => {
    const p = basePipeline();
    const summary = summaryFromPipeline(p);
    expect(summary.id).toBe(p.id);
    expect((summary as CompanyPipeline).stages).toBeUndefined();
  });

  describe('applyPipelineAction', () => {
    it('handles known actions', () => {
      const p = basePipeline('power_app');
      expect(applyPipelineAction(p, 'power_app', 'fill_power_app')).toContain('formulario');
      expect(applyPipelineAction(p, 'operations', 'view_ops_status')).toContain('operaciones');
      expect(applyPipelineAction(p, 'operations', 'resend_goptc')).toContain('GOPTC');
    });

    it('marks form complete and advances', () => {
      const p = basePipeline('power_app');
      const msg = applyPipelineAction(p, 'power_app', 'mark_form_complete');
      expect(msg).toContain('completo');
      expect(p.currentStageId).toBe('operations');
    });

    it('handles card delivery and finalize', () => {
      const p = basePipeline('card_delivery');
      applyPipelineAction(p, 'card_delivery', 'confirm_delivery');
      expect(p.stages.find((s) => s.id === 'card_delivery')!.subSteps[2].status).toBe('in_progress');

      applyPipelineAction(p, 'card_delivery', 'upload_receipt');
      expect(p.currentStageId).toBe('follow_up');

      const follow = basePipeline('follow_up');
      applyPipelineAction(follow, 'follow_up', 'finalize_delivery');
      expect(follow.progressPercent).toBe(100);
    });

    it('returns messages for unknown stage and default action', () => {
      expect(applyPipelineAction(basePipeline(), 'calls', 'retry_contact')).toContain('contacto');
      expect(applyPipelineAction(basePipeline(), 'calls' as never, 'unknown')).toContain('mock');
      expect(applyPipelineAction(basePipeline(), 'invalid' as never, 'x')).toBe('Etapa no encontrada');
    });
  });

  describe('applyCallState', () => {
    it('no-ops without stage or call', () => {
      const p = basePipeline();
      applyCallState(p, undefined);
      expect(p.stages[0].subSteps[0].status).toBe('in_progress');
    });

    it('sets substeps for queued/in_progress', () => {
      const p = basePipeline();
      applyCallState(p, { status: 'queued', hasRecording: false, qualified: false, callId: 'c1' });
      expect(p.stages[0].linkedCallId).toBe('c1');
      expect(p.stages[0].subSteps[0].status).toBe('in_progress');
    });

    it('handles processing completed call', () => {
      const p = basePipeline();
      applyCallState(p, {
        status: 'completed',
        hasRecording: false,
        qualified: false,
        processing: true,
      });
      expect(p.stages[0].subSteps[0].status).toBe('in_progress');
    });

    it('completes qualified call', () => {
      const p = basePipeline();
      applyCallState(p, {
        status: 'completed',
        hasRecording: true,
        qualified: true,
        identityVerified: true,
        clientInterested: true,
        at: '2026-06-01',
      });
      expect(p.stages[0].status).toBe('completed');
    });

    it('marks failed protocol substeps', () => {
      const p = basePipeline();
      applyCallState(p, {
        status: 'failed',
        hasRecording: false,
        qualified: false,
        identityVerified: false,
        clientInterested: false,
      });
      expect(p.stages[0].subSteps[1].status).toBe('failed');
    });
  });

  describe('advanceStage', () => {
    it('advances to next stage', () => {
      const p = basePipeline('calls');
      advanceStage(p, 'calls');
      expect(p.currentStageId).toBe('power_app');
    });
  });
});
