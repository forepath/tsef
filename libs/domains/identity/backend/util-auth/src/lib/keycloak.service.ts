import { Injectable, Logger } from '@nestjs/common';
import {
  KeycloakConnectOptions,
  KeycloakConnectOptionsFactory,
  PolicyEnforcementMode,
  TokenValidation,
} from 'nest-keycloak-connect';

@Injectable()
export class KeycloakService implements KeycloakConnectOptionsFactory {
  private readonly logger = new Logger(KeycloakService.name);

  createKeycloakConnectOptions(): KeycloakConnectOptions | Promise<KeycloakConnectOptions> {
    return {
      serverUrl: process.env.KEYCLOAK_SERVER_URL,
      authServerUrl: process.env.KEYCLOAK_AUTH_SERVER_URL,
      realm: process.env.KEYCLOAK_REALM,
      clientId: process.env.KEYCLOAK_CLIENT_ID,
      secret: process.env.KEYCLOAK_CLIENT_SECRET,
      policyEnforcement: PolicyEnforcementMode.PERMISSIVE,
      tokenValidation: process.env.KEYCLOAK_TOKEN_VALIDATION as TokenValidation,
    };
  }
}
