import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';
import { ActionResult, CompanyPipeline, PortfolioCompanySummary, PortfolioKpis } from './portfolio-company.model';

export interface PortfolioRepository {
  getCompanies(): Observable<PortfolioCompanySummary[]>;
  getKpis(): Observable<PortfolioKpis>;
  getCompanyPipeline(companyId: string): Observable<CompanyPipeline>;
  executeAction(companyId: string, stageId: string, actionId: string): Observable<ActionResult>;
}

export const PORTFOLIO_REPOSITORY = new InjectionToken<PortfolioRepository>('PORTFOLIO_REPOSITORY');
