import { PIPELINE_STAGE_LABELS, PipelineStageId } from '../models/pipeline-stage.model';
import type { BackendPipelineStage } from '../models/pipeline-case.model';

const BACKEND_STAGE_ORDER: readonly BackendPipelineStage[] = [
  'file_matching',
  'sales_call',
  'power_apps',
  'delivery_confirmation',
  'activation_follow_up',
  'completed',
];

export function mapBackendStageToFrontend(stage: BackendPipelineStage): PipelineStageId {
  switch (stage) {
    case 'file_matching':
    case 'sales_call':
      return 'calls';
    case 'power_apps':
      return 'power_app';
    case 'delivery_confirmation':
      return 'operations';
    case 'activation_follow_up':
    case 'completed':
    case 'rejected':
    case 'failed':
      return 'follow_up';
    default:
      return 'calls';
  }
}

export function isPowerAppStageCompleted(stage: BackendPipelineStage): boolean {
  const idx = BACKEND_STAGE_ORDER.indexOf(stage);
  const powerIdx = BACKEND_STAGE_ORDER.indexOf('power_apps');
  if (idx === -1 || powerIdx === -1) {
    return false;
  }
  return idx > powerIdx;
}

export function stageLabelForBackend(stage: BackendPipelineStage): string {
  const frontendId = mapBackendStageToFrontend(stage);
  return PIPELINE_STAGE_LABELS[frontendId];
}
