import { CloudInitConfigEntity } from '../../entities/cloud-init-config.entity';
import { buildProvisioningUserData, normalizeCloudInitService } from './cloud-init-dispatch.utils';
import { CloudInitServiceType } from './integrated-provisioning-service';

jest.mock('./agent-controller.utils', () => ({
  buildCloudInitConfigFromRequest: jest.fn().mockReturnValue({ host: {} }),
  buildBillingCloudInitUserData: jest.fn().mockReturnValue('controller-user-data'),
}));

jest.mock('./agent-manager.utils', () => ({
  buildAgentManagerCloudInitConfigFromRequest: jest.fn().mockReturnValue({ host: {} }),
  buildAgentManagerCloudInitUserData: jest.fn().mockReturnValue('manager-user-data'),
}));

jest.mock('./decabill-billing.utils', () => ({
  buildDecabillBillingCloudInitConfigFromRequest: jest.fn().mockReturnValue({ host: {} }),
  buildDecabillBillingCloudInitUserData: jest.fn().mockReturnValue('decabill-user-data'),
}));

jest.mock('./custom-configuration.utils', () => ({
  buildCustomConfigurationCloudInitConfigFromRequest: jest.fn().mockReturnValue({ app: {} }),
  buildCustomConfigurationCloudInitUserData: jest.fn().mockReturnValue('custom-user-data'),
}));

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

    it('defaults to controller for unknown values', () => {
      expect(normalizeCloudInitService(undefined)).toBe('agenstra-controller');
      expect(normalizeCloudInitService('other')).toBe('agenstra-controller');
    });
  });

  describe('buildProvisioningUserData', () => {
    const baseParams = {
      effectiveConfig: { service: CloudInitServiceType.AgenstraController },
      hostname: 'host1',
      baseDomain: 'spirde.com',
    };

    it('builds controller user data by default', () => {
      expect(buildProvisioningUserData({ ...baseParams, service: CloudInitServiceType.AgenstraController })).toBe(
        'controller-user-data',
      );
    });

    it('builds manager user data', () => {
      expect(buildProvisioningUserData({ ...baseParams, service: CloudInitServiceType.AgenstraManager })).toBe(
        'manager-user-data',
      );
    });

    it('builds decabill-billing user data', () => {
      expect(buildProvisioningUserData({ ...baseParams, service: CloudInitServiceType.DecabillBilling })).toBe(
        'decabill-user-data',
      );
    });

    it('builds custom user data when template and env are provided', () => {
      const template = { id: 't1' } as CloudInitConfigEntity;

      expect(
        buildProvisioningUserData({
          ...baseParams,
          service: CloudInitServiceType.Custom,
          customTemplate: template,
          resolvedCustomEnv: { FOO: 'bar' },
        }),
      ).toBe('custom-user-data');
    });

    it('throws when custom service lacks template or env', () => {
      expect(() => buildProvisioningUserData({ ...baseParams, service: CloudInitServiceType.Custom })).toThrow(
        'Custom CloudInit provisioning requires template and resolved environment variables',
      );
    });
  });
});
