import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';
import { ActionResult, CompanyPipeline, PortfolioCompanySummary, PortfolioKpis } from './portfolio-company.model';

export interface PortfolioPageQuery {
  page: number;
  pageSize: number;
  search?: string;
}

export interface PortfolioPageResult {
  companies: PortfolioCompanySummary[];
  total: number;
  page: number;
  pageSize: number;
}

export interface PortfolioRepository {
  getCompanies(query: PortfolioPageQuery): Observable<PortfolioPageResult>;
  getKpis(): Observable<PortfolioKpis>;
  getCompanyPipeline(companyId: string): Observable<CompanyPipeline>;
  executeAction(companyId: string, stageId: string, actionId: string): Observable<ActionResult>;
}

export const PORTFOLIO_REPOSITORY = new InjectionToken<PortfolioRepository>('PORTFOLIO_REPOSITORY');
