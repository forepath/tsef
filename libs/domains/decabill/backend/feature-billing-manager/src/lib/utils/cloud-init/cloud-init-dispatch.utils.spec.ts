import { normalizeCloudInitService } from './cloud-init-dispatch.utils';

describe('cloud-init-dispatch.utils', () => {
  describe('normalizeCloudInitService', () => {
    it('returns manager, decabill-billing, and custom when specified', () => {
      expect(normalizeCloudInitService('agenstra-manager')).toBe('agenstra-manager');
      expect(normalizeCloudInitService('decabill-billing')).toBe('decabill-billing');
      expect(normalizeCloudInitService('custom')).toBe('custom');
    });

    it('maps legacy controller and manager aliases to canonical ids', () => {
      expect(normalizeCloudInitService('controller')).toBe('agenstra-controller');
      expect(normalizeCloudInitService('manager')).toBe('agenstra-manager');
    });

    it('defaults to controller for unknown values on read paths', () => {
      expect(normalizeCloudInitService(undefined)).toBe('agenstra-controller');
      expect(normalizeCloudInitService('other')).toBe('agenstra-controller');
    });
  });
});
