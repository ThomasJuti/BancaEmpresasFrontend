import {
  PIPELINE_STAGE_LABELS,
  PIPELINE_STAGE_ORDER,
  PipelineAction,
  PipelineStage,
  PipelineStageId,
  PipelineSubStep,
  StepStatus,
} from '../models/pipeline-stage.model';
import {
  CompanyPipeline,
  PortfolioCompanySummary,
} from '../models/portfolio-company.model';

// Construcción del pipeline HITL de colocación (etapas, sub-pasos y acciones).
// Compartido por HttpPortfolioRepository para evitar duplicar la definición del proceso.

export function stageActions(stageId: PipelineStageId): PipelineAction[] {
  const actions: Record<PipelineStageId, PipelineAction[]> = {
    calls: [
      { id: 'view_call', label: 'Ver detalle llamada', kind: 'secondary' },
      { id: 'retry_contact', label: 'Reintentar contacto', kind: 'primary', requiresConfirmation: true, confirmationMessage: '¿Registrar un nuevo intento de contacto telefónico?' },
    ],
    power_app: [
      { id: 'fill_power_app', label: 'Diligenciar solicitud', kind: 'primary' },
      { id: 'mark_form_complete', label: 'Marcar formulario completo', kind: 'secondary', requiresConfirmation: true, confirmationMessage: '¿Confirmar que el formulario de realce fue diligenciado?' },
    ],
    operations: [
      { id: 'view_ops_status', label: 'Ver estado operaciones', kind: 'secondary' },
      { id: 'resend_goptc', label: 'Simular reenvío', kind: 'primary', requiresConfirmation: true, confirmationMessage: '¿Simular reenvío del archivo a GOPTC?' },
    ],
    card_delivery: [
      { id: 'confirm_delivery', label: 'Confirmar entrega', kind: 'primary', requiresConfirmation: true, confirmationMessage: '¿Confirmar que la tarjeta fue entregada al destinatario?' },
      { id: 'upload_receipt', label: 'Subir acuse (mock)', kind: 'secondary' },
    ],
    follow_up: [
      { id: 'send_email', label: 'Enviar correo', kind: 'primary' },
      { id: 'start_agent_call', label: 'Iniciar llamada agente', kind: 'secondary', requiresConfirmation: true, confirmationMessage: '¿Programar llamada de seguimiento con el agente?' },
      { id: 'view_next_reminder', label: 'Ver próximo recordatorio', kind: 'secondary' },
    ],
  };
  return actions[stageId];
}

export function defaultSubSteps(stageId: PipelineStageId, stageStatus: StepStatus): PipelineSubStep[] {
  const templates: Record<PipelineStageId, PipelineSubStep[]> = {
    calls: [
      { id: 'contact', title: 'Contacto inicial', description: 'Llamada outbound al representante de la empresa.', status: 'pending', assignee: 'Call Center' },
      { id: 'benefits', title: 'Presentación beneficios', description: 'Explicación de beneficios LATAM Business y cupo aprobado.', status: 'pending', assignee: 'Call Center' },
      { id: 'acceptance', title: 'Aceptación oferta', description: 'Cliente acepta avanzar con emisión de tarjeta.', status: 'pending', assignee: 'Call Center' },
      { id: 'recording', title: 'Grabación asociada', description: 'Grabación de la venta disponible para auditoría.', status: 'pending', assignee: 'Sistema' },
    ],
    power_app: [
      { id: 'form_start', title: 'Formulario realce iniciado', description: 'Apertura del formulario Power App post-venta.', status: 'pending', assignee: 'Asesor comercial' },
      { id: 'cardholder_data', title: 'Datos tarjetahabiente', description: 'Captura de datos del representante designado (PN).', status: 'pending', assignee: 'Asesor comercial' },
      { id: 'scheduling', title: 'Agendamiento entrega', description: 'Programación de entrega (3 días hábiles Bogotá).', status: 'pending', assignee: 'Asesor comercial' },
    ],
    operations: [
      { id: 'goptc_send', title: 'Envío a GOPTC', description: 'Archivo MFT de realce y agendamiento enviado.', status: 'pending', assignee: 'Operaciones TC' },
      { id: 'capture', title: 'Captura/realce', description: 'ANS 5 días hábiles para captura en GOPTC.', status: 'pending', assignee: 'GOPTC' },
      { id: 'logistics', title: 'Despacho operador logístico', description: 'Courier o comercial asignado realiza despacho.', status: 'pending', assignee: 'Logística' },
    ],
    card_delivery: [
      { id: 'manufacturing', title: 'Tarjeta fabricada', description: 'Fabricación del plástico (~7 días hábiles).', status: 'pending', assignee: 'GOPTC' },
      { id: 'delivery', title: 'Entrega', description: 'Entrega certificada al tarjetahabiente o tercero.', status: 'pending', assignee: 'Courier / Comercial' },
      { id: 'receipt', title: 'Acuse de recibido firmado', description: 'Acuse con firma, nombre, fecha y cédula.', status: 'pending', assignee: 'Destinatario' },
    ],
    follow_up: [
      { id: 'month1_rule', title: 'Regla mes 1', description: 'Si no activa en 30 días: correo + llamada agente.', status: 'pending', assignee: 'Sistema / Agente' },
      { id: 'month2_rule', title: 'Regla mes 2', description: 'Recordatorio cada 15 días sin activación.', status: 'pending', assignee: 'Sistema' },
      { id: 'month3_rule', title: 'Regla mes 3', description: 'Recordatorio semanal; cancelación al día 90.', status: 'pending', assignee: 'Sistema' },
    ],
  };

  const steps = templates[stageId].map((s) => ({ ...s }));
  if (stageStatus === 'completed') {
    return steps.map((s) => ({ ...s, status: 'completed' as StepStatus, completedAt: '2026-06-01T10:00:00.000Z' }));
  }
  if (stageStatus === 'in_progress') {
    return steps.map((s, i) => ({
      ...s,
      status: (i === 0 ? 'completed' : i === 1 ? 'in_progress' : 'pending') as StepStatus,
      ...(i === 0 ? { completedAt: '2026-06-15T10:00:00.000Z' } : {}),
    }));
  }
  return steps;
}

