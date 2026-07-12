import { environment } from '../../../environments/environment';

export const API_BASE_URL = environment.apiBaseUrl;

export const SALES_CALLS_API = `${API_BASE_URL}/sales-calls`;
export const FILE_MATCHING_API = `${API_BASE_URL}/file-matching`;
export const POWER_APPS_API = `${API_BASE_URL}/power-apps`;
export const PIPELINE_API = `${API_BASE_URL}/pipeline`;
export const ACTIVATION_FOLLOW_UP_API = `${API_BASE_URL}/activation-follow-up`;
export const DELIVERY_CONFIRMATION_API = `${API_BASE_URL}/delivery-confirmation`;
