import { ClientAgentCredentialEntity } from './client-agent-credential.entity';

describe('ClientAgentCredentialEntity', () => {
  it('should create an instance with required fields', () => {
    const entity = new ClientAgentCredentialEntity();
    entity.clientId = '00000000-0000-0000-0000-000000000001';
    entity.agentId = '00000000-0000-0000-0000-000000000002';
    entity.password = 'secret';
    expect(entity).toBeInstanceOf(ClientAgentCredentialEntity);
    expect(entity.clientId).toBeDefined();
    expect(entity.agentId).toBeDefined();
    expect(entity.password).toBe('secret');
  });
});
