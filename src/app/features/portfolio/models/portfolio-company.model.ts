import { PipelineStage, PipelineStageId } from './pipeline-stage.model';
import { BackendPipelineStage } from './pipeline-case.model';

export interface PortfolioCompanySummary {
  id: string;
  name: string;
  nit: string;
  clienteId?: string;
  currentStageId: PipelineStageId;
  currentStageLabel: string;
  progressPercent: number;
  phone?: string | null;
  email?: string | null;
  representanteLegalNombre?: string | null;
  pipelineCaseId?: string;
  pipelineCaseStage?: BackendPipelineStage;
  powerAppSubmittedAt?: string;
  powerAppRadicado?: string | null;
}

export interface CompanyPipeline extends PortfolioCompanySummary {
  stages: PipelineStage[];
}

export interface ActionResult {
  success: boolean;
  message: string;
  pipeline?: CompanyPipeline;
}
