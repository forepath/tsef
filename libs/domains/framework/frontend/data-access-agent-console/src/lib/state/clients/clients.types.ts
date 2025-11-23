// Types based on OpenAPI spec
export type ClientAuthenticationType = 'api_key' | 'keycloak';

export interface AgentTypeInfo {
  type: string;
  displayName: string;
}

export interface ConfigResponseDto {
  gitRepositoryUrl?: string | null;
  agentTypes: AgentTypeInfo[];
}

export interface ClientResponseDto {
  id: string;
  name: string;
  description?: string;
  endpoint: string;
  authenticationType: ClientAuthenticationType;
  agentWsPort?: number;
  config?: ConfigResponseDto;
  createdAt: string;
  updatedAt: string;
}

export interface CreateClientDto {
  name: string;
  description?: string;
  endpoint: string;
  authenticationType: ClientAuthenticationType;
  apiKey?: string;
  keycloakClientId?: string;
  keycloakClientSecret?: string;
  keycloakRealm?: string;
  agentWsPort?: number;
}

export interface UpdateClientDto {
  name?: string;
  description?: string;
  endpoint?: string;
  authenticationType?: ClientAuthenticationType;
  apiKey?: string;
  keycloakClientId?: string;
  keycloakClientSecret?: string;
  keycloakRealm?: string;
  agentWsPort?: number;
}

export interface CreateClientResponseDto extends ClientResponseDto {
  apiKey?: string;
}

export interface ListClientsParams {
  limit?: number;
  offset?: number;
}
