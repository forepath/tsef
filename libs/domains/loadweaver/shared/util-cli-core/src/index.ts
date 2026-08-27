export type { GlobalCliOptions, LoadweaverContext, LoadweaverConfig } from './lib/context';
export { loadweaverConfigSchema } from './lib/config/schema';
export {
  vipPoolSchema,
  vipListenerSchema,
  vipBackendTargetSchema,
  type VipPool,
  type VipListener,
  type VipBackendTarget,
} from './lib/config/vip-pool.schema';
export {
  LOADWEAVER_CONFIG_ENV,
  loadLoadweaverConfig,
  readLoadweaverConfigOverlay,
} from './lib/config/load-loadweaver-config';
export {
  deriveVipStateSnapshot,
  resolveVipPools,
  vipStateChanged,
  listVipAddresses,
  type VipStateSnapshot,
  type VipPoolFingerprint,
  type ResolvedVipPool,
} from './lib/services/derive-vip-state.service';
export { DEFAULT_CONFIG_TEMPLATE } from './lib/config/defaults';
export { NodeRegistry, listNodeIds, getManagerNodes, resolveNodeHost } from './lib/services/node-registry.service';
export { resolveSshTarget } from './lib/services/ssh-target.service';
export { validateSshIdentityFiles, warnUnreachableProxyJumps } from './lib/services/ssh-config-validation.service';
export { runPrerequisiteChecks, assertPrerequisites } from './lib/services/prerequisite.service';
export { withExamples } from './lib/command-help';
export { renderTemplate } from './lib/template/render-template';
export { readTemplateFile, readTemplateFromDir } from './lib/template/read-template';
export {
  defaultWorkspaceDir,
  clusterStatePath,
  clusterLockPath,
  wireguardKeysPath,
  routingKeysPath,
} from './lib/workspace/paths';
export { deriveClusterCidr, cidrContainsIp, cidrsOverlap } from './lib/services/derive-cluster-cidr.service';
export { deriveOsdDevices, diffOsdDeviceChanges } from './lib/services/derive-osd-devices.service';
export { isRoutingEnabled, isRoutingHub, resolveRoutingHubNodes } from './lib/services/resolve-routing-hubs.service';
export {
  deriveRoutingStateSnapshot,
  routingStateChanged,
  type RoutingPeerSnapshot,
  type RoutingStateSnapshot,
} from './lib/services/routing-state.service';
export {
  acquireClusterLock,
  releaseClusterLock,
  readClusterLock,
  isClusterLockStale,
  createLockRecord,
  type ClusterLockRecord,
} from './lib/workspace/cluster-lock';
export { confirmProceedAfterDrift, type DriftFinding, type DriftConfirmDecision } from './lib/workspace/confirm-drift';
export { runGuardedMutation } from './lib/workspace/mutation-guard';
export { assertRemoteSuccess, isRemoteAlreadyExists } from './lib/services/remote-exec.service';
export {
  deriveExpectedSwarmLabels,
  diffSwarmLabelChanges,
  groupExpectedLabelsByKey,
  LEGACY_SWARM_LABEL_KEYS,
  missingExpectedSwarmLabels,
  parseSwarmLabel,
  roleSwarmLabel,
  routerSwarmLabel,
  siteSwarmLabel,
  staleManagedSwarmLabelKeys,
  MANAGED_SWARM_LABEL_PREFIX,
} from './lib/services/expected-swarm-labels.service';
export { printStructuredOutput } from './lib/output/structured-output';
