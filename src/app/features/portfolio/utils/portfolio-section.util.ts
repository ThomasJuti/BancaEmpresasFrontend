import { PipelineStageId } from '../models/pipeline-stage.model';
import { PortfolioCompanySummary } from '../models/portfolio-company.model';
import { PortfolioListSection } from '../models/portfolio.repository';

type SectionCompany = Pick<PortfolioCompanySummary, 'hasCall' | 'currentStageId'>;

/** Empresa sin llamada registrada, pendiente de contacto del call center. */
export function isPendingCallCompany(company: SectionCompany): boolean {
  return !company.hasCall && company.currentStageId === 'calls';
}

/** Empresa con llamada o avance en el pipeline post-venta. */
export function isPipelineSectionCompany(company: SectionCompany): boolean {
  return !!company.hasCall || company.currentStageId !== 'calls';
}

export function matchesPortfolioSection(
  company: SectionCompany,
  section: PortfolioListSection,
): boolean {
  return section === 'pending_calls'
    ? isPendingCallCompany(company)
    : isPipelineSectionCompany(company);
}

export function matchesStageFilter(
  company: Pick<PortfolioCompanySummary, 'currentStageId'>,
  stage?: PipelineStageId,
): boolean {
  return !stage || company.currentStageId === stage;
}
