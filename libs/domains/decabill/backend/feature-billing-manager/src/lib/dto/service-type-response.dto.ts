export class ServiceTypeResponseDto {
  id!: string;
  key!: string;
  name!: string;
  description?: string;
  /** Primary provider id; null when None (no cloud provider). */
  provider!: string | null;
  /** Interchangeable provider ids (first is primary). Empty means None. */
  allowedProviders!: string[];
  configSchema!: Record<string, unknown>;
  isActive!: boolean;
  disallowStatutoryWithdrawal!: boolean;
  providerDefaultsConfigured!: Record<string, boolean>;
  createdAt!: Date;
  updatedAt!: Date;
}
