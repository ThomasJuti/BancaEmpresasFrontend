import { PipelineStage, PipelineStageId } from './pipeline-stage.model';

export type ActivationStatus = 'pending' | 'activated' | 'at_risk' | 'cancelled';

export interface PortfolioCompanySummary {
  id: string;
  name: string;
  nit: string;
  currentStageId: PipelineStageId;
  currentStageLabel: string;
  progressPercent: number;
  cardShippedAt?: string;
  activatedAt?: string;
  assignedCommercial: string;
  activationStatus: ActivationStatus;
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

export type FollowUpPhase = 'not_shipped' | 'month_1' | 'month_2' | 'month_3' | 'activated' | 'cancelled';

export interface FollowUpSchedule {
  phase: FollowUpPhase;
  label: string;
  cadence: string;
  nextAction: string;
  nextActionDate?: string;
  daysSinceShipment: number;
  isCancellationRisk: boolean;
}
