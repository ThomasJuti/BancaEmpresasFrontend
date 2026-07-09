export type StepStatus = 'pending' | 'in_progress' | 'completed' | 'blocked';

export type PipelineStageId =
  | 'calls'
  | 'power_app'
  | 'operations'
  | 'card_delivery'
  | 'follow_up';

export interface PipelineSubStep {
  id: string;
  title: string;
  description: string;
  status: StepStatus;
  completedAt?: string;
  assignee?: string;
}

export interface PipelineAction {
  id: string;
  label: string;
  kind: 'primary' | 'secondary';
  requiresConfirmation?: boolean;
  confirmationMessage?: string;
}

export interface PipelineStage {
  id: PipelineStageId;
  order: number;
  title: string;
  status: StepStatus;
  subSteps: PipelineSubStep[];
  actions: PipelineAction[];
  linkedCallId?: string;
}

export const PIPELINE_STAGE_LABELS: Record<PipelineStageId, string> = {
  calls: 'Llamadas',
  power_app: 'Power App',
  operations: 'Operaciones y envío',
  card_delivery: 'Tarjeta y acuse',
  follow_up: 'Seguimiento activación',
};

export const PIPELINE_STAGE_ORDER: PipelineStageId[] = [
  'calls',
  'power_app',
  'operations',
  'card_delivery',
  'follow_up',
];
