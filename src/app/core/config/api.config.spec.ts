import { describe, expect, it } from 'vitest';
import {
  ACTIVATION_FOLLOW_UP_API,
  API_BASE_URL,
  DELIVERY_CONFIRMATION_API,
  FILE_MATCHING_API,
  PIPELINE_API,
  POWER_APPS_API,
  SALES_CALLS_API,
} from './api.config';

describe('api.config', () => {
  it('builds API endpoints from environment base URL', () => {
    expect(API_BASE_URL).toContain('/api');
    expect(SALES_CALLS_API).toBe(`${API_BASE_URL}/sales-calls`);
    expect(FILE_MATCHING_API).toBe(`${API_BASE_URL}/file-matching`);
    expect(POWER_APPS_API).toBe(`${API_BASE_URL}/power-apps`);
    expect(PIPELINE_API).toBe(`${API_BASE_URL}/pipeline`);
    expect(ACTIVATION_FOLLOW_UP_API).toBe(`${API_BASE_URL}/activation-follow-up`);
    expect(DELIVERY_CONFIRMATION_API).toBe(`${API_BASE_URL}/delivery-confirmation`);
  });
});
