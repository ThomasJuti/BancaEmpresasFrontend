import { describe, expect, it } from 'vitest';
import { isPowerAppStageCompleted, mapBackendStageToFrontend } from './pipeline-case.mapper';

describe('pipeline-case.mapper', () => {
  describe('mapBackendStageToFrontend', () => {
    it('maps backend stages to frontend ids', () => {
      expect(mapBackendStageToFrontend('file_matching')).toBe('calls');
      expect(mapBackendStageToFrontend('sales_call')).toBe('calls');
      expect(mapBackendStageToFrontend('power_apps')).toBe('power_app');
      expect(mapBackendStageToFrontend('delivery_confirmation')).toBe('operations');
      expect(mapBackendStageToFrontend('activation_follow_up')).toBe('follow_up');
      expect(mapBackendStageToFrontend('completed')).toBe('follow_up');
      expect(mapBackendStageToFrontend('rejected')).toBe('follow_up');
      expect(mapBackendStageToFrontend('failed')).toBe('follow_up');
      expect(mapBackendStageToFrontend('unknown' as never)).toBe('calls');
    });
  });

  describe('isPowerAppStageCompleted', () => {
    it('detects stages after power_apps', () => {
      expect(isPowerAppStageCompleted('delivery_confirmation')).toBe(true);
      expect(isPowerAppStageCompleted('power_apps')).toBe(false);
      expect(isPowerAppStageCompleted('sales_call')).toBe(false);
    });
  });
});
