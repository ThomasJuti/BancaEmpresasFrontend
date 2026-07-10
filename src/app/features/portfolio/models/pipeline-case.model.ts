export type BackendPipelineStage =
  | 'file_matching'
  | 'sales_call'
  | 'power_apps'
  | 'delivery_confirmation'
  | 'activation_follow_up'
  | 'completed'
  | 'rejected'
  | 'failed';

export interface PipelineCaseDto {
  id: string;
  leadId: string;
  stage: BackendPipelineStage;
  createdAt: string;
  updatedAt: string;
}

export interface PipelineCaseResponse {
  case: PipelineCaseDto;
}
