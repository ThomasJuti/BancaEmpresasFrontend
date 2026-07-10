export type StepStatus = 'pending' | 'in_progress' | 'completed' | 'blocked' | 'failed';

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
  // Check único de cierre: el monitoreo de uso vive en la vista lateral "Seguimiento".
  follow_up: 'Cierre de entrega',
};

/** Etiquetas cortas para filtros y navegación del asesor. */
export const PIPELINE_STAGE_FILTER_LABELS: Record<PipelineStageId, string> = {
  calls: 'Contacto telefónico',
  power_app: 'Solicitud Power App',
  operations: 'Operaciones',
  card_delivery: 'Entrega de tarjeta',
  follow_up: 'Activación',
};

export const PIPELINE_STAGE_ORDER: PipelineStageId[] = [
  'calls',
  'power_app',
  'operations',
  'card_delivery',
  'follow_up',
];
