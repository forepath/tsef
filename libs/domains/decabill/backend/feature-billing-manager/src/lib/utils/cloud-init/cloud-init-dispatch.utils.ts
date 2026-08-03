import { CloudInitConfigEntity } from '../../entities/cloud-init-config.entity';
import { buildBillingCloudInitUserData, buildCloudInitConfigFromRequest } from './agent-controller.utils';
import { buildAgentManagerCloudInitConfigFromRequest, buildAgentManagerCloudInitUserData } from './agent-manager.utils';
import {
  buildCustomConfigurationCloudInitConfigFromRequest,
  buildCustomConfigurationCloudInitUserData,
} from './custom-configuration.utils';
import {
  buildDecabillBillingCloudInitConfigFromRequest,
  buildDecabillBillingCloudInitUserData,
} from './decabill-billing.utils';
import { CloudInitServiceType, canonicalizeCloudInitService } from './integrated-provisioning-service';

export { CloudInitServiceType } from './integrated-provisioning-service';

export function normalizeCloudInitService(service: string | undefined): CloudInitServiceType {
  return canonicalizeCloudInitService(service);
}

export function buildProvisioningUserData(params: {
  service: CloudInitServiceType;
  effectiveConfig: Record<string, unknown>;
  hostname: string;
  baseDomain: string;
  customTemplate?: CloudInitConfigEntity;
  resolvedCustomEnv?: Record<string, string>;
}): string {
  const { service, effectiveConfig, hostname, baseDomain, customTemplate, resolvedCustomEnv } = params;

  if (service === CloudInitServiceType.Custom) {
    if (!customTemplate || !resolvedCustomEnv) {
      throw new Error('Custom CloudInit provisioning requires template and resolved environment variables');
    }

    return buildCustomConfigurationCloudInitUserData(
      customTemplate,
      buildCustomConfigurationCloudInitConfigFromRequest(
        customTemplate,
        resolvedCustomEnv,
        effectiveConfig,
        hostname,
        baseDomain,
      ),
    );
  }

  if (service === CloudInitServiceType.AgenstraManager) {
    return buildAgentManagerCloudInitUserData(
      buildAgentManagerCloudInitConfigFromRequest(effectiveConfig, hostname, baseDomain),
    );
  }

  if (service === CloudInitServiceType.DecabillBilling) {
    return buildDecabillBillingCloudInitUserData(
      buildDecabillBillingCloudInitConfigFromRequest(effectiveConfig, hostname, baseDomain),
    );
  }

  return buildBillingCloudInitUserData(buildCloudInitConfigFromRequest(effectiveConfig, hostname, baseDomain));
}
