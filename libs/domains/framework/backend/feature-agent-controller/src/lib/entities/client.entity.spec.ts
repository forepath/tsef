import { AuthenticationType, ClientEntity } from './client.entity';

describe('ClientEntity', () => {
  it('should create an instance', () => {
    const client = new ClientEntity();
    expect(client).toBeDefined();
  });

  it('should have all required properties', () => {
    const client = new ClientEntity();
    client.id = 'test-uuid';
    client.name = 'Test Client';
    client.description = 'Test Description';
    client.endpoint = 'https://example.com/api';
    client.authenticationType = AuthenticationType.API_KEY;
    client.apiKey = 'test-api-key-123';
    client.createdAt = new Date();
    client.updatedAt = new Date();

    expect(client.id).toBe('test-uuid');
    expect(client.name).toBe('Test Client');
    expect(client.description).toBe('Test Description');
    expect(client.endpoint).toBe('https://example.com/api');
    expect(client.authenticationType).toBe(AuthenticationType.API_KEY);
    expect(client.apiKey).toBe('test-api-key-123');
    expect(client.createdAt).toBeInstanceOf(Date);
    expect(client.updatedAt).toBeInstanceOf(Date);
  });

  it('should allow optional description and apiKey', () => {
    const client = new ClientEntity();
    client.id = 'test-uuid';
    client.name = 'Test Client';
    client.endpoint = 'https://example.com/api';
    client.authenticationType = AuthenticationType.KEYCLOAK;
    client.createdAt = new Date();
    client.updatedAt = new Date();

    expect(client.description).toBeUndefined();
    expect(client.apiKey).toBeUndefined();
  });

  it('should support API_KEY authentication type', () => {
    const client = new ClientEntity();
    client.id = 'test-uuid';
    client.name = 'Test Client';
    client.endpoint = 'https://example.com/api';
    client.authenticationType = AuthenticationType.API_KEY;
    client.apiKey = 'api-key-123';
    client.createdAt = new Date();
    client.updatedAt = new Date();

    expect(client.authenticationType).toBe(AuthenticationType.API_KEY);
    expect(client.apiKey).toBe('api-key-123');
  });

  it('should support KEYCLOAK authentication type', () => {
    const client = new ClientEntity();
    client.id = 'test-uuid';
    client.name = 'Test Client';
    client.endpoint = 'https://example.com/api';
    client.authenticationType = AuthenticationType.KEYCLOAK;
    client.keycloakClientId = 'keycloak-client-id';
    client.keycloakClientSecret = 'keycloak-client-secret';
    client.keycloakRealm = 'test-realm';
    client.createdAt = new Date();
    client.updatedAt = new Date();

    expect(client.authenticationType).toBe(AuthenticationType.KEYCLOAK);
    expect(client.keycloakClientId).toBe('keycloak-client-id');
    expect(client.keycloakClientSecret).toBe('keycloak-client-secret');
    expect(client.keycloakRealm).toBe('test-realm');
  });

  it('should allow optional Keycloak fields', () => {
    const client = new ClientEntity();
    client.id = 'test-uuid';
    client.name = 'Test Client';
    client.endpoint = 'https://example.com/api';
    client.authenticationType = AuthenticationType.API_KEY;
    client.createdAt = new Date();
    client.updatedAt = new Date();

    expect(client.keycloakClientId).toBeUndefined();
    expect(client.keycloakClientSecret).toBeUndefined();
    expect(client.keycloakRealm).toBeUndefined();
  });
});
