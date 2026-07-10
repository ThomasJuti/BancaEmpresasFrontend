import { BackendPipelineStage } from '../models/pipeline-case.model';
import { PIPELINE_STAGE_ORDER, PipelineStageId } from '../models/pipeline-stage.model';
import { CompanyPipeline } from '../models/portfolio-company.model';
import { mapBackendStageToFrontend } from './pipeline-case.mapper';

const BACKEND_STAGE_ORDER: readonly BackendPipelineStage[] = [
  'file_matching',
  'sales_call',
  'power_apps',
  'delivery_confirmation',
  'activation_follow_up',
  'completed',
];

function backendStageIndex(stage: BackendPipelineStage | undefined): number {
  if (!stage) {
    return BACKEND_STAGE_ORDER.indexOf('file_matching');
  }
  const idx = BACKEND_STAGE_ORDER.indexOf(stage);
  return idx === -1 ? BACKEND_STAGE_ORDER.indexOf('file_matching') : idx;
}

function frontendStageIndex(stageId: PipelineStageId): number {
  return PIPELINE_STAGE_ORDER.indexOf(stageId);
}

/** Etapa efectiva del pipeline según Supabase (fuente de verdad). */
export function effectiveCurrentStageId(pipeline: CompanyPipeline): PipelineStageId {
  if (pipeline.pipelineCaseStage) {
    return mapBackendStageToFrontend(pipeline.pipelineCaseStage);
  }
  return pipeline.currentStageId;
}

export function isStageReachable(target: PipelineStageId, pipeline: CompanyPipeline): boolean {
  const current = effectiveCurrentStageId(pipeline);
  return frontendStageIndex(target) <= frontendStageIndex(current);
}

/** Power App habilitada solo cuando Supabase alcanzó power_apps o posterior. */
export function canOpenPowerApp(pipeline: CompanyPipeline): boolean {
  const stage = pipeline.pipelineCaseStage;
  if (!stage) {
    return false;
  }
  return backendStageIndex(stage) >= BACKEND_STAGE_ORDER.indexOf('power_apps');
}

export function isCallsStageComplete(pipeline: CompanyPipeline): boolean {
  const callsStage = pipeline.stages.find((s) => s.id === 'calls');
  return callsStage?.status === 'completed';
}