export function buildStages(
  currentStageId: PipelineStageId,
  overrides: Partial<Record<PipelineStageId, Partial<PipelineStage>>> = {},
): PipelineStage[] {
  const currentIndex = PIPELINE_STAGE_ORDER.indexOf(currentStageId);

  return PIPELINE_STAGE_ORDER.map((id, index) => {
    let status: StepStatus = 'pending';
    if (index < currentIndex) {
      status = 'completed';
    } else if (index === currentIndex) {
      status = 'in_progress';
    }

    const base: PipelineStage = {
      id,
      order: index + 1,
      title: PIPELINE_STAGE_LABELS[id],
      status,
      subSteps: defaultSubSteps(id, status),
      actions: stageActions(id),
      ...(id === 'calls' ? { linkedCallId: 'call-mock-001' } : {}),
    };

    return { ...base, ...overrides[id] };
  });
}

export function computeProgress(currentStageId: PipelineStageId): number {
  const index = PIPELINE_STAGE_ORDER.indexOf(currentStageId);
  return Math.round(((index + 0.5) / PIPELINE_STAGE_ORDER.length) * 100);
}

export function summaryFromPipeline(pipeline: CompanyPipeline): PortfolioCompanySummary {
  const { stages, ...summary } = pipeline;
  void stages;
  return summary;
}

/** Aplica una acción del pipeline sobre la empresa (muta el objeto) y devuelve el mensaje de feedback. */
export function applyPipelineAction(
  pipeline: CompanyPipeline,
  stageId: PipelineStageId,
  actionId: string,
): string {
  const stage = pipeline.stages.find((s) => s.id === stageId);
  if (!stage) {
    return 'Etapa no encontrada';
  }

  switch (actionId) {
    case 'retry_contact':
      stage.subSteps[0].status = 'in_progress';
      return 'Nuevo intento de contacto registrado.';
    case 'mark_form_complete':
    case 'power_app_approved':
      stage.subSteps.forEach((s) => {
        s.status = 'completed';
        s.completedAt = new Date().toISOString();
      });
      advanceStage(pipeline, 'power_app');
      return actionId === 'power_app_approved'
        ? 'Solicitud aprobada. Operaciones puede iniciar realce.'
        : 'Formulario Power App marcado como completo.';
    case 'fill_power_app':
      return 'Abrir formulario de solicitud.';
    case 'resend_goptc':
      return 'Reenvío a GOPTC simulado correctamente.';
    case 'view_ops_status':
      return 'Estado operaciones: en captura (ANS día 3 de 5).';
    case 'confirm_delivery':
      if (!pipeline.cardShippedAt) {
        pipeline.cardShippedAt = new Date().toISOString();
      }
      stage.subSteps[2].status = 'in_progress';
      return 'Entrega confirmada. Pendiente acuse de recibido.';
    case 'upload_receipt':
      stage.subSteps[2].status = 'completed';
      stage.subSteps[2].completedAt = new Date().toISOString();
      stage.status = 'completed';
      advanceStage(pipeline, 'card_delivery');
      return 'Acuse de recibido cargado (mock).';
    case 'send_email':
      return 'Correo de recordatorio de activación enviado (mock).';
    case 'start_agent_call':
      return 'Llamada de agente programada para seguimiento (mock).';
    case 'view_next_reminder':
      return 'Próximo recordatorio visible en el panel de seguimiento.';
    case 'view_call':
      return 'Redirigir a detalle de llamada cuando exista integración.';
    default:
      return 'Acción ejecutada correctamente (mock).';
  }
}

export function advanceStage(pipeline: CompanyPipeline, completedStageId: PipelineStageId): void {
  const completed = pipeline.stages.find((s) => s.id === completedStageId);
  if (completed) {
    completed.status = 'completed';
    completed.subSteps.forEach((s) => {
      s.status = 'completed';
      if (!s.completedAt) {
        s.completedAt = new Date().toISOString();
      }
    });
  }

  const nextIndex = PIPELINE_STAGE_ORDER.indexOf(completedStageId) + 1;
  if (nextIndex < PIPELINE_STAGE_ORDER.length) {
    const nextId = PIPELINE_STAGE_ORDER[nextIndex];
    pipeline.currentStageId = nextId;
    pipeline.currentStageLabel = PIPELINE_STAGE_LABELS[nextId];
    pipeline.progressPercent = computeProgress(nextId);
    const nextStage = pipeline.stages.find((s) => s.id === nextId);
    if (nextStage) {
      nextStage.status = 'in_progress';
    }
  }
}
