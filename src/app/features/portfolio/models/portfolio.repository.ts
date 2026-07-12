import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';
import { CallDetail } from '../../../core/services/sales-calls.service';
import { PipelineStageId } from './pipeline-stage.model';
import { ActionResult, CompanyPipeline, PortfolioCompanySummary } from './portfolio-company.model';

export interface PortfolioPageQuery {
  page: number;
  pageSize: number;
  search?: string;
  stage?: PipelineStageId;
}

export interface PortfolioPageResult {
  companies: PortfolioCompanySummary[];
  total: number;
  page: number;
  pageSize: number;
}

export interface PortfolioRepository {
  getCompanies(query: PortfolioPageQuery): Observable<PortfolioPageResult>;
  getCompanyPipeline(companyId: string): Observable<CompanyPipeline>;
  getCallsForCompany(nit: string): Observable<CallDetail[]>;
  invalidateCompanyCache(companyId: string): void;
  executeAction(companyId: string, stageId: string, actionId: string): Observable<ActionResult>;
}

export const PORTFOLIO_REPOSITORY = new InjectionToken<PortfolioRepository>('PORTFOLIO_REPOSITORY');
