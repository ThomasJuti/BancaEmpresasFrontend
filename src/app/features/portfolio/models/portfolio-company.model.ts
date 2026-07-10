import { PipelineStage, PipelineStageId } from './pipeline-stage.model';

export type ActivationStatus = 'pending' | 'activated' | 'at_risk' | 'cancelled';

export interface PortfolioCompanySummary {
  id: string;
  name: string;
  nit: string;
  clienteId?: string;
  currentStageId: PipelineStageId;
  currentStageLabel: string;
  progressPercent: number;
  cardShippedAt?: string;
  activatedAt?: string;
  assignedCommercial: string;
  activationStatus: ActivationStatus;
  phone?: string | null;
  email?: string | null;
  powerAppSubmittedAt?: string;
  powerAppRadicado?: string | null;
}

export interface CompanyPipeline extends PortfolioCompanySummary {
  stages: PipelineStage[];
}

export interface PortfolioKpis {
  sold: number;
  inFollowUp: number;
  activated: number;
  atRisk: number;
}

export interface ActionResult {
  success: boolean;
  message: string;
  pipeline?: CompanyPipeline;
}
