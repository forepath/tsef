export interface Environment {
  production: boolean;
  controller: {
    restApiUrl: string;
    websocketUrl: string;
  };
  authentication: AuthenticationConfig;
  chatModelOptions: Record<string, string>;
  editor: {
    openInNewWindow: boolean;
  };
  cookieConsent: {
    domain: string;
    privacyPolicyUrl: string;
  };
}

export type AuthenticationConfig = KeycloakAuthenticationConfig | ApiKeyAuthenticationConfig;

export interface KeycloakAuthenticationConfig {
  type: 'keycloak';
  authServerUrl: string;
  realm: string;
  clientId: string;
}

export interface ApiKeyAuthenticationConfig {
  type: 'api-key';
  apiKey?: string;
}
